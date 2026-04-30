import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import {
  subscriptionPaymentReceiptEmail,
  PORTAL_FROM,
  PORTAL_REPLY_TO,
} from '@/lib/portal/emails';

export const dynamic = 'force-dynamic';

const MANAGER_EMAIL = 'manager@merrittworkspace.net';
const MEMBER_SERVICES_EMAIL = 'memberservices@merrittworkspace.net';

let resendClient: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

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
        const customerId = session.customer as string;

        // Recurring members come through Checkout in `payment` mode that
        // charges the prorated first month + last-month deposit and saves
        // the card/bank off-session. Now we create the subscription via
        // the API with `billing_cycle_anchor` + `proration_behavior:
        // 'none'` (which Checkout itself disallows when one-time prices
        // are present) so the first full-month charge fires on the 1st of
        // the month after the start month.
        let subscriptionId: string | null =
          (session.subscription as string) || null;
        let subscriptionStatus: string | null = null;

        if (
          !subscriptionId &&
          session.mode === 'payment' &&
          session.metadata?.create_subscription === '1'
        ) {
          const monthlyCostCents = Number(
            session.metadata.monthly_cost_cents || 0
          );
          const anchor = Number(session.metadata.billing_cycle_anchor || 0);

          // Pull the saved payment method off the PaymentIntent and pin
          // it as the customer's invoice default so subsequent monthly
          // invoices auto-charge it without further action.
          let paymentMethodId: string | null = null;
          if (session.payment_intent) {
            try {
              const pi = await stripe.paymentIntents.retrieve(
                session.payment_intent as string
              );
              paymentMethodId = (pi.payment_method as string) || null;
            } catch (err) {
              console.error(
                'Failed to retrieve PaymentIntent on checkout.session.completed',
                err
              );
            }
          }
          if (paymentMethodId) {
            await stripe.customers.update(customerId, {
              invoice_settings: { default_payment_method: paymentMethodId },
            });
          }

          if (monthlyCostCents > 0 && anchor > 0) {
            try {
              const sub = await stripe.subscriptions.create({
                customer: customerId,
                items: [
                  {
                    price_data: {
                      currency: 'usd',
                      recurring: { interval: 'month' },
                      unit_amount: monthlyCostCents,
                      product_data: {
                        name: 'Merritt Workspace Membership',
                      },
                    },
                    quantity: 1,
                  },
                ],
                billing_cycle_anchor: anchor,
                proration_behavior: 'none',
                default_payment_method: paymentMethodId || undefined,
                collection_method: 'charge_automatically',
                metadata: {
                  member_id: memberId,
                  monthly_cost_cents: String(monthlyCostCents),
                  last_month_deposit_cents:
                    session.metadata.last_month_deposit_cents || '',
                  selected_payment_method:
                    session.metadata.selected_payment_method || '',
                  start_date: session.metadata.start_date || '',
                },
              } as any);
              subscriptionId = sub.id;
              subscriptionStatus = sub.status;
            } catch (err) {
              console.error(
                'Failed to create subscription after checkout',
                err
              );
            }
          }
        } else if (subscriptionId) {
          // Day-pass / one-time members don't have a subscription; this
          // branch handles any legacy `subscription`-mode sessions.
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            subscriptionStatus = sub.status;
          } catch (err) {
            console.error(
              'Failed to retrieve subscription on checkout.session.completed',
              err
            );
          }
        }

        await sb
          .from('members')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
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
          .select('id, email, first_name, last_name')
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

        // Send a receipt on successful payment. Stripe fires `invoice.paid`
        // for both the initial subscription charge (billing_reason =
        // subscription_create) and each recurring monthly cycle
        // (billing_reason = subscription_cycle), so this one branch covers
        // both the first-payment confirmation and the ~1st-of-month
        // recurring confirmation. Member is the primary recipient;
        // manager + member services are BCC'd so they receive a copy
        // without exposing internal mailboxes to the member.
        if (event.type === 'invoice.paid' && member?.email) {
          const resend = getResend();
          if (!resend) {
            console.warn(
              'Skipping subscription receipt email: RESEND_API_KEY not set'
            );
          } else {
            const isFirstPayment =
              (invoice as any).billing_reason === 'subscription_create';
            const amountCents =
              invoice.amount_paid || invoice.amount_due || 0;
            const amount = (amountCents / 100).toFixed(2);
            const paidAtSec = invoice.status_transitions?.paid_at;
            const paidOn = new Date(
              paidAtSec ? paidAtSec * 1000 : Date.now()
            ).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            const email = subscriptionPaymentReceiptEmail({
              firstName: member.first_name || 'there',
              amount,
              paidOn,
              description: invoice.description || 'Monthly membership',
              invoiceNumber: invoice.number || null,
              invoicePdfUrl: invoice.invoice_pdf || null,
              isFirstPayment,
            });
            try {
              await resend.emails.send({
                from: PORTAL_FROM,
                to: member.email,
                bcc: [MANAGER_EMAIL, MEMBER_SERVICES_EMAIL],
                replyTo: PORTAL_REPLY_TO,
                subject: email.subject,
                html: email.html,
                text: email.text,
              });
            } catch (err) {
              // Do not fail the webhook if email delivery fails —
              // payment_history is already recorded and Stripe will retry
              // the webhook on a non-2xx, which would double-record.
              console.error('Failed to send subscription receipt email', err);
            }
          }
        }
        break;
      }
    }
  } catch (e: any) {
    console.error('Webhook handler error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
