import { describe, it, expect } from 'vitest';
import {
  buildOccupancy,
  canonicalizeSpaceNumber,
  validateManualAssignment,
  DESK_SPACES,
  OFFICE_SPACES,
  type ManualAssignment,
  type SeatingMember,
} from '@/lib/portal/seating';

// Guards the admin seating-chart merge logic: the occupancy list is built by
// overlaying portal members (members.desk_number/office_number) and the manual
// seating_manual_assignments table onto a fixed set of spaces.

function member(
  id: string,
  first: string,
  last: string,
  fields: Partial<SeatingMember> = {}
): SeatingMember {
  return {
    id,
    first_name: first,
    last_name: last,
    desk_number: null,
    office_number: null,
    ...fields,
  };
}

function manual(
  id: string,
  space_type: 'desk' | 'office',
  space_number: string,
  occupant_name: string
): ManualAssignment {
  return {
    id,
    space_type,
    space_number,
    occupant_name,
    created_at: '',
    updated_at: '',
  };
}

describe('canonical space sets', () => {
  it('covers DD1–DD26', () => {
    expect(DESK_SPACES).toHaveLength(26);
    expect(DESK_SPACES[0]).toBe('DD1');
    expect(DESK_SPACES[25]).toBe('DD26');
  });

  it('lists offices 100–112, 114, 120 and omits 113', () => {
    expect(OFFICE_SPACES).toContain('100');
    expect(OFFICE_SPACES).toContain('112');
    expect(OFFICE_SPACES).toContain('114');
    expect(OFFICE_SPACES).toContain('120');
    expect(OFFICE_SPACES).not.toContain('113');
    expect(OFFICE_SPACES).toHaveLength(15);
  });
});

describe('canonicalizeSpaceNumber', () => {
  it('normalizes desk casing/whitespace via the DD# rules', () => {
    expect(canonicalizeSpaceNumber('desk', 'dd4')).toBe('DD4');
    expect(canonicalizeSpaceNumber('desk', ' DD04 ')).toBe('DD4');
  });
  it('uppercases/trims office numbers', () => {
    expect(canonicalizeSpaceNumber('office', ' 101 ')).toBe('101');
  });
  it('returns null for empty', () => {
    expect(canonicalizeSpaceNumber('office', '')).toBeNull();
    expect(canonicalizeSpaceNumber('desk', null)).toBeNull();
  });
});

describe('buildOccupancy', () => {
  it('shows every desk, with Vacant where unassigned', () => {
    const entries = buildOccupancy('desk', DESK_SPACES, [], []);
    expect(entries).toHaveLength(26);
    expect(entries.every((e) => e.occupant === null)).toBe(true);
  });

  it('places a portal member on their desk with a portal source', () => {
    const members = [member('m1', 'Ada', 'Lovelace', { desk_number: 'DD4' })];
    const entries = buildOccupancy('desk', DESK_SPACES, members, []);
    const dd4 = entries.find((e) => e.spaceNumber === 'DD4')!;
    expect(dd4.occupant).toMatchObject({
      name: 'Ada Lovelace',
      source: 'portal',
      memberId: 'm1',
    });
  });

  it('places a manual occupant with a manual source', () => {
    const entries = buildOccupancy('office', OFFICE_SPACES, [], [
      manual('a1', 'office', '101', 'Grace Hopper'),
    ]);
    const o101 = entries.find((e) => e.spaceNumber === '101')!;
    expect(o101.occupant).toMatchObject({
      name: 'Grace Hopper',
      source: 'manual',
      manualId: 'a1',
    });
  });

  it('matches case-insensitively between sources (dd4 vs DD4)', () => {
    const members = [member('m1', 'Ada', 'Lovelace', { desk_number: 'DD4' })];
    const entries = buildOccupancy('desk', DESK_SPACES, members, [
      manual('a1', 'desk', 'dd4', 'Walk-in Person'),
    ]);
    const dd4 = entries.find((e) => e.spaceNumber === 'DD4')!;
    // Portal is the primary occupant; manual is flagged as the conflict.
    expect(dd4.occupant?.source).toBe('portal');
    expect(dd4.conflict).toMatchObject({
      name: 'Walk-in Person',
      source: 'manual',
    });
  });

  it('does not flag a conflict when only one source claims a space', () => {
    const members = [member('m1', 'Ada', 'Lovelace', { desk_number: 'DD4' })];
    const entries = buildOccupancy('desk', DESK_SPACES, members, []);
    expect(entries.find((e) => e.spaceNumber === 'DD4')!.conflict).toBeUndefined();
  });

  it('appends occupied non-canonical spaces (e.g. a stray office) at the end', () => {
    const entries = buildOccupancy('office', OFFICE_SPACES, [], [
      manual('a1', 'office', '999', 'Mystery Tenant'),
    ]);
    const last = entries[entries.length - 1];
    expect(last.spaceNumber).toBe('999');
    expect(last.occupant?.name).toBe('Mystery Tenant');
    expect(entries).toHaveLength(OFFICE_SPACES.length + 1);
  });

  it('ignores the office field when building desks and vice versa', () => {
    const members = [
      member('m1', 'Ada', 'Lovelace', { office_number: '101' }),
    ];
    const deskEntries = buildOccupancy('desk', DESK_SPACES, members, []);
    expect(deskEntries.every((e) => e.occupant === null)).toBe(true);
  });
});

describe('validateManualAssignment', () => {
  it('rejects an invalid space type', () => {
    const r = validateManualAssignment({
      space_type: 'room',
      space_number: '1',
      occupant_name: 'X',
    });
    expect(r.ok).toBe(false);
  });

  it('requires a name', () => {
    const r = validateManualAssignment({
      space_type: 'desk',
      space_number: 'DD4',
      occupant_name: '   ',
    });
    expect(r.ok).toBe(false);
  });

  it('enforces the DD# rules for desks', () => {
    const bad = validateManualAssignment({
      space_type: 'desk',
      space_number: 'DD99',
      occupant_name: 'X',
    });
    expect(bad.ok).toBe(false);
    const good = validateManualAssignment({
      space_type: 'desk',
      space_number: 'dd4',
      occupant_name: 'Ada Lovelace',
    });
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.spaceNumber).toBe('DD4');
  });

  it('accepts office numbers as free text (trimmed/uppercased)', () => {
    const r = validateManualAssignment({
      space_type: 'office',
      space_number: ' 120 ',
      occupant_name: 'Grace Hopper',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spaceNumber).toBe('120');
      expect(r.occupantName).toBe('Grace Hopper');
    }
  });
});
