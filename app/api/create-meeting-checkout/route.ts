// app/api/create-meeting-checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { meetingRoomAPI } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  try {
    const {
      booking_id,
      customer_name,
      customer_email,
      room_name,
      booking_date,
      start_time,
      end_time,
      duration_hours,
      attendees,
      total_amount,
      purpose
    } = await request.json();

    console.log('🔷 Creating Stripe checkout session for meeting room booking:', {
      booking_id,
      customer: customer_name,
      email: customer_email,
      total: total_amount,
      date: booking_date,
      time: `${start_time} - ${end_time}`
    });

    // Validate required fields
    if (!booking_id || !customer_name || !customer_email || !total_amount) {
      return NextResponse.json(
        { error: 'Missing required booking information' },
        { status: 400 }
      );
    }

    // Verify the booking exists and is still pending
    const booking = await meetingRoomAPI.getBooking(booking_id);
    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: 'Booking is no longer available for payment' },
        { status: 400 }
      );
    }

    // Create line item for Stripe
    const line_items = [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Meeting Room - ${room_name}`,
          description: `${new Date(booking_date).toLocaleDateString()} at ${start_time} - ${end_time} (${duration_hours} hour${duration_hours > 1 ? 's' : ''})`,
          metadata: {
            room_name,
            booking_date,
            start_time,
            end_time,
            attendees: attendees.toString(),
            booking_id
          }
        },
        unit_amount: Math.round(total_amount * 100), // Convert to cents
      },
      quantity: 1,
    }];

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/member-resources/meeting-rooms?canceled=true&booking_id=${booking_id}`,
      customer_email: customer_email,
      metadata: {
        booking_id,
        customer_name,
        customer_email,
        room_name,
        booking_date,
        start_time,
        end_time,
        duration_hours: duration_hours.toString(),
        attendees: attendees.toString(),
        total_amount: total_amount.toString(),
        purpose: purpose || '',
        booking_type: 'meeting_room'
      },
      // Add shipping address collection for business bookings
      billing_address_collection: 'required',
      // Customize the checkout
      custom_text: {
        submit: {
          message: 'Your meeting room will be confirmed after payment!'
        }
      },
      // Set session expiration (30 minutes)
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
    });

    console.log('✅ Stripe checkout session created:', session.id);

    // Update booking with session ID
    try {
      console.log('Updating booking payment info...');
      const updatedBooking = await meetingRoomAPI.updateBookingPayment(booking_id, session.id);
      console.log('Booking updated successfully:', updatedBooking.id);
    } catch (updateError) {
      console.error('Failed to update booking with session ID:', updateError);
      // Don't fail the entire process if update fails - the session is still valid
      console.warn('Continuing with checkout despite update failure');
    }

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url,
      booking_id,
      expires_at: session.expires_at
    });

  } catch (error: any) {
    console.error('❌ Meeting room Stripe checkout error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { 
          error: 'Payment system error',
          details: error.message 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Failed to create payment session',
        details: error.message 
      },
      { status: 500 }
    );
  }
}