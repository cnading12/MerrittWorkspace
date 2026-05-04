import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = [
  'designation',
  'monthly_cost_cents',
  'status',
  'access_code',
  'office_number',
  'desk_number',
] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireAdmin(req);
    const sb = getServiceSupabase();

    const { data: member, error: memErr } = await sb
      .from('members')
      .select('*')
      .eq('id', id)
      .single();
    if (memErr || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const [appRes, docsRes, paymentsRes, agreementsRes] = await Promise.all([
      member.application_id
        ? sb.from('member_applications').select('*').eq('id', member.application_id).maybeSingle()
        : Promise.resolve({ data: null }),
      sb.from('member_documents').select('*').eq('member_id', id).order('created_at', { ascending: false }),
      sb.from('payment_history').select('*').eq('member_id', id).order('created_at', { ascending: false }),
      sb.from('member_agreements').select('*').eq('member_id', id).order('signed_at', { ascending: false }),
    ]);

    // Backfill any Stripe payments that aren't in payment_history yet.
    // Older onboarding flows (pre-fix) didn't record the upfront Checkout
    // charge, and a member who paid multiple times before refunds would
    // otherwise appear blank here. Walking the customer's PaymentIntents and
    // upserting any unknown ones keeps Stripe as the source of truth without
    // requiring a one-off migration. We refresh refunded amounts on every
    // load so admin-side refunds done in the Stripe Dashboard reflect back
    // into our local view.
    let payments = paymentsRes.data || [];
    if (member.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
          apiVersion: '2025-08-27.basil' as any,
        });
        const intents = await stripe.paymentIntents.list({
          customer: member.stripe_customer_id,
          limit: 100,
        });
        const knownPiIds = new Set(
          payments
            .map((p: any) => p.stripe_payment_intent_id)
            .filter((x: string | null): x is string => !!x)
        );
        // Also index existing rows by their Stripe invoice ID. The
        // `invoice.paid` webhook records subscription invoices with
        // `stripe_invoice_id` set but — under Stripe API 2025-08-27.basil
        // where the legacy `invoice.payment_intent` field is gone —
        // potentially with `stripe_payment_intent_id` null. Without a
        // second lookup key, the PaymentIntent walk below would treat
        // those rows as missing and insert a duplicate every load.
        const invoiceIdToRow = new Map<string, any>();
        for (const p of payments) {
          if (p.stripe_invoice_id) invoiceIdToRow.set(p.stripe_invoice_id, p);
        }
        const newRows: any[] = [];
        const updates: { id: string; status: string; piId?: string | null }[] = [];
        for (const pi of intents.data) {
          const refunded =
            (pi as any).amount_refunded && (pi as any).amount_refunded > 0;
          const mappedStatus =
            pi.status === 'succeeded'
              ? refunded
                ? 'refunded'
                : 'succeeded'
              : pi.status === 'requires_payment_method' ||
                  pi.status === 'canceled'
                ? 'failed'
                : 'pending';
          const piInvoiceId = (pi as any).invoice || null;
          const matchedByInvoice =
            piInvoiceId ? invoiceIdToRow.get(piInvoiceId) : null;
          if (!knownPiIds.has(pi.id) && !matchedByInvoice) {
            // Skip uncaptured/failed intents that never collected funds; the
            // member only cares about money that actually moved.
            if (pi.status !== 'succeeded') continue;
            newRows.push({
              member_id: id,
              stripe_invoice_id: piInvoiceId,
              stripe_payment_intent_id: pi.id,
              amount_cents: pi.amount_received || pi.amount,
              currency: pi.currency,
              status: mappedStatus,
              description:
                pi.description || 'Initial membership payment',
              invoice_pdf_url: null,
              paid_at: new Date(pi.created * 1000).toISOString(),
            });
          } else {
            const existing =
              matchedByInvoice ||
              payments.find(
                (p: any) => p.stripe_payment_intent_id === pi.id
              );
            if (!existing) continue;
            const needsStatus = existing.status !== mappedStatus;
            // Backfill the PI ID onto invoice rows that were saved without
            // one — collapses the two dedup keys into a single fast lookup
            // on subsequent loads.
            const needsPiId =
              !existing.stripe_payment_intent_id && pi.id;
            if (needsStatus || needsPiId) {
              updates.push({
                id: existing.id,
                status: mappedStatus,
                piId: needsPiId ? pi.id : null,
              });
            }
          }
        }
        if (newRows.length > 0) {
          await sb.from('payment_history').insert(newRows);
        }
        for (const u of updates) {
          const patch: Record<string, any> = { status: u.status };
          if (u.piId) patch.stripe_payment_intent_id = u.piId;
          await sb
            .from('payment_history')
            .update(patch)
            .eq('id', u.id);
        }
        if (newRows.length > 0 || updates.length > 0) {
          const { data: refreshed } = await sb
            .from('payment_history')
            .select('*')
            .eq('member_id', id)
            .order('created_at', { ascending: false });
          payments = refreshed || payments;
        }
      } catch (err) {
        console.error('Failed to backfill payments from Stripe', err);
      }
    }

    // Generate signed URLs (1h) for each document.
    const documents = await Promise.all(
      (docsRes.data || []).map(async (d: any) => {
        const { data: signed } = await sb.storage
          .from('member-documents')
          .createSignedUrl(d.file_path, 3600);
        return { ...d, signed_url: signed?.signedUrl || null };
      })
    );

    return NextResponse.json({
      member,
      application: (appRes as any).data || null,
      documents,
      payments,
      agreements: agreementsRes.data || [],
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireAdmin(req);
    const body = await req.json();
    const update: Record<string, any> = {};
    for (const k of ALLOWED_FIELDS) {
      if (k in body) update[k] = body[k];
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No allowed fields' }, { status: 400 });
    }
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('members')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ member: data });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
