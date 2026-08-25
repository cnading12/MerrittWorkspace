// app/api/create-meeting-checkout/route.ts
//
// CLOSED TO PUBLIC CALLERS.
//
// This endpoint used to accept a `total_amount` from the request body and
// hand back a Stripe Checkout URL for it, with no authentication. Because
// /api/webhooks/meeting-rooms reconstructs the whole reservation from the
// session metadata once payment completes, that let anyone book a conference
// room — at any date, time and duration they chose — for whatever price they
// felt like putting in the JSON.
//
// The session-building logic now lives in lib/bookings/conferenceCheckout.ts,
// which recomputes the amount from the published hourly rate. The two real
// callers (/api/bookings for guests, /api/bookings/member for member overage)
// import it directly instead of fetching this route over HTTP.
//
// The route itself is kept — rather than deleted — so that any stale client
// or bookmarked integration gets an explicit, debuggable 410 instead of a
// confusing 404, and so nothing can quietly start using it again.
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error:
        'This endpoint has been retired. Conference-room checkout is created server-side by /api/bookings (guests) and /api/bookings/member (members).',
    },
    { status: 410 }
  );
}
