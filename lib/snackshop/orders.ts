// Server-only helper for persisting Snackshop purchases.
//
// Called from the Stripe webhook(s) for guest / hosted-checkout orders and
// from the member one-click checkout route. Writes are idempotent: the
// snack_orders table has unique indexes on stripe_session_id and
// stripe_payment_intent_id, so a duplicate webhook delivery (or delivery
// to both snack webhook endpoints) is a no-op rather than a duplicate row.

import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export interface SnackOrderItem {
  id?: string;
  name: string;
  price: number; // dollars
  quantity: number;
}

export interface RecordSnackOrderInput {
  memberId?: string | null;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  officeNumber?: string | null;
  notes?: string | null;
  items: SnackOrderItem[];
  totalCents: number;
  currency?: string;
  paymentMethod: 'card' | 'saved_card';
  isMemberOrder: boolean;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  paidAt?: string | null;
}

/**
 * Idempotently record a paid Snackshop order. Returns true when a new row
 * was inserted, false when the order already existed (duplicate webhook).
 * Never throws on a duplicate; logs and rethrows on unexpected errors so a
 * webhook can decide whether to 500 (and let Stripe retry).
 */
export async function recordSnackOrder(input: RecordSnackOrderInput): Promise<boolean> {
  const sb = getServiceSupabase();

  const row = {
    member_id: input.memberId ?? null,
    order_number: input.orderNumber,
    customer_name: input.customerName,
    customer_email: input.customerEmail,
    office_number: input.officeNumber ?? null,
    notes: input.notes ?? null,
    items: input.items ?? [],
    total_cents: input.totalCents,
    currency: input.currency ?? 'usd',
    payment_method: input.paymentMethod,
    is_member_order: input.isMemberOrder,
    stripe_session_id: input.stripeSessionId ?? null,
    stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    status: 'paid' as const,
    paid_at: input.paidAt ?? new Date().toISOString(),
  };

  const { error } = await sb.from('snack_orders').insert(row);

  if (error) {
    // 23505 = unique_violation → the order was already recorded. Treat as a
    // successful no-op so duplicate webhook deliveries don't 500.
    if ((error as { code?: string }).code === '23505') {
      console.log('ℹ️ snack_orders: order already recorded, skipping', {
        session: row.stripe_session_id,
        pi: row.stripe_payment_intent_id,
      });
      return false;
    }
    console.error('❌ snack_orders insert failed:', error);
    throw new Error(`Failed to record snack order: ${error.message}`);
  }

  return true;
}
