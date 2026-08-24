// app/api/create-checkout-session/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserFromRequest } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { priceCart } from '@/lib/snackshop/products';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil', // Updated to latest version
});

// If the request carries a portal session (Authorization: Bearer <token>),
// resolve the member so we can attach the order to their Stripe customer and
// save the card for future one-click checkouts. Returns nulls for guests —
// the guest checkout flow is completely unchanged.
async function resolveMemberContext(
  request: NextRequest,
): Promise<{ memberId: string | null; stripeCustomerId: string | null }> {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return { memberId: null, stripeCustomerId: null };
    const sb = getServiceSupabase();
    const { data: member } = await sb
      .from('members')
      .select('id, stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!member) return { memberId: null, stripeCustomerId: null };
    return {
      memberId: member.id as string,
      stripeCustomerId: (member.stripe_customer_id as string | null) ?? null,
    };
  } catch (err) {
    // Never let auth resolution break checkout — fall back to guest behavior.
    console.error('resolveMemberContext failed, treating as guest:', err);
    return { memberId: null, stripeCustomerId: null };
  }
}

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

    // Server-authoritative pricing from the catalog. The client sends whole
    // cart objects, but only the product id and quantity of each are trusted:
    // this route used to build Stripe line items straight from the client's
    // own `item.price`, so a tampered payload could buy the whole snack shop
    // for a cent. `priceCart` re-derives every price (and validates the
    // quantities) from SNACK_PRODUCTS, exactly as the member one-click path
    // already did.
    let priced;
    try {
      priced = priceCart(cart_items);
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Invalid cart' }, { status: 400 });
    }

    // Create line items for Stripe
    const line_items = priced.items.map((item) => ({
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

    // Resolve member context (guest → all nulls, unchanged flow).
    const { memberId, stripeCustomerId } = await resolveMemberContext(request);

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/order-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/member-resources/snackshop?canceled=true`,
      metadata: {
        order_type: 'snackshop', // IMPORTANT: Identifies this as a snackshop order for webhook
        order_id: tempOrderId,
        customer_name,
        customer_email,
        office_number,
        notes: notes || '',
        cart_items: JSON.stringify(priced.items),
        ...(memberId ? { member_id: memberId } : {}),
      },
      // Add shipping address collection if needed
      billing_address_collection: 'required',
      // Customize the checkout
      custom_text: {
        submit: {
          message: 'Your items will be ready for pickup in the kitchen after payment!'
        }
      }
    };

    if (stripeCustomerId) {
      // Signed-in member without a saved card yet: attach the order to their
      // Stripe customer and save the card so the next purchase is one-click.
      sessionParams.customer = stripeCustomerId;
      sessionParams.payment_intent_data = { setup_future_usage: 'off_session' };
    } else {
      // Guest (or member with no Stripe customer): unchanged behavior.
      sessionParams.customer_email = customer_email;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log('✅ Stripe session created:', session.id);

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url,
      tempOrderId 
    });

  } catch (error: any) {
    console.error('❌ Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment session' },
      { status: 500 }
    );
  }
}