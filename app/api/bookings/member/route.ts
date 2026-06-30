// app/api/bookings/member/route.ts
//
// Authenticated conference-room booking for portal members.
//
//  GET  → returns the member's monthly included-hours summary (for the UI).
//  POST → books the room. Hours within the member's monthly allotment are
//         free; hours beyond it are billed at $25/hr and auto-charged to the
//         card on file (off-session, one click). Falls back to hosted Stripe
//         Checkout when there's no card on file or the bank requires
//         authentication. Every booking is recorded in conference_bookings.
//
// Guests never reach this route (it requires a portal session). The public
// /api/bookings paid flow is unchanged.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { googleCalendarAPI } from '@/lib/google-calendar';
import { sendMemberBookingConfirmationEmail } from '@/lib/resend';
import {
  getMemberHoursSummary,
  splitDuration,
  HOURLY_RATE_DOLLARS,
} from '@/lib/bookings/conference-hours';
import { recordConferenceBooking } from '@/lib/bookings/conference-orders';
import { ensureStripeCustomer, findDefaultCard } from '@/lib/stripe/savedCard';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

function calculateEndTime(startTime: string, durationHours: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setHours(date.getHours() + durationHours);
  return date.toTimeString().slice(0, 5);
}

export async function GET(req: NextRequest) {
  try {
    const member = await requireMember(req);
    const summary = await getMemberHoursSummary(member);
    return NextResponse.json({
      ...summary,
      hourly_rate: HOURLY_RATE_DOLLARS,
      designation: member.designation,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const member = await requireMember(req);
    const body = await req.json();

    const bookingDate: string = body?.booking_date;
    const startTime: string = body?.start_time;
    const durationHours = Number(body?.duration_hours);
    const attendees = body?.attendees != null ? Number(body.attendees) : null;
    const purpose: string = typeof body?.purpose === 'string' ? body.purpose : '';

    if (!bookingDate || !startTime || !durationHours) {
      return NextResponse.json(
        { error: 'Missing required booking fields (date, time, duration).' },
        { status: 400 },
      );
    }
    if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 4) {
      return NextResponse.json({ error: 'Duration must be between 1 and 4 hours.' }, { status: 400 });
    }

    const endTime = calculateEndTime(startTime, durationHours);

    // Identity comes from the member profile — never re-entered.
    const customerName = `${member.first_name} ${member.last_name}`.trim() || member.email;
    const customerEmail = member.email;

    // Conflict check against the live calendar (source of truth), same as the
    // guest flow.
    const hasConflict = await googleCalendarAPI.checkCalendarConflict(bookingDate, startTime, endTime);
    if (hasConflict) {
      return NextResponse.json(
        { error: 'That time slot is no longer available. Please choose a different time.' },
        { status: 409 },
      );
    }

    // How much of this booking is free vs billable.
    const summary = await getMemberHoursSummary(member);
    const split = splitDuration(durationHours, summary.remaining);
    const bookingRef = `MH-MEMBER-${Date.now()}`;

    // Shape used by the Google Calendar + email helpers.
    const calendarBooking = {
      id: bookingRef,
      room_id: null,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: member.phone || '',
      company: member.company_name || '',
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      duration_hours: durationHours,
      attendees: attendees ?? 1,
      purpose,
      total_amount: split.billedCents / 100,
      status: 'confirmed' as const,
      payment_status: 'completed' as const,
      confirmation_sent: false,
      is_member_booking: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // ---- Fully covered by the allotment: free booking ----
    if (split.billedCents === 0) {
      let calendarEventId: string | null = null;
      try {
        calendarEventId = await googleCalendarAPI.createBookingEvent(calendarBooking as any);
        if (!calendarEventId) throw new Error('Calendar event creation returned null');
      } catch (calErr) {
        console.error('❌ member booking: calendar event failed:', calErr);
        return NextResponse.json(
          { error: 'Failed to create the calendar event. Please try again or contact support.' },
          { status: 500 },
        );
      }

      try {
        await recordConferenceBooking({
          memberId: member.id,
          bookingRef,
          customerName,
          customerEmail,
          customerPhone: member.phone,
          company: member.company_name,
          bookingDate,
          startTime,
          endTime,
          durationHours,
          includedHours: split.includedHours,
          billedHours: 0,
          attendees,
          purpose,
          totalCents: 0,
          isMemberBooking: true,
          paymentStatus: 'included',
          googleEventId: calendarEventId,
        });
      } catch (dbErr) {
        console.error('⚠️ member booking: failed to record (continuing):', dbErr);
      }

      try {
        await sendMemberBookingConfirmationEmail({
          to: customerEmail,
          customerName,
          booking: calendarBooking as any,
          roomName: 'Conference Room',
          isMemberBooking: true,
          memberHoursUsed: split.includedHours,
          remainingHours: Math.max(0, summary.remaining - split.includedHours),
        });
      } catch (emailErr) {
        console.error('⚠️ member booking: email failed (continuing):', emailErr);
      }

      const encoded = Buffer.from(
        JSON.stringify({
          ...calendarBooking,
          calendar_event_created: true,
          calendar_event_id: calendarEventId,
        }),
      ).toString('base64');

      return NextResponse.json({
        success: true,
        free: true,
        redirect_to: `/booking-success/member?data=${encoded}`,
        booking: { id: bookingRef, included_hours: split.includedHours, billed_hours: 0 },
      });
    }

    // ---- Overage: part (or all) of the booking is billable ----
    // Hold the slot first so we never charge for a slot we couldn't reserve.
    let calendarEventId: string | null = null;
    try {
      calendarEventId = await googleCalendarAPI.createBookingEvent(calendarBooking as any);
      if (!calendarEventId) throw new Error('Calendar event creation returned null');
    } catch (calErr) {
      console.error('❌ member booking (overage): calendar event failed:', calErr);
      return NextResponse.json(
        { error: 'Failed to create the calendar event. Please try again or contact support.' },
        { status: 500 },
      );
    }

    const customerId = await ensureStripeCustomer(stripe, {
      id: member.id,
      email: member.email,
      first_name: member.first_name,
      last_name: member.last_name,
      stripe_customer_id: member.stripe_customer_id,
    });
    const paymentMethodId = await findDefaultCard(stripe, customerId);

    // Try a one-click off-session charge when a card is on file.
    if (paymentMethodId) {
      try {
        const pi = await stripe.paymentIntents.create({
          amount: split.billedCents,
          currency: 'usd',
          customer: customerId,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
          receipt_email: customerEmail,
          description: `Conference room overage — ${bookingRef} (${split.billedHours}h @ $${HOURLY_RATE_DOLLARS})`,
          metadata: {
            booking_type: 'meeting_room',
            booking_id: bookingRef,
            member_id: member.id,
            included_hours: String(split.includedHours),
            billed_hours: String(split.billedHours),
            calendar_event_id: calendarEventId,
          },
        });

        if (pi.status === 'succeeded') {
          try {
            await recordConferenceBooking({
              memberId: member.id,
              bookingRef,
              customerName,
              customerEmail,
              customerPhone: member.phone,
              company: member.company_name,
              bookingDate,
              startTime,
              endTime,
              durationHours,
              includedHours: split.includedHours,
              billedHours: split.billedHours,
              attendees,
              purpose,
              totalCents: split.billedCents,
              isMemberBooking: true,
              paymentStatus: 'paid',
              googleEventId: calendarEventId,
              stripePaymentIntentId: pi.id,
            });
          } catch (dbErr) {
            console.error('⚠️ member booking (overage): failed to record (continuing):', dbErr);
          }

          try {
            await sendMemberBookingConfirmationEmail({
              to: customerEmail,
              customerName,
              booking: calendarBooking as any,
              roomName: 'Conference Room',
              isMemberBooking: true,
              memberHoursUsed: split.includedHours,
              remainingHours: 0,
            });
          } catch (emailErr) {
            console.error('⚠️ member booking (overage): email failed (continuing):', emailErr);
          }

          return NextResponse.json({
            success: true,
            charged: true,
            charged_cents: split.billedCents,
            included_hours: split.includedHours,
            billed_hours: split.billedHours,
            booking: { id: bookingRef },
          });
        }

        // Anything other than success on a confirm:true intent → fall back.
        console.warn('member booking (overage): PI not succeeded, status:', pi.status);
      } catch (err: any) {
        if (err?.code === 'authentication_required') {
          // Hand off to hosted Checkout (below) where 3DS can be completed.
        } else if (err instanceof Stripe.errors.StripeCardError) {
          await googleCalendarAPI.cancelBookingEvent(calendarEventId);
          return NextResponse.json(
            { error: err.message || 'Your card was declined. Please try another card.' },
            { status: 402 },
          );
        } else {
          await googleCalendarAPI.cancelBookingEvent(calendarEventId);
          throw err;
        }
      }
    }

    // ---- Hosted Checkout fallback (no card on file, or auth required) ----
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const checkoutRes = await fetch(`${baseUrl}/api/create-meeting-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        booking_id: bookingRef,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: member.phone || '',
        company: member.company_name || '',
        room_name: 'Conference Room',
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        duration_hours: durationHours,
        attendees: attendees ?? 1,
        total_amount: split.billedCents / 100,
        purpose,
        calendar_event_id: calendarEventId,
        member_id: member.id,
        included_hours: split.includedHours,
        billed_hours: split.billedHours,
      }),
    });

    if (!checkoutRes.ok) {
      await googleCalendarAPI.cancelBookingEvent(calendarEventId);
      const errData = await checkoutRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData.error || 'Failed to start checkout for the overage charge.' },
        { status: 500 },
      );
    }

    const checkoutData = await checkoutRes.json();
    return NextResponse.json({
      success: true,
      requires_checkout: true,
      checkout_url: checkoutData.url,
      included_hours: split.includedHours,
      billed_hours: split.billedHours,
      charged_cents: split.billedCents,
    });
  } catch (e: any) {
    if (e instanceof PortalError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('❌ member booking error:', e);
    return NextResponse.json(
      { error: 'Failed to create booking. Please try again.', details: e?.message },
      { status: 500 },
    );
  }
}
