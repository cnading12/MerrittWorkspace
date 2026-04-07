import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Stripe webhook for membership subscription events.
// Configure in Stripe to send:
//   checkout.session.completed,
//   customer.subscription.{created,updated,deleted},
//   invoice.{paid,payment_failed,payment_action_required}
// The last event fires for ACH subscriptions that need additional
// verification (e.g. micro-deposit fallback). It is handled below so we
// can record the pending state without marking the invoice as failed.
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
        // Retrieve the subscription so we persist its real Stripe status.
        // ACH subscriptions start in `incomplete` until the first payment
        // settles (3–5 business days); card subscriptions are `active`
        // immediately. Either way we unlock onboarding — the member has
        // authorized payment and done everything they need to do.
        let subscriptionStatus: string | null = null;
        if (session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(
              session.subscription as string
            );
            subscriptionStatus = sub.status;
          } catch (err) {
            console.error('Failed to retrieve subscription on checkout.session.completed', err);
          }
        }
        await sb
          .from('members')
          .update({
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            subscription_status: subscriptionStatus,
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
        const cpe = (sub as any).current_period_end as number | undefined;
        await sb
          .from('members')
          .update({
            stripe_subscription_id: sub.id,
            subscription_status: sub.status,
            next_charge_date: cpe
              ? new Date(cpe * 1000).toISOString().slice(0, 10)
              : null,
          })
          .eq('id', memberId);
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed':
      case 'invoice.payment_action_required': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const { data: member } = await sb
          .from('members')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle();
        // ACH payments can sit in a processing state for 3–5 business days
        // after the member submits. Map Stripe events to our own status:
        //   paid            → succeeded
        //   payment_failed  → failed
        //   action_required → pending  (ACH verification still outstanding)
        const mappedStatus =
          event.type === 'invoice.paid'
            ? 'succeeded'
            : event.type === 'invoice.payment_failed'
              ? 'failed'
              : 'pending';
        await sb.from('payment_history').upsert(
          {
            member_id: member?.id || null,
            stripe_invoice_id: invoice.id,
            stripe_payment_intent_id: (invoice as any).payment_intent || null,
            amount_cents: invoice.amount_paid || invoice.amount_due,
            currency: invoice.currency,
            status: mappedStatus,
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
