import { describe, it, expect, vi, beforeEach } from 'vitest';

// Flex-space allowances are per-designation and POOL per office, the same way
// conference hours do. The behaviors worth pinning: an office draws on one
// shared allowance anchored by its highest-tier occupant, a member with no
// office keeps a personal allowance, and overage is prorated by the minute
// rather than rounded up to a full hour.

const queryLog: Array<{ table: string; method: string; args: any[] }> = [];
let resultsByTable: Record<string, { data: any[] | null; error: any; count?: number }> = {};

function chainableQuery(table: string) {
  const q: any = {};
  for (const method of ['select', 'eq', 'neq', 'gte', 'gt', 'lt', 'in', 'not']) {
    q[method] = (...args: any[]) => {
      queryLog.push({ table, method, args });
      return q;
    };
  }
  q.then = (resolve: any) => resolve(resultsByTable[table] ?? { data: [], error: null });
  return q;
}

vi.mock('@/lib/portal/supabaseAdmin', () => ({
  getServiceSupabase: () => ({ from: (table: string) => chainableQuery(table) }),
}));

import {
  getMemberFlexSummary,
  splitFlexDuration,
  FLEX_HOURLY_RATE_CENTS,
  MAX_ACTIVE_FUTURE_BOOKINGS,
  FLEX_OPEN_MINUTES,
  FLEX_CLOSE_MINUTES,
} from '@/lib/bookings/flex-hours';
import { clearAllocationCache } from '@/lib/bookings/allocations';

const setMembers = (rows: any[]) => {
  resultsByTable['members'] = { data: rows, error: null };
};
const setBookings = (rows: any[]) => {
  resultsByTable['flex_bookings'] = { data: rows, error: null };
};

// A Wednesday.
const midweek = new Date('2026-08-19T18:00:00Z');

beforeEach(() => {
  queryLog.length = 0;
  // No tier_allocations rows: everything resolves through the built-in
  // fallbacks, which is the degraded path most worth guarding.
  resultsByTable = { tier_allocations: { data: [], error: null } };
  setMembers([]);
  setBookings([]);
  clearAllocationCache();
});

describe('personal allowance', () => {
  it('gives a dedicated desk 4 hours a week', async () => {
    const s = await getMemberFlexSummary(
      { id: 'm1', designation: 'dedicated_desk', office_number: null },
      midweek,
    );
    expect(s.allowedMinutes).toBe(240);
    expect(s.remainingMinutes).toBe(240);
    expect(s.pooled).toBeUndefined();
  });

  it('gives a day pass none', async () => {
    const s = await getMemberFlexSummary(
      { id: 'm1', designation: 'one_day_dedicated_desk', office_number: null },
      midweek,
    );
    expect(s.allowedMinutes).toBe(0);
  });

  it('counts existing bookings against the week', async () => {
    setBookings([{ duration_minutes: 90 }, { duration_minutes: 60 }]);
    const s = await getMemberFlexSummary(
      { id: 'm1', designation: 'dedicated_desk', office_number: null },
      midweek,
    );
    expect(s.usedMinutes).toBe(150);
    expect(s.remainingMinutes).toBe(90);
  });

  it('never reports negative remaining time', async () => {
    setBookings([{ duration_minutes: 600 }]);
    const s = await getMemberFlexSummary(
      { id: 'm1', designation: 'dedicated_desk', office_number: null },
      midweek,
    );
    expect(s.remainingMinutes).toBe(0);
  });

  it('gives a private dedicated desk a personal allowance, not a pooled one', async () => {
    // Several private-desk members can share one converted office; pooling
    // would make them compete for a single allowance.
    const s = await getMemberFlexSummary(
      { id: 'm1', designation: 'private_dedicated_desk', office_number: '108' },
      midweek,
    );
    expect(s.pooled).toBeUndefined();
    expect(s.allowedMinutes).toBe(240);
  });
});

describe('office pooling', () => {
  const large = { id: 'primary', designation: 'private_office_large', office_number: '110' };

  it('anchors a large office on its 8-hour allowance', async () => {
    setMembers([
      { id: 'primary', designation: 'private_office_large', status: 'active', office_number: '110', archived_at: null },
      { id: 'occ-1', designation: 'office_member', status: 'active', office_number: '110', archived_at: null },
      { id: 'occ-2', designation: 'office_member', status: 'active', office_number: '110', archived_at: null },
    ]);
    const s = await getMemberFlexSummary(large, midweek);
    expect(s).toMatchObject({ allowedMinutes: 480, pooled: true, office_number: '110', pool_size: 3 });
  });

  it('sums every occupant of the office against the shared allowance', async () => {
    setMembers([
      { id: 'primary', designation: 'private_office_large', status: 'active', office_number: '110', archived_at: null },
      { id: 'occ-1', designation: 'office_member', status: 'active', office_number: '110', archived_at: null },
    ]);
    setBookings([{ duration_minutes: 120 }, { duration_minutes: 60 }]);
    const s = await getMemberFlexSummary(large, midweek);
    expect(s.usedMinutes).toBe(180);
    expect(s.remainingMinutes).toBe(300);

    // Usage is queried for the whole office, not just the caller.
    const inCall = queryLog.find((c) => c.table === 'flex_bookings' && c.method === 'in');
    expect(inCall?.args[1]).toEqual(['primary', 'occ-1']);
  });

  it('holds a six-person large office to the same single allowance', async () => {
    setMembers([
      { id: 'primary', designation: 'private_office_large', status: 'active', office_number: '110', archived_at: null },
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `occ-${i}`, designation: 'office_member', status: 'active', office_number: '110', archived_at: null,
      })),
    ]);
    const s = await getMemberFlexSummary(large, midweek);
    expect(s.allowedMinutes).toBe(480);
    expect(s.pool_size).toBe(6);
  });

  it('pools a two-desk office on its 6-hour allowance', async () => {
    setMembers([
      { id: 'primary', designation: 'private_office_double', status: 'active', office_number: '104', archived_at: null },
      { id: 'occ-1', designation: 'office_member', status: 'active', office_number: '104', archived_at: null },
    ]);
    const s = await getMemberFlexSummary(
      { id: 'primary', designation: 'private_office_double', office_number: '104' },
      midweek,
    );
    expect(s).toMatchObject({ allowedMinutes: 360, pooled: true, pool_size: 2 });
  });

  it('gives a single-desk office the same 6 hours as a two-desk office', async () => {
    setMembers([
      { id: 'solo', designation: 'private_office_single', status: 'active', office_number: '101', archived_at: null },
    ]);
    const s = await getMemberFlexSummary(
      { id: 'solo', designation: 'private_office_single', office_number: '101' },
      midweek,
    );
    expect(s.allowedMinutes).toBe(360);
  });

  it('excludes cancelled, declined and archived occupants from the pool', async () => {
    setMembers([
      { id: 'primary', designation: 'private_office_large', status: 'active', office_number: '110', archived_at: null },
      { id: 'gone', designation: 'office_member', status: 'cancelled', office_number: '110', archived_at: null },
      { id: 'nope', designation: 'office_member', status: 'declined', office_number: '110', archived_at: null },
      { id: 'filed', designation: 'office_member', status: 'active', office_number: '110', archived_at: '2026-01-01' },
    ]);
    const s = await getMemberFlexSummary(large, midweek);
    expect(s.pool_size).toBe(1);
  });

  it('matches office numbers case- and whitespace-insensitively', async () => {
    setMembers([
      { id: 'primary', designation: 'private_office_large', status: 'active', office_number: ' 110 ', archived_at: null },
      { id: 'occ-1', designation: 'office_member', status: 'active', office_number: '110', archived_at: null },
    ]);
    const s = await getMemberFlexSummary(large, midweek);
    expect(s.pool_size).toBe(2);
  });

  it('always counts the caller even if the occupants query misses them', async () => {
    setMembers([]);
    const s = await getMemberFlexSummary(large, midweek);
    expect(s).toMatchObject({ allowedMinutes: 480, pool_size: 1 });
  });
});

describe('splitFlexDuration', () => {
  it('is fully included when the allowance covers it', () => {
    expect(splitFlexDuration(120, 240)).toEqual({
      includedMinutes: 120, billedMinutes: 0, billedCents: 0,
    });
  });

  it('splits across the allowance boundary', () => {
    expect(splitFlexDuration(120, 60)).toEqual({
      includedMinutes: 60, billedMinutes: 60, billedCents: FLEX_HOURLY_RATE_CENTS,
    });
  });

  it('prorates a half-hour overage rather than charging a full hour', () => {
    expect(splitFlexDuration(30, 0)).toEqual({
      includedMinutes: 0, billedMinutes: 30, billedCents: 3750,
    });
  });

  it('bills the whole booking when nothing is left', () => {
    expect(splitFlexDuration(240, 0).billedCents).toBe(4 * FLEX_HOURLY_RATE_CENTS);
  });

  it('treats a negative remaining balance as zero', () => {
    expect(splitFlexDuration(60, -30)).toEqual({
      includedMinutes: 0, billedMinutes: 60, billedCents: FLEX_HOURLY_RATE_CENTS,
    });
  });
});

describe('policy constants', () => {
  it('opens the window at 8:00 AM and closes it at 4:00 PM', () => {
    expect(FLEX_OPEN_MINUTES).toBe(8 * 60);
    expect(FLEX_CLOSE_MINUTES).toBe(16 * 60);
  });

  it('caps a member at two future reservations', () => {
    expect(MAX_ACTIVE_FUTURE_BOOKINGS).toBe(2);
  });
});
