import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { isOneTimeDesignation } from '@/lib/portal/pricing';
import { denverTodayIso } from '@/lib/bookings/conference-hours';
import {
  billingCycleAnchorAfter,
  calculateProratedFirstMonthCents,
  parseStartDate,
} from '@/lib/portal/legal';

export const dynamic = 'force-dynamic';

const ALREADY_PAID_MESSAGE =
  "We've already received your initial payment (bank debits can take 3–5 " +
  'business days to clear, but the money is on its way). Your subscription ' +
  "is still being finalized — please don't pay again. If your portal " +
  "hasn't unlocked within an hour, email memberservices@merrittworkspace.net " +
  "and we'll fix it without charging you again.";

// How far back to scan the member's Stripe Checkout history for an
// in-flight or completed signup payment. The window only needs to cover
// the gap between "member paid" and "our database knows about it" — the
// ACH processing window (≤5 business days) plus webhook lag — so two
// weeks is generous. Bounding it means a member who legitimately signs
// up again months later (e.g. cancelled and returning) isn't blocked by
// their own old, already-consumed signup session.
const SIGNUP_SESSION_LOOKBACK_SECONDS = 14 * 24 * 60 * 60;

export async function POST(req: NextRequest) {
  try {
    const member = await requireMember(req);
    if (!member.agreement_signed) {
      return NextResponse.json({ error: 'Sign the member agreement first' }, { status: 400 });
    }
    if (!member.monthly_cost_cents) {
      return NextResponse.json(
        { error: 'No monthly cost assigned. Contact your administrator.' },
        { status: 400 }
      );
    }
    if (member.stripe_subscription_id) {
      return NextResponse.json({ error: 'Subscription already exists' }, { status: 400 });
    }

    const sb = getServiceSupabase();

    // Fail-safe: block duplicate signup payments. If we've already recorded
    // an initial Checkout payment for this member (one without a Stripe
    // invoice ID — those come from `invoice.paid` for recurring charges),
    // don't open another Checkout session even if the follow-up
    // subscription creation hasn't landed yet. Without this, a member who
    // returned to the portal before the webhook finished could click "Set
    // up auto-pay" again and be charged a second prorated first month +
    // deposit. Recovery (manually creating the subscription against the
    // already-saved payment method) goes through the admin panel.
    //
    // 'pending' counts as paid here: an ACH debit sits in `processing` for
    // 3–5 business days after the member submits Checkout, and the money
    // WILL leave their bank account. A member double-charged during that
    // window sees two withdrawals days later, when nothing on our side
    // still looks wrong.
    const { data: existingInitialPayment } = await sb
      .from('payment_history')
      .select('id, status, amount_cents, paid_at, created_at')
      .eq('member_id', member.id)
      .in('status', ['succeeded', 'pending', 'processing'])
      .is('stripe_invoice_id', null)
      .not('stripe_payment_intent_id', 'is', null)
      .limit(1)
      .maybeSingle();
    if (existingInitialPayment) {
      return NextResponse.json(
        { error: ALREADY_PAID_MESSAGE },
        { status: 409 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil' as any,
    });

    // Read the payment method the member selected when they signed the Fee
    // Agreement. Valid values are 'card' (default) or 'ach'. When 'ach', we
    // configure Stripe Checkout to offer US bank account auto-debit via
    // Financial Connections so the member can avoid the 3.5% card fee.
    const { data: feeAgreement } = await sb
      .from('member_agreements')
      .select('metadata')
      .eq('member_id', member.id)
      .eq('agreement_type', 'fee_agreement')
      .maybeSingle();
    const selectedMethod =
      (feeAgreement?.metadata as any)?.payment_method === 'ach' ? 'ach' : 'card';

    // Find or create the Stripe customer.
    let customerId = member.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: member.email,
        name: `${member.first_name} ${member.last_name}`,
        metadata: { member_id: member.id },
      });
      customerId = customer.id;
      await sb
        .from('members')
        .update({ stripe_customer_id: customerId })
        .eq('id', member.id);
    }

    // Second fail-safe, against Stripe itself. The payment_history guard
    // above only knows about charges the webhook has recorded — and the
    // webhook can lag, fail, or (for ACH) fire while the debit is still
    // processing. So before opening a new Checkout session, ask Stripe
    // what signup sessions this customer already has:
    //
    //   - A recent COMPLETED payment-mode signup session whose payment
    //     succeeded or is still processing means the member has already
    //     paid (or the money is already leaving their bank). Refuse to
    //     open another payable page, full stop.
    //   - A recent OPEN signup session is a payable page that may still
    //     be sitting in another tab. Expire it so there is never more
    //     than one live way to pay; a second completed Checkout is a
    //     second first-month + deposit out of someone's bank account.
    //
    // This is the fix for a real incident: two members' portals hung on
    // submit, they retried, and one paid the initial charge twice by ACH
    // — every database-side guard failed open because the processing
    // debit had no payment_history row yet.
    const lookbackCutoff =
      Math.floor(Date.now() / 1000) - SIGNUP_SESSION_LOOKBACK_SECONDS;
    const recentSessions = await stripe.checkout.sessions.list({
      customer: customerId,
      created: { gte: lookbackCutoff },
      limit: 20,
      expand: ['data.payment_intent'],
    });
    for (const s of recentSessions.data ?? []) {
      if (s.metadata?.order_type !== 'membership_subscription') continue;
      if (s.status === 'open') {
        try {
          await stripe.checkout.sessions.expire(s.id);
        } catch {
          // Expiry fails when the session just completed (or Stripe is
          // unreachable). Either way we can no longer prove there isn't a
          // paid/payable session out there — fail closed. Money paths
          // never guess.
          return NextResponse.json(
            {
              error:
                'We found a previous payment attempt that we could not ' +
                'verify. Please reload this page to see your current ' +
                'payment status before trying again — if the problem ' +
                'persists, email memberservices@merrittworkspace.net.',
            },
            { status: 409 }
          );
        }
        continue;
      }
      if (s.status !== 'complete' || s.mode !== 'payment') continue;
      const pi =
        s.payment_intent && typeof s.payment_intent === 'object'
          ? (s.payment_intent as Stripe.PaymentIntent)
          : null;
      const piStatus = pi?.status ?? null;
      const paidOrInFlight =
        s.payment_status === 'paid' ||
        piStatus === 'succeeded' ||
        piStatus === 'processing' ||
        piStatus === 'requires_capture';
      if (paidOrInFlight) {
        return NextResponse.json(
          { error: ALREADY_PAID_MESSAGE },
          { status: 409 }
        );
      }
      // A complete session whose payment failed outright (ACH bounced,
      // card declined post-auth) is not money in flight — the member is
      // allowed to try paying again.
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    // Legacy / existing-member migration flow.
    //
    // Legacy members didn't sign a Fee Agreement that included a prorated
    // first month or a last-month deposit — their agreement was just an
    // acknowledgement of the standard monthly rate, billable on the 1st of
    // the next billing cycle. So when they opt in to auto-pay, we DON'T
    // collect any upfront charge: Stripe Checkout runs in `setup` mode (just
    // saves a payment method off-session). The companion webhook then
    // creates the subscription via the API with `billing_cycle_anchor` set
    // to the 1st of the upcoming month and `proration_behavior: 'none'`, so
    // the very first charge is a clean monthly invoice on that anchor date.
    if ((member as any).is_legacy_member) {
      const today = new Date();
      const anchorDate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)
      );
      const anchor = Math.floor(anchorDate.getTime() / 1000);

      const checkoutPaymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
        selectedMethod === 'ach' ? ['us_bank_account', 'card'] : ['card', 'link'];

      const session = await stripe.checkout.sessions.create({
        mode: 'setup',
        customer: customerId,
        payment_method_types: checkoutPaymentMethodTypes,
        payment_method_options:
          selectedMethod === 'ach'
            ? {
                us_bank_account: {
                  financial_connections: {
                    permissions: ['payment_method'],
                  },
                  verification_method: 'instant',
                },
              }
            : undefined,
        success_url: `${baseUrl}/portal?subscribed=1`,
        cancel_url: `${baseUrl}/portal?canceled=1`,
        custom_text: {
          submit: {
            message: `No charge today. Your monthly auto-charge of $${(member.monthly_cost_cents / 100).toFixed(2)} will run on ${anchorDate.toLocaleDateString(
              'en-US',
              { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
            )} and on the 1st of every month after.`,
          },
        },
        metadata: {
          order_type: 'membership_subscription',
          member_id: member.id,
          legacy_setup: '1',
          create_subscription: '1',
          monthly_cost_cents: String(member.monthly_cost_cents),
          billing_cycle_anchor: String(anchor),
          selected_payment_method: selectedMethod,
        },
      });

      return NextResponse.json({ url: session.url, id: session.id });
    }

    // One-time day-pass flow (e.g. One Day Dedicated Desk at $30).
    // These members pay a single upfront charge instead of a recurring
    // monthly subscription, so we use Stripe Checkout in `payment` mode.
    if (isOneTimeDesignation(member.designation)) {
      const checkoutPaymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
        selectedMethod === 'ach' ? ['us_bank_account', 'card'] : ['card', 'link'];

      const ccFeeCents =
        selectedMethod === 'card'
          ? Math.round(member.monthly_cost_cents * 0.035)
          : 0;
      const totalCents = member.monthly_cost_cents + ccFeeCents;

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        payment_method_types: checkoutPaymentMethodTypes,
        payment_method_options:
          selectedMethod === 'ach'
            ? {
                us_bank_account: {
                  financial_connections: {
                    permissions: ['payment_method'],
                  },
                  verification_method: 'instant',
                },
              }
            : undefined,
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: totalCents,
              product_data: {
                name: 'Merritt Workspace — One Day Dedicated Desk',
                description: `${member.first_name} ${member.last_name} — single day pass`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/portal?subscribed=1`,
        cancel_url: `${baseUrl}/portal?canceled=1`,
        metadata: {
          order_type: 'membership_subscription',
          member_id: member.id,
          one_time: '1',
          base_cents: String(member.monthly_cost_cents),
          cc_fee_cents: String(ccFeeCents),
          selected_payment_method: selectedMethod,
          // The fee agreement anchors a day pass to the purchase day; the
          // webhook records it in day_passes so conference-room hours (1
          // hr per pass day) and staff records know when they're coming in.
          pass_date: denverTodayIso(),
        },
      });

      return NextResponse.json({ url: session.url, id: session.id });
    }

    // Billing logic (two-step flow):
    //   - The member chose a membership start_date when signing the Fee
    //     Agreement (today through today + 30 days).
    //   - Step 1 (this route): Stripe Checkout in `payment` mode collects
    //     the upfront charge — prorated first partial month (start_date →
    //     end of start month) plus a one-month deposit — and saves the
    //     payment method off-session via `setup_future_usage`. The amounts
    //     match the signed Fee Agreement exactly because we set them as
    //     one-time line items rather than letting Stripe auto-prorate.
    //   - Step 2 (webhooks/subscriptions): on `checkout.session.completed`
    //     we create the recurring subscription via the Stripe API using
    //     the saved payment method, with `billing_cycle_anchor` = 1st of
    //     the month after start month and `proration_behavior: 'none'`,
    //     so the first full-month charge fires on the anchor date with no
    //     duplicate proration.
    //   - We use this two-step flow because Stripe Checkout disallows
    //     `proration_behavior: 'none'` whenever a session contains
    //     one-time prices, and any alternative (e.g. `trial_end`) would
    //     surface "X days free / Try Membership" trial copy in the
    //     Checkout UI, which misrepresents the offering.
    const startDateRaw = (feeAgreement?.metadata as any)?.start_date;
    let startDate: Date;
    try {
      startDate =
        typeof startDateRaw === 'string' && startDateRaw
          ? parseStartDate(startDateRaw)
          : new Date();
    } catch {
      return NextResponse.json(
        { error: 'Fee Agreement is missing a valid start_date — please re-sign.' },
        { status: 400 }
      );
    }
    const proratedCents = calculateProratedFirstMonthCents(
      member.monthly_cost_cents,
      startDate
    );
    const lastMonthDepositCents = member.monthly_cost_cents;

    // 3.5% processing fee applies to the upfront charge only when the member
    // chose to pay by card on their signed Fee Agreement. ACH-paying members
    // never see this fee. Keeping the math here byte-identical to
    // `calculateFeeAgreementTotals` (lib/portal/legal.ts) is critical — the
    // amount Stripe charges must match the Grand Total the member signed.
    const ccFeeCents =
      selectedMethod === 'card'
        ? Math.round((proratedCents + lastMonthDepositCents) * 0.035)
        : 0;

    // Anchor billing to the 1st of the month after the chosen start month.
    const anchor = billingCycleAnchorAfter(startDate);

    // Payment method configuration.
    //   - ACH members: primary `us_bank_account` (no fee), with `card` as a
    //     fallback in case Financial Connections can't verify their bank.
    //     Financial Connections `instant` verification means no micro-deposit
    //     delay; the member links their bank via Plaid-style flow inside
    //     Stripe Checkout and the subscription auto-debits from it monthly.
    //   - Card members: `card` + `link` (Stripe's one-click wallet).
    const checkoutPaymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
      selectedMethod === 'ach' ? ['us_bank_account', 'card'] : ['card', 'link'];

    // Save the payment method off-session so the webhook can attach it to
    // the subscription it creates after this Checkout completes. ACH
    // requires the flag on the bank-account payment_method_options block;
    // for card/link, setting it on payment_intent_data covers both.
    const paymentMethodOptions: Stripe.Checkout.SessionCreateParams.PaymentMethodOptions =
      selectedMethod === 'ach'
        ? {
            us_bank_account: {
              financial_connections: {
                permissions: ['payment_method'],
              },
              verification_method: 'instant',
              setup_future_usage: 'off_session',
            },
          }
        : {};

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: customerId,
      payment_method_types: checkoutPaymentMethodTypes,
      payment_method_options: paymentMethodOptions,
      payment_intent_data: {
        setup_future_usage: 'off_session',
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: proratedCents,
            product_data: {
              name: "First Month's Membership Fee (prorated)",
              // Surface the recurring charge in the order summary itself
              // (Stripe doesn't render "Then $X/mo" automatically in
              // payment-mode Checkout — see custom_text.submit.message
              // below for the same info next to the Pay button).
              description: `${member.first_name} ${member.last_name} — then $${(member.monthly_cost_cents / 100).toFixed(2)}/mo billed on the 1st starting ${new Date(
                anchor * 1000
              ).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                timeZone: 'UTC',
              })}`,
            },
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: 'usd',
            unit_amount: lastMonthDepositCents,
            product_data: {
              name: "Last Month's Membership Fee (deposit)",
            },
          },
          quantity: 1,
        },
        ...(ccFeeCents > 0
          ? [
              {
                price_data: {
                  currency: 'usd' as const,
                  unit_amount: ccFeeCents,
                  product_data: {
                    name: '3.5% Credit Card Processing Fee',
                    description:
                      'One-time fee on this initial payment, per your signed Fee Agreement. Switch to ACH any time to avoid this fee.',
                  },
                },
                quantity: 1,
              },
            ]
          : []),
      ],
      // Stripe only renders "Then $X per month" copy in subscription-mode
      // Checkout, but subscription-mode + one-time prices triggers the
      // proration_behavior conflict (and any workaround leaks trial UI).
      // Spell out the recurring charge ourselves next to the submit button
      // so the member sees what's coming after this upfront payment.
      custom_text: {
        submit: {
          message: `Then $${(member.monthly_cost_cents / 100).toFixed(2)} per month, billed on the 1st starting ${new Date(
            anchor * 1000
          ).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          })}.`,
        },
      },
      success_url: `${baseUrl}/portal?subscribed=1`,
      cancel_url: `${baseUrl}/portal?canceled=1`,
      metadata: {
        order_type: 'membership_subscription',
        member_id: member.id,
        // Tells the webhook to create a subscription after checkout
        // completes, using the values below.
        create_subscription: '1',
        monthly_cost_cents: String(member.monthly_cost_cents),
        billing_cycle_anchor: String(anchor),
        prorated_first_charge_cents: String(proratedCents),
        last_month_deposit_cents: String(lastMonthDepositCents),
        cc_fee_cents: String(ccFeeCents),
        initial_total_cents: String(proratedCents + lastMonthDepositCents + ccFeeCents),
        selected_payment_method: selectedMethod,
        start_date: typeof startDateRaw === 'string' ? startDateRaw : '',
      },
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
