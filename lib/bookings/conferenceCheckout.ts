// Server-side creation of the Stripe Checkout session for a conference-room
// booking.
//
// This used to live behind the public POST /api/create-meeting-checkout
// route, which both internal booking routes then called over HTTP. Two
// problems with that:
//
//   1. The charged amount came from the caller's `total_amount` field. Since
//      the route was public and unauthenticated, anyone could mint a checkout
//      session for a four-hour room at $0.01 — and because
//      /api/webhooks/meeting-rooms builds the real booking out of the session
//      metadata on `checkout.session.completed`, paying that session produced
//      a genuine, calendar-held reservation. The price and the booking
//      details were both attacker-controlled.
//   2. The self-`fetch` back into our own deployment was needless indirection
//      that silently breaks whenever NEXT_PUBLIC_BASE_URL is wrong.
//
// Both callers now import this function directly, and the amount is always
// recomputed here from the published hourly rate — never accepted from the
// caller.
import Stripe from 'stripe';
import { HOURLY_RATE_CENTS } from './conference-hours';

export interface ConferenceCheckoutInput {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  company?: string | null;
  roomName?: string | null;
  bookingDate: string;
  startTime: string;
  endTime: string;
  /** Total length of the reservation, used for display only. */
  durationHours: number;
  attendees?: number | null;
  /**
   * Hours actually being charged. For a guest booking this equals
   * `durationHours`; for a member paying overage it is only the portion
   * beyond their included allotment. Always computed by the caller from
   * server-side state — never taken from a request body.
   */
  billedHours: number;
  purpose?: string | null;
  calendarEventId?: string | null;
  idDocumentPath?: string | null;
  memberId?: string | null;
  includedHours?: number | null;
}

export interface ConferenceCheckoutResult {
  sessionId: string;
  url: string | null;
  amountCents: number;
  expiresAt: number | null;
}

export class ConferenceCheckoutError extends Error {}

// Guard rails on the billed duration. A conference booking is hourly and the
// room is not available around the clock, so anything outside this range is a
// malformed or manipulated request rather than a real reservation.
const MAX_BILLABLE_HOURS = 12;

export function conferenceAmountCents(billedHours: number): number {
  if (typeof billedHours !== 'number' || !Number.isFinite(billedHours)) {
    throw new ConferenceCheckoutError('Invalid billed hours');
  }
  if (billedHours <= 0 || billedHours > MAX_BILLABLE_HOURS) {
    throw new ConferenceCheckoutError('Invalid billed hours');
  }
  // Quarter-hour granularity keeps the cents integral at a $25/hr rate.
  const quarters = Math.round(billedHours * 4);
  return Math.round((quarters / 4) * HOURLY_RATE_CENTS);
}

export async function createConferenceCheckoutSession(
  stripe: Stripe,
  input: ConferenceCheckoutInput
): Promise<ConferenceCheckoutResult> {
  if (!input.bookingId || !input.customerName || !input.customerEmail) {
    throw new ConferenceCheckoutError('Missing required booking information');
  }

  const amountCents = conferenceAmountCents(input.billedHours);
  const roomName = input.roomName || 'Conference Room';
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Conference Room - ${roomName}`,
            description: `${new Date(input.bookingDate).toLocaleDateString()} at ${input.startTime} - ${input.endTime} (${input.durationHours} hour${input.durationHours > 1 ? 's' : ''})`,
            metadata: {
              room_name: roomName,
              booking_date: input.bookingDate,
              start_time: input.startTime,
              end_time: input.endTime,
              attendees: input.attendees?.toString() || '1',
              booking_id: input.bookingId,
            },
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${baseUrl}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/member-resources/meeting-rooms?canceled=true`,
    customer_email: input.customerEmail,
    metadata: {
      booking_type: 'meeting_room',
      booking_id: input.bookingId,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone || '',
      company: input.company || '',
      room_name: roomName,
      booking_date: input.bookingDate,
      start_time: input.startTime,
      end_time: input.endTime,
      duration_hours: input.durationHours?.toString() || '1',
      attendees: input.attendees?.toString() || '1',
      total_amount: (amountCents / 100).toString(),
      purpose: input.purpose || '',
      calendar_event_id: input.calendarEventId || '',
      ...(input.idDocumentPath ? { id_document_path: String(input.idDocumentPath) } : {}),
      ...(input.memberId ? { member_id: String(input.memberId) } : {}),
      ...(input.includedHours !== undefined && input.includedHours !== null
        ? { included_hours: String(input.includedHours) }
        : {}),
      billed_hours: String(input.billedHours),
    },
    billing_address_collection: 'required',
    custom_text: {
      submit: {
        message: 'Your conference room will be confirmed after payment!',
      },
    },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
  });

  return {
    sessionId: session.id,
    url: session.url,
    amountCents,
    expiresAt: session.expires_at ?? null,
  };
}
