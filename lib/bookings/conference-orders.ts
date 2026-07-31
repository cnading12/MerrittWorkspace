// Server-only helper for persisting conference-room bookings.
//
// Called from the member booking route (one-click overage / free bookings)
// and the meeting-rooms Stripe webhook (guest paid + member hosted-checkout
// fallback). Idempotent: unique indexes on the Stripe ids mean a duplicate
// webhook delivery is a no-op rather than a duplicate booking.

import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export interface RecordConferenceBookingInput {
  memberId?: string | null;
  bookingRef: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  company?: string | null;
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  durationHours: number;
  includedHours: number;
  billedHours: number;
  attendees?: number | null;
  purpose?: string | null;
  totalCents: number;
  currency?: string;
  isMemberBooking: boolean;
  paymentStatus: 'included' | 'paid' | 'pending' | 'failed' | 'refunded';
  googleEventId?: string | null;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  paidAt?: string | null;
  // Storage path of the photo ID a guest attached when booking (null for
  // member bookings — their photo_id lives in member_documents).
  idDocumentPath?: string | null;
}

/**
 * Idempotently record a conference-room booking. Returns true when a new row
 * was inserted, false when it already existed (duplicate webhook delivery).
 */
export async function recordConferenceBooking(
  input: RecordConferenceBookingInput,
): Promise<boolean> {
  const sb = getServiceSupabase();

  const row = {
    member_id: input.memberId ?? null,
    booking_ref: input.bookingRef,
    customer_name: input.customerName,
    customer_email: input.customerEmail,
    customer_phone: input.customerPhone ?? null,
    company: input.company ?? null,
    booking_date: input.bookingDate,
    start_time: input.startTime,
    end_time: input.endTime,
    duration_hours: input.durationHours,
    included_hours: input.includedHours,
    billed_hours: input.billedHours,
    attendees: input.attendees ?? null,
    purpose: input.purpose ?? null,
    total_cents: input.totalCents,
    currency: input.currency ?? 'usd',
    is_member_booking: input.isMemberBooking,
    status: 'confirmed' as const,
    payment_status: input.paymentStatus,
    google_event_id: input.googleEventId ?? null,
    stripe_session_id: input.stripeSessionId ?? null,
    stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    id_document_path: input.idDocumentPath ?? null,
    paid_at: input.paidAt ?? (input.paymentStatus === 'pending' ? null : new Date().toISOString()),
  };

  const { error } = await sb.from('conference_bookings').insert(row);

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      console.log('ℹ️ conference_bookings: booking already recorded, skipping', {
        session: row.stripe_session_id,
        pi: row.stripe_payment_intent_id,
      });
      return false;
    }
    console.error('❌ conference_bookings insert failed:', error);
    throw new Error(`Failed to record conference booking: ${error.message}`);
  }

  return true;
}
