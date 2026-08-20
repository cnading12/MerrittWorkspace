import { describe, it, expect } from 'vitest';
import {
  summarizeOfficeAvailability,
  getOfficeAvailability,
  type OfficeAvailabilityMember,
} from '@/lib/portal/officeAvailability';
import { OFFICE_SPACES } from '@/lib/portal/seating';

// Guards the numbers the public membership pages print for private offices.
// The rule worth protecting: a room is unavailable if ANYONE is in it, whoever
// pays for it — the paying primary, a $0 office member, or a dedicated-desk
// member seated in an office we converted into a desk area. Getting that wrong
// advertises a room that is already full.

function member(
  id: string,
  over: Partial<OfficeAvailabilityMember> = {},
): OfficeAvailabilityMember {
  return { id, status: 'active', office_number: null, archived_at: null, ...over };
}

describe('summarizeOfficeAvailability — occupancy', () => {
  it('reports an empty building as entirely available', () => {
    const a = summarizeOfficeAvailability({ members: [], manualOfficeNumbers: [] });
    expect(a.capacity).toBe(OFFICE_SPACES.length);
    expect(a.takenCount).toBe(0);
    expect(a.remainingCount).toBe(OFFICE_SPACES.length);
    expect(a.availableOffices).toEqual(OFFICE_SPACES);
    expect(a.isFull).toBe(false);
  });

  it('counts offices claimed by portal members', () => {
    const a = summarizeOfficeAvailability({
      members: [member('m1', { office_number: '101' })],
      manualOfficeNumbers: [],
    });
    expect(a.occupiedOffices).toEqual(['101']);
    expect(a.availableOffices).not.toContain('101');
    expect(a.remainingCount).toBe(OFFICE_SPACES.length - 1);
  });

  it('counts offices charted manually for people not on the portal', () => {
    const a = summarizeOfficeAvailability({ members: [], manualOfficeNumbers: ['102'] });
    expect(a.occupiedOffices).toEqual(['102']);
    expect(a.takenCount).toBe(1);
  });

  it('does not double-count an office claimed in both sources', () => {
    const a = summarizeOfficeAvailability({
      members: [member('m1', { office_number: '103' })],
      manualOfficeNumbers: ['103'],
    });
    expect(a.occupiedOffices).toEqual(['103']);
    expect(a.takenCount).toBe(1);
  });

  it('counts a shared office once, not once per occupant', () => {
    // One paying primary plus two $0 office members is still one full room.
    const a = summarizeOfficeAvailability({
      members: [
        member('primary', { office_number: '104' }),
        member('extra-1', { office_number: '104' }),
        member('extra-2', { office_number: '104' }),
      ],
      manualOfficeNumbers: [],
    });
    expect(a.occupiedOffices).toEqual(['104']);
    expect(a.takenCount).toBe(1);
  });

  it('treats an office converted into a dedicated-desk area as unavailable', () => {
    // private_dedicated_desk members pay for a desk, not the room — but the
    // room still cannot be sold as a private office.
    const a = summarizeOfficeAvailability({
      members: [member('desk-member', { office_number: '105' })],
      manualOfficeNumbers: [],
    });
    expect(a.availableOffices).not.toContain('105');
  });

  it('matches office numbers across surrounding whitespace', () => {
    const a = summarizeOfficeAvailability({
      members: [member('m1', { office_number: ' 106 ' })],
      manualOfficeNumbers: [],
    });
    expect(a.occupiedOffices).toEqual(['106']);
  });

  it('does not let a bogus office value consume a real office', () => {
    const a = summarizeOfficeAvailability({
      members: [
        member('typo', { office_number: '999' }),
        member('legacy', { office_number: 'Suite B' }),
        member('blank', { office_number: '' }),
        // 113 does not exist — see seating.ts.
        member('phantom', { office_number: '113' }),
      ],
      manualOfficeNumbers: ['also-bogus'],
    });
    expect(a.takenCount).toBe(0);
    expect(a.remainingCount).toBe(OFFICE_SPACES.length);
  });
});

describe('summarizeOfficeAvailability — who still holds a room', () => {
  it('ignores archived members', () => {
    const a = summarizeOfficeAvailability({
      members: [member('gone', { office_number: '101', archived_at: '2026-01-01' })],
      manualOfficeNumbers: [],
    });
    expect(a.takenCount).toBe(0);
    expect(a.availableOffices).toContain('101');
  });

  it('ignores declined office-member requests', () => {
    const a = summarizeOfficeAvailability({
      members: [member('nope', { office_number: '101', status: 'declined' })],
      manualOfficeNumbers: [],
    });
    expect(a.takenCount).toBe(0);
  });

  it('keeps counting a cancelled member until they are archived', () => {
    // They're in their notice period; the room is not re-sellable yet.
    const a = summarizeOfficeAvailability({
      members: [member('leaving', { office_number: '101', status: 'cancelled' })],
      manualOfficeNumbers: [],
    });
    expect(a.takenCount).toBe(1);
    expect(a.availableOffices).not.toContain('101');
  });
});

describe('summarizeOfficeAvailability — the full threshold', () => {
  it('is full when every office is occupied', () => {
    const a = summarizeOfficeAvailability({
      members: OFFICE_SPACES.map((o, i) => member(`m${i}`, { office_number: o })),
      manualOfficeNumbers: [],
    });
    expect(a.takenCount).toBe(OFFICE_SPACES.length);
    expect(a.remainingCount).toBe(0);
    expect(a.isFull).toBe(true);
  });

  it('is not full one room short', () => {
    const a = summarizeOfficeAvailability({
      members: OFFICE_SPACES.slice(0, -1).map((o, i) => member(`m${i}`, { office_number: o })),
      manualOfficeNumbers: [],
    });
    expect(a.remainingCount).toBe(1);
    expect(a.isFull).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getOfficeAvailability over a stubbed Supabase client
// ---------------------------------------------------------------------------

function makeMockSb(state: {
  members: OfficeAvailabilityMember[];
  manual: Array<{ space_type: string; space_number: string }>;
  // Simulate a database where the archive migration hasn't run.
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

describe('getOfficeAvailability', () => {
  it('merges both occupancy sources from the database', async () => {
    const sb = makeMockSb({
      members: [member('m1', { office_number: '101' })],
      manual: [
        { space_type: 'office', space_number: '102' },
        // Desk rows must not leak into the office count.
        { space_type: 'desk', space_number: 'DD4' },
      ],
    });
    const a = await getOfficeAvailability(sb);
    expect(a.occupiedOffices).toEqual(['101', '102']);
    expect(a.takenCount).toBe(2);
  });

  it('still reports occupancy when the archive migration is missing', async () => {
    const sb = makeMockSb({
      members: [member('m1', { office_number: '101' })],
      manual: [],
      missingArchivedColumn: true,
    });
    const a = await getOfficeAvailability(sb);
    expect(a.occupiedOffices).toEqual(['101']);
    expect(a.availableOffices).not.toContain('101');
  });
});
