import { NextRequest, NextResponse } from 'next/server';
import { meetingRoomAPI } from '@/lib/supabase';
import { googleCalendarAPI } from '@/lib/google-calendar';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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