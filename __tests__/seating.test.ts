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
  it('covers DD1–DD26 and omits the removed DD5', () => {
    expect(DESK_SPACES).toHaveLength(25);
    expect(DESK_SPACES[0]).toBe('DD1');
    expect(DESK_SPACES[24]).toBe('DD26');
    expect(DESK_SPACES).not.toContain('DD5');
    // Neighbours keep their original labels — nothing was renumbered.
    expect(DESK_SPACES).toContain('DD4');
    expect(DESK_SPACES).toContain('DD6');
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
    expect(entries).toHaveLength(25);
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

describe('buildOccupancy — multi-occupant offices', () => {
  // Office 110: Priya pays (primary), Omar is an approved office member,
  // Nia's request is still pending.
  const officeMembers = [
    member('m-omar', 'Omar', 'Diaz', {
      office_number: '110',
      designation: 'office_member',
      status: 'active',
    }),
    member('m-priya', 'Priya', 'Shah', {
      office_number: '110',
      designation: 'private_office_large',
      status: 'active',
    }),
    member('m-nia', 'Nia', 'Bell', {
      office_number: ' 110 ',
      designation: 'office_member',
      status: 'pending',
    }),
  ];

  it('lists every occupant of an office, primary first', () => {
    const entries = buildOccupancy('office', OFFICE_SPACES, officeMembers, []);
    const o110 = entries.find((e) => e.spaceNumber === '110')!;
    expect(o110.occupants.map((o) => o.name)).toEqual([
      'Priya Shah',
      'Omar Diaz',
      'Nia Bell',
    ]);
    expect(o110.occupants[0]).toMatchObject({ role: 'primary' });
    expect(o110.occupants[1]).toMatchObject({ role: 'member' });
    expect(o110.occupants[2]).toMatchObject({ role: 'member', pending: true });
    // The headline occupant is the primary.
    expect(o110.occupant).toMatchObject({ name: 'Priya Shah', role: 'primary' });
  });

  it('keeps single-occupant entries working with an occupants array of one', () => {
    const members = [member('m1', 'Ada', 'Lovelace', { desk_number: 'DD4' })];
    const entries = buildOccupancy('desk', DESK_SPACES, members, []);
    const dd4 = entries.find((e) => e.spaceNumber === 'DD4')!;
    expect(dd4.occupants).toHaveLength(1);
    expect(dd4.occupants[0].name).toBe('Ada Lovelace');
  });

  it('a manual occupant does not appear in occupants (portal-only) but stays the headline when alone', () => {
    const entries = buildOccupancy('office', OFFICE_SPACES, [], [
      manual('a1', 'office', '101', 'Grace Hopper'),
    ]);
    const o101 = entries.find((e) => e.spaceNumber === '101')!;
    expect(o101.occupants).toHaveLength(0);
    expect(o101.occupant?.name).toBe('Grace Hopper');
  });

  it('still flags a manual conflict on a multi-occupant office', () => {
    const entries = buildOccupancy('office', OFFICE_SPACES, officeMembers, [
      manual('a1', 'office', '110', 'Walk-in Person'),
    ]);
    const o110 = entries.find((e) => e.spaceNumber === '110')!;
    expect(o110.occupants).toHaveLength(3);
    expect(o110.conflict).toMatchObject({ name: 'Walk-in Person', source: 'manual' });
  });

  it('no longer hides a second portal claimant of the same desk', () => {
    const members = [
      member('m1', 'Ada', 'Lovelace', { desk_number: 'DD4' }),
      member('m2', 'Alan', 'Turing', { desk_number: 'dd4' }),
    ];
    const entries = buildOccupancy('desk', DESK_SPACES, members, []);
    const dd4 = entries.find((e) => e.spaceNumber === 'DD4')!;
    expect(dd4.occupants.map((o) => o.name).sort()).toEqual([
      'Ada Lovelace',
      'Alan Turing',
    ]);
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
    // DD5 is in range but no longer exists — staff can't chart someone there.
    const removed = validateManualAssignment({
      space_type: 'desk',
      space_number: 'DD5',
      occupant_name: 'X',
    });
    expect(removed.ok).toBe(false);
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
