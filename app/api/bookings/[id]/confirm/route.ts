// Manual staff override for confirming / cancelling a conference booking.
//
// ADMIN ONLY. Both handlers were previously unauthenticated, which meant
// anyone who knew or guessed a booking id could:
//   • POST — flip that booking to status=confirmed, payment_status=paid and
//     attach any Stripe payment-intent id they liked, i.e. hand themselves a
//     confirmed room and a calendar hold without ever paying; or
//   • DELETE — cancel any other customer's booking and delete their calendar
//     event.
//
// The legitimate paid-booking path is Stripe -> /api/webhooks/meeting-rooms,
// which verifies the webhook signature before marking anything paid. This
// route stays only as a staff escape hatch and now requires an admin session.
import { NextRequest, NextResponse } from 'next/server';
import { meetingRoomAPI } from '@/lib/supabase';
import { googleCalendarAPI } from '@/lib/google-calendar';
import { requireAdmin, PortalError } from '@/lib/portal/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request);

    const bookingId = params.id;
    const { payment_intent_id, session_id } = await request.json();

    // Get the booking
    const booking = await meetingRoomAPI.getBooking(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update booking status to confirmed and paid
    const updatedBooking = await meetingRoomAPI.updateBookingStatus(
      bookingId,
      'confirmed',
      'paid'
    );

    // Update with Stripe payment information
    await meetingRoomAPI.updateBookingPayment(
      bookingId,
      session_id,
      payment_intent_id
    );

    // Create Google Calendar event
    const calendarEventId = await googleCalendarAPI.createBookingEvent(updatedBooking);

    if (calendarEventId) {
      // Update booking with calendar event ID
      await meetingRoomAPI.updateBookingPayment(bookingId, undefined, undefined);
      console.log('Calendar event created:', calendarEventId);
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      calendar_event_created: !!calendarEventId,
      message: 'Booking confirmed successfully'
    });

  } catch (error: any) {
    if (error instanceof PortalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error confirming booking:', error);
    return NextResponse.json(
      { error: 'Failed to confirm booking' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request);

    const bookingId = params.id;

    // Get the booking
    const booking = await meetingRoomAPI.getBooking(bookingId);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update booking status to cancelled
    const updatedBooking = await meetingRoomAPI.updateBookingStatus(
      bookingId,
      'cancelled'
    );

    // Cancel Google Calendar event if it exists
    if (booking.calendar_event_id) {
      await googleCalendarAPI.cancelBookingEvent(booking.calendar_event_id);
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: 'Booking cancelled successfully'
    });

  } catch (error: any) {
    if (error instanceof PortalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}
