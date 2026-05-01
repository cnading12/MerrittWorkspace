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
// Two scan paths:
//  1. Members with a `stripe_customer_id` already on file: query Stripe
//     for that customer's subscriptions directly.
//  2. Members WITHOUT a `stripe_customer_id`: look up Stripe customers by
//     email. If exactly one matches (or one obvious primary by active
//     subscription), backfill the customer id and then proceed as in (1).
//     This catches members whose `checkout.session.completed` webhook
//     never wrote the customer id back.
//
// Read-only on the Stripe side; only writes back to the local members
// table. Idempotent.

// Status priority for picking which subscription represents the member's
// current auto-pay state when Stripe returns more than one. Lower number
// wins.
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

type Verdict =
  | 'updated'
  | 'no_change'
  | 'no_stripe_customer'
  | 'no_subscriptions'
  | 'errored';

type MemberOutcome = {
  member_id: string;
  email: string;
  verdict: Verdict;
  detail: string;
  before: {
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    subscription_status: string | null;
  };
  after?: {
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    subscription_status: string | null;
  };
};

type MemberRow = {
  id: string;
  email: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
};

// Picks the best Stripe customer when an email matches more than one. Stripe
// allows multiple customers per email, so we prefer one with any subscription
// (active or otherwise) over one with none, and the most recently created as
// a tiebreaker.
async function findCustomerByEmail(
  stripe: Stripe,
  email: string
): Promise<Stripe.Customer | null> {
  const list = await stripe.customers.list({ email, limit: 10 });
  if (list.data.length === 0) return null;
  if (list.data.length === 1) return list.data[0];

  const withSubInfo = await Promise.all(
    list.data.map(async (c) => {
      const subs = await stripe.subscriptions.list({
        customer: c.id,
        status: 'all',
        limit: 1,
      });
      return { customer: c, hasSub: subs.data.length > 0 };
    })
  );
  withSubInfo.sort((a, b) => {
    if (a.hasSub !== b.hasSub) return a.hasSub ? -1 : 1;
    return (b.customer.created || 0) - (a.customer.created || 0);
  });
  return withSubInfo[0].customer;
}

async function reconcileMember(
  stripe: Stripe,
  sb: ReturnType<typeof getServiceSupabase>,
  m: MemberRow
): Promise<MemberOutcome> {
  const before = {
    stripe_customer_id: m.stripe_customer_id,
    stripe_subscription_id: m.stripe_subscription_id,
    subscription_status: m.subscription_status,
  };

  let customerId = m.stripe_customer_id;
  let backfilledCustomer = false;

  if (!customerId) {
    const customer = await findCustomerByEmail(stripe, m.email);
    if (!customer) {
      return {
        member_id: m.id,
        email: m.email,
        verdict: 'no_stripe_customer',
        detail: 'No Stripe customer matched this member’s email',
        before,
      };
    }
    customerId = customer.id;
    backfilledCustomer = true;
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
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

  const customerChanged = customerId !== m.stripe_customer_id;
  const subChanged = nextSubId !== m.stripe_subscription_id;
  const statusChanged = nextStatus !== m.subscription_status;

  if (!customerChanged && !subChanged && !statusChanged) {
    return {
      member_id: m.id,
      email: m.email,
      verdict: primary ? 'no_change' : 'no_subscriptions',
      detail: primary
        ? 'Already in sync with Stripe'
        : 'Stripe customer found but has no subscriptions',
      before,
    };
  }

  const update: Record<string, any> = {
    stripe_subscription_id: nextSubId,
    subscription_status: nextStatus,
    next_charge_date: nextChargeDate,
  };
  if (backfilledCustomer) update.stripe_customer_id = customerId;

  const { error: upErr } = await sb.from('members').update(update).eq('id', m.id);
  if (upErr) throw new Error(upErr.message);

  let detail: string;
  if (backfilledCustomer && primary) {
    detail = `Backfilled customer id by email match; subscription is ${nextStatus}`;
  } else if (backfilledCustomer) {
    detail = 'Backfilled customer id by email match; no active subscription';
  } else if (!m.stripe_subscription_id && nextSubId) {
    detail = 'Filled missing subscription id from Stripe';
  } else if (m.stripe_subscription_id && !nextSubId) {
    detail = 'Cleared stale subscription id (none in Stripe)';
  } else if (subChanged) {
    detail = 'Replaced with current Stripe subscription';
  } else {
    detail = `Updated subscription_status to ${nextStatus}`;
  }

  return {
    member_id: m.id,
    email: m.email,
    verdict: primary || backfilledCustomer ? 'updated' : 'no_subscriptions',
    detail,
    before,
    after: {
      stripe_customer_id: customerId,
      stripe_subscription_id: nextSubId,
      subscription_status: nextStatus,
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil' as any,
    });
    const sb = getServiceSupabase();

    // Scan everyone who plausibly has auto-pay: active or paused members
    // whose status, customer id, or subscription id suggests they belong in
    // a billing flow. Pending applicants who never paid are filtered out.
    const { data: members, error } = await sb
      .from('members')
      .select(
        'id, email, status, stripe_customer_id, stripe_subscription_id, subscription_status'
      )
      .in('status', ['active', 'paused', 'approved']);
    if (error) throw new Error(error.message);

    const outcomes: MemberOutcome[] = [];
    const errors: { member_id: string; email: string; error: string }[] = [];

    for (const m of members || []) {
      try {
        outcomes.push(await reconcileMember(stripe, sb, m as MemberRow));
      } catch (e: any) {
        errors.push({
          member_id: m.id,
          email: m.email,
          error: e?.message || String(e),
        });
        outcomes.push({
          member_id: m.id,
          email: m.email,
          verdict: 'errored',
          detail: e?.message || String(e),
          before: {
            stripe_customer_id: m.stripe_customer_id,
            stripe_subscription_id: m.stripe_subscription_id,
            subscription_status: m.subscription_status,
          },
        });
      }
    }

    const counts = outcomes.reduce<Record<Verdict, number>>(
      (acc, o) => {
        acc[o.verdict] = (acc[o.verdict] || 0) + 1;
        return acc;
      },
      {
        updated: 0,
        no_change: 0,
        no_stripe_customer: 0,
        no_subscriptions: 0,
        errored: 0,
      }
    );

    return NextResponse.json({
      scanned: outcomes.length,
      counts,
      outcomes,
      errors,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
