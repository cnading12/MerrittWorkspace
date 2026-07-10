// Day-pass purchases for onboarded One Day Dedicated Desk members.
//
//  GET  → the member's day passes (newest first) plus the valid purchase
//         date window, for the portal UI.
//  POST → buy another pass for a chosen date WITHOUT re-applying: opens a
//         Stripe Checkout session in `payment` mode (same pricing as the
//         original pass — member.monthly_cost_cents plus a 3.5% fee when
//         paying by card). The subscriptions webhook records the pass in
//         day_passes + payment_history on `checkout.session.completed`.
//
// The first pass comes from the initial onboarding payment (see
// app/api/portal/create-subscription), so this route requires onboarding to
// be complete — it's strictly a repurchase path.

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { denverTodayIso } from '@/lib/bookings/conference-hours';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// How far ahead a pass can be bought, matching the flex/conference horizon.
const MAX_ADVANCE_DAYS = 60;

function maxPurchaseDateIso(todayIso: string): string {
  const [y, m, d] = todayIso.split('-').map(Number);
  const max = new Date(Date.UTC(y, m - 1, d + MAX_ADVANCE_DAYS));
  return `${max.getUTCFullYear()}-${String(max.getUTCMonth() + 1).padStart(2, '0')}-${String(max.getUTCDate()).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const member = await requireMember(req);
    if (member.designation !== 'one_day_dedicated_desk') {
      return NextResponse.json(
        { error: 'Day passes are only available on the One Day Dedicated Desk plan.' },
        { status: 403 }
      );
    }
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('day_passes')
      .select('id, pass_date, amount_cents, status, created_at')
      .eq('member_id', member.id)
      .order('pass_date', { ascending: false });
    if (error) throw new Error(error.message);
    const today = denverTodayIso();
    return NextResponse.json({
      passes: data || [],
      today,
      max_purchase_date: maxPurchaseDateIso(today),
      price_cents: member.monthly_cost_cents ?? 3000,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e?.message || 'Server error' }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const member = await requireMember(req);
    if (member.designation !== 'one_day_dedicated_desk') {
      return NextResponse.json(
        { error: 'Day passes are only available on the One Day Dedicated Desk plan.' },
        { status: 403 }
      );
    }
    // Repurchase requires a completed onboarding: agreement signed and the
    // first pass already paid for. (The first pass goes through the normal
    // onboarding payment flow.)
    if (!member.agreement_signed || !member.onboarding_unlocked) {
      return NextResponse.json(
        { error: 'Finish onboarding (agreement + first payment) before buying additional day passes.' },
        { status: 400 }
      );
    }
    if (member.status === 'cancelled' || member.status === 'declined' || member.status === 'paused') {
      return NextResponse.json(
        { error: 'Your membership is not active. Contact memberservices@merrittworkspace.net.' },
        { status: 403 }
      );
    }
    if (!member.monthly_cost_cents) {
      return NextResponse.json(
        { error: 'No day-pass price assigned. Contact your administrator.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const passDate: string = typeof body?.pass_date === 'string' ? body.pass_date : '';
    const today = denverTodayIso();
    const maxDate = maxPurchaseDateIso(today);
    if (!DATE_RE.test(passDate)) {
      return NextResponse.json({ error: 'pass_date must be YYYY-MM-DD.' }, { status: 400 });
    }
    if (passDate < today || passDate > maxDate) {
      return NextResponse.json(
        { error: `pass_date must be between ${today} and ${maxDate}.` },
        { status: 400 }
      );
    }

    const sb = getServiceSupabase();
    const { data: existing } = await sb
      .from('day_passes')
      .select('id')
      .eq('member_id', member.id)
      .eq('pass_date', passDate)
      .eq('status', 'confirmed')
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: `You already have a day pass for ${passDate}.` },
        { status: 409 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil' as any,
    });

    // Same payment-method choice the member made on their Fee Agreement:
    // ACH (no fee) or card (3.5% processing fee) — matching the original
    // day-pass checkout in create-subscription.
    const { data: feeAgreement } = await sb
      .from('member_agreements')
      .select('metadata')
      .eq('member_id', member.id)
      .eq('agreement_type', 'fee_agreement')
      .maybeSingle();
    const selectedMethod =
      (feeAgreement?.metadata as any)?.payment_method === 'ach' ? 'ach' : 'card';

    let customerId = member.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: member.email,
        name: `${member.first_name} ${member.last_name}`,
        metadata: { member_id: member.id },
      });
      customerId = customer.id;
      await sb.from('members').update({ stripe_customer_id: customerId }).eq('id', member.id);
    }

    const ccFeeCents =
      selectedMethod === 'card' ? Math.round(member.monthly_cost_cents * 0.035) : 0;
    const totalCents = member.monthly_cost_cents + ccFeeCents;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

    const checkoutPaymentMethodTypes: Stripe.Checkout.SessionCreateParams.PaymentMethodType[] =
      selectedMethod === 'ach' ? ['us_bank_account', 'card'] : ['card', 'link'];

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
              description: `${member.first_name} ${member.last_name} — day pass for ${passDate}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/portal?day_pass=1`,
      cancel_url: `${baseUrl}/portal?canceled=1`,
      metadata: {
        order_type: 'day_pass',
        member_id: member.id,
        pass_date: passDate,
        base_cents: String(member.monthly_cost_cents),
        cc_fee_cents: String(ccFeeCents),
        selected_payment_method: selectedMethod,
      },
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e?.message || 'Server error' }, { status });
  }
}
