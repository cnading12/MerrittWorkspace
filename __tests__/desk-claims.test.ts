import { describe, it, expect } from 'vitest';
import { findDeskClaim, manualOccupantMatchesName } from '@/lib/portal/deskClaims';

// Guards the desk-occupancy rule enforced by the portal assignment API
// (app/api/portal/assignment/route.ts) and the existing-member migration
// (app/api/membership-application/existing-member/route.ts): a dedicated desk
// with an occupant in EITHER seating source — a portal member's desk_number or
// a staff-entered seating_manual_assignments row — cannot be claimed.

interface MockState {
  members: Array<{ id: string; desk_number: string | null }>;
  manual: Array<{ space_type: string; space_number: string; occupant_name: string }>;
}

// Minimal supabase mock implementing the query chains findDeskClaim uses:
// select → ilike/eq/neq filters → limit (which resolves the filtered rows).
// ilike is modeled as case-insensitive equality since the helper never passes
// wildcards.
function makeMockSb(state: MockState) {
  return {
    from: (table: string) => {
      const rows: any[] =
        table === 'members'
          ? state.members
          : table === 'seating_manual_assignments'
            ? state.manual
            : [];
      const filters: Array<(r: any) => boolean> = [];
      const builder: any = {
        select: () => builder,
        ilike: (col: string, val: string) => {
          filters.push((r) => (r[col] || '').toLowerCase() === val.toLowerCase());
          return builder;
        },
        eq: (col: string, val: any) => {
          filters.push((r) => r[col] === val);
          return builder;
        },
        neq: (col: string, val: any) => {
          filters.push((r) => r[col] !== val);
          return builder;
        },
        limit: (n: number) =>
          Promise.resolve({
            data: rows.filter((r) => filters.every((f) => f(r))).slice(0, n),
            error: null,
          }),
      };
      return builder;
    },
  } as any;
}

describe('findDeskClaim', () => {
  it('returns null for a vacant desk', async () => {
    const sb = makeMockSb({ members: [], manual: [] });
    expect(await findDeskClaim(sb, 'DD4')).toBeNull();
  });

  it('reports a desk held by a portal member', async () => {
    const sb = makeMockSb({
      members: [{ id: 'm-1', desk_number: 'DD4' }],
      manual: [],
    });
    expect(await findDeskClaim(sb, 'DD4')).toEqual({
      source: 'portal',
      memberId: 'm-1',
    });
  });

  it('reports a desk held by a manual seating-chart entry', async () => {
    const sb = makeMockSb({
      members: [],
      manual: [{ space_type: 'desk', space_number: 'DD4', occupant_name: 'Jane Doe' }],
    });
    expect(await findDeskClaim(sb, 'DD4')).toEqual({
      source: 'manual',
      occupantName: 'Jane Doe',
    });
  });

  it('matches case-insensitively against legacy member values', async () => {
    const sb = makeMockSb({
      members: [{ id: 'm-1', desk_number: 'dd4' }],
      manual: [],
    });
    expect(await findDeskClaim(sb, 'DD4')).not.toBeNull();
  });

  it('ignores manual entries for offices with the same number', async () => {
    const sb = makeMockSb({
      members: [],
      manual: [{ space_type: 'office', space_number: 'DD4', occupant_name: 'Jane Doe' }],
    });
    expect(await findDeskClaim(sb, 'DD4')).toBeNull();
  });

  it("does not let a member's own current desk block them", async () => {
    const sb = makeMockSb({
      members: [{ id: 'm-1', desk_number: 'DD4' }],
      manual: [],
    });
    expect(await findDeskClaim(sb, 'DD4', { excludeMemberId: 'm-1' })).toBeNull();
  });

  it('still blocks an excluded member when someone else holds the desk', async () => {
    const sb = makeMockSb({
      members: [{ id: 'm-2', desk_number: 'DD4' }],
      manual: [],
    });
    expect(await findDeskClaim(sb, 'DD4', { excludeMemberId: 'm-1' })).toEqual({
      source: 'portal',
      memberId: 'm-2',
    });
  });

  it('prefers the portal claim when both sources hold the desk', async () => {
    const sb = makeMockSb({
      members: [{ id: 'm-1', desk_number: 'DD4' }],
      manual: [{ space_type: 'desk', space_number: 'DD4', occupant_name: 'Jane Doe' }],
    });
    expect(await findDeskClaim(sb, 'DD4')).toEqual({
      source: 'portal',
      memberId: 'm-1',
    });
  });
});

describe('manualOccupantMatchesName', () => {
  it('matches the same name exactly', () => {
    expect(manualOccupantMatchesName('Jane Doe', 'Jane', 'Doe')).toBe(true);
  });

  it('ignores casing and extra whitespace', () => {
    expect(manualOccupantMatchesName('  jane   DOE ', 'Jane', 'Doe')).toBe(true);
  });

  it('rejects a different person', () => {
    expect(manualOccupantMatchesName('John Smith', 'Jane', 'Doe')).toBe(false);
  });

  it('rejects partial matches (fails closed)', () => {
    expect(manualOccupantMatchesName('Jane', 'Jane', 'Doe')).toBe(false);
    expect(manualOccupantMatchesName('Jane Doe Jr', 'Jane', 'Doe')).toBe(false);
  });
});
