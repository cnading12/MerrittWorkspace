import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Admin-only: hard-reconcile a member's local payment_history against
// Stripe. This is the "fix it" button when the local table disagrees
// with Stripe (e.g. phantom $0 placeholder invoices recorded as gross,
// dashboard refunds that didn't sync, missing initial Checkout charges).
//
// Algorithm:
//   1. Pull all PaymentIntents for the customer (with latest_charge
//      expanded so we can read amount_refunded).
//   2. Pull all Invoices for the customer.
//   3. Build the "Stripe truth" set of payments — only include Stripe
//      objects where money actually moved (PI.amount_received > 0 or
//      Invoice.amount_paid > 0). $0 placeholder invoices and
//      uncaptured/canceled PIs are deliberately excluded.
//   4. Walk existing local rows. Each one must match a truth entry by
//      its stripe_payment_intent_id or stripe_invoice_id; any row
//      without a corresponding truth entry is a phantom and gets
//      deleted. Matched rows get their amount/status/description
//      refreshed from Stripe.
//   5. Insert any truth entries that don't have a local row yet.
//
// Returns counts so the admin can see what changed.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(req);
    const { id: memberId } = await params;
    const sb = getServiceSupabase();

    const { data: member, error: memberError } = await sb
      .from('members')
      .select('id, stripe_customer_id')
      .eq('id', memberId)
      .single();
    if (memberError || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    if (!member.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Member has no Stripe customer — nothing to reconcile.' },
        { status: 400 }
      );
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Stripe is not configured on the server.' },
        { status: 500 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil' as any,
    });

    const [intentsRes, invoicesRes] = await Promise.all([
      stripe.paymentIntents.list({
        customer: member.stripe_customer_id,
        limit: 100,
        expand: ['data.latest_charge'],
      }),
      stripe.invoices.list({
        customer: member.stripe_customer_id,
        limit: 100,
      }),
    ]);

    type Truth = {
      stripe_payment_intent_id: string | null;
      stripe_invoice_id: string | null;
      amount_cents: number;
      currency: string;
      status: 'succeeded' | 'failed' | 'pending' | 'refunded';
      description: string;
      invoice_pdf_url: string | null;
      paid_at: string | null;
    };

    const truths: Truth[] = [];

    // PaymentIntents (covers initial Checkout one-off charges that have
    // no associated invoice). Filter to ones where money actually moved.
    for (const pi of intentsRes.data) {
      if (pi.status !== 'succeeded') continue;
      const received = pi.amount_received || 0;
      if (received <= 0) continue;
      const charge =
        typeof (pi as any).latest_charge === 'object'
          ? ((pi as any).latest_charge as Stripe.Charge | null)
          : null;
      const refunded =
        !!charge &&
        typeof charge.amount_refunded === 'number' &&
        charge.amount_refunded > 0;
      const piInvoiceId = (pi as any).invoice
        ? typeof (pi as any).invoice === 'string'
          ? ((pi as any).invoice as string)
          : ((pi as any).invoice as any).id
        : null;
      truths.push({
        stripe_payment_intent_id: pi.id,
        stripe_invoice_id: piInvoiceId || null,
        amount_cents: received,
        currency: pi.currency,
        status: refunded ? 'refunded' : 'succeeded',
        description: pi.description || 'Initial membership payment',
        invoice_pdf_url: null,
        paid_at: new Date(pi.created * 1000).toISOString(),
      });
    }

    // Invoices (covers recurring subscription charges). Skip invoices
    // already represented by a PaymentIntent truth above (matched by
    // invoice id) so we don't duplicate. Skip $0 invoices entirely —
    // those are the placeholders that caused the original phantom.
    const piInvoiceIds = new Set(
      truths
        .map((t) => t.stripe_invoice_id)
        .filter((x): x is string => !!x)
    );
    for (const inv of invoicesRes.data) {
      if (!inv.id) continue;
      if (piInvoiceIds.has(inv.id)) continue;
      const paid = inv.amount_paid || 0;
      const due = inv.amount_due || 0;
      const status =
        inv.status === 'paid'
          ? 'succeeded'
          : inv.status === 'uncollectible' || inv.status === 'void'
            ? 'failed'
            : 'pending';
      // Skip $0 invoices — they don't represent money movement and
      // should never have a row.
      if (status === 'succeeded' && paid <= 0) continue;
      const amount = status === 'succeeded' ? paid : due || paid;
      if (amount <= 0) continue;
      truths.push({
        stripe_payment_intent_id: null,
        stripe_invoice_id: inv.id,
        amount_cents: amount,
        currency: inv.currency,
        status,
        description: inv.description || 'Membership',
        invoice_pdf_url: inv.invoice_pdf || null,
        paid_at: inv.status_transitions?.paid_at
          ? new Date(inv.status_transitions.paid_at * 1000).toISOString()
          : null,
      });
    }

    // Pull existing local rows for this member.
    const { data: existing } = await sb
      .from('payment_history')
      .select('*')
      .eq('member_id', memberId);

    const existingRows = existing || [];

    // Match each local row to a truth entry (by PI id first, then by
    // invoice id). Anything unmatched is a phantom.
    const matchedTruthIdx = new Set<number>();
    const phantomIds: string[] = [];
    const updates: { id: string; patch: Record<string, any> }[] = [];

    for (const row of existingRows) {
      let matchIdx = -1;
      if (row.stripe_payment_intent_id) {
        matchIdx = truths.findIndex(
          (t) => t.stripe_payment_intent_id === row.stripe_payment_intent_id
        );
      }
      if (matchIdx === -1 && row.stripe_invoice_id) {
        matchIdx = truths.findIndex(
          (t) => t.stripe_invoice_id === row.stripe_invoice_id
        );
      }
      if (matchIdx === -1) {
        phantomIds.push(row.id);
        continue;
      }
      matchedTruthIdx.add(matchIdx);
      const t = truths[matchIdx];
      const patch: Record<string, any> = {};
      if (row.amount_cents !== t.amount_cents) patch.amount_cents = t.amount_cents;
      if (row.status !== t.status) patch.status = t.status;
      if (
        t.stripe_payment_intent_id &&
        row.stripe_payment_intent_id !== t.stripe_payment_intent_id
      ) {
        patch.stripe_payment_intent_id = t.stripe_payment_intent_id;
      }
      if (
        t.stripe_invoice_id &&
        row.stripe_invoice_id !== t.stripe_invoice_id
      ) {
        patch.stripe_invoice_id = t.stripe_invoice_id;
      }
      if (t.invoice_pdf_url && row.invoice_pdf_url !== t.invoice_pdf_url) {
        patch.invoice_pdf_url = t.invoice_pdf_url;
      }
      if (Object.keys(patch).length > 0) {
        updates.push({ id: row.id, patch });
      }
    }

    // Truth entries with no local row → insert.
    const inserts = truths
      .filter((_, i) => !matchedTruthIdx.has(i))
      .map((t) => ({
        member_id: memberId,
        ...t,
      }));

    if (phantomIds.length > 0) {
      await sb.from('payment_history').delete().in('id', phantomIds);
    }
    for (const u of updates) {
      await sb.from('payment_history').update(u.patch).eq('id', u.id);
    }
    if (inserts.length > 0) {
      await sb.from('payment_history').insert(inserts);
    }

    return NextResponse.json({
      ok: true,
      removed: phantomIds.length,
      updated: updates.length,
      added: inserts.length,
      stripe_payments_seen: truths.length,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
