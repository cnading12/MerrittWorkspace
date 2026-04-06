import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Member self-service: cancel the active Stripe subscription at period end.
// We do NOT cancel immediately — the member keeps access through the end of
// the period they've already paid for. Stripe will fire a
// `customer.subscription.updated` event which the webhook can use to keep
// our local mirror in sync; we also write the new status here so the UI
// reflects the change immediately.
export async function POST(req: NextRequest) {
  try {
    const member = await requireMember(req);
    if (!member.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil' as any,
    });

    const updated = await stripe.subscriptions.update(member.stripe_subscription_id, {
      cancel_at_period_end: true,
      metadata: { cancelled_by: 'member', cancelled_via: 'portal' },
    });

    await getServiceSupabase()
      .from('members')
      .update({
        subscription_status: 'cancel_at_period_end',
        status: 'cancelled',
      })
      .eq('id', member.id);

    return NextResponse.json({
      ok: true,
      cancel_at: updated.cancel_at,
      current_period_end: (updated as any).current_period_end ?? null,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
