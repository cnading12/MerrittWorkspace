import { NextRequest, NextResponse } from 'next/server';
import { meetingRoomAPI } from '@/lib/supabase';
import { googleCalendarAPI } from '@/lib/google-calendar';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const { payment_intent_id, session_id } = await request.json();

    // SECURITY: Require session_id for verification
    if (!session_id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // SECURITY: Verify the Stripe session is valid and paid
    let stripeSession: Stripe.Checkout.Session;
    try {
      stripeSession = await stripe.checkout.sessions.retrieve(session_id);
    } catch {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      );
    }

    // SECURITY: Verify payment was successful
    if (stripeSession.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 403 }
      );
    }

    // SECURITY: Verify this session is for this booking
    if (stripeSession.metadata?.booking_id !== bookingId) {
      return NextResponse.json(
        { error: 'Session does not match booking' },
        { status: 403 }
      );
    }

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

    // TODO: Send confirmation email via Resend
    // await sendBookingConfirmationEmail(updatedBooking);

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      calendar_event_created: !!calendarEventId,
      message: 'Booking confirmed successfully'
    });

  } catch (error) {
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
    const bookingId = params.id;

    // SECURITY: Require admin secret for cancellation
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_API_SECRET;

    if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    // TODO: Send cancellation email via Resend
    // await sendBookingCancellationEmail(updatedBooking);

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      message: 'Booking cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
}