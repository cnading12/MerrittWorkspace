import { describe, it, expect, vi, beforeEach } from 'vitest';

// Guards the conference-room included-hours accounting in
// lib/bookings/conference-hours.ts. The critical behaviors:
//   • The allotment is checked against the calendar month the BOOKING falls
//     in, so future bookings draw down that month's hours the moment they're
//     made and a member can't stack free hours past their monthly limit by
//     booking ahead (e.g. a dedicated-desk member with 4 included hours
//     booking 8 free hours spread over next month).
//   • Private-office hours are POOLED: every occupant of an office (the
//     paying primary plus any $0 office members) draws from one shared
//     allotment anchored by the primary's designation.

// Chainable Supabase mock that records the filters applied to each query and
// returns a per-table result.
const queryLog: Array<{ table?: string; method: string; args: any[] }> = [];
let resultsByTable: Record<string, { data: any[] | null; error: any }> = {};

function chainableQuery(table: string) {
  const q: any = {};
  for (const method of ['select', 'eq', 'neq', 'gte', 'lt', 'in', 'not']) {
    q[method] = (...args: any[]) => {
      queryLog.push({ table, method, args });
      return q;
    };
  }
  q.then = (resolve: any) =>
    resolve(resultsByTable[table] ?? { data: [], error: null });
  q.maybeSingle = async () => {
    queryLog.push({ table, method: 'maybeSingle', args: [] });
    const res = resultsByTable[table] ?? { data: [], error: null };
    return {
      data: Array.isArray(res.data) ? res.data[0] ?? null : res.data,
      error: res.error,
    };
  };
  return q;
}

vi.mock('@/lib/portal/supabaseAdmin', () => ({
  getServiceSupabase: () => ({
    from: (table: string) => {
      queryLog.push({ method: 'from', args: [table] });
      return chainableQuery(table);
    },
  }),
}));

import {
  monthBoundsForDate,
  dayBoundsForDate,
  denverMonthBounds,
  monthlyIncludedHours,
  isOfficePooledDesignation,
  isDayPassDesignation,
  splitDuration,
  getMemberHoursSummary,
} from '@/lib/bookings/conference-hours';

beforeEach(() => {
  queryLog.length = 0;
  resultsByTable = {};
});

function setBookings(rows: any[] | null, error: any = null) {
  resultsByTable['conference_bookings'] = { data: rows, error };
}
function setMembers(rows: any[] | null, error: any = null) {
  resultsByTable['members'] = { data: rows, error };
}
function setDayPasses(rows: any[] | null, error: any = null) {
  resultsByTable['day_passes'] = { data: rows, error };
}

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

describe('getMemberHoursSummary (personal allotment)', () => {
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
    setBookings([{ included_hours: 2 }, { included_hours: 2 }]);
    const summary = await getMemberHoursSummary(member, '2026-08-20');
    expect(summary).toEqual({ included: 4, used: 4, remaining: 0 });

    const split = splitDuration(4, summary.remaining);
    expect(split.includedHours).toBe(0);
    expect(split.billedHours).toBe(4);
  });

  it('a booking month with no usage has the full allotment even if the current month is spent', async () => {
    setBookings([]);
    const summary = await getMemberHoursSummary(member, '2026-08-05');
    expect(summary).toEqual({ included: 4, used: 0, remaining: 4 });
  });

  it('throws when the usage query fails rather than treating usage as zero', async () => {
    setBookings(null, { message: 'boom' });
    await expect(getMemberHoursSummary(member, '2026-08-05')).rejects.toThrow(/boom/);
  });
});

describe('getMemberHoursSummary (admin conference_hours_override)', () => {
  // Special-case accounts (e.g. approved non-members given portal access to
  // book the room) get an explicit per-member monthly allotment instead of a
  // new designation. The override is a PERSONAL monthly allotment that beats
  // designation, day-pass rules, and office pooling.

  it('grants free hours to a designation that normally has none', async () => {
    setBookings([]);
    const summary = await getMemberHoursSummary(
      { id: 'mem-guest', designation: 'other', conference_hours_override: 4 },
      '2026-08-05'
    );
    expect(summary).toEqual({ included: 4, used: 0, remaining: 4 });
  });

  it('works with no designation at all and counts monthly usage', async () => {
    setBookings([{ included_hours: 3 }]);
    const summary = await getMemberHoursSummary(
      { id: 'mem-guest', designation: null, conference_hours_override: 4 },
      '2026-08-05'
    );
    expect(summary).toEqual({ included: 4, used: 3, remaining: 1 });
  });

  it('beats the day-pass daily rules — monthly allotment, no pass required', async () => {
    setBookings([]);
    const summary = await getMemberHoursSummary(
      { id: 'mem-day', designation: 'one_day_dedicated_desk', conference_hours_override: 2 },
      '2026-07-15'
    );
    // No daily/has_day_pass flags → the booking route treats it as a normal
    // monthly allotment instead of enforcing the day-pass hard cap.
    expect(summary).toEqual({ included: 2, used: 0, remaining: 2 });
  });

  it('beats office pooling — the override is personal', async () => {
    setBookings([]);
    const summary = await getMemberHoursSummary(
      {
        id: 'mem-omar',
        designation: 'office_member',
        office_number: '110',
        conference_hours_override: 6,
      },
      '2026-08-05'
    );
    expect(summary).toEqual({ included: 6, used: 0, remaining: 6 });
  });

  it('an explicit 0 means zero free hours even for a designation with an allotment', async () => {
    setBookings([]);
    const summary = await getMemberHoursSummary(
      { id: 'mem-1', designation: 'dedicated_desk', conference_hours_override: 0 },
      '2026-08-05'
    );
    expect(summary).toEqual({ included: 0, used: 0, remaining: 0 });
  });

  it('null override falls through to the designation-based allotment', async () => {
    setBookings([]);
    const summary = await getMemberHoursSummary(
      { id: 'mem-1', designation: 'dedicated_desk', conference_hours_override: null },
      '2026-08-05'
    );
    expect(summary).toEqual({ included: 4, used: 0, remaining: 4 });
  });

  it('checks usage against the month of the booking date', async () => {
    setBookings([]);
    await getMemberHoursSummary(
      { id: 'mem-guest', designation: 'other', conference_hours_override: 4 },
      '2026-08-15'
    );
    const gte = queryLog.find((c) => c.table === 'conference_bookings' && c.method === 'gte');
    const lt = queryLog.find((c) => c.table === 'conference_bookings' && c.method === 'lt');
    expect(gte?.args[1]).toBe('2026-08-01');
    expect(lt?.args[1]).toBe('2026-09-01');
  });
});

describe('getMemberHoursSummary (office shared pool)', () => {
  // Office 110: Priya pays for a large office (20 hrs), Omar and Nia are
  // $0 office members inside it.
  const primary = {
    id: 'mem-priya',
    designation: 'private_office_large',
    office_number: '110',
  };
  const officeMember = {
    id: 'mem-omar',
    designation: 'office_member',
    office_number: '110',
  };

  function occupantRows() {
    return [
      { id: 'mem-priya', designation: 'private_office_large', status: 'active', office_number: '110', archived_at: null },
      { id: 'mem-omar', designation: 'office_member', status: 'active', office_number: ' 110 ', archived_at: null },
      { id: 'mem-nia', designation: 'office_member', status: 'active', office_number: '110', archived_at: null },
      // Different office — must not join the pool.
      { id: 'mem-other', designation: 'private_office_single', status: 'active', office_number: '104', archived_at: null },
      // Former occupant — no longer holds a seat.
      { id: 'mem-gone', designation: 'office_member', status: 'cancelled', office_number: '110', archived_at: null },
    ];
  }

  it('an office member draws from the office allotment set by the primary', async () => {
    setMembers(occupantRows());
    setBookings([]);
    const summary = await getMemberHoursSummary(officeMember, '2026-08-05');
    expect(summary).toMatchObject({
      included: 20,
      used: 0,
      remaining: 20,
      pooled: true,
      office_number: '110',
      pool_size: 3,
    });
  });

  it("sums every occupant's bookings against the shared pool", async () => {
    setMembers(occupantRows());
    // Usage across the pool: primary 8h + office member 4h = 12h used.
    setBookings([{ included_hours: 8 }, { included_hours: 4 }]);
    const summary = await getMemberHoursSummary(primary, '2026-08-05');
    expect(summary).toMatchObject({ included: 20, used: 12, remaining: 8, pooled: true });

    // The usage query must cover ALL current occupants — not just the caller.
    const inCall = queryLog.find(
      (c) => c.table === 'conference_bookings' && c.method === 'in'
    );
    expect(inCall?.args[1]).toEqual(
      expect.arrayContaining(['mem-priya', 'mem-omar', 'mem-nia'])
    );
    expect(inCall?.args[1]).not.toContain('mem-other');
    expect(inCall?.args[1]).not.toContain('mem-gone');
  });

  it('an office member with no primary on the portal has a 0-hour pool (paid booking still possible)', async () => {
    setMembers([
      { id: 'mem-omar', designation: 'office_member', status: 'active', office_number: '110', archived_at: null },
    ]);
    setBookings([]);
    const summary = await getMemberHoursSummary(officeMember, '2026-08-05');
    expect(summary).toMatchObject({ included: 0, used: 0, remaining: 0, pooled: true });
  });

  it('members without an office number keep their personal allotment', async () => {
    setBookings([]);
    const summary = await getMemberHoursSummary(
      { id: 'mem-solo', designation: 'private_office_single', office_number: null },
      '2026-08-05'
    );
    expect(summary).toEqual({ included: 8, used: 0, remaining: 8 });
  });

  it('always counts the requesting member in the pool even if the occupants query misses them', async () => {
    setMembers([]);
    setBookings([{ included_hours: 3 }]);
    const summary = await getMemberHoursSummary(primary, '2026-08-05');
    // Pool falls back to the caller: their own designation anchors the
    // allotment and their own bookings still count.
    expect(summary).toMatchObject({ included: 20, used: 3, remaining: 17, pool_size: 1 });
  });
});

describe('getMemberHoursSummary (day-pass daily allotment)', () => {
  // One Day Dedicated Desk members: 1 included hour per day, only on days
  // they hold a confirmed pass, checked against that DAY's bookings rather
  // than a monthly pool.
  const dayPassMember = { id: 'mem-day', designation: 'one_day_dedicated_desk' };

  it('grants 1 hour on a day with a confirmed pass', async () => {
    setDayPasses([{ id: 'pass-1' }]);
    setBookings([]);
    const summary = await getMemberHoursSummary(dayPassMember, '2026-07-15');
    expect(summary).toEqual({
      included: 1,
      used: 0,
      remaining: 1,
      daily: true,
      has_day_pass: true,
    });
  });

  it('grants nothing on a day without a pass', async () => {
    setDayPasses([]);
    setBookings([]);
    const summary = await getMemberHoursSummary(dayPassMember, '2026-07-15');
    expect(summary).toEqual({
      included: 0,
      used: 0,
      remaining: 0,
      daily: true,
      has_day_pass: false,
    });
  });

  it("counts that day's existing booking against the daily hour", async () => {
    setDayPasses([{ id: 'pass-1' }]);
    setBookings([{ included_hours: 1 }]);
    const summary = await getMemberHoursSummary(dayPassMember, '2026-07-15');
    expect(summary).toMatchObject({ included: 1, used: 1, remaining: 0 });
  });

  it('queries usage bounded to the single booking day, not the month', async () => {
    setDayPasses([{ id: 'pass-1' }]);
    setBookings([]);
    await getMemberHoursSummary(dayPassMember, '2026-07-31');
    const gte = queryLog.find((c) => c.table === 'conference_bookings' && c.method === 'gte');
    const lt = queryLog.find((c) => c.table === 'conference_bookings' && c.method === 'lt');
    expect(gte?.args[1]).toBe('2026-07-31');
    expect(lt?.args[1]).toBe('2026-08-01');
  });

  it('throws when the pass lookup fails rather than assuming no pass', async () => {
    setDayPasses(null, { message: 'pass boom' });
    await expect(getMemberHoursSummary(dayPassMember, '2026-07-15')).rejects.toThrow(/pass boom/);
  });
});

describe('dayBoundsForDate', () => {
  it('bounds a date to itself and the next day, across month ends', () => {
    expect(dayBoundsForDate('2026-07-15')).toEqual({ start: '2026-07-15', nextStart: '2026-07-16' });
    expect(dayBoundsForDate('2026-07-31')).toEqual({ start: '2026-07-31', nextStart: '2026-08-01' });
    expect(dayBoundsForDate('2026-12-31')).toEqual({ start: '2026-12-31', nextStart: '2027-01-01' });
  });
});

describe('isDayPassDesignation', () => {
  it('matches only the one-day desk designation', () => {
    expect(isDayPassDesignation('one_day_dedicated_desk')).toBe(true);
    expect(isDayPassDesignation('dedicated_desk')).toBe(false);
    expect(isDayPassDesignation(null)).toBe(false);
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

  it('gives office members no personal hours — theirs come from the office pool', () => {
    expect(monthlyIncludedHours('office_member')).toBe(0);
  });
});

describe('isOfficePooledDesignation', () => {
  it('pools private offices and office members, nothing else', () => {
    expect(isOfficePooledDesignation('private_office_large')).toBe(true);
    expect(isOfficePooledDesignation('office_member')).toBe(true);
    expect(isOfficePooledDesignation('dedicated_desk')).toBe(false);
    expect(isOfficePooledDesignation(null)).toBe(false);
  });
});
