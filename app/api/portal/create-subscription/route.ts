import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

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

    // Billing logic:
    //   - We anchor the monthly cycle to the 1st of next month at 12:00 UTC
    //     (subscription_data.billing_cycle_anchor below).
    //   - Because the anchor is in the FUTURE relative to subscription
    //     creation and we set `proration_behavior: 'create_prorations'`,
    //     Stripe will charge a prorated amount immediately covering the
    //     period from today through (1st of next month - 1 day), then
    //     charge the full monthly amount on the 1st of each subsequent
    //     month. This matches "charged on first of month (prorated)".
    //   - We also compute the prorated cents locally so we can stash it
    //     in session metadata for our own bookkeeping/email receipts.
    //     Stripe is the source of truth for the actual charge amount.
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const day = now.getUTCDate();
    const remaining = daysInMonth - day + 1;
    const proratedCents = Math.round(
      (member.monthly_cost_cents * remaining) / daysInMonth
    );

    // Anchor billing to the 1st of next month (UTC). Date.UTC handles
    // December → January rollover (month + 1 === 12 becomes Jan of year+1).
    const anchor = Math.floor(Date.UTC(year, month + 1, 1, 12, 0, 0) / 1000);

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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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
      ],
      subscription_data: {
        billing_cycle_anchor: anchor,
        proration_behavior: 'create_prorations',
        metadata: {
          member_id: member.id,
          monthly_cost_cents: String(member.monthly_cost_cents),
          selected_payment_method: selectedMethod,
        },
      },
      payment_method_collection: 'always',
      success_url: `${baseUrl}/portal?subscribed=1`,
      cancel_url: `${baseUrl}/portal?canceled=1`,
      metadata: {
        order_type: 'membership_subscription',
        member_id: member.id,
        prorated_first_charge_cents: String(proratedCents),
        selected_payment_method: selectedMethod,
      },
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
