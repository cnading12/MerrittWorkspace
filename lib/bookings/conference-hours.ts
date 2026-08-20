// Conference-room included-hours policy and usage accounting.
//
// Members get a tiered monthly allotment of free conference-room hours based
// on their membership designation. Hours reset on the 1st of each calendar
// month (Mountain Time). Anything beyond the allotment is billed at the
// hourly rate. Usage is summed from the conference_bookings table.
//
// The per-designation numbers live in the tier_allocations table (see
// lib/bookings/allocations.ts) so they can be changed without a deploy.
//
// Only PEAK hours — weekdays 8:00 AM – 6:00 PM MT — draw on the allotment.
// Evenings, nights and weekends are unlimited and free for every tier; the
// booking routes split a booking with splitPeakHours (lib/bookings/peak.ts)
// before consulting the allotment, and record off-peak hours with
// included_hours = 0 so they never count against a month.
//
// Private offices POOL their hours: an office can have several occupants
// (one paying "primary" member plus any number of $0 "office members"), and
// they all draw from a single per-office allotment — the highest allowance
// among the occupants, in practice the paying primary's. Usage by any
// occupant counts against the shared pool. Members without an office keep
// their personal allotment.
//
// A per-member admin override (members.conference_hours_override) replaces
// all of the above with a fixed personal monthly allotment — used for rare
// special cases like approved non-members who may book the room.

import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { conferenceHoursPerMonth, getAllocations } from '@/lib/bookings/allocations';

const MT_TZ = 'America/Denver';

export const HOURLY_RATE_DOLLARS = 25;
export const HOURLY_RATE_CENTS = 2500;

// One Day Dedicated Desk policy: 1 hour of conference-room time per day,
// only on days the member holds a confirmed day pass, with NO paid overage
// beyond it (the booking route enforces the hard cap).
export const DAY_PASS_INCLUDED_HOURS_PER_DAY = 1;

export function isDayPassDesignation(
  designation: string | null | undefined
): boolean {
  return designation === 'one_day_dedicated_desk';
}

// Monthly allotment for one designation. Async because the numbers come from
// tier_allocations; the underlying read is cached per instance, so calling
// this per member in a loop is cheap.
export async function monthlyIncludedHours(
  designation: string | null | undefined,
): Promise<number> {
  return conferenceHoursPerMonth(designation);
}

// Designations whose hours are pooled per office when the member has an
// office_number. Kept as a local list (rather than importing portal types)
// so this module stays dependency-light for unit tests.
const OFFICE_POOLED_DESIGNATIONS = new Set([
  'private_office_single',
  'private_office_double',
  'private_office_large',
  'office_member',
]);

export function isOfficePooledDesignation(
  designation: string | null | undefined
): boolean {
  return !!designation && OFFICE_POOLED_DESIGNATIONS.has(designation);
}

export interface MonthBounds {
  start: string;
  nextStart: string;
}

// Calendar-month date-string bounds [start, nextStart) for the month
// containing the given plain date (YYYY-MM-DD). booking_date is a plain date,
// so string comparison against these is correct and naturally "resets on
// the 1st".
export function monthBoundsForDate(dateStr: string): MonthBounds {
  const [year, month] = dateStr.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextStart = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  return { start, nextStart };
}

// Current Mountain-Time calendar month as date-string bounds [start, nextStart).
export function denverMonthBounds(now: Date = new Date()): MonthBounds {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MT_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((p) => p.type === 'year')!.value;
  const month = parts.find((p) => p.type === 'month')!.value;
  return monthBoundsForDate(`${year}-${month}-01`);
}

// Today's Mountain-Time calendar date as YYYY-MM-DD.
export function denverTodayIso(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

// Single-day date-string bounds [start, nextStart) for a plain date. Used by
// the day-pass allotment, which resets per DAY instead of per month.
export function dayBoundsForDate(dateStr: string): MonthBounds {
  const [year, month, day] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  const nextStart = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
  return { start: dateStr, nextStart };
}

// Hours one or more members have drawn from the allotment of the given
// calendar month. Every non-cancelled booking dated in that month counts —
// including bookings that haven't happened yet, so future reservations reduce
// the allotment the moment they're made. Only the `included_hours` portion
// counts — billed overage hours don't reduce the allotment. Cancelled
// bookings are excluded so cancelling frees the time. Pass multiple ids to
// sum usage across an office's occupants (the shared pool).
export async function getUsedIncludedHoursForMonth(
  memberId: string | string[],
  bounds: MonthBounds,
): Promise<number> {
  const { start, nextStart } = bounds;
  const memberIds = Array.isArray(memberId) ? memberId : [memberId];
  if (memberIds.length === 0) return 0;
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('conference_bookings')
    .select('included_hours')
    .in('member_id', memberIds)
    .neq('status', 'cancelled')
    .gte('booking_date', start)
    .lt('booking_date', nextStart);
  if (error) throw new Error(`conference-hours query failed: ${error.message}`);
  return (data || []).reduce((sum, row: any) => sum + Number(row.included_hours || 0), 0);
}

export interface HoursSummary {
  included: number; // monthly allotment for this member (or their office)
  used: number; // already drawn (or reserved by future bookings) that month
  remaining: number; // allotment left
  // Present when the allotment is an office-wide shared pool: the hours
  // above belong to the office, not the individual, and every occupant's
  // bookings draw from them.
  pooled?: boolean;
  office_number?: string;
  pool_size?: number; // how many members share the pool
  // Present for day-pass members: the allotment above is per-DAY (for the
  // requested date), and it only exists on days with a confirmed day pass.
  daily?: boolean;
  has_day_pass?: boolean;
}

// Occupants of an office share a canonical key: office numbers are free text
// on the members row, so match them the same way the seating chart does
// (trimmed + uppercased).
function officeKey(raw: string | null | undefined): string | null {
  const v = (raw || '').trim().toUpperCase();
  return v || null;
}

// Everyone currently occupying the given office: the paying primary plus any
// office members. Cancelled/declined/archived members no longer hold a seat
// and are excluded (their historical bookings also stop counting against the
// pool, matching how a freed seat behaves elsewhere).
async function getOfficeOccupants(officeNumber: string): Promise<
  { id: string; designation: string | null }[]
> {
  const key = officeKey(officeNumber);
  if (!key) return [];
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('members')
    .select('id, designation, status, office_number, archived_at')
    .not('office_number', 'is', null);
  if (error) throw new Error(`conference-hours occupants query failed: ${error.message}`);
  return (data || [])
    .filter(
      (m: any) =>
        officeKey(m.office_number) === key &&
        !m.archived_at &&
        m.status !== 'cancelled' &&
        m.status !== 'declined'
    )
    .map((m: any) => ({ id: m.id, designation: m.designation ?? null }));
}

// Allotment summary for the month containing `forDate` (YYYY-MM-DD), or the
// current Mountain-Time month when omitted. When validating a booking, pass
// the booking's date so the check runs against the month the booking actually
// draws from — a reservation two months out competes with the other
// reservations already made for that month, not with this month's usage.
//
// Members with an office (primary or office member) get the office's SHARED
// pool: the allotment comes from the highest-tier occupant (in practice the
// paying primary), and usage sums every occupant's bookings. Everyone else
// keeps their personal allotment.
//
// An admin-set conference_hours_override (members table) beats everything:
// the member gets exactly that many free hours per calendar month as a
// PERSONAL allotment, regardless of designation, day-pass rules, or office
// pooling. It exists for special cases (e.g. approved non-members given
// portal access to book the room) that don't warrant their own designation.
export async function getMemberHoursSummary(
  member: {
    id: string;
    designation: string | null;
    office_number?: string | null;
    conference_hours_override?: number | null;
  },
  forDate?: string | null,
): Promise<HoursSummary> {
  if (member.conference_hours_override != null) {
    const bounds = forDate ? monthBoundsForDate(forDate) : denverMonthBounds();
    const included = Math.max(0, Number(member.conference_hours_override) || 0);
    const used = await getUsedIncludedHoursForMonth(member.id, bounds);
    return { included, used, remaining: Math.max(0, included - used) };
  }

  // Day-pass members: the allotment is per DAY, not per month, and only
  // exists on days the member holds a confirmed day pass. No pass for the
  // date → 0 included hours (and the booking route rejects the booking
  // outright rather than offering billed overage).
  if (isDayPassDesignation(member.designation)) {
    const date = forDate || denverTodayIso();
    const sb = getServiceSupabase();
    const { data: pass, error } = await sb
      .from('day_passes')
      .select('id')
      .eq('member_id', member.id)
      .eq('pass_date', date)
      .eq('status', 'confirmed')
      .maybeSingle();
    if (error) throw new Error(`day-pass lookup failed: ${error.message}`);
    const included = pass ? DAY_PASS_INCLUDED_HOURS_PER_DAY : 0;
    const used = await getUsedIncludedHoursForMonth(member.id, dayBoundsForDate(date));
    return {
      included,
      used,
      remaining: Math.max(0, included - used),
      daily: true,
      has_day_pass: !!pass,
    };
  }

  const bounds = forDate ? monthBoundsForDate(forDate) : denverMonthBounds();

  const officeNumber = member.office_number || null;
  if (officeNumber && isOfficePooledDesignation(member.designation)) {
    let occupants = await getOfficeOccupants(officeNumber);
    // Always include the requesting member, even if the occupants query
    // missed them (e.g. status edge case) — their own bookings must count.
    if (!occupants.some((o) => o.id === member.id)) {
      occupants = [...occupants, { id: member.id, designation: member.designation }];
    }
    // One allocations read for the whole office rather than one per occupant.
    const allocations = await getAllocations();
    const included = Math.max(
      0,
      ...occupants.map(
        (o) =>
          (o.designation && allocations[o.designation]?.conferenceHoursPerMonth) || 0
      )
    );
    const used = await getUsedIncludedHoursForMonth(
      occupants.map((o) => o.id),
      bounds
    );
    return {
      included,
      used,
      remaining: Math.max(0, included - used),
      pooled: true,
      office_number: officeNumber.trim(),
      pool_size: occupants.length,
    };
  }

  const included = await monthlyIncludedHours(member.designation);
  const used = await getUsedIncludedHoursForMonth(member.id, bounds);
  return { included, used, remaining: Math.max(0, included - used) };
}

export interface HoursSplit {
  includedHours: number; // portion of this booking covered by the allotment
  billedHours: number; // portion charged at the hourly rate
  billedCents: number; // billedHours * hourly rate, in cents
}

// Split a requested duration into the free (allotment) portion and the
// billable overage portion, given how much allotment is left.
export function splitDuration(durationHours: number, remainingIncluded: number): HoursSplit {
  const includedHours = Math.max(0, Math.min(durationHours, remainingIncluded));
  const billedHours = Math.max(0, durationHours - includedHours);
  return {
    includedHours,
    billedHours,
    billedCents: Math.round(billedHours * HOURLY_RATE_CENTS),
  };
}
