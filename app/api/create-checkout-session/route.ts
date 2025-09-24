// Create this file at: app/api/create-checkout-session/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: NextRequest) {
  try {
    const {
      cart_items,
      customer_name,
      customer_email,
      office_number,
      notes,
      total_amount
    } = await request.json();

    console.log('🔷 Creating Stripe checkout session for:', {
      customer: customer_name,
      email: customer_email,
      total: total_amount,
      items: cart_items?.length || 0
    });

    // Validate required fields
    if (!cart_items || cart_items.length === 0) {
      return NextResponse.json(
        { error: 'No items in cart' },
        { status: 400 }
      );
    }

    if (!customer_name || !customer_email || !office_number) {
      return NextResponse.json(
        { error: 'Missing required customer information' },
        { status: 400 }
      );
    }

    // Create line items for Stripe
    const line_items = cart_items.map((item: any) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          description: `Merritt Workspace Snackshop - ${item.name}`,
        },
        unit_amount: Math.round(item.price * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));

    // Generate a temporary order ID for metadata
    const tempOrderId = `MW${Date.now().toString().slice(-8)}`;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/member-resources/snackshop?canceled=true`,
      customer_email: customer_email,
      metadata: {
        order_id: tempOrderId,
        customer_name,
        customer_email,
        office_number,
        notes: notes || '',
        cart_items: JSON.stringify(cart_items)
      },
      // Add shipping address collection if needed
      billing_address_collection: 'required',
      // Customize the checkout
      custom_text: {
        submit: {
          message: 'Your items will be ready for pickup in the kitchen after payment!'
        }
      }
    });

    console.log('✅ Stripe session created:', session.id);

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url,
      tempOrderId 
    });

  } catch (error: any) {
    console.error('❌ Stripe checkout error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create payment session',
        details: error.message 
      },
      { status: 500 }
    );
  }
}