import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { isOneTimeDesignation } from '@/lib/portal/pricing';
import {
  billingCycleAnchorAfter,
  calculateProratedFirstMonthCents,
  parseStartDate,
} from '@/lib/portal/legal';

export const dynamic = 'force-dynamic';

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

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil' as any,
    });

    const sb = getServiceSupabase();

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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

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
              description: `${member.first_name} ${member.last_name}`,
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
        initial_total_cents: String(proratedCents + lastMonthDepositCents),
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
