import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { sendCancellationEmailsOnce } from '@/lib/portal/cancellationEmails';

export const dynamic = 'force-dynamic';

// Member self-service cancellation.
//
// Policy (see Section 4 of Terms & Conditions, lib/portal/legal.ts):
//   • Members give written 30-day notice to cancel.
//   • The Last Month's Membership Fee they paid at sign-up satisfies their
//     final month — they are NOT invoiced for it.
//   • Termination is effective on the last day of the calendar month
//     following the member's current paid-for billing period (i.e. the
//     month for which the next monthly invoice would otherwise have been
//     issued). This always meets or exceeds the 30-day-notice requirement
//     for any notice given outside the very last day of a calendar month.
//
// Implementation:
//   1. Add a one-time negative invoice item (= -monthly_cost) attached to
//      the subscription. Stripe auto-applies pending invoice items to the
//      next draft subscription invoice, which zeroes out the upcoming
//      monthly charge — i.e. the "Last Month's Fee" deposit gets credited
//      against the final month's invoice.
//   2. Update the subscription with a hard `cancel_at` set to the last
//      moment of the final calendar month. We deliberately use `cancel_at`
//      (not `cancel_at_period_end`) because we want to extend access one
//      full calendar month past the current paid period, not stop at it.
//   3. Mirror cancellation_notice_received_at + cancellation_effective_date
//      onto the member row so the portal and admin views show the real
//      last day of membership.

function lastDayOfMonth(d: Date): Date {
  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    0,
    23, 59, 59,
  ));
}

export async function POST(req: NextRequest) {
  try {
    const member = await requireMember(req);
    if (!member.stripe_subscription_id) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
    }
    if (!member.monthly_cost_cents) {
      return NextResponse.json(
        { error: 'Monthly cost not set on member record — contact us to cancel.' },
        { status: 400 },
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil' as any,
    });

    const sub = await stripe.subscriptions.retrieve(member.stripe_subscription_id);

    // Idempotent: if already cancelled, don't double-credit the upcoming
    // invoice. But still reconcile the local member row in case it drifted out
    // of sync (e.g. it was cancelled directly in Stripe, or a prior DB write /
    // webhook never landed) so the portal reflects the real cancelled state.
    if (sub.cancel_at || sub.cancel_at_period_end || sub.status === 'canceled') {
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
        await getServiceSupabase()
          .from('members')
          .update({
            subscription_status:
              sub.status === 'canceled' ? 'canceled' : 'cancel_at_period_end',
            status: 'cancelled',
            cancellation_notice_received_at:
              member.cancellation_notice_received_at ?? new Date().toISOString(),
            cancellation_effective_date: effectiveDateIso,
          })
          .eq('id', member.id);
      }

      // Best-effort confirmation/notification. Idempotent per-recipient, so a
      // repeat click (which lands here) won't re-send to anyone already mailed.
      await sendCancellationEmailsOnce({
        member,
        effectiveDateIso,
        cancelledBy: 'member',
      });

      return NextResponse.json({
        ok: true,
        already_cancelled: true,
        reconciled: needsReconcile,
        cancel_at: sub.cancel_at,
        cancellation_effective_date: effectiveDateIso,
      });
    }

    // current_period_end is the unix timestamp at which Stripe will roll the
    // subscription into the next billing period. For monthly subs anchored
    // to the 1st, this is "1st of next calendar month, 00:00 UTC". The
    // "final month" is the calendar month that contains this date.
    const currentPeriodEndUnix = (sub as any).current_period_end as number | undefined;
    if (!currentPeriodEndUnix) {
      return NextResponse.json(
        { error: 'Subscription has no current period — contact us to cancel.' },
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
        { error: 'Subscription has no customer — contact us to cancel.' },
        { status: 400 },
      );
    }

    // Step 1: credit the upcoming invoice for one full month.
    // This represents applying the Last Month's Membership Fee (collected
    // at sign-up) against the final month's recurring charge.
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
      updated = await stripe.subscriptions.update(member.stripe_subscription_id, {
        cancel_at: finalMonthEndUnix,
        cancel_at_period_end: false,
        proration_behavior: 'none',
        metadata: {
          ...(sub.metadata || {}),
          cancelled_by: 'member',
          cancelled_via: 'portal',
          notice_received_at: new Date().toISOString(),
          cancellation_effective_at: finalMonthEnd.toISOString(),
        },
      });
    } catch (e) {
      // If the subscription update fails, roll back the credit so the
      // member isn't left with a free month they can't use.
      try {
        await stripe.invoiceItems.del(credit.id);
      } catch {
        // best effort
      }
      throw e;
    }

    // Step 3: mirror cancellation state locally.
    const effectiveDateIso = finalMonthEnd.toISOString().slice(0, 10);
    await getServiceSupabase()
      .from('members')
      .update({
        subscription_status: 'cancel_at_period_end',
        status: 'cancelled',
        cancellation_notice_received_at: new Date().toISOString(),
        cancellation_effective_date: effectiveDateIso,
        last_month_credit_invoice_item_id: credit.id,
      })
      .eq('id', member.id);

    // Notify the member (confirmation + policy) and staff. Best-effort and
    // idempotent per-recipient — never blocks or fails the cancellation.
    await sendCancellationEmailsOnce({
      member,
      effectiveDateIso,
      cancelledBy: 'member',
    });

    return NextResponse.json({
      ok: true,
      cancel_at: updated.cancel_at,
      current_period_end: (updated as any).current_period_end ?? null,
      cancellation_effective_date: effectiveDateIso,
      last_month_credit_invoice_item_id: credit.id,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
