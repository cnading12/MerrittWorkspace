import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Reconciles each member's locally-cached Stripe subscription fields with
// the truth in Stripe. Subscription webhooks are the primary path; this
// route is a safety net for the cases where a webhook silently failed
// (caught error in checkout.session.completed, missed delivery, race with
// subscription creation) and the database drifted out of sync.
//
// Read-only on the Stripe side; only writes back to the local members
// table. Idempotent.

// Status priority for picking which subscription represents the member's
// current auto-pay state when Stripe returns more than one. Lower number
// wins. Statuses Stripe can return: incomplete, incomplete_expired,
// trialing, active, past_due, canceled, unpaid.
const STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  trialing: 1,
  past_due: 2,
  incomplete: 3,
  unpaid: 4,
  incomplete_expired: 5,
  canceled: 6,
};

function pickPrimarySubscription(
  subs: Stripe.Subscription[]
): Stripe.Subscription | null {
  if (subs.length === 0) return null;
  return [...subs].sort((a, b) => {
    const ap = STATUS_PRIORITY[a.status] ?? 99;
    const bp = STATUS_PRIORITY[b.status] ?? 99;
    if (ap !== bp) return ap - bp;
    return (b.created || 0) - (a.created || 0);
  })[0];
}

type ReconcileChange = {
  member_id: string;
  email: string;
  before: {
    stripe_subscription_id: string | null;
    subscription_status: string | null;
  };
  after: {
    stripe_subscription_id: string | null;
    subscription_status: string | null;
  };
  reason: string;
};

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil' as any,
    });
    const sb = getServiceSupabase();

    const { data: members, error } = await sb
      .from('members')
      .select(
        'id, email, stripe_customer_id, stripe_subscription_id, subscription_status'
      )
      .not('stripe_customer_id', 'is', null);
    if (error) throw new Error(error.message);

    const changes: ReconcileChange[] = [];
    const errors: { member_id: string; email: string; error: string }[] = [];
    let scanned = 0;

    for (const m of members || []) {
      scanned += 1;
      try {
        const subs = await stripe.subscriptions.list({
          customer: m.stripe_customer_id!,
          status: 'all',
          limit: 10,
        });
        const primary = pickPrimarySubscription(subs.data);

        const nextSubId = primary?.id ?? null;
        const nextStatus = primary?.status ?? null;
        const cpe =
          primary && (primary as any).current_period_end
            ? ((primary as any).current_period_end as number)
            : null;
        const nextChargeDate = cpe
          ? new Date(cpe * 1000).toISOString().slice(0, 10)
          : null;

        const subChanged = nextSubId !== m.stripe_subscription_id;
        const statusChanged = nextStatus !== m.subscription_status;
        if (!subChanged && !statusChanged) continue;

        const reason = !m.stripe_subscription_id && nextSubId
          ? 'filled missing subscription id'
          : m.stripe_subscription_id && !nextSubId
            ? 'cleared stale subscription id (none in Stripe)'
            : subChanged
              ? 'replaced with current Stripe subscription'
              : 'updated subscription status from Stripe';

        const { error: upErr } = await sb
          .from('members')
          .update({
            stripe_subscription_id: nextSubId,
            subscription_status: nextStatus,
            next_charge_date: nextChargeDate,
          })
          .eq('id', m.id);
        if (upErr) throw new Error(upErr.message);

        changes.push({
          member_id: m.id,
          email: m.email,
          before: {
            stripe_subscription_id: m.stripe_subscription_id,
            subscription_status: m.subscription_status,
          },
          after: {
            stripe_subscription_id: nextSubId,
            subscription_status: nextStatus,
          },
          reason,
        });
      } catch (e: any) {
        errors.push({
          member_id: m.id,
          email: m.email,
          error: e?.message || String(e),
        });
      }
    }

    return NextResponse.json({
      scanned,
      updated: changes.length,
      errored: errors.length,
      changes,
      errors,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
