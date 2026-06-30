// app/api/snackshop/member-checkout/route.ts
//
// One-click Snackshop checkout for signed-in portal members. Charges a card
// already on file (off-session) so members never re-enter name, office, or
// payment details. Falls back to the hosted Stripe Checkout flow when the
// member has no saved card yet (requires_setup) or the bank requires
// authentication (requires_action).
//
// Guests never reach this route — it requires a portal session. The public
// /api/create-checkout-session route still serves the guest flow unchanged.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { priceCart } from '@/lib/snackshop/products';
import { recordSnackOrder } from '@/lib/snackshop/orders';
import { sendSnackOrderConfirmationEmails } from '@/lib/snackshop/emails';
import { ensureStripeCustomer, findDefaultCard } from '@/lib/stripe/savedCard';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(req: NextRequest) {
  try {
    const member = await requireMember(req);

    const body = await req.json();
    const rawCart = Array.isArray(body?.cart_items) ? body.cart_items : [];
    const notes: string = typeof body?.notes === 'string' ? body.notes.trim() : '';
    const providedOffice: string =
      typeof body?.office_number === 'string' ? body.office_number.trim() : '';

    // Server-authoritative pricing from the catalog — the client only sends
    // ids + quantities, so a tampered payload can't change the charge.
    let priced;
    try {
      priced = priceCart(rawCart);
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Invalid cart' }, { status: 400 });
    }

    // Pickup location: prefer the member's profile, then anything they typed
    // in. If we still have nothing, ask the client to collect it (goal 3).
    const officeNumber = member.office_number || member.desk_number || providedOffice;
    if (!officeNumber) {
      return NextResponse.json(
        { error: 'We need your office or desk number for pickup.', missing: 'office_number' },
        { status: 400 },
      );
    }

    const customerName = `${member.first_name} ${member.last_name}`.trim() || member.email;
    const customerEmail = member.email;
    const orderId = `MW${Date.now().toString().slice(-8)}`;

    const customerId = await ensureStripeCustomer(stripe, {
      id: member.id,
      email: member.email,
      first_name: member.first_name,
      last_name: member.last_name,
      stripe_customer_id: member.stripe_customer_id,
    });

    const paymentMethodId = await findDefaultCard(stripe, customerId);
    if (!paymentMethodId) {
      // No card on file yet — let the client fall back to hosted Checkout,
      // which will save the card so the next purchase is one-click.
      return NextResponse.json({ requires_setup: true });
    }

    // Charge the saved card off-session.
    let paymentIntent: Stripe.PaymentIntent;
    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: priced.totalCents,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: `Merritt Snackshop order ${orderId}`,
        metadata: {
          order_type: 'snackshop',
          order_id: orderId,
          member_id: member.id,
          customer_name: customerName,
          customer_email: customerEmail,
          office_number: officeNumber,
          notes,
          cart_items: JSON.stringify(priced.items),
        },
      });
    } catch (err: any) {
      // Bank wants authentication (3DS): hand off to hosted Checkout where the
      // member can complete it.
      if (err?.code === 'authentication_required') {
        return NextResponse.json({ requires_action: true });
      }
      if (err instanceof Stripe.errors.StripeCardError) {
        return NextResponse.json(
          { error: err.message || 'Your card was declined. Please try another card.' },
          { status: 402 },
        );
      }
      throw err;
    }

    if (paymentIntent.status === 'requires_action') {
      return NextResponse.json({ requires_action: true });
    }

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: `Payment could not be completed (status: ${paymentIntent.status}).` },
        { status: 402 },
      );
    }

    // Persist the order (idempotent) and email confirmations — synchronous so
    // the member gets instant feedback and history without a webhook round-trip.
    try {
      await recordSnackOrder({
        memberId: member.id,
        orderNumber: orderId,
        customerName,
        customerEmail,
        officeNumber,
        notes: notes || null,
        items: priced.items,
        totalCents: priced.totalCents,
        currency: 'usd',
        paymentMethod: 'saved_card',
        isMemberOrder: true,
        stripeSessionId: null,
        stripePaymentIntentId: paymentIntent.id,
        paidAt: new Date().toISOString(),
      });
    } catch (dbError) {
      console.error('⚠️ member-checkout: failed to persist order (continuing):', dbError);
    }

    try {
      await sendSnackOrderConfirmationEmails({
        order_id: orderId,
        total: priced.totalCents / 100,
        customer_name: customerName,
        customer_email: customerEmail,
        office_number: officeNumber,
        notes,
        items: priced.items,
      });
    } catch (emailError) {
      console.error('⚠️ member-checkout: failed to send emails (continuing):', emailError);
    }

    return NextResponse.json({
      success: true,
      order_id: orderId,
      total_cents: priced.totalCents,
      office_number: officeNumber,
    });
  } catch (e: any) {
    if (e instanceof PortalError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error('❌ member-checkout error:', e);
    return NextResponse.json(
      { error: 'Failed to process payment', details: e?.message },
      { status: 500 },
    );
  }
}
