// Conference-room included-hours policy and usage accounting.
//
// Members get a tiered monthly allotment of free conference-room hours based
// on their membership designation. Hours reset on the 1st of each calendar
// month (Mountain Time). Anything beyond the allotment is billed at the
// hourly rate. Usage is summed from the conference_bookings table.
//
// Private offices POOL their hours: an office can have several occupants
// (one paying "primary" member plus any number of $0 "office members"), and
// they all draw from a single per-office allotment set by the primary's
// designation (single 8 / double 12 / large 20). Usage by any occupant
// counts against the shared pool. Members without an office keep their
// personal allotment.

import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

const MT_TZ = 'America/Denver';

export const HOURLY_RATE_DOLLARS = 25;
export const HOURLY_RATE_CENTS = 2500;

// Free conference hours per calendar month, by membership designation.
// Tiers chosen by the workspace: dedicated desk 4, private offices 8/12/20.
// Everything else (one-day desk, flex, other) gets none.
export const INCLUDED_MONTHLY_HOURS: Record<string, number> = {
  dedicated_desk: 4,
  private_office_single: 8,
  private_office_double: 12,
  private_office_large: 20,
  one_day_dedicated_desk: 0,
  flex: 0,
  // Office members have no personal allotment — they draw from their
  // office's shared pool (anchored by the primary member's designation).
  office_member: 0,
  other: 0,
};

export function monthlyIncludedHours(designation: string | null | undefined): number {
  if (!designation) return 0;
  return INCLUDED_MONTHLY_HOURS[designation] ?? 0;
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
export async function getMemberHoursSummary(
  member: { id: string; designation: string | null; office_number?: string | null },
  forDate?: string | null,
): Promise<HoursSummary> {
  const bounds = forDate ? monthBoundsForDate(forDate) : denverMonthBounds();

  const officeNumber = member.office_number || null;
  if (officeNumber && isOfficePooledDesignation(member.designation)) {
    let occupants = await getOfficeOccupants(officeNumber);
    // Always include the requesting member, even if the occupants query
    // missed them (e.g. status edge case) — their own bookings must count.
    if (!occupants.some((o) => o.id === member.id)) {
      occupants = [...occupants, { id: member.id, designation: member.designation }];
    }
    const included = Math.max(
      0,
      ...occupants.map((o) => monthlyIncludedHours(o.designation))
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

  const included = monthlyIncludedHours(member.designation);
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
