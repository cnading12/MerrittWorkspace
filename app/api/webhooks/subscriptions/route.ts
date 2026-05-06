import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { getMembershipProductId } from '@/lib/portal/stripeProduct';
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

  // Stripe API 2025-08-27.basil removed `Invoice.payment_intent`. The
  // associated PaymentIntent now lives at
  // `invoice.payments.data[].payment.payment_intent`, with the legacy
  // string field still appearing on older event payloads. Resolve from
  // both shapes, falling back to a fresh retrieve with `payments` expanded
  // when the webhook payload didn't include it (Stripe doesn't expand by
  // default for webhook events).
  const resolveInvoicePaymentIntent = async (
    invoice: any
  ): Promise<string | null> => {
    if (typeof invoice?.payment_intent === 'string') {
      return invoice.payment_intent;
    }
    const fromPayments = (inv: any): string | null => {
      const list = inv?.payments?.data;
      if (!Array.isArray(list)) return null;
      for (const p of list) {
        const pi = p?.payment?.payment_intent;
        if (typeof pi === 'string') return pi;
        if (pi?.id) return pi.id;
      }
      return null;
    };
    const direct = fromPayments(invoice);
    if (direct) return direct;
    if (!invoice?.id) return null;
    try {
      const expanded = await stripe.invoices.retrieve(invoice.id, {
        expand: ['payments.data.payment'],
      } as any);
      return fromPayments(expanded);
    } catch (err) {
      console.error('Failed to expand invoice for payment_intent', err);
      return null;
    }
  };

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

        // Legacy / existing-member auto-pay setup. The Checkout session
        // ran in `setup` mode (no upfront charge) — the PaymentMethod is
        // attached to a SetupIntent rather than a PaymentIntent. We pull
        // it off, set it as the customer default, and create a clean
        // recurring subscription anchored to the next 1st of the month
        // with no proration.
        if (
          !subscriptionId &&
          session.mode === 'setup' &&
          session.metadata?.legacy_setup === '1'
        ) {
          const monthlyCostCents = Number(
            session.metadata.monthly_cost_cents || 0
          );
          const anchor = Number(session.metadata.billing_cycle_anchor || 0);

          let paymentMethodId: string | null = null;
          if (session.setup_intent) {
            try {
              const si = await stripe.setupIntents.retrieve(
                session.setup_intent as string
              );
              paymentMethodId = (si.payment_method as string) || null;
            } catch (err) {
              console.error(
                'Failed to retrieve SetupIntent for legacy auto-pay',
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
              const productId = await getMembershipProductId(stripe);
              const sub = await stripe.subscriptions.create({
                customer: customerId,
                items: [
                  {
                    price_data: {
                      currency: 'usd',
                      recurring: { interval: 'month' },
                      unit_amount: monthlyCostCents,
                      product: productId,
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
                  legacy_member: '1',
                  selected_payment_method:
                    session.metadata.selected_payment_method || '',
                },
              } as any);
              subscriptionId = sub.id;
              subscriptionStatus = sub.status;
            } catch (err) {
              const errorMessage =
                err instanceof Error ? err.message : String(err);
              console.error(
                'Failed to create legacy auto-pay subscription',
                err
              );
              subscriptionStatus = 'creation_failed';
              try {
                await sb.from('subscription_creation_failures').insert({
                  member_id: memberId,
                  stripe_customer_id: customerId,
                  error_message: errorMessage,
                  payload: {
                    legacy_member: true,
                    monthly_cost_cents: monthlyCostCents,
                    billing_cycle_anchor: anchor,
                    selected_payment_method:
                      session.metadata.selected_payment_method || null,
                    checkout_session_id: session.id,
                    payment_method_id: paymentMethodId,
                  },
                });
              } catch (logErr) {
                console.error(
                  'Failed to log legacy subscription creation failure',
                  logErr
                );
              }
            }
          }
        } else if (
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
              // Subscriptions API requires `product` (an existing
              // Product ID) — `product_data` is only accepted on
              // Checkout Sessions / Invoice Items. Resolve once via a
              // find-or-create helper.
              const productId = await getMembershipProductId(stripe);
              const sub = await stripe.subscriptions.create({
                customer: customerId,
                items: [
                  {
                    price_data: {
                      currency: 'usd',
                      recurring: { interval: 'month' },
                      unit_amount: monthlyCostCents,
                      product: productId,
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
              // Subscription creation failed after the member already paid
              // through Checkout. Surface the failure instead of silently
              // dropping it: tag the member's subscription_status with a
              // sentinel the admin UI matches against, log the error to a
              // dedicated table for forensics, and email the manager.
              // The status column stays 'active' so portal/door access is
              // unaffected — the member did pay and is using the space.
              const errorMessage =
                err instanceof Error ? err.message : String(err);
              console.error(
                'Failed to create subscription after checkout',
                err
              );
              subscriptionStatus = 'creation_failed';
              try {
                await sb.from('subscription_creation_failures').insert({
                  member_id: memberId,
                  stripe_customer_id: customerId,
                  error_message: errorMessage,
                  payload: {
                    monthly_cost_cents: monthlyCostCents,
                    billing_cycle_anchor: anchor,
                    selected_payment_method:
                      session.metadata.selected_payment_method || null,
                    start_date: session.metadata.start_date || null,
                    last_month_deposit_cents:
                      session.metadata.last_month_deposit_cents || null,
                    checkout_session_id: session.id,
                    payment_method_id: paymentMethodId,
                  },
                });
              } catch (logErr) {
                console.error(
                  'Failed to log subscription creation failure',
                  logErr
                );
              }
              const resend = getResend();
              if (resend) {
                try {
                  await resend.emails.send({
                    from: PORTAL_FROM,
                    to: MANAGER_EMAIL,
                    replyTo: PORTAL_REPLY_TO,
                    subject:
                      'Subscription creation failed for new member',
                    text: [
                      'A new member completed Checkout but the follow-up subscription creation failed.',
                      '',
                      `Member ID: ${memberId}`,
                      `Stripe customer: ${customerId}`,
                      `Error: ${errorMessage}`,
                      '',
                      'Open the member in /admin/members and use the "Recreate subscription" button to retry.',
                    ].join('\n'),
                  });
                } catch (mailErr) {
                  console.error(
                    'Failed to send subscription failure alert',
                    mailErr
                  );
                }
              }
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

        // Record the upfront Checkout charge in payment_history. Checkout in
        // `payment` mode produces a PaymentIntent, not an Invoice, so the
        // invoice.* branch below never fires for it — without this, the
        // initial first-month + deposit charge never appears under the
        // member's payment history in either the portal or the admin panel.
        // Idempotency: bail if we've already recorded this PaymentIntent
        // (Stripe retries webhooks on non-2xx responses).
        const paymentIntentId = (session.payment_intent as string) || null;
        if (paymentIntentId && session.payment_status === 'paid') {
          const { data: existing } = await sb
            .from('payment_history')
            .select('id')
            .eq('stripe_payment_intent_id', paymentIntentId)
            .maybeSingle();
          if (!existing) {
            const amountCents =
              (session.amount_total as number | null) ??
              Number(session.metadata?.initial_total_cents || 0);
            const isOneTime = session.metadata?.one_time === '1';
            await sb.from('payment_history').insert({
              member_id: memberId,
              stripe_invoice_id: null,
              stripe_payment_intent_id: paymentIntentId,
              amount_cents: amountCents,
              currency: session.currency || 'usd',
              status: 'succeeded',
              description: isOneTime
                ? 'One-day dedicated desk'
                : 'Initial membership payment (first month + deposit)',
              invoice_pdf_url: null,
              paid_at: new Date().toISOString(),
            });
          }
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const memberId = sub.metadata?.member_id;
        if (!memberId) break;
        const cpe = (sub as any).current_period_end as number | undefined;
        // On delete, clear the subscription pointer so admin views don't
        // keep treating a canceled subscription's ID as auto-pay on file.
        // The subscription_status will be 'canceled' here either way.
        const isDeleted = event.type === 'customer.subscription.deleted';
        await sb
          .from('members')
          .update({
            stripe_subscription_id: isDeleted ? null : sub.id,
            subscription_status: sub.status,
            next_charge_date:
              !isDeleted && cpe
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
        const resolvedPaymentIntentId =
          await resolveInvoicePaymentIntent(invoice);
        await sb.from('payment_history').upsert(
          {
            member_id: member?.id || null,
            stripe_invoice_id: invoice.id,
            stripe_payment_intent_id: resolvedPaymentIntentId,
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
