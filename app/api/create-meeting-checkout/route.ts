// app/api/create-meeting-checkout/route.ts - UPDATED FOR DATABASE-FREE
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  try {
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
      calendar_event_id,
      // Storage path of the guest's uploaded photo ID (required for guest
      // bookings, absent for member overage checkouts).
      id_document_path,
      // Optional member-overage fields. Present only when a signed-in member
      // is paying for hours beyond their included allotment via the hosted
      // checkout fallback; absent (undefined) for guest bookings.
      member_id,
      included_hours,
      billed_hours
    } = await request.json();

    console.log('🔷 Creating Stripe checkout session for meeting room:', {
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

    // Create line item for Stripe
    const line_items = [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Meeting Room - ${room_name || 'Conference Room'}`,
          description: `${new Date(booking_date).toLocaleDateString()} at ${start_time} - ${end_time} (${duration_hours} hour${duration_hours > 1 ? 's' : ''})`,
          metadata: {
            room_name: room_name || 'Conference Room',
            booking_date,
            start_time,
            end_time,
            attendees: attendees?.toString() || '1',
            booking_id
          }
        },
        unit_amount: Math.round(total_amount * 100), // Convert to cents
      },
      quantity: 1,
    }];

    // Create Stripe checkout session with ALL booking data in metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/member-resources/meeting-rooms?canceled=true`,
      customer_email: customer_email,
      metadata: {
        booking_type: 'meeting_room',
        booking_id,
        customer_name,
        customer_email,
        customer_phone: customer_phone || '',
        company: company || '',
        room_name: room_name || 'Conference Room',
        booking_date,
        start_time,
        end_time,
        duration_hours: duration_hours?.toString() || '1',
        attendees: attendees?.toString() || '1',
        total_amount: total_amount?.toString() || '0',
        purpose: purpose || '',
        calendar_event_id: calendar_event_id || '',
        ...(id_document_path ? { id_document_path: String(id_document_path) } : {}),
        ...(member_id ? { member_id: String(member_id) } : {}),
        ...(included_hours !== undefined ? { included_hours: String(included_hours) } : {}),
        ...(billed_hours !== undefined ? { billed_hours: String(billed_hours) } : {})
      },
      billing_address_collection: 'required',
      custom_text: {
        submit: {
          message: 'Your meeting room will be confirmed after payment!'
        }
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutes
    });

    console.log('✅ Stripe checkout session created:', session.id);

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