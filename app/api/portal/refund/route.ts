import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Member self-service: refund the most recent succeeded payment.
// This issues a full refund via Stripe and updates the local payment_history
// row to 'refunded'. Only the latest succeeded payment is eligible — if no
// succeeded payment exists, a 404 is returned.
export async function POST(req: NextRequest) {
  try {
    const member = await requireMember(req);
    const sb = getServiceSupabase();

    // Find the most recent succeeded payment for this member.
    const { data: payment, error: paymentError } = await sb
      .from('payment_history')
      .select('*')
      .eq('member_id', member.id)
      .eq('status', 'succeeded')
      .order('paid_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'No refundable payment found' },
        { status: 404 }
      );
    }

    if (!payment.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: 'Payment has no associated payment intent' },
        { status: 400 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil' as any,
    });

    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
    });

    // Mark the local payment_history row as refunded.
    await sb
      .from('payment_history')
      .update({ status: 'refunded' })
      .eq('id', payment.id);

    return NextResponse.json({
      ok: true,
      refund_id: refund.id,
      amount_refunded: refund.amount,
      status: refund.status,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
