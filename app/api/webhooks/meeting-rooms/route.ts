// app/api/webhooks/meeting-rooms/route.ts - NO DATABASE VERSION
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { googleCalendarAPI } from '@/lib/google-calendar';
import { sendMemberBookingConfirmationEmail } from '@/lib/resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
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
    const bookingType = session.metadata?.booking_type;

    // Only handle meeting room bookings
    if (bookingType !== 'meeting_room') {
      console.log('Not a meeting room booking, skipping...');
      return;
    }

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
      purpose,
      calendar_event_id
    } = session.metadata || {};

    if (!booking_id || !customer_email) {
      console.error('❌ Missing required booking data in session metadata');
      return;
    }

    console.log('✅ Payment successful for booking:', booking_id);

    // Create booking object from metadata
    const booking = {
      id: booking_id,
      customer_name: customer_name || '',
      customer_email,
      customer_phone: customer_phone || '',
      company: company || '',
      booking_date: booking_date || '',
      start_time: start_time || '',
      end_time: end_time || '',
      duration_hours: parseInt(duration_hours || '1'),
      attendees: parseInt(attendees || '1'),
      purpose: purpose || '',
      total_amount: parseFloat(total_amount || '0'),
      is_member_booking: false,
      status: 'confirmed' as const,
      payment_status: 'paid' as const
    };

    // Update the calendar event to mark as paid
    if (calendar_event_id) {
      console.log('📅 Updating calendar event to mark as PAID:', calendar_event_id);
      try {
        await googleCalendarAPI.updateBookingEvent(calendar_event_id, booking);
        console.log('✅ Calendar event updated to PAID status');
      } catch (calendarError) {
        console.error('⚠️ Failed to update calendar event:', calendarError);
      }
    }

    // Send confirmation emails
    console.log('📧 Sending confirmation emails for PAID booking...');
    try {
      await sendMemberBookingConfirmationEmail({
        to: customer_email,
        customerName: customer_name || 'Customer',
        booking: booking as any,
        roomName: room_name || 'Conference Room',
        isMemberBooking: false,
        memberHoursUsed: 0
      });
      console.log('✅ Confirmation emails sent successfully');
    } catch (emailError) {
      console.error('⚠️ Failed to send confirmation emails:', emailError);
    }

    console.log('✅✅✅ PAID BOOKING COMPLETE: Payment confirmed, calendar updated, emails sent');

  } catch (error) {
    console.error('❌ Error processing checkout session:', error);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('Processing failed payment intent:', paymentIntent.id);

  try {
    // Get session with this payment intent
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntent.id,
      limit: 1
    });

    if (sessions.data.length === 0) {
      console.log('No session found for failed payment intent');
      return;
    }

    const session = sessions.data[0];
    const calendarEventId = session.metadata?.calendar_event_id;

    if (calendarEventId) {
      console.log('🗑️ Cancelling calendar event due to failed payment:', calendarEventId);
      await googleCalendarAPI.cancelBookingEvent(calendarEventId);
      console.log('✅ Calendar event cancelled for failed payment');
    }

    console.log('Failed payment processed for session:', session.id);

  } catch (error) {
    console.error('Error processing failed payment:', error);
    throw error;
  }
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  console.log('Processing expired checkout session:', session.id);

  try {
    const bookingType = session.metadata?.booking_type;

    // Only handle meeting room bookings
    if (bookingType !== 'meeting_room') {
      return;
    }

    const calendarEventId = session.metadata?.calendar_event_id;

    if (calendarEventId) {
      console.log('🗑️ Cancelling calendar event due to expired session:', calendarEventId);
      await googleCalendarAPI.cancelBookingEvent(calendarEventId);
      console.log('✅ Calendar event cancelled for expired session');
    }

  } catch (error) {
    console.error('Error processing expired checkout session:', error);
    throw error;
  }
}