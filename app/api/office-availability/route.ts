// PUBLIC private-office availability — counts only, no names or office numbers.
//
// The membership pages call this so the offices they advertise reflect the
// admin seating chart rather than a number typed into the copy. An office is
// available when neither a portal member nor a manual staff entry claims it
// (see lib/portal/officeAvailability.ts).
//
// Unauthenticated on purpose: it powers public marketing pages. Only aggregate
// numbers are returned, never who sits where.

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { getOfficeAvailability } from '@/lib/portal/officeAvailability';
import { OFFICE_SPACES } from '@/lib/portal/seating';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const availability = await getOfficeAvailability(getServiceSupabase());
    return NextResponse.json({
      capacity: availability.capacity,
      taken: availability.takenCount,
      remaining: availability.remainingCount,
      isFull: availability.isFull,
      // Per-size counts, or null when the floor plan has no sizes recorded —
      // see lib/portal/officeSizes.ts. Null means "say nothing about sizes",
      // never "none free".
      by_size: availability.bySize,
    });
  } catch (e: any) {
    // Never break a marketing page over this. `unavailable` tells the client to
    // say nothing about availability at all rather than to print a wrong
    // number — remaining is null, not 0, so "we don't know" can't be mistaken
    // for "nothing left".
    console.error('Failed to read private-office availability', e);
    return NextResponse.json({
      capacity: OFFICE_SPACES.length,
      taken: null,
      remaining: null,
      isFull: false,
      unavailable: true,
      by_size: null,
    });
  }
}
