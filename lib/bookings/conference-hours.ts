// Conference-room included-hours policy and usage accounting.
//
// Members get a tiered monthly allotment of free conference-room hours based
// on their membership designation. Hours reset on the 1st of each calendar
// month (Mountain Time). Anything beyond the allotment is billed at the
// hourly rate. Usage is summed from the conference_bookings table.

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
  other: 0,
};

export function monthlyIncludedHours(designation: string | null | undefined): number {
  if (!designation) return 0;
  return INCLUDED_MONTHLY_HOURS[designation] ?? 0;
}

// Current Mountain-Time calendar month as date-string bounds [start, nextStart).
// booking_date is a plain date, so string comparison against these is correct
// and naturally "resets on the 1st".
export function denverMonthBounds(now: Date = new Date()): { start: string; nextStart: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MT_TZ,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === 'year')!.value);
  const month = Number(parts.find((p) => p.type === 'month')!.value);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextStart = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;
  return { start, nextStart };
}

// Hours a member has already drawn from this month's allotment. Only the
// `included_hours` portion counts — billed overage hours don't reduce the
// allotment. Cancelled bookings are excluded so cancelling frees the time.
export async function getUsedIncludedHoursThisMonth(
  memberId: string,
  now: Date = new Date(),
): Promise<number> {
  const { start, nextStart } = denverMonthBounds(now);
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('conference_bookings')
    .select('included_hours')
    .eq('member_id', memberId)
    .neq('status', 'cancelled')
    .gte('booking_date', start)
    .lt('booking_date', nextStart);
  if (error) throw new Error(`conference-hours query failed: ${error.message}`);
  return (data || []).reduce((sum, row: any) => sum + Number(row.included_hours || 0), 0);
}

export interface HoursSummary {
  included: number; // monthly allotment for this member
  used: number; // already drawn this month
  remaining: number; // allotment left
}

export async function getMemberHoursSummary(
  member: { id: string; designation: string | null },
  now: Date = new Date(),
): Promise<HoursSummary> {
  const included = monthlyIncludedHours(member.designation);
  const used = await getUsedIncludedHoursThisMonth(member.id, now);
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
