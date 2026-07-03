import Stripe from 'stripe';

// As of Stripe API version 2025-03-31.basil, `current_period_end` (and
// `current_period_start`) no longer exist on the Subscription object —
// they moved to each subscription item. Reading them off the top-level
// subscription silently yields undefined, which the cancellation routes
// used to misreport as "Subscription has no current period" for perfectly
// healthy active subscriptions.
//
// A subscription can technically carry multiple items with different
// periods (ours only ever have one), so take the latest item period end.
// Fall back to the legacy top-level field in case the account/client ever
// runs against a pre-basil API version.
export function getCurrentPeriodEndUnix(sub: Stripe.Subscription): number | null {
  const itemEnds = (sub.items?.data ?? [])
    .map((item) => (item as any).current_period_end as number | undefined)
    .filter((end): end is number => typeof end === 'number');
  if (itemEnds.length > 0) return Math.max(...itemEnds);

  const legacyEnd = (sub as any).current_period_end as number | undefined;
  return typeof legacyEnd === 'number' ? legacyEnd : null;
}
