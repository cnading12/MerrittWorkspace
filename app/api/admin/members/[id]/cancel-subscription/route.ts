import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { sendCancellationEmailsOnce } from '@/lib/portal/cancellationEmails';
import { memberHasEverPaid, cancelNeverPaidMember } from '@/lib/portal/memberRemoval';
import { getCurrentPeriodEndUnix } from '@/lib/portal/stripeSubscription';

export const dynamic = 'force-dynamic';

// Admin-initiated cancellation. Mirrors the member self-service flow in
// app/api/portal/cancel-subscription/route.ts so an admin-side cancel stops
// the Stripe subscription, applies the Last Month's Membership Fee credit
// against the upcoming invoice, and writes the cancellation effective date
// back onto the member row. Use this when an admin needs to cancel on behalf
// of a member (rare — most members will cancel themselves from the portal).

function lastDayOfMonth(d: Date): Date {
  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    0,
    23, 59, 59,
  ));
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const adminUser = await requireAdmin(req);

    const sb = getServiceSupabase();
    const { data: member, error: memErr } = await sb
      .from('members')
      .select('*')
      .eq('id', id)
      .single();
    if (memErr || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Never-paid members (e.g. trial-day signups) are marked cancelled and KEPT
    // so the team can see who dropped off — staff are emailed inside
    // cancelNeverPaidMember. They can be permanently deleted later by an admin
    // (admin-only delete route). Members who have actually paid fall through to
    // the normal Stripe wind-down below.
    if (!(await memberHasEverPaid(sb, member.id))) {
      const { alreadyCancelled } = await cancelNeverPaidMember({
        sb,
        member,
        cancelledBy: 'admin',
      });
      return NextResponse.json({ ok: true, cancelled: true, never_paid: true, already_cancelled: alreadyCancelled });
    }

    if (!member.stripe_subscription_id) {
      // No live subscription — just flip the local status so the admin's
      // intent is recorded. Nothing to do in Stripe.
      await sb
        .from('members')
        .update({ status: 'cancelled' })
        .eq('id', id);
      // No Stripe sub, so no effective date to derive — the member is
      // cancelled immediately. Still notify both parties (once each).
      await sendCancellationEmailsOnce({
        member,
        effectiveDateIso: member.cancellation_effective_date ?? null,
        cancelledBy: 'admin',
      });
      return NextResponse.json({
        ok: true,
        no_subscription: true,
      });
    }
    if (!member.monthly_cost_cents) {
      return NextResponse.json(
        { error: 'Monthly cost not set on member record.' },
        { status: 400 },
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil' as any,
    });

    const sub = await stripe.subscriptions.retrieve(member.stripe_subscription_id);

    // Idempotent: if the subscription is already cancelled in Stripe, don't
    // re-credit the invoice or touch the cancel schedule again. But the local
    // member row can drift out of sync — e.g. the member cancelled themselves,
    // it was cancelled directly in the Stripe dashboard, or a previous webhook
    // / DB write never landed. In those cases status can still read 'active'
    // even though Stripe is cancelled. Reconcile the local record here so the
    // admin's click actually fixes the displayed status instead of just
    // reporting "already cancelled" forever.
    if (sub.cancel_at || sub.cancel_at_period_end || sub.status === 'canceled') {
      // Derive the effective cancellation date from Stripe: the scheduled
      // cancel_at if set, otherwise the timestamp the sub actually ended.
      const effectiveUnix =
        (sub.cancel_at as number | null) ??
        ((sub as any).ended_at as number | null) ??
        ((sub as any).canceled_at as number | null) ??
        null;
      const effectiveDateIso = effectiveUnix
        ? new Date(effectiveUnix * 1000).toISOString().slice(0, 10)
        : (member.cancellation_effective_date ?? null);

      const needsReconcile =
        member.status !== 'cancelled' ||
        member.cancellation_effective_date !== effectiveDateIso;

      if (needsReconcile) {
        await sb
          .from('members')
          .update({
            subscription_status:
              sub.status === 'canceled' ? 'canceled' : 'cancel_at_period_end',
            status: 'cancelled',
            // Preserve the original notice timestamp if we already recorded one.
            cancellation_notice_received_at:
              member.cancellation_notice_received_at ?? new Date().toISOString(),
            cancellation_effective_date: effectiveDateIso,
          })
          .eq('id', id);
      }

      // Idempotent per-recipient, so a repeat admin click won't re-send.
      await sendCancellationEmailsOnce({
        member,
        effectiveDateIso,
        cancelledBy: 'admin',
      });

      return NextResponse.json({
        ok: true,
        already_cancelled: true,
        reconciled: needsReconcile,
        cancel_at: sub.cancel_at,
        cancellation_effective_date: effectiveDateIso,
      });
    }

    const currentPeriodEndUnix = getCurrentPeriodEndUnix(sub);
    if (!currentPeriodEndUnix) {
      return NextResponse.json(
        { error: 'Subscription has no current period.' },
        { status: 400 },
      );
    }
    const currentPeriodEndDate = new Date(currentPeriodEndUnix * 1000);
    const finalMonthEnd = lastDayOfMonth(currentPeriodEndDate);
    const finalMonthEndUnix = Math.floor(finalMonthEnd.getTime() / 1000);

    const customerId =
      typeof sub.customer === 'string' ? sub.customer : sub.customer?.id;
    if (!customerId) {
      return NextResponse.json(
        { error: 'Subscription has no customer.' },
        { status: 400 },
      );
    }

    // Step 1: credit the upcoming invoice for one full month (Last Month's Fee).
    const credit = await stripe.invoiceItems.create({
      customer: customerId,
      subscription: member.stripe_subscription_id,
      amount: -member.monthly_cost_cents,
      currency: 'usd',
      description: "Last Month's Membership Fee — credit applied (paid at sign-up)",
      metadata: {
        kind: 'last_month_deposit_credit',
        member_id: member.id,
      },
    });

    // Step 2: hard-cancel at the end of the final calendar month.
    let updated: Stripe.Subscription;
    try {
      // Note: only cancel_at, never combined with cancel_at_period_end —
      // Stripe rejects requests that pass both parameters together.
      updated = await stripe.subscriptions.update(member.stripe_subscription_id, {
        cancel_at: finalMonthEndUnix,
        proration_behavior: 'none',
        metadata: {
          ...(sub.metadata || {}),
          cancelled_by: 'admin',
          cancelled_via: 'admin',
          cancelled_by_admin_user_id: adminUser.id,
          notice_received_at: new Date().toISOString(),
          cancellation_effective_at: finalMonthEnd.toISOString(),
        },
      });
    } catch (e) {
      try {
        await stripe.invoiceItems.del(credit.id);
      } catch {
        // best effort
      }
      throw e;
    }

    // Step 3: mirror cancellation state locally.
    const effectiveDateIso = finalMonthEnd.toISOString().slice(0, 10);
    await sb
      .from('members')
      .update({
        subscription_status: 'cancel_at_period_end',
        status: 'cancelled',
        cancellation_notice_received_at: new Date().toISOString(),
        cancellation_effective_date: effectiveDateIso,
        last_month_credit_invoice_item_id: credit.id,
      })
      .eq('id', id);

    // Notify the member (confirmation + policy) and staff. Best-effort and
    // idempotent per-recipient — never blocks or fails the cancellation.
    await sendCancellationEmailsOnce({
      member,
      effectiveDateIso,
      cancelledBy: 'admin',
    });

    return NextResponse.json({
      ok: true,
      cancel_at: updated.cancel_at,
      current_period_end: getCurrentPeriodEndUnix(updated),
      cancellation_effective_date: effectiveDateIso,
      last_month_credit_invoice_item_id: credit.id,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
