import Stripe from 'stripe';

// The Stripe Subscriptions API requires `price_data.product` to be a
// real Product ID — unlike Checkout Sessions and Invoice Items, it does
// not accept inline `product_data`. This helper finds-or-creates a
// single shared "Merritt Workspace Membership" product so every monthly
// subscription points at the same product record.
//
// Idempotency: we tag the product with metadata.merritt_membership = '1'
// so subsequent lookups resolve to the same product even if the display
// name changes. Cached in-process to avoid an extra round-trip on every
// subscription creation.

const PRODUCT_NAME = 'Merritt Workspace Membership';
const METADATA_KEY = 'merritt_membership';

let cachedProductId: string | null = null;

export async function getMembershipProductId(stripe: Stripe): Promise<string> {
  if (cachedProductId) return cachedProductId;

  // Stripe doesn't support filtering products by metadata server-side,
  // so we list (active products only — capped at 100, more than enough
  // for our use) and match locally.
  const list = await stripe.products.list({ active: true, limit: 100 });
  const existing = list.data.find(
    (p) => p.metadata?.[METADATA_KEY] === '1'
  );
  if (existing) {
    cachedProductId = existing.id;
    return existing.id;
  }

  const created = await stripe.products.create({
    name: PRODUCT_NAME,
    metadata: { [METADATA_KEY]: '1' },
  });
  cachedProductId = created.id;
  return created.id;
}
