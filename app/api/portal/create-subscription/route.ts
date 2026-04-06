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

    // Find or create the Stripe customer.
    let customerId = member.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: member.email,
        name: `${member.first_name} ${member.last_name}`,
        metadata: { member_id: member.id },
      });
      customerId = customer.id;
      await getServiceSupabase()
        .from('members')
        .update({ stripe_customer_id: customerId })
        .eq('id', member.id);
    }

    // Compute proration for first charge: charge today for the rest of this
    // month, then bill on the 1st of each subsequent month.
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const day = now.getUTCDate();
    const remaining = daysInMonth - day + 1;
    const proratedCents = Math.round(
      (member.monthly_cost_cents * remaining) / daysInMonth
    );

    // Anchor billing to the 1st of next month (UTC).
    const anchor = Math.floor(Date.UTC(year, month + 1, 1, 12, 0, 0) / 1000);

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
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
        metadata: { member_id: member.id, monthly_cost_cents: String(member.monthly_cost_cents) },
      },
      payment_method_collection: 'always',
      success_url: `${baseUrl}/portal?subscribed=1`,
      cancel_url: `${baseUrl}/portal?canceled=1`,
      metadata: {
        order_type: 'membership_subscription',
        member_id: member.id,
        prorated_first_charge_cents: String(proratedCents),
      },
    });

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
