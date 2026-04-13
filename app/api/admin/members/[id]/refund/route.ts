import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Admin-only: refund the most recent succeeded payment for a member.
// Issues a full refund via Stripe and updates the local payment_history
// row to 'refunded'. Only the latest succeeded payment is eligible — if no
// succeeded payment exists, a 404 is returned.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id: memberId } = await params;
    const sb = getServiceSupabase();

    // Verify the member exists.
    const { data: member, error: memberError } = await sb
      .from('members')
      .select('id')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Find the most recent succeeded payment for this member.
    const { data: payment, error: paymentError } = await sb
      .from('payment_history')
      .select('*')
      .eq('member_id', memberId)
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
