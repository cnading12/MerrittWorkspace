import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Stripe webhook for membership subscription events.
// Configure in Stripe to send: checkout.session.completed,
// customer.subscription.{created,updated,deleted}, invoice.{paid,payment_failed}.
//
// Set STRIPE_SUBSCRIPTION_WEBHOOK_SECRET in your env.

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-08-27.basil' as any,
  });
  const secret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET!;
  const sig = req.headers.get('stripe-signature') || '';
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    console.error('Webhook signature error:', err.message);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  const sb = getServiceSupabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.order_type !== 'membership_subscription') break;
        const memberId = session.metadata.member_id;
        if (!memberId) break;
        await sb
          .from('members')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            subscription_status: 'active',
            onboarding_unlocked: true,
            status: 'active',
          })
          .eq('id', memberId);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const memberId = sub.metadata?.member_id;
        if (!memberId) break;
        await sb
          .from('members')
          .update({
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
            next_charge_date: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString().slice(0, 10)
              : null,
          })
          .eq('id', memberId);
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const { data: member } = await sb
          .from('members')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();
        await sb.from('payment_history').upsert(
          {
            member_id: member?.id || null,
            stripe_invoice_id: invoice.id,
            stripe_payment_intent_id: (invoice as any).payment_intent || null,
            amount_cents: invoice.amount_paid || invoice.amount_due,
            currency: invoice.currency,
            status: event.type === 'invoice.paid' ? 'succeeded' : 'failed',
            description: invoice.description || 'Membership',
            invoice_pdf_url: invoice.invoice_pdf || null,
            paid_at: invoice.status_transitions?.paid_at
              ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
              : null,
          },
          { onConflict: 'stripe_invoice_id' }
        );
        break;
      }
    }
  } catch (e: any) {
    console.error('Webhook handler error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
