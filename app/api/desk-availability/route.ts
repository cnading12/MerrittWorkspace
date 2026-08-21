// PUBLIC dedicated-desk availability — counts only, no names or desk numbers.
//
// The membership pages and the application form call this to decide what to
// offer. While the shared coworking floor still has room they advertise the
// standard $200 dedicated desk. Once every one of the 25 desks is spoken for
// (see lib/portal/deskAvailability.ts for what that means), the floor-plan
// desk can no longer be selected and the $300 PRIVATE dedicated desk — a desk
// in a lockable office we've converted into a dedicated-desk area — is offered
// instead. The private option is deliberately invisible until then.
//
// Unauthenticated on purpose: it powers public marketing pages. Only aggregate
// numbers are returned, never who sits where.

import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { getDeskCapacity } from '@/lib/portal/deskAvailability';
import { DESK_COUNT, PRIVATE_DESK_COUNT } from '@/lib/portal/desks';
import {
  DEDICATED_DESK_MONTHLY_CENTS,
  PRIVATE_DEDICATED_DESK_MONTHLY_CENTS,
} from '@/lib/portal/pricing';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const capacity = await getDeskCapacity(getServiceSupabase());
    return NextResponse.json({
      capacity: capacity.capacity,
      taken: capacity.takenCount,
      remaining: capacity.remainingCount,
      isFull: capacity.isFull,
      dedicated_desk_cents: DEDICATED_DESK_MONTHLY_CENTS,
      private_dedicated_desk_cents: PRIVATE_DEDICATED_DESK_MONTHLY_CENTS,
      private_desk: {
        capacity: capacity.privateDesk.capacity,
        taken: capacity.privateDesk.takenCount,
        remaining: capacity.privateDesk.remainingCount,
        isFull: capacity.privateDesk.isFull,
      },
    });
  } catch (e: any) {
    // Never break a marketing page over this. Failing "not full" keeps the
    // normal $200 desk on offer and keeps the private option hidden, which is
    // the safer of the two wrong answers: staff can still decline an
    // application, but we'd rather not publish the private tier by accident.
    console.error('Failed to read dedicated-desk availability', e);
    return NextResponse.json({
      capacity: DESK_COUNT,
      taken: null,
      remaining: null,
      isFull: false,
      unavailable: true,
      dedicated_desk_cents: DEDICATED_DESK_MONTHLY_CENTS,
      private_dedicated_desk_cents: PRIVATE_DEDICATED_DESK_MONTHLY_CENTS,
      // Nulls, not zeros: the page must be able to tell "we don't know" from
      // "none left" and simply say nothing about counts.
      private_desk: {
        capacity: PRIVATE_DESK_COUNT,
        taken: null,
        remaining: null,
        isFull: false,
      },
    });
  }
}
