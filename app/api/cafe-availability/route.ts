// PUBLIC cafe-membership availability — a count and nothing else.
//
// The membership pages and the application form call this to decide whether to
// keep offering the tier. It is capped at fifteen places (see
// lib/portal/cafeAvailability.ts), so unlike the desk tiers there is no
// higher-priced fallback to switch to: when it is full, it is closed.
//
// Unauthenticated on purpose — it powers public marketing pages. Aggregate
// numbers only, never who holds a place.

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { getCafeCapacity, CAFE_MEMBER_LIMIT } from '@/lib/portal/cafeAvailability';
import { CAFE_MEMBERSHIP_MONTHLY_CENTS } from '@/lib/portal/pricing';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const capacity = await getCafeCapacity(getServiceSupabase());
    return NextResponse.json({
      capacity: capacity.capacity,
      taken: capacity.takenCount,
      remaining: capacity.remainingCount,
      isFull: capacity.isFull,
      cafe_membership_cents: CAFE_MEMBERSHIP_MONTHLY_CENTS,
    });
  } catch (e: any) {
    // Never break a marketing page over this. Failing "not full" keeps the
    // tier on offer, which is the safer wrong answer: staff can decline an
    // application, but a tier that vanishes because of a database hiccup is a
    // silent loss of every enquiry that arrived while it was down.
    console.error('Failed to read cafe-membership availability', e);
    return NextResponse.json({
      capacity: CAFE_MEMBER_LIMIT,
      // Nulls, not zeros: the page must be able to tell "we don't know" from
      // "none left" and simply say nothing about counts.
      taken: null,
      remaining: null,
      isFull: false,
      unavailable: true,
      cafe_membership_cents: CAFE_MEMBERSHIP_MONTHLY_CENTS,
    });
  }
}
