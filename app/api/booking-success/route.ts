// app/api/booking-success/route.ts - Works without database
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
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

    // Extract booking details from session metadata
    const {
      booking_id,
      customer_name,
      customer_email,
      customer_phone,
      company,
      room_name,
      booking_date,
      start_time,
      end_time,
      duration_hours,
      attendees,
      total_amount,
      purpose
    } = session.metadata || {};

    if (!booking_id || !customer_name || !customer_email) {
      return NextResponse.json(
        { error: 'Missing booking information in session' },
        { status: 404 }
      );
    }

    // Format the response with booking details from Stripe metadata
    const booking = {
      id: booking_id,
      customer_name,
      customer_email,
      customer_phone: customer_phone || '',
      company: company || '',
      booking_date,
      start_time,
      end_time,
      duration_hours: parseInt(duration_hours || '1'),
      total_amount: parseFloat(total_amount || '0'),
      attendees: parseInt(attendees || '1'),
      purpose: purpose || '',
      room_name: room_name || 'Conference Room',
      is_member_booking: false,
      status: 'confirmed',
      payment_status: 'paid',
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