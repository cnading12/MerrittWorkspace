import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Admin-only: delete a stale/phantom row from the local payment_history.
// Used to clean up rows that don't correspond to a real Stripe charge —
// e.g. legacy rows recorded by older webhook versions that mis-summed
// amount_due on $0 invoices. This only touches our DB; nothing in Stripe
// changes. The admin GET reconciles refunded status from Stripe on every
// load, so a re-sync after deletion will reinstate the row only if Stripe
// actually has a matching PaymentIntent.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    await requireAdmin(req);
    const { id: memberId, paymentId } = await params;
    const sb = getServiceSupabase();

    const { data: existing, error: fetchErr } = await sb
      .from('payment_history')
      .select('id, member_id')
      .eq('id', paymentId)
      .maybeSingle();
    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Payment row not found' }, { status: 404 });
    }
    if (existing.member_id !== memberId) {
      return NextResponse.json(
        { error: 'Payment row does not belong to this member' },
        { status: 400 }
      );
    }

    const { error: delErr } = await sb
      .from('payment_history')
      .delete()
      .eq('id', paymentId);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
