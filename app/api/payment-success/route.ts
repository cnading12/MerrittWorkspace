// app/api/payment-success/route.ts
// NOTE: This route is now primarily for displaying order confirmation
// The actual email sending is handled by the webhook for reliability

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

    console.log('🔍 Fetching session details for order confirmation:', sessionId);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer_details', 'payment_intent']
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 404 }
      );
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Extract order details from session metadata
    const {
      order_id,
      customer_name,
      customer_email,
      office_number,
      notes,
      cart_items
    } = session.metadata || {};

    if (!order_id || !customer_name || !customer_email) {
      return NextResponse.json(
        { error: 'Missing order information in session' },
        { status: 400 }
      );
    }

    // Parse cart items
    let parsedCartItems = [];
    try {
      parsedCartItems = cart_items ? JSON.parse(cart_items) : [];
    } catch (error) {
      console.error('Error parsing cart items:', error);
    }

    // Calculate total from session
    const totalAmount = (session.amount_total || 0) / 100; // Convert from cents

    // Prepare payment details for display
    const paymentDetails = {
      order_id,
      total: totalAmount,
      customer_name,
      customer_email,
      office_number,
      notes: notes || '',
      items: parsedCartItems,
      session_id: sessionId,
      payment_status: 'completed',
      timestamp: new Date().toISOString()
    };

    console.log('✅ Payment details retrieved for display');

    // NOTE: Email sending is handled by the webhook (app/api/webhooks/snackshop/route.ts)
    // This ensures emails are sent reliably even if the user closes the browser
    
    return NextResponse.json({ 
      payment_details: paymentDetails,
      message: 'Payment processed successfully. Confirmation emails will be sent shortly.'
    });

  } catch (error: any) {
    console.error('❌ Payment success API error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Payment session error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}