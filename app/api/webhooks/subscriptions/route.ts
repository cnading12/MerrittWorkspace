import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { getMembershipProductId } from '@/lib/portal/stripeProduct';
import { getCurrentPeriodEndUnix } from '@/lib/portal/stripeSubscription';
import {
  getTransactionalEmailHeaders,
  subscriptionPaymentReceiptEmail,
  PORTAL_FROM,
  PORTAL_REPLY_TO,
} from '@/lib/portal/emails';
import {
  sendSignupEmailsOnce,
  checkoutFactsFromMetadata,
} from '@/lib/portal/signupEmails';

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
//   invoice.{paid,payment_failed,payment_action_required},
//   charge.refunded
// `charge.refunded` keeps the local payment_history in sync when staff
// issue refunds directly from the Stripe Dashboard (i.e. outside our admin
// refund route), so the member portal reflects the refunded state.
//
// Set STRIPE_SUBSCRIPTION_WEBHOOK_SECRET in your env.

// Record a purchased day pass for a One Day Dedicated Desk member.
// Idempotent: upserts on (member_id, pass_date), so Stripe webhook retries
// can't double-insert. Conflicts overwrite (not skip) so re-buying a date
// whose earlier pass was refunded re-confirms the pass with the new charge.
async function recordDayPass(
  sb: ReturnType<typeof getServiceSupabase>,
  opts: {
    memberId: string;
    passDate: string | null | undefined;
    checkoutSessionId: string;
    paymentIntentId: string | null;
    amountCents: number;
  }
) {
  if (!opts.passDate || !/^\d{4}-\d{2}-\d{2}$/.test(opts.passDate)) {
    console.warn('day pass purchase missing/invalid pass_date metadata', opts);
    return;
  }
  const { error } = await sb.from('day_passes').upsert(
    {
      member_id: opts.memberId,
      pass_date: opts.passDate,
      amount_cents: opts.amountCents,
      stripe_checkout_session_id: opts.checkoutSessionId,
      stripe_payment_intent_id: opts.paymentIntentId,
      status: 'confirmed',
    },
    { onConflict: 'member_id,pass_date' }
  );
  if (error) {
    console.error('Failed to record day pass', error);
  }
}

// The Charge receipt_url stands in for an invoice PDF on payment-mode
// Checkout charges (they never produce a Stripe Invoice).
async function getReceiptUrl(
  stripe: Stripe,
  paymentIntentId: string
): Promise<string | null> {
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['latest_charge'],
    });
    const charge = pi.latest_charge;
    if (charge && typeof charge !== 'string') {
      return charge.receipt_url || null;
    }
  } catch (err) {
    console.error('Failed to retrieve receipt_url for checkout PaymentIntent', err);
  }
  return null;
}

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

        // Additional day-pass purchase by an already-onboarded One Day
        // Dedicated Desk member (app/api/portal/day-pass). No member-state
        // changes — just record the pass and the payment.
        if (session.metadata?.order_type === 'day_pass') {
          const dayPassMemberId = session.metadata.member_id;
          if (!dayPassMemberId) break;
          const paymentIntentId = (session.payment_intent as string) || null;
          const baseCents = Number(session.metadata.base_cents || 0);

          await recordDayPass(sb, {
            memberId: dayPassMemberId,
            passDate: session.metadata.pass_date,
            checkoutSessionId: session.id,
            paymentIntentId,
            amountCents: baseCents || (session.amount_total as number) || 0,
          });

          // Record the charge in payment_history (idempotent on the
          // PaymentIntent, since Stripe retries webhooks on non-2xx).
          if (paymentIntentId && session.payment_status === 'paid') {
            const { data: existing } = await sb
              .from('payment_history')
              .select('id')
              .eq('stripe_payment_intent_id', paymentIntentId)
              .maybeSingle();
            if (!existing) {
              await sb.from('payment_history').insert({
                member_id: dayPassMemberId,
                stripe_invoice_id: null,
                stripe_payment_intent_id: paymentIntentId,
                amount_cents:
                  (session.amount_total as number | null) ?? baseCents,
                currency: session.currency || 'usd',
                status: 'succeeded',
                description: `One-day dedicated desk — pass for ${session.metadata.pass_date || 'unspecified date'}`,
                invoice_pdf_url: await getReceiptUrl(stripe, paymentIntentId),
                paid_at: new Date().toISOString(),
              });
            }
          }
          break;
        }

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

        const { data: signedUpMember } = await sb
          .from('members')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: subscriptionStatus,
            onboarding_unlocked: true,
            status: 'active',
          })
          .eq('id', memberId)
          .select(
            'id, first_name, last_name, email, phone, company_name, designation, monthly_cost_cents, desk_number, office_number, access_code, is_legacy_member'
          )
          .maybeSingle();

        // A completed one-time (day pass) signup also mints the member's
        // first day pass, anchored to the purchase day the fee agreement
        // named. Conference-room hours key off this row.
        const isOneTimeSignup = session.metadata?.one_time === '1';
        if (isOneTimeSignup) {
          await recordDayPass(sb, {
            memberId,
            passDate: session.metadata?.pass_date,
            checkoutSessionId: session.id,
            paymentIntentId: (session.payment_intent as string) || null,
            amountCents:
              Number(session.metadata?.base_cents || 0) ||
              (session.amount_total as number) ||
              0,
          });
        }

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
            // Checkout in `payment` mode never produces a Stripe Invoice,
            // so `invoice.invoice_pdf` doesn't exist for this charge. The
            // Charge's `receipt_url` is the equivalent member-facing PDF
            // (publicly accessible, no auth) — save it so the admin/portal
            // "Invoice" button works for the initial signup charge too.
            const receiptUrl = await getReceiptUrl(stripe, paymentIntentId);
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
              invoice_pdf_url: receiptUrl,
              paid_at: new Date().toISOString(),
            });
          }
        }

        // This is the moment the member OFFICIALLY signs up: the portal is
        // unlocked and they're active. Welcome the member and tell the
        // management team. Both sends are claimed at-most-once inside the
        // helper, so Stripe's webhook retries can't duplicate them, and the
        // helper never throws — email must not fail the webhook.
        if (signedUpMember) {
          await sendSignupEmailsOnce({
            member: signedUpMember as any,
            facts: checkoutFactsFromMetadata(
              session.metadata as Record<string, string> | null
            ),
          });
        } else {
          console.error(
            'Signup emails skipped: member row not returned after checkout update',
            memberId
          );
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const memberId = sub.metadata?.member_id;
        if (!memberId) break;
        const cpe = getCurrentPeriodEndUnix(sub) ?? undefined;
        // On delete, clear the subscription pointer so admin views don't
        // keep treating a canceled subscription's ID as auto-pay on file.
        // The subscription_status will be 'canceled' here either way.
        const isDeleted = event.type === 'customer.subscription.deleted';

        const update: Record<string, any> = {
          stripe_subscription_id: isDeleted ? null : sub.id,
          subscription_status: sub.status,
          next_charge_date:
            !isDeleted && cpe
              ? new Date(cpe * 1000).toISOString().slice(0, 10)
              : null,
        };

        // Mirror cancellation onto the member's own status so the portal and
        // admin views reflect reality even when the cancel originates outside
        // our cancel routes — e.g. the member cancels directly in the Stripe
        // dashboard, or our own DB write failed earlier. Without this the
        // member row stays status='active' forever and admin "Cancel
        // membership" can only ever report "already cancelled".
        const isCancelled =
          isDeleted ||
          sub.status === 'canceled' ||
          !!sub.cancel_at ||
          !!sub.cancel_at_period_end;
        if (isCancelled) {
          update.status = 'cancelled';
          // Effective date: the scheduled cancel_at, else when the sub ended.
          const effectiveUnix =
            (sub.cancel_at as number | null) ??
            ((sub as any).ended_at as number | null) ??
            ((sub as any).canceled_at as number | null) ??
            null;
          if (effectiveUnix) {
            update.cancellation_effective_date = new Date(effectiveUnix * 1000)
              .toISOString()
              .slice(0, 10);
          }
          // Use Stripe's own canceled_at as the notice timestamp: it's
          // authoritative and stable across webhook redeliveries, so this stays
          // idempotent and won't clobber the real notice time with "now".
          const noticeUnix = (sub as any).canceled_at as number | null;
          if (noticeUnix) {
            update.cancellation_notice_received_at = new Date(
              noticeUnix * 1000,
            ).toISOString();
          }
        }

        await sb.from('members').update(update).eq('id', memberId);
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
        // Pick the right amount per event. Previously this fell back to
        // `amount_due` when `amount_paid` was 0, which polluted the table
        // with phantom rows: Stripe fires `invoice.paid` for $0 invoices
        // (e.g. the placeholder created during subscription_create with a
        // future billing anchor + proration_behavior='none', or any invoice
        // fully zeroed out by credits) where amount_paid=0 but amount_due
        // still reflects the gross subscription item amount. Recording
        // amount_due in that case writes a "succeeded" row for money that
        // never moved.
        //
        //   invoice.paid              → record amount_paid (the real amount
        //                                actually charged); skip if it's 0
        //   invoice.payment_failed    → record amount_due (what we tried
        //                                to charge)
        //   invoice.payment_action_required → record amount_due (pending)
        const amountCents =
          event.type === 'invoice.paid'
            ? (invoice.amount_paid || 0)
            : (invoice.amount_due || invoice.amount_paid || 0);
        if (event.type === 'invoice.paid' && amountCents <= 0) {
          // No money moved on this paid invoice — don't record a row.
          // Receipt email below is also skipped via the same gate so
          // members aren't notified about $0 "payments".
          break;
        }
        const resolvedPaymentIntentId =
          await resolveInvoicePaymentIntent(invoice);
        await sb.from('payment_history').upsert(
          {
            member_id: member?.id || null,
            stripe_invoice_id: invoice.id,
            stripe_payment_intent_id: resolvedPaymentIntentId,
            amount_cents: amountCents,
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
                headers: getTransactionalEmailHeaders(),
                tags: [{ name: 'category', value: 'payment_receipt' }],
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
      case 'charge.refunded': {
        // Stripe fires this whenever a refund is created (full or partial),
        // including refunds issued from the Stripe Dashboard. Match on the
        // PaymentIntent ID — that's the stable key shared between our
        // initial Checkout charges (no invoice) and recurring invoice
        // charges. We don't differentiate partial vs full refunds here;
        // any non-zero refund flips the row to 'refunded' so the portal
        // can warn the member that funds are on the way back.
        const charge = event.data.object as Stripe.Charge;
        const piId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : (charge.payment_intent as any)?.id || null;
        if (!piId) break;
        if (!charge.amount_refunded || charge.amount_refunded <= 0) break;
        await sb
          .from('payment_history')
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent_id', piId);
        // If the charge bought a day pass, retire the pass too so it stops
        // granting building/conference access for its date.
        await sb
          .from('day_passes')
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent_id', piId);
        break;
      }
    }
  } catch (e: any) {
    console.error('Webhook handler error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
