// Shared helpers for charging a member's card on file.
//
// Used by the snack one-click checkout and the conference-room overage
// charge. Keeps "ensure a Stripe customer" and "find a card to charge"
// consistent across both member payment flows.

import Stripe from 'stripe';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export interface MemberStripeInfo {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  stripe_customer_id: string | null;
}

/**
 * Ensure the member has a Stripe customer, creating + persisting one onto the
 * members row if missing. Returns the customer id.
 */
export async function ensureStripeCustomer(
  stripe: Stripe,
  member: MemberStripeInfo,
): Promise<string> {
  if (member.stripe_customer_id) return member.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: member.email,
    name: `${member.first_name} ${member.last_name}`.trim(),
    metadata: { member_id: member.id },
  });

  const sb = getServiceSupabase();
  await sb.from('members').update({ stripe_customer_id: customer.id }).eq('id', member.id);
  return customer.id;
}

/**
 * Find a saved card to charge: prefer the customer's default payment method,
 * else the most recently attached card. Returns null when nothing is on file.
 */
export async function findDefaultCard(stripe: Stripe, customerId: string): Promise<string | null> {
  const customer = await stripe.customers.retrieve(customerId);
  if (!customer.deleted) {
    const defaultPm = customer.invoice_settings?.default_payment_method;
    if (typeof defaultPm === 'string' && defaultPm) return defaultPm;
    if (defaultPm && typeof defaultPm === 'object') return defaultPm.id;
  }
  const cards = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
  return cards.data[0]?.id ?? null;
}
