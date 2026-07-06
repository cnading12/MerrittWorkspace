// Staff-only monthly dues summary, triggered by Vercel Cron on the 7th of
// each month (see vercel.json). Monthly subscription charges fire on the
// 1st; waiting until the 7th gives ACH payments (3–5 business days) time
// to settle so the report reflects final outcomes instead of a wall of
// "processing".
//
// The summary covers every dues charge recorded this month — who paid and
// how much, whose payment failed (front and center), what is still
// pending, plus active subscribers with no charge recorded at all. It is
// emailed to member services + manager only; members never receive it.
//
// Set CRON_SECRET in the Vercel env — Vercel Cron sends it as
// `Authorization: Bearer <CRON_SECRET>` and we reject anything else.
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import {
  buildDuesSummary,
  formatUsd,
  type DuesChargeEntry,
  type DuesMemberRow,
  type DuesPaymentRow,
} from '@/lib/portal/duesSummary';
import {
  getTransactionalEmailHeaders,
  monthlyDuesSummaryEmail,
  PORTAL_FROM,
  PORTAL_REPLY_TO,
  STAFF_NOTIFICATION_EMAILS,
  type DuesSummaryEmailEntry,
} from '@/lib/portal/emails';

export const dynamic = 'force-dynamic';

const DENVER_TZ = 'America/Denver';

const formatDenverDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: DENVER_TZ,
      })
    : '';

const toEmailEntry = (e: DuesChargeEntry): DuesSummaryEmailEntry => ({
  memberName: e.memberName,
  email: e.email,
  amount: formatUsd(e.amountCents),
  description: e.description,
  date: formatDenverDate(e.occurredAt),
});

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') || '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    // Don't hard-fail before the env var is configured — a silently
    // skipped report is worse than an unauthenticated internal summary —
    // but make the misconfiguration visible in the logs.
    console.warn(
      'CRON_SECRET is not set — /api/cron/monthly-dues-summary is running unauthenticated'
    );
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: 'RESEND_API_KEY not configured' },
      { status: 500 }
    );
  }

  const sb = getServiceSupabase();

  // Report month = the current calendar month in Denver at run time.
  const now = new Date();
  const denverToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: DENVER_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now); // YYYY-MM-DD
  const [year, month] = denverToday.split('-').map(Number);
  // UTC midnight on the 1st is the evening of the last day of the prior
  // month in Denver — a safe lower bound, since dues invoices only fire
  // on the 1st and nothing dues-related lands that late in a month.
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthLabel = new Date(Date.UTC(year, month - 1, 1, 12)).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric', timeZone: DENVER_TZ }
  );

  try {
    // Dues charges are invoice-backed payment_history rows (synced from
    // Stripe invoice.* webhooks). Initial Checkout signup charges and
    // one-day desks have no stripe_invoice_id and are excluded.
    const { data: rowsData, error: rowsError } = await sb
      .from('payment_history')
      .select(
        'member_id, amount_cents, status, description, paid_at, created_at, stripe_invoice_id'
      )
      .not('stripe_invoice_id', 'is', null)
      .gte('created_at', monthStart.toISOString());
    if (rowsError) throw rowsError;
    const rows = (rowsData || []) as DuesPaymentRow[];

    // Everyone we expected to charge this month: active members with a
    // subscription on file who already existed before the 1st (members
    // who joined mid-month are anchored to next month's 1st).
    const { data: expectedData, error: expectedError } = await sb
      .from('members')
      .select('id, first_name, last_name, email, monthly_cost_cents')
      .eq('status', 'active')
      .not('stripe_subscription_id', 'is', null)
      .lt('created_at', monthStart.toISOString());
    if (expectedError) throw expectedError;
    const expectedMembers = (expectedData || []) as DuesMemberRow[];

    // Names/emails for charged members not in the expected set (e.g.
    // cancelled after being charged).
    const membersById = new Map<string, DuesMemberRow>(
      expectedMembers.map((m) => [m.id, m])
    );
    const missingIds = Array.from(
      new Set(
        rows
          .map((r) => r.member_id)
          .filter((id): id is string => !!id && !membersById.has(id))
      )
    );
    if (missingIds.length) {
      const { data: extraData, error: extraError } = await sb
        .from('members')
        .select('id, first_name, last_name, email, monthly_cost_cents')
        .in('id', missingIds);
      if (extraError) throw extraError;
      for (const m of (extraData || []) as DuesMemberRow[]) {
        membersById.set(m.id, m);
      }
    }

    const summary = buildDuesSummary({ rows, membersById, expectedMembers });

    const email = monthlyDuesSummaryEmail({
      monthLabel,
      totalCollected: formatUsd(summary.totalCollectedCents),
      paid: summary.paid.map(toEmailEntry),
      failed: summary.failed.map(toEmailEntry),
      pending: summary.pending.map(toEmailEntry),
      refunded: summary.refunded.map(toEmailEntry),
      noCharge: summary.noCharge.map((m) => ({
        memberName: m.memberName,
        email: m.email,
        expectedAmount:
          m.expectedAmountCents != null ? formatUsd(m.expectedAmountCents) : null,
      })),
    });

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: sendError } = await resend.emails.send({
      from: PORTAL_FROM,
      to: STAFF_NOTIFICATION_EMAILS,
      replyTo: PORTAL_REPLY_TO,
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: getTransactionalEmailHeaders(),
      tags: [{ name: 'category', value: 'monthly_dues_summary' }],
    });
    if (sendError) throw new Error(`Resend error: ${sendError.message}`);

    return NextResponse.json({
      sent: true,
      month: monthLabel,
      paid: summary.paid.length,
      failed: summary.failed.length,
      pending: summary.pending.length,
      refunded: summary.refunded.length,
      noCharge: summary.noCharge.length,
      totalCollectedCents: summary.totalCollectedCents,
    });
  } catch (err: any) {
    console.error('Monthly dues summary failed:', err);
    return NextResponse.json(
      { error: err?.message || 'Monthly dues summary failed' },
      { status: 500 }
    );
  }
}
