// Create this file: app/api/webhooks/meeting-rooms/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { meetingRoomAPI } from '@/lib/supabase';
import { googleCalendarAPI } from '@/lib/google-calendar';
import { sendMemberBookingConfirmationEmail } from '@/lib/resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = headers();
  const sig = headersList.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      
      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('🎯 Processing completed meeting room checkout session:', session.id);

  try {
    const bookingId = session.metadata?.booking_id;
    const bookingType = session.metadata?.booking_type;

    // Only handle meeting room bookings
    if (bookingType !== 'meeting_room') {
      console.log('Not a meeting room booking, skipping...');
      return;
    }

    if (!bookingId) {
      console.error('❌ No booking ID found in session metadata');
      return;
    }

    console.log('📋 Processing paid booking:', bookingId);

    // Get the booking from database
    const booking = await meetingRoomAPI.getBooking(bookingId);
    if (!booking) {
      console.error('❌ Booking not found:', bookingId);
      return;
    }

    console.log('✅ Booking found, updating status...');
    
    // Update booking status
    const updatedBooking = await meetingRoomAPI.updateBookingStatus(bookingId, 'confirmed', 'paid');
    
    // Update with Stripe payment intent ID
    if (session.payment_intent) {
      await meetingRoomAPI.updateBookingPayment(
        bookingId,
        session.id,
        session.payment_intent as string
      );
    }

    console.log('📅 CRITICAL: Creating Google Calendar event for PAID booking...');

    // 🔥 CRITICAL: Create Google Calendar event for manager visibility
    let calendarEventId = null;
    try {
      calendarEventId = await googleCalendarAPI.createBookingEvent(updatedBooking);
      if (calendarEventId) {
        // Update booking with calendar event ID
        await meetingRoomAPI.supabase
          .from('bookings')
          .update({ calendar_event_id: calendarEventId })
          .eq('id', bookingId);
        
        console.log('✅ PAID BOOKING: Google Calendar event created successfully:', calendarEventId);
      } else {
        console.error('⚠️ PAID BOOKING: Failed to create calendar event - returned null');
      }
    } catch (calendarError) {
      console.error('❌ PAID BOOKING: Failed to create calendar event:', calendarError);
      // Don't fail the entire process if calendar creation fails
    }

    console.log('📧 Sending confirmation emails...');

    // Send confirmation emails
    try {
      await sendMemberBookingConfirmationEmail({
        to: updatedBooking.customer_email,
        customerName: updatedBooking.customer_name,
        booking: updatedBooking,
        roomName: session.metadata?.room_name || 'Conference Room',
        isMemberBooking: false, // This is a paid booking
      });

      // Update confirmation sent status
      await meetingRoomAPI.supabase
        .from('bookings')
        .update({ confirmation_sent: true })
        .eq('id', bookingId);

      console.log('✅ PAID BOOKING: Payment successful, booking confirmed, emails sent, and calendar event created');
    } catch (emailError) {
      console.error('❌ Failed to send confirmation emails:', emailError);
      // Don't fail the entire process if email sending fails
    }

  } catch (error) {
    console.error('❌ Error processing meeting room checkout session:', error);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing successful meeting room payment intent:', paymentIntent.id);
  
  try {
    // Find booking by payment intent ID
    const { data: booking, error } = await meetingRoomAPI.supabase
      .from('bookings')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (error || !booking) {
      console.error('Could not find booking for payment intent:', paymentIntent.id);
      return;
    }

    // Ensure booking is marked as paid (should already be done in checkout.session.completed)
    await meetingRoomAPI.updateBookingStatus(booking.id, 'confirmed', 'paid');
    
    console.log('Payment intent processed successfully for booking:', booking.id);
  } catch (error) {
    console.error('Error processing payment intent:', error);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing failed meeting room payment intent:', paymentIntent.id);
  
  try {
    // Find booking by payment intent ID
    const { data: booking, error } = await meetingRoomAPI.supabase
      .from('bookings')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .single();

    if (error || !booking) {
      console.error('Could not find booking for failed payment intent:', paymentIntent.id);
      return;
    }

    // Mark booking as payment failed
    await meetingRoomAPI.updateBookingStatus(booking.id, 'cancelled', 'failed');
    
    // 🔥 CRITICAL: Remove calendar event if payment failed
    if (booking.calendar_event_id) {
      try {
        await googleCalendarAPI.cancelBookingEvent(booking.calendar_event_id);
        console.log('✅ Calendar event cancelled for failed payment:', booking.calendar_event_id);
      } catch (calendarError) {
        console.error('❌ Failed to cancel calendar event:', calendarError);
      }
    }
    
    console.log('Failed payment processed for booking:', booking.id);

  } catch (error) {
    console.error('Error processing failed payment:', error);
    throw error;
  }
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  console.log('Processing expired meeting room checkout session:', session.id);
  
  try {
    const bookingId = session.metadata?.booking_id;
    const bookingType = session.metadata?.booking_type;

    // Only handle meeting room bookings
    if (bookingType !== 'meeting_room' || !bookingId) {
      return;
    }

    // Find the booking
    const booking = await meetingRoomAPI.getBooking(bookingId);
    if (!booking) {
      console.error('Booking not found for expired session:', bookingId);
      return;
    }

    // If booking is still pending, cancel it
    if (booking.status === 'pending') {
      await meetingRoomAPI.updateBookingStatus(bookingId, 'cancelled', 'expired');
      console.log('Cancelled expired booking:', bookingId);
    }

  } catch (error) {
    console.error('Error processing expired checkout session:', error);
    throw error;
  }
}