import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Backfills `payment_history.invoice_pdf_url` for rows that were recorded
// before the webhook started saving the Charge `receipt_url` for Checkout
// (`payment` mode) charges. Two paths:
//   - Rows with a `stripe_payment_intent_id`: retrieve the PaymentIntent
//     with `latest_charge` expanded, take `charge.receipt_url`.
//   - Rows with only a `stripe_invoice_id` (recurring invoices that
//     happened to webhook in before Stripe rendered the PDF): retrieve
//     the Invoice and take `invoice.invoice_pdf`.
// Idempotent — only touches rows where `invoice_pdf_url` is null.

type Outcome =
  | { id: string; verdict: 'updated'; url: string }
  | { id: string; verdict: 'no_url_available'; detail: string }
  | { id: string; verdict: 'errored'; detail: string };

type Row = {
  id: string;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
};

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil' as any,
    });
    const sb = getServiceSupabase();

    const { data: rows, error } = await sb
      .from('payment_history')
      .select('id, stripe_invoice_id, stripe_payment_intent_id')
      .is('invoice_pdf_url', null)
      .eq('status', 'succeeded');
    if (error) throw new Error(error.message);

    const outcomes: Outcome[] = [];

    for (const row of (rows || []) as Row[]) {
      try {
        let url: string | null = null;

        if (row.stripe_payment_intent_id) {
          const pi = await stripe.paymentIntents.retrieve(
            row.stripe_payment_intent_id,
            { expand: ['latest_charge'] }
          );
          const charge = pi.latest_charge;
          if (charge && typeof charge !== 'string') {
            url = charge.receipt_url || null;
          }
        }

        if (!url && row.stripe_invoice_id) {
          const invoice = await stripe.invoices.retrieve(
            row.stripe_invoice_id
          );
          url = invoice.invoice_pdf || null;
        }

        if (!url) {
          outcomes.push({
            id: row.id,
            verdict: 'no_url_available',
            detail:
              'Stripe returned no receipt_url or invoice_pdf for this payment',
          });
          continue;
        }

        const { error: upErr } = await sb
          .from('payment_history')
          .update({ invoice_pdf_url: url })
          .eq('id', row.id);
        if (upErr) throw new Error(upErr.message);

        outcomes.push({ id: row.id, verdict: 'updated', url });
      } catch (e: any) {
        outcomes.push({
          id: row.id,
          verdict: 'errored',
          detail: e?.message || String(e),
        });
      }
    }

    const counts = outcomes.reduce<Record<string, number>>((acc, o) => {
      acc[o.verdict] = (acc[o.verdict] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      scanned: outcomes.length,
      counts,
      outcomes,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
