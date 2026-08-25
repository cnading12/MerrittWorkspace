// Flex-space allowance policy and usage accounting.
//
// Members get a weekly allowance of free flex-space time based on their
// membership designation, sourced from the tier_allocations table so the
// numbers can change without a deploy. The week is Mountain Time, Monday
// 00:00 through the following Monday 00:00 (lib/bookings/weekly-hours.ts).
// Nothing rolls over.
//
// Allowances POOL per office, exactly as conference hours do: every occupant
// of an office draws from one allowance — the highest among them, in practice
// the paying primary's. A member with no office_number keeps a personal
// allowance. See lib/bookings/officePool.ts.
//
// Beyond the allowance, members can still book: the excess is billed at the
// flex hourly rate, mirroring how conference-room overage works. Being out of
// hours limits what is free, not what is possible.
//
// A per-member admin override (members.flex_hours_override) replaces all of
// the above with a fixed personal weekly allowance, and is never pooled. It
// exists for community partners, whose comped access is negotiated
// individually rather than set by a tier.

import { getAllocations, flexHoursPerWeek } from '@/lib/bookings/allocations';
import { getPoolOccupants, poolsPerOffice } from '@/lib/bookings/officePool';
import { getWeeklyMinutes, mountainWeekBounds } from '@/lib/bookings/weekly-hours';

export const FLEX_HOURLY_RATE_DOLLARS = 75;
export const FLEX_HOURLY_RATE_CENTS = 7500;

// A single reservation runs 30 minutes to 4 hours.
export const MIN_BOOKING_MINUTES = 30;
export const MAX_BOOKING_MINUTES = 240;

// A member may hold at most this many future reservations at once, so one
// person can't sit on the calendar weeks ahead and lock everyone else out.
export const MAX_ACTIVE_FUTURE_BOOKINGS = 2;

// Bookable window: weekdays 8:00 AM – 4:00 PM Mountain Time.
//
// The numbers themselves live in lib/hours.ts, which is a dependency-free leaf
// the client components can import; this module reaches the service-role
// Supabase client through its allowance accounting, so it must never be pulled
// into a browser bundle. Re-exported here so the booking policy still has one
// entry point.
export {
  FLEX_OPEN_MINUTES,
  FLEX_CLOSE_MINUTES,
  FLEX_WINDOW_LABEL,
} from '@/lib/hours';

export interface FlexSummary {
  // Weekly allowance in minutes for this member (or their office).
  allowedMinutes: number;
  // Already drawn, including future reservations in the same week.
  usedMinutes: number;
  remainingMinutes: number;
  weekStart: string;
  weekEnd: string;
  // Present when the allowance is an office-wide shared pool.
  pooled?: boolean;
  office_number?: string;
  pool_size?: number;
}

function hoursToMinutes(hours: number): number {
  return Math.max(0, Math.round(hours * 60));
}

/**
 * Weekly flex allowance and usage for a member, for the week containing
 * `target` (defaults to now).
 *
 * When validating a booking, pass the booking's start time so the check runs
 * against the week the booking actually draws from — a reservation three
 * weeks out competes with that week's reservations, not this week's.
 */
export async function getMemberFlexSummary(
  member: {
    id: string;
    designation: string | null;
    office_number?: string | null;
    flex_hours_override?: number | null;
  },
  target: Date = new Date(),
): Promise<FlexSummary> {
  const { start, end } = mountainWeekBounds(target);
  const base = { weekStart: start.toISOString(), weekEnd: end.toISOString() };

  // An admin-set override beats everything: designation allowance and office
  // pooling alike. It is a personal weekly allowance.
  if (member.flex_hours_override != null) {
    const allowedMinutes = hoursToMinutes(Number(member.flex_hours_override) || 0);
    const { minutes: usedMinutes } = await getWeeklyMinutes(member.id, target);
    return {
      ...base,
      allowedMinutes,
      usedMinutes,
      remainingMinutes: Math.max(0, allowedMinutes - usedMinutes),
    };
  }

  if (poolsPerOffice(member)) {
    const officeNumber = member.office_number as string;
    const occupants = await getPoolOccupants(member);
    // One allocations read for the whole office rather than one per occupant.
    const allocations = await getAllocations();
    const allowedHours = Math.max(
      0,
      ...occupants.map(
        (o) => (o.designation && allocations[o.designation]?.flexHoursPerWeek) || 0,
      ),
    );
    const allowedMinutes = hoursToMinutes(allowedHours);
    const { minutes: usedMinutes } = await getWeeklyMinutes(
      occupants.map((o) => o.id),
      target,
    );
    return {
      ...base,
      allowedMinutes,
      usedMinutes,
      remainingMinutes: Math.max(0, allowedMinutes - usedMinutes),
      pooled: true,
      office_number: officeNumber.trim(),
      pool_size: occupants.length,
    };
  }

  const allowedMinutes = hoursToMinutes(await flexHoursPerWeek(member.designation));
  const { minutes: usedMinutes } = await getWeeklyMinutes(member.id, target);
  return {
    ...base,
    allowedMinutes,
    usedMinutes,
    remainingMinutes: Math.max(0, allowedMinutes - usedMinutes),
  };
}

export interface FlexSplit {
  includedMinutes: number; // covered by the weekly allowance
  billedMinutes: number; // charged at the flex hourly rate
  billedCents: number;
}

/**
 * Split a requested duration into its free and billable parts, given how much
 * allowance is left. Overage is prorated by the minute, so a 30-minute
 * overrun costs half an hour's rate rather than a full one.
 */
export function splitFlexDuration(
  durationMinutes: number,
  remainingMinutes: number,
): FlexSplit {
  const includedMinutes = Math.max(
    0,
    Math.min(durationMinutes, Math.max(0, remainingMinutes)),
  );
  const billedMinutes = Math.max(0, durationMinutes - includedMinutes);
  return {
    includedMinutes,
    billedMinutes,
    billedCents: Math.round((billedMinutes / 60) * FLEX_HOURLY_RATE_CENTS),
  };
}

/** How many future reservations a member is already holding. */
export async function countActiveFutureBookings(
  memberId: string,
  now: Date = new Date(),
): Promise<number> {
  const { getServiceSupabase } = await import('@/lib/portal/supabaseAdmin');
  const sb = getServiceSupabase();
  const { count, error } = await sb
    .from('flex_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', memberId)
    .neq('status', 'cancelled')
    .gt('start_time', now.toISOString());
  if (error) throw new Error(`flex future-booking count failed: ${error.message}`);
  return count ?? 0;
}
