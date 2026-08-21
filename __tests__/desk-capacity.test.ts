import { describe, it, expect } from 'vitest';
import {
  summarizeDeskCapacity,
  summarizePrivateDeskCapacity,
  getDeskCapacity,
  listAvailableDesks,
  type DeskCapacityMember,
} from '@/lib/portal/deskAvailability';
import { DESK_SPACES } from '@/lib/portal/seating';
import { DESK_COUNT, PRIVATE_DESK_COUNT } from '@/lib/portal/desks';

// Guards the rule that decides whether the shared coworking floor is FULL —
// the switch that stops new members from taking a floor-plan desk and starts
// offering the higher-priced private dedicated desk instead.
//
// The subtlety worth protecting: a member who finished the onboarding portal
// and is paying holds one of the 25 desks even before they've picked a DD
// number. People routinely take days to choose, or pay ahead of their start
// date, and those seats must not be sold twice.

function member(
  id: string,
  over: Partial<DeskCapacityMember> = {},
): DeskCapacityMember {
  return {
    id,
    designation: 'dedicated_desk',
    status: 'active',
    desk_number: null,
    onboarding_unlocked: true,
    archived_at: null,
    ...over,
  };
}

// A roster that seats `n` dedicated-desk members at DD1, DD2, … in floor order.
function seatedMembers(n: number): DeskCapacityMember[] {
  return DESK_SPACES.slice(0, n).map((desk, i) =>
    member(`m${i}`, { desk_number: desk }),
  );
}

describe('summarizeDeskCapacity — physical occupancy', () => {
  it('reports an empty building as entirely available', () => {
    const c = summarizeDeskCapacity({ members: [], manualDeskNumbers: [] });
    expect(c.capacity).toBe(DESK_COUNT);
    expect(c.takenCount).toBe(0);
    expect(c.remainingCount).toBe(DESK_COUNT);
    expect(c.isFull).toBe(false);
    expect(c.availableDesks).toEqual(DESK_SPACES);
  });

  it('counts desks claimed by portal members', () => {
    const c = summarizeDeskCapacity({
      members: [member('m1', { desk_number: 'DD4' })],
      manualDeskNumbers: [],
    });
    expect(c.claimedDesks).toEqual(['DD4']);
    expect(c.takenCount).toBe(1);
    expect(c.availableDesks).not.toContain('DD4');
  });

  it('counts desks charted manually for people not on the portal', () => {
    const c = summarizeDeskCapacity({ members: [], manualDeskNumbers: ['dd7'] });
    expect(c.claimedDesks).toEqual(['DD7']);
    expect(c.availableDesks).not.toContain('DD7');
  });

  it('does not double-count a desk claimed in both sources', () => {
    const c = summarizeDeskCapacity({
      members: [member('m1', { desk_number: 'DD4' })],
      manualDeskNumbers: ['DD4'],
    });
    expect(c.takenCount).toBe(1);
  });

  it('matches desk numbers across casing and whitespace', () => {
    const c = summarizeDeskCapacity({
      members: [member('m1', { desk_number: ' dd04 ' })],
      manualDeskNumbers: [],
    });
    expect(c.claimedDesks).toEqual(['DD4']);
    expect(c.availableDesks).not.toContain('DD4');
  });

  it('does not let a bogus desk value occupy one of the 25 real desks', () => {
    // DD5 was retired and DD99 never existed, so neither marks a real desk as
    // taken. The paid member behind the bad value still holds a seat, though —
    // they fall back to being counted as someone who hasn't picked yet, which
    // is what stops a typo from quietly freeing up capacity.
    const c = summarizeDeskCapacity({
      members: [member('m1', { desk_number: 'DD99' })],
      manualDeskNumbers: ['DD5'],
    });
    expect(c.claimedDesks).toEqual([]);
    expect(c.availableDesks).toEqual(DESK_SPACES);
    expect(c.reservedCount).toBe(1);
    expect(c.takenCount).toBe(1);
  });

  it('a bogus manual entry alone consumes nothing', () => {
    const c = summarizeDeskCapacity({ members: [], manualDeskNumbers: ['DD5', 'lounge'] });
    expect(c.takenCount).toBe(0);
    expect(c.availableDesks).toEqual(DESK_SPACES);
  });
});

describe('summarizeDeskCapacity — paid members who have not picked a desk', () => {
  it('counts a paid desk member with no desk number toward capacity', () => {
    const c = summarizeDeskCapacity({
      members: [member('m1')],
      manualDeskNumbers: [],
    });
    expect(c.reservedCount).toBe(1);
    expect(c.takenCount).toBe(1);
    expect(c.remainingCount).toBe(DESK_COUNT - 1);
    // …but every desk is still physically pickable, including by them.
    expect(c.availableDesks).toEqual(DESK_SPACES);
  });

  it('does not count a desk member who has not finished onboarding', () => {
    const c = summarizeDeskCapacity({
      members: [member('m1', { onboarding_unlocked: false, status: 'approved' })],
      manualDeskNumbers: [],
    });
    expect(c.reservedCount).toBe(0);
    expect(c.takenCount).toBe(0);
  });

  it('does not count a member twice once they pick a desk', () => {
    const c = summarizeDeskCapacity({
      members: [member('m1', { desk_number: 'DD4' })],
      manualDeskNumbers: [],
    });
    expect(c.reservedCount).toBe(0);
    expect(c.takenCount).toBe(1);
  });

  it('does not reserve a seat for day-pass or private-desk members', () => {
    const c = summarizeDeskCapacity({
      members: [
        member('m1', { designation: 'one_day_dedicated_desk' }),
        member('m2', { designation: 'private_dedicated_desk' }),
        member('m3', { designation: 'private_office_single' }),
        member('m4', { designation: 'flex' }),
      ],
      manualDeskNumbers: [],
    });
    expect(c.reservedCount).toBe(0);
    expect(c.takenCount).toBe(0);
  });

  it('still counts the desk a day-pass member is physically sitting at', () => {
    const c = summarizeDeskCapacity({
      members: [
        member('m1', { designation: 'one_day_dedicated_desk', desk_number: 'DD9' }),
      ],
      manualDeskNumbers: [],
    });
    expect(c.claimedDesks).toEqual(['DD9']);
    expect(c.takenCount).toBe(1);
  });
});

describe('summarizeDeskCapacity — who still holds a seat', () => {
  it('ignores archived members', () => {
    const c = summarizeDeskCapacity({
      members: [
        member('m1', { desk_number: 'DD4', archived_at: '2026-01-01T00:00:00Z' }),
        member('m2', { archived_at: '2026-01-01T00:00:00Z' }),
      ],
      manualDeskNumbers: [],
    });
    expect(c.takenCount).toBe(0);
    expect(c.availableDesks).toContain('DD4');
  });

  it('ignores declined members', () => {
    const c = summarizeDeskCapacity({
      members: [member('m1', { desk_number: 'DD4', status: 'declined' })],
      manualDeskNumbers: [],
    });
    expect(c.takenCount).toBe(0);
  });

  it('keeps counting a cancelled member until they are archived', () => {
    // They're in their notice period — the desk is not re-sellable yet. This
    // matches how the admin seating chart decides who to show.
    const c = summarizeDeskCapacity({
      members: [member('m1', { desk_number: 'DD4', status: 'cancelled' })],
      manualDeskNumbers: [],
    });
    expect(c.takenCount).toBe(1);
  });
});

describe('summarizeDeskCapacity — the full threshold', () => {
  it('is full when all 25 desks are physically occupied', () => {
    const c = summarizeDeskCapacity({
      members: seatedMembers(DESK_COUNT),
      manualDeskNumbers: [],
    });
    expect(c.takenCount).toBe(DESK_COUNT);
    expect(c.remainingCount).toBe(0);
    expect(c.isFull).toBe(true);
    expect(c.availableDesks).toEqual([]);
  });

  it('is full when the last desk is held by a paid member who has not picked', () => {
    // 24 seated + 1 paid member still deciding = 25 spoken for. The one
    // remaining desk is being HELD for that member, so it is still pickable
    // even though nothing more may be sold.
    const c = summarizeDeskCapacity({
      members: [...seatedMembers(DESK_COUNT - 1), member('undecided')],
      manualDeskNumbers: [],
    });
    expect(c.takenCount).toBe(DESK_COUNT);
    expect(c.isFull).toBe(true);
    expect(c.availableDesks).toHaveLength(1);
  });

  it('is not full one seat short', () => {
    const c = summarizeDeskCapacity({
      members: seatedMembers(DESK_COUNT - 1),
      manualDeskNumbers: [],
    });
    expect(c.takenCount).toBe(DESK_COUNT - 1);
    expect(c.remainingCount).toBe(1);
    expect(c.isFull).toBe(false);
  });

  it('never reports negative remaining when oversold', () => {
    const c = summarizeDeskCapacity({
      members: [...seatedMembers(DESK_COUNT), member('extra1'), member('extra2')],
      manualDeskNumbers: [],
    });
    expect(c.takenCount).toBe(DESK_COUNT + 2);
    expect(c.remainingCount).toBe(0);
    expect(c.isFull).toBe(true);
  });
});

describe('summarizeDeskCapacity — the requesting member', () => {
  it('leaves the caller their own desk to re-select', () => {
    const members = [
      member('me', { desk_number: 'DD4' }),
      member('them', { desk_number: 'DD6' }),
    ];
    const c = summarizeDeskCapacity({
      members,
      manualDeskNumbers: [],
      excludeMemberId: 'me',
    });
    expect(c.availableDesks).toContain('DD4');
    expect(c.availableDesks).not.toContain('DD6');
    // Capacity is building-wide and unaffected by who is asking.
    expect(c.takenCount).toBe(2);
  });

  it('does not free a desk that staff also charted manually', () => {
    const c = summarizeDeskCapacity({
      members: [member('me', { desk_number: 'DD4' })],
      manualDeskNumbers: ['DD4'],
      excludeMemberId: 'me',
    });
    expect(c.availableDesks).not.toContain('DD4');
  });
});

// ---------------------------------------------------------------------------
// getDeskCapacity / listAvailableDesks over a stubbed Supabase client
// ---------------------------------------------------------------------------

function makeMockSb(state: {
  members: DeskCapacityMember[];
  manual: Array<{ space_type: string; space_number: string }>;
  // Simulate a database where the archive migration hasn't run: selecting
  // archived_at errors, and only the core columns come back.
  missingArchivedColumn?: boolean;
}) {
  return {
    from: (table: string) => {
      if (table === 'members') {
        return {
          select: (columns: string) => {
            if (state.missingArchivedColumn && columns.includes('archived_at')) {
              return Promise.resolve({
                data: null,
                error: { message: 'column members.archived_at does not exist' },
              });
            }
            return Promise.resolve({ data: state.members, error: null });
          },
        };
      }
      return {
        select: () => ({
          eq: (col: string, val: any) =>
            Promise.resolve({
              data: state.manual.filter((r: any) => r[col] === val),
              error: null,
            }),
        }),
      };
    },
  } as any;
}

describe('getDeskCapacity', () => {
  it('merges both occupancy sources from the database', async () => {
    const sb = makeMockSb({
      members: [member('m1', { desk_number: 'DD4' }), member('m2')],
      manual: [
        { space_type: 'desk', space_number: 'DD6' },
        { space_type: 'office', space_number: '101' },
      ],
    });
    const c = await getDeskCapacity(sb);
    expect(c.claimedDesks).toEqual(['DD4', 'DD6']);
    expect(c.reservedCount).toBe(1);
    expect(c.takenCount).toBe(3);
  });

  it('still reports physical occupancy when the archive migration is missing', async () => {
    const sb = makeMockSb({
      members: [member('m1', { desk_number: 'DD4' })],
      manual: [],
      missingArchivedColumn: true,
    });
    const c = await getDeskCapacity(sb);
    expect(c.claimedDesks).toEqual(['DD4']);
    expect(c.availableDesks).not.toContain('DD4');
  });

  it('listAvailableDesks returns the pickable desks, excluding the caller', async () => {
    const sb = makeMockSb({
      members: [member('me', { desk_number: 'DD4' }), member('them', { desk_number: 'DD6' })],
      manual: [],
    });
    const desks = await listAvailableDesks(sb, { excludeMemberId: 'me' });
    expect(desks).toContain('DD4');
    expect(desks).not.toContain('DD6');
    expect(desks).toHaveLength(DESK_COUNT - 1);
  });
});

// ---------------------------------------------------------------------------
// PRIVATE dedicated desks — desks inside converted private offices
// ---------------------------------------------------------------------------

describe('summarizePrivateDeskCapacity', () => {
  it('reports every private desk free when nobody holds one', () => {
    const c = summarizePrivateDeskCapacity([]);
    expect(c.capacity).toBe(PRIVATE_DESK_COUNT);
    expect(c.takenCount).toBe(0);
    expect(c.remainingCount).toBe(PRIVATE_DESK_COUNT);
    expect(c.isFull).toBe(false);
  });

  it('counts only private-desk members, not floor-desk ones', () => {
    const c = summarizePrivateDeskCapacity([
      member('p1', { designation: 'private_dedicated_desk' }),
      member('floor', { designation: 'dedicated_desk', desk_number: 'DD4' }),
      member('office', { designation: 'private_office_single' }),
    ]);
    expect(c.takenCount).toBe(1);
    expect(c.remainingCount).toBe(PRIVATE_DESK_COUNT - 1);
  });

  it('does not count a private-desk member who has been archived', () => {
    const c = summarizePrivateDeskCapacity([
      member('gone', { designation: 'private_dedicated_desk', archived_at: '2026-01-01' }),
    ]);
    expect(c.takenCount).toBe(0);
  });

  it('keeps counting a cancelled private-desk member until they are archived', () => {
    const c = summarizePrivateDeskCapacity([
      member('leaving', { designation: 'private_dedicated_desk', status: 'cancelled' }),
    ]);
    expect(c.takenCount).toBe(1);
  });

  it('is full once every private desk is held, and never goes negative', () => {
    const holders = Array.from({ length: PRIVATE_DESK_COUNT + 2 }, (_, i) =>
      member(`p${i}`, { designation: 'private_dedicated_desk' }),
    );
    const c = summarizePrivateDeskCapacity(holders);
    expect(c.isFull).toBe(true);
    expect(c.remainingCount).toBe(0);
  });

  it('rides along on the shared-floor summary so one query answers both', () => {
    const c = summarizeDeskCapacity({
      members: [member('p1', { designation: 'private_dedicated_desk' })],
      manualDeskNumbers: [],
    });
    expect(c.privateDesk.takenCount).toBe(1);
    // A private-desk member sits outside the 25 floor desks entirely.
    expect(c.takenCount).toBe(0);
  });
});
