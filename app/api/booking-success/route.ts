// app/api/booking-success/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { meetingRoomAPI } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 404 }
      );
    }

    const bookingId = session.metadata?.booking_id;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'No booking ID found in session' },
        { status: 404 }
      );
    }

    // Get booking details with room information
    const { data: bookingData, error: bookingError } = await meetingRoomAPI.supabase
      .from('bookings')
      .select(`
        *,
        meeting_rooms (
          name
        )
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !bookingData) {
      console.error('Error fetching booking:', bookingError);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Format the response
    const booking = {
      id: bookingData.id,
      customer_name: bookingData.customer_name,
      customer_email: bookingData.customer_email,
      booking_date: bookingData.booking_date,
      start_time: bookingData.start_time,
      end_time: bookingData.end_time,
      duration_hours: bookingData.duration_hours,
      total_amount: bookingData.total_amount,
      attendees: bookingData.attendees,
      purpose: bookingData.purpose,
      room_name: bookingData.meeting_rooms?.name || 'Meeting Room',
      is_member_booking: bookingData.is_member_booking,
      status: bookingData.status,
      payment_status: bookingData.payment_status,
    };

    return NextResponse.json({ booking });

  } catch (error) {
    console.error('Booking success API error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Invalid session ID or session expired' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}