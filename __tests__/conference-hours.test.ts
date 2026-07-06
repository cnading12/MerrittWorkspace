import { describe, it, expect, vi, beforeEach } from 'vitest';

// Guards the conference-room included-hours accounting in
// lib/bookings/conference-hours.ts. The critical behavior: the allotment is
// checked against the calendar month the BOOKING falls in, so future
// bookings draw down that month's hours the moment they're made and a member
// can't stack free hours past their monthly limit by booking ahead
// (e.g. a dedicated-desk member with 4 included hours booking 8 free hours
// spread over next month).

// Chainable Supabase mock that records the filters applied to the query.
const queryLog: Array<{ method: string; args: any[] }> = [];
let queryResult: { data: any[] | null; error: any } = { data: [], error: null };

function chainableQuery() {
  const q: any = {};
  for (const method of ['select', 'eq', 'neq', 'gte', 'lt']) {
    q[method] = (...args: any[]) => {
      queryLog.push({ method, args });
      return q;
    };
  }
  q.then = (resolve: any) => resolve(queryResult);
  return q;
}

vi.mock('@/lib/portal/supabaseAdmin', () => ({
  getServiceSupabase: () => ({
    from: (table: string) => {
      queryLog.push({ method: 'from', args: [table] });
      return chainableQuery();
    },
  }),
}));

import {
  monthBoundsForDate,
  denverMonthBounds,
  monthlyIncludedHours,
  splitDuration,
  getMemberHoursSummary,
} from '@/lib/bookings/conference-hours';

beforeEach(() => {
  queryLog.length = 0;
  queryResult = { data: [], error: null };
});

describe('monthBoundsForDate', () => {
  it('bounds a mid-month date to its own calendar month', () => {
    expect(monthBoundsForDate('2026-07-06')).toEqual({
      start: '2026-07-01',
      nextStart: '2026-08-01',
    });
  });

  it('bounds a future-month date to THAT month, not the current one', () => {
    expect(monthBoundsForDate('2026-08-15')).toEqual({
      start: '2026-08-01',
      nextStart: '2026-09-01',
    });
  });

  it('rolls December into January of the next year', () => {
    expect(monthBoundsForDate('2026-12-31')).toEqual({
      start: '2026-12-01',
      nextStart: '2027-01-01',
    });
  });
});

describe('denverMonthBounds', () => {
  it('uses the Mountain-Time calendar month', () => {
    // 2026-07-01T02:00Z is still June 30th in Denver (UTC-6).
    expect(denverMonthBounds(new Date('2026-07-01T02:00:00Z'))).toEqual({
      start: '2026-06-01',
      nextStart: '2026-07-01',
    });
    expect(denverMonthBounds(new Date('2026-07-15T18:00:00Z'))).toEqual({
      start: '2026-07-01',
      nextStart: '2026-08-01',
    });
  });
});

describe('getMemberHoursSummary', () => {
  const member = { id: 'mem-1', designation: 'dedicated_desk' };

  function appliedBounds() {
    const gte = queryLog.find((c) => c.method === 'gte');
    const lt = queryLog.find((c) => c.method === 'lt');
    return { start: gte?.args[1], nextStart: lt?.args[1] };
  }

  it('queries the month of the booking date when one is given', async () => {
    await getMemberHoursSummary(member, '2026-08-15');
    expect(appliedBounds()).toEqual({ start: '2026-08-01', nextStart: '2026-09-01' });
  });

  it('counts existing future bookings against that month, capping further free hours', async () => {
    // Member already reserved 4 included hours next month (two future
    // bookings). A dedicated-desk member has a 4-hour allotment, so a new
    // next-month booking has nothing left to draw on.
    queryResult = { data: [{ included_hours: 2 }, { included_hours: 2 }], error: null };
    const summary = await getMemberHoursSummary(member, '2026-08-20');
    expect(summary).toEqual({ included: 4, used: 4, remaining: 0 });

    const split = splitDuration(4, summary.remaining);
    expect(split.includedHours).toBe(0);
    expect(split.billedHours).toBe(4);
  });

  it('a booking month with no usage has the full allotment even if the current month is spent', async () => {
    queryResult = { data: [], error: null };
    const summary = await getMemberHoursSummary(member, '2026-08-05');
    expect(summary).toEqual({ included: 4, used: 0, remaining: 4 });
  });

  it('throws when the usage query fails rather than treating usage as zero', async () => {
    queryResult = { data: null, error: { message: 'boom' } };
    await expect(getMemberHoursSummary(member, '2026-08-05')).rejects.toThrow(/boom/);
  });
});

describe('splitDuration', () => {
  it('splits a booking across the allotment boundary', () => {
    expect(splitDuration(4, 1)).toEqual({ includedHours: 1, billedHours: 3, billedCents: 7500 });
  });

  it('is fully included when the allotment covers it', () => {
    expect(splitDuration(2, 4)).toEqual({ includedHours: 2, billedHours: 0, billedCents: 0 });
  });
});

describe('monthlyIncludedHours', () => {
  it('gives dedicated desk 4 hours and unknown designations none', () => {
    expect(monthlyIncludedHours('dedicated_desk')).toBe(4);
    expect(monthlyIncludedHours('flex')).toBe(0);
    expect(monthlyIncludedHours(null)).toBe(0);
    expect(monthlyIncludedHours('mystery')).toBe(0);
  });
});
