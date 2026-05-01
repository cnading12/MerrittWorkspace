import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { billingCycleAnchorAfter, parseStartDate } from '@/lib/portal/legal';

export const dynamic = 'force-dynamic';

// Recovery endpoint for members whose checkout.session.completed webhook
// successfully recorded the upfront Checkout charge but failed to create
// the recurring subscription via stripe.subscriptions.create. The webhook
// flags those members with subscription_status = 'creation_failed' (and
// logs the error to subscription_creation_failures); this route lets an
// admin retry creation using the saved payment method that's already
// pinned on the Stripe customer.
//
// Eligibility is the same predicate the admin UI gates the recovery
// button on:
//   stripe_customer_id IS NOT NULL
//   AND stripe_subscription_id IS NULL
//   AND agreement_signed = true
//   AND subscription_status = 'creation_failed'
//
// We deliberately do NOT write stripe_subscription_id back here. The
// existing customer.subscription.created webhook handler is the single
// source of truth for that side effect — letting it land normally keeps
// one code path responsible for member-row updates on subscription
// creation.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireAdmin(req);
    const sb = getServiceSupabase();

    const { data: member, error: memErr } = await sb
      .from('members')
      .select(
        'id, first_name, last_name, monthly_cost_cents, agreement_signed, stripe_customer_id, stripe_subscription_id, subscription_status'
      )
      .eq('id', id)
      .single();
    if (memErr || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (member.stripe_subscription_id) {
      return NextResponse.json(
        {
          error:
            'Member already has a subscription. Refusing to create a second one.',
        },
        { status: 400 }
      );
    }
    if (!member.stripe_customer_id) {
      return NextResponse.json(
        {
          error:
            'Member has no Stripe customer on file. Send them a fresh payment link instead.',
        },
        { status: 400 }
      );
    }
    if (!member.agreement_signed) {
      return NextResponse.json(
        { error: 'Member has not signed a Fee Agreement.' },
        { status: 400 }
      );
    }
    if (member.subscription_status !== 'creation_failed') {
      return NextResponse.json(
        {
          error:
            'Member is not flagged as creation_failed. This route only recovers members the webhook explicitly marked.',
        },
        { status: 400 }
      );
    }
    if (!member.monthly_cost_cents || member.monthly_cost_cents <= 0) {
      return NextResponse.json(
        { error: 'Member has no monthly cost assigned.' },
        { status: 400 }
      );
    }

    const { data: feeAgreement } = await sb
      .from('member_agreements')
      .select('id, metadata')
      .eq('member_id', id)
      .eq('agreement_type', 'fee_agreement')
      .order('signed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!feeAgreement) {
      return NextResponse.json(
        { error: 'No signed Fee Agreement found for this member.' },
        { status: 400 }
      );
    }
    const startDateRaw = (feeAgreement.metadata as any)?.start_date;
    let startDate: Date;
    try {
      startDate =
        typeof startDateRaw === 'string' && startDateRaw
          ? parseStartDate(startDateRaw)
          : new Date();
    } catch {
      return NextResponse.json(
        {
          error:
            'Fee Agreement has an invalid start_date — re-sign before retrying.',
        },
        { status: 400 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil' as any,
    });

    // Verify the customer has a saved default payment method. The webhook
    // pins it on invoice_settings.default_payment_method during the original
    // Checkout completion (route.ts line ~102), so any member who reached
    // 'creation_failed' should have one — but a customer could lose it via
    // a manual Dashboard edit. Fail fast with a clear message rather than
    // creating a subscription Stripe will immediately mark incomplete.
    const customer = await stripe.customers.retrieve(member.stripe_customer_id);
    if ((customer as any).deleted) {
      return NextResponse.json(
        { error: 'Stripe customer is deleted. Send a fresh payment link.' },
        { status: 400 }
      );
    }
    const defaultPm = (customer as Stripe.Customer).invoice_settings
      ?.default_payment_method;
    if (!defaultPm) {
      return NextResponse.json(
        {
          error:
            'Stripe customer has no default payment method on file. Send a fresh payment link to collect one.',
        },
        { status: 400 }
      );
    }

    const anchor = billingCycleAnchorAfter(startDate);
    const monthlyCostCents = member.monthly_cost_cents;

    // Match the webhook's subscriptions.create call byte-for-byte except for
    // default_payment_method, which we omit so the subscription inherits the
    // customer's invoice_settings.default_payment_method (single source of
    // truth on the customer record). proration_behavior: 'none' is critical:
    // the member already paid first month + deposit at Checkout; we do NOT
    // want Stripe to invoice them again for the partial-month proration the
    // anchor would otherwise generate.
    const sub = await stripe.subscriptions.create({
      customer: member.stripe_customer_id,
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
      collection_method: 'charge_automatically',
      metadata: {
        member_id: member.id,
        monthly_cost_cents: String(monthlyCostCents),
        last_month_deposit_cents:
          (feeAgreement.metadata as any)?.last_month_cents != null
            ? String((feeAgreement.metadata as any).last_month_cents)
            : '',
        selected_payment_method:
          (feeAgreement.metadata as any)?.payment_method || '',
        start_date: typeof startDateRaw === 'string' ? startDateRaw : '',
        recovery: '1',
        recovery_fee_agreement_id: feeAgreement.id,
      },
    } as any);

    return NextResponse.json({
      subscription_id: sub.id,
      status: sub.status,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
