// Per-designation booking allowances, read from the tier_allocations table.
//
// The numbers used to be hardcoded — conference hours in
// INCLUDED_MONTHLY_HOURS and a single uniform 4 hr/week flex cap — which meant
// changing one required a deploy. They now live in tier_allocations so they
// can be changed with an UPDATE in the Supabase SQL editor. There is no admin
// UI by design.
//
// The constants below stay as a FALLBACK. If the table is missing (migration
// not yet applied) or the query fails, bookings keep working on the previous
// numbers rather than collapsing to zero and locking every member out of a
// perk they pay for. A degraded read is a bad day; a zero allowance is a
// support queue.
//
// Reset cadence is deliberately not stored: flex resets Monday 00:00 MT and
// conference resets the 1st of the month MT. That is policy, implemented in
// weekly-hours.ts and conference-hours.ts, not a knob.

import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export interface TierAllocation {
  flexHoursPerWeek: number;
  conferenceHoursPerMonth: number;
}

// Mirrors the seed in supabase/migrations/20260820_tier_allocations.sql.
// Keep the two in step: this is what runs when the table can't be read.
export const FALLBACK_ALLOCATIONS: Record<string, TierAllocation> = {
  dedicated_desk: { flexHoursPerWeek: 4, conferenceHoursPerMonth: 4 },
  // The same product in a private room, sold once every shared desk is
  // claimed. Same allowance as a shared desk.
  private_dedicated_desk: { flexHoursPerWeek: 4, conferenceHoursPerMonth: 4 },
  // Single and double are identical by design. Do not differentiate them in
  // logic or in the UI.
  private_office_single: { flexHoursPerWeek: 6, conferenceHoursPerMonth: 14 },
  private_office_double: { flexHoursPerWeek: 6, conferenceHoursPerMonth: 14 },
  private_office_large: { flexHoursPerWeek: 8, conferenceHoursPerMonth: 20 },
  // Day passes include no flex access at all. Their conference time is 1 hr
  // on pass days, granted by DAY_PASS_INCLUDED_HOURS_PER_DAY rather than here.
  one_day_dedicated_desk: { flexHoursPerWeek: 0, conferenceHoursPerMonth: 0 },
  // An office occupant someone else pays for. Their allowance almost always
  // comes from the office pool (the highest among occupants), so this only
  // applies to an office whose paying primary isn't on the portal.
  office_member: { flexHoursPerWeek: 6, conferenceHoursPerMonth: 14 },
  // Comped non-profit access. Zero by design: each arrangement is negotiated
  // individually, so the real hours come from the per-member admin overrides.
  // A partner with no override set gets nothing included and pays the
  // standard overage rate — a safe default rather than a free-for-all.
  community_partner: { flexHoursPerWeek: 0, conferenceHoursPerMonth: 0 },
};

// A designation with no row and no fallback (the retired 'flex' and 'other'
// values, or anything added to members without a matching allocation row) gets
// nothing included — but is still allowed to book at the overage rate, same as
// any member who has spent their allowance.
export const NO_ALLOCATION: TierAllocation = {
  flexHoursPerWeek: 0,
  conferenceHoursPerMonth: 0,
};

type AllocationMap = Record<string, TierAllocation>;

// Serverless instances are short-lived, so this is a per-instance cache with a
// short TTL rather than anything coordinated. Worst case after an edit is that
// one warm instance serves stale numbers for up to CACHE_TTL_MS.
const CACHE_TTL_MS = 60_000;
let cached: { at: number; value: AllocationMap } | null = null;

// Exported for tests, and usable from a script if a row is edited and someone
// wants the change visible immediately.
export function clearAllocationCache(): void {
  cached = null;
}

function coerceHours(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Every designation's allowance, table values layered over the fallbacks.
 *
 * Never throws and never returns an empty map: a failed read logs and returns
 * the fallbacks. A row with a malformed value falls back for that one field
 * rather than poisoning the whole map.
 */
export async function getAllocations(): Promise<AllocationMap> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const merged: AllocationMap = { ...FALLBACK_ALLOCATIONS };

  try {
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('tier_allocations')
      .select('designation, flex_hours_per_week, conference_hours_per_month');

    if (error) throw new Error(error.message);

    for (const row of data || []) {
      const designation = (row as any).designation;
      if (typeof designation !== 'string' || !designation) continue;
      const base = merged[designation] ?? NO_ALLOCATION;
      const flex = coerceHours((row as any).flex_hours_per_week);
      const conference = coerceHours((row as any).conference_hours_per_month);
      merged[designation] = {
        flexHoursPerWeek: flex ?? base.flexHoursPerWeek,
        conferenceHoursPerMonth: conference ?? base.conferenceHoursPerMonth,
      };
    }
  } catch (e) {
    // Deliberately non-fatal — see the note at the top of this file.
    console.error(
      'tier_allocations read failed; falling back to built-in allowances',
      e,
    );
  }

  cached = { at: Date.now(), value: merged };
  return merged;
}

/** One designation's allowance. */
export async function getAllocationFor(
  designation: string | null | undefined,
): Promise<TierAllocation> {
  if (!designation) return NO_ALLOCATION;
  const all = await getAllocations();
  return all[designation] ?? NO_ALLOCATION;
}

/** Flex hours per week for a designation. */
export async function flexHoursPerWeek(
  designation: string | null | undefined,
): Promise<number> {
  return (await getAllocationFor(designation)).flexHoursPerWeek;
}

/** Conference hours per calendar month for a designation. */
export async function conferenceHoursPerMonth(
  designation: string | null | undefined,
): Promise<number> {
  return (await getAllocationFor(designation)).conferenceHoursPerMonth;
}

/**
 * Synchronous allowance lookup against the built-in fallbacks only.
 *
 * For the handful of callers that cannot be async — chiefly the signup email
 * builder, which composes a string inside a synchronous template. Prefer the
 * async helpers everywhere else: they see edits made to tier_allocations,
 * this does not. Callers that can resolve the live number should pass it in
 * rather than relying on this.
 */
export function fallbackConferenceHours(
  designation: string | null | undefined,
): number {
  if (!designation) return 0;
  return (
    FALLBACK_ALLOCATIONS[designation]?.conferenceHoursPerMonth ??
    NO_ALLOCATION.conferenceHoursPerMonth
  );
}
