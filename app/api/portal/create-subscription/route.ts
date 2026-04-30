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

    // Billing logic:
    //   - The member chose a membership start_date when signing the Fee
    //     Agreement (today through today + 30 days).
    //   - The first invoice fires at signup (today) and bundles two
    //     non-recurring line items: the prorated first partial month
    //     (start_date → end of start_date's month) and a one-month
    //     deposit. We pass these as one-off line items so the amounts
    //     match the signed Fee Agreement exactly.
    //   - The recurring monthly membership uses `trial_end` set to the 1st
    //     of the month AFTER the start month. During the trial Stripe
    //     doesn't charge the recurring item, so the first full-month
    //     charge fires on trial_end (which becomes the billing cycle
    //     anchor), then every 1st of the month thereafter. We use
    //     `trial_end` instead of `billing_cycle_anchor` +
    //     `proration_behavior: 'none'` because Stripe Checkout disallows
    //     `proration_behavior: 'none'` when the session also has one-time
    //     prices (our prorated/deposit line items).
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
    // Checkout automatically saves the payment method used during the flow
    // as the subscription's default_payment_method, so subsequent monthly
    // invoices auto-charge it without any extra configuration.
    const checkoutPaymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
      selectedMethod === 'ach' ? ['us_bank_account', 'card'] : ['card', 'link'];

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
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
            recurring: { interval: 'month' },
            unit_amount: member.monthly_cost_cents,
            product_data: {
              name: 'Merritt Workspace Membership',
              description: `${member.first_name} ${member.last_name}`,
            },
          },
          quantity: 1,
        },
        {
          // One-off prorated first partial month (start_date → end of
          // start month). We charge it explicitly as a one-time item so
          // the amount matches the signed Fee Agreement regardless of
          // when the member actually completes Stripe Checkout.
          price_data: {
            currency: 'usd',
            unit_amount: proratedCents,
            product_data: {
              name: "First Month's Membership Fee (prorated)",
            },
          },
          quantity: 1,
        },
        {
          // One-off last-month deposit. No `recurring` key -> Stripe treats
          // this as a one-time item and places it on the first invoice only.
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
      subscription_data: {
        // Trial through the end of the start month. Stripe doesn't charge
        // the recurring item during the trial, so the first full-month
        // charge fires on trial_end (which Stripe also uses as the billing
        // cycle anchor). The prorated first partial month is already on
        // the first invoice as a one-time line item above.
        trial_end: anchor,
        metadata: {
          member_id: member.id,
          monthly_cost_cents: String(member.monthly_cost_cents),
          last_month_deposit_cents: String(lastMonthDepositCents),
          selected_payment_method: selectedMethod,
          start_date: typeof startDateRaw === 'string' ? startDateRaw : '',
        },
      },
      payment_method_collection: 'always',
      success_url: `${baseUrl}/portal?subscribed=1`,
      cancel_url: `${baseUrl}/portal?canceled=1`,
      metadata: {
        order_type: 'membership_subscription',
        member_id: member.id,
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
