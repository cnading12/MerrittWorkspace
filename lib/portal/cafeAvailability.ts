// Cafe-membership capacity.
//
// A cafe member has no desk and no seat on the coworking floor, so none of the
// desk math in deskAvailability.ts applies to them. What limits this tier is
// the cafe itself: there are a finite number of seats in the 1905 building, and
// the entire promise of the membership is that one of them is free when a
// member turns up. Oversell it and the product stops being the product.
//
// So the cap is a straight headcount of live cafe members against
// CAFE_MEMBER_LIMIT. "Live" is deliberately generous about when someone starts
// counting and strict about when they stop, for the same reason the desk math
// is: a member who has paid but not yet walked through the door still occupies
// a place, and a cancelled member keeps theirs until they are archived, because
// until then they can still show up.
//
// Unlike a desk, there is nothing to assign — no cafe seat numbers, no picking.
// That is why this file is a counter and deskAvailability.ts is an allocator.

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * How many cafe memberships may be live at once.
 *
 * Set from the cafe's seating rather than from revenue: raising it without
 * adding seating is how the tier starts generating complaints instead of
 * income.
 */
export const CAFE_MEMBER_LIMIT = 15;

/** The minimal member shape the count needs, kept structural for testing. */
export interface CafeCapacityMember {
  id: string;
  designation?: string | null;
  status?: string | null;
  archived_at?: string | null;
}

export interface CafeCapacity {
  /** CAFE_MEMBER_LIMIT — how many may be live at once. */
  capacity: number;
  /** Live cafe members right now. */
  takenCount: number;
  /** Places left to sell, floored at zero. */
  remainingCount: number;
  /** No further cafe memberships may be sold. */
  isFull: boolean;
}

/**
 * Does this member occupy one of the fifteen places?
 *
 * Archived members never do — archiving is what frees a place. Everyone else
 * carrying the designation does, including `cancelled`: a member serving out
 * their notice can still come in and sit down, so their place is not free to
 * resell until they are archived. This mirrors how desk capacity treats a
 * cancelled desk holder.
 */
export function occupiesCafePlace(member: CafeCapacityMember): boolean {
  if (member.designation !== 'cafe_membership') return false;
  if (member.archived_at) return false;
  return true;
}

export function computeCafeCapacity(members: CafeCapacityMember[]): CafeCapacity {
  const takenCount = members.filter(occupiesCafePlace).length;
  return {
    capacity: CAFE_MEMBER_LIMIT,
    takenCount,
    remainingCount: Math.max(0, CAFE_MEMBER_LIMIT - takenCount),
    isFull: takenCount >= CAFE_MEMBER_LIMIT,
  };
}

/**
 * Read cafe capacity from the database.
 *
 * Selects only the columns the count needs, and filters to the designation in
 * the query so a building full of desk members costs nothing to skip.
 */
export async function getCafeCapacity(supabase: SupabaseClient): Promise<CafeCapacity> {
  const { data, error } = await supabase
    .from('members')
    .select('id, designation, status, archived_at')
    .eq('designation', 'cafe_membership');

  if (error) {
    // `archived_at` arrived in a later migration than `members` itself. If it
    // is missing, fall back to counting every cafe row rather than failing:
    // over-counting closes the tier early, which is recoverable, where an
    // exception would take down the marketing pages that call this.
    const { data: fallback, error: fallbackError } = await supabase
      .from('members')
      .select('id, designation, status')
      .eq('designation', 'cafe_membership');
    if (fallbackError) throw fallbackError;
    console.warn(
      'members is missing archived_at — cafe capacity is counting every cafe row, including archived ones. Apply the pending migrations.',
    );
    return computeCafeCapacity((fallback ?? []) as CafeCapacityMember[]);
  }

  return computeCafeCapacity((data ?? []) as CafeCapacityMember[]);
}
