// app/api/webhooks/stripe/route.ts
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
  console.log('Processing completed checkout session:', session.id);

  try {
    const bookingId = session.metadata?.booking_id;
    const customerEmail = session.metadata?.customer_email;
    const roomName = session.metadata?.room_name;

    if (!bookingId) {
      console.error('No booking ID found in session metadata');
      return;
    }

    // Update booking status
    const booking = await meetingRoomAPI.updateBookingStatus(bookingId, 'confirmed', 'paid');
    
    // Update with Stripe payment intent ID
    if (session.payment_intent) {
      await meetingRoomAPI.updateBookingPayment(
        bookingId,
        session.id,
        session.payment_intent as string
      );
    }

    // Create Google Calendar event
    try {
      const calendarEventId = await googleCalendarAPI.createBookingEvent(booking);
      if (calendarEventId) {
        await meetingRoomAPI.supabase
          .from('bookings')
          .update({ calendar_event_id: calendarEventId })
          .eq('id', booking.id);
      }
    } catch (calendarError) {
      console.error('Failed to create calendar event:', calendarError);
      // Don't fail the entire process if calendar creation fails
    }

    // Send confirmation emails
    try {
      await sendMemberBookingConfirmationEmail({
        to: booking.customer_email,
        customerName: booking.customer_name,
        booking,
        roomName: roomName || 'Meeting Room',
        isMemberBooking: false,
      });

      // Update confirmation sent status
      await meetingRoomAPI.supabase
        .from('bookings')
        .update({ confirmation_sent: true })
        .eq('id', booking.id);

      console.log('Payment successful, booking confirmed, and emails sent');
    } catch (emailError) {
      console.error('Failed to send confirmation emails:', emailError);
      // Don't fail the entire process if email sending fails
    }

  } catch (error) {
    console.error('Error processing checkout session:', error);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing successful payment intent:', paymentIntent.id);
  
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

    // Ensure booking is marked as paid
    await meetingRoomAPI.updateBookingStatus(booking.id, 'confirmed', 'paid');
    
    console.log('Payment intent processed successfully for booking:', booking.id);
  } catch (error) {
    console.error('Error processing payment intent:', error);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing failed payment intent:', paymentIntent.id);
  
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
    
    console.log('Failed payment processed for booking:', booking.id);
  } catch (error) {
    console.error('Error processing failed payment:', error);
    throw error;
  }
}