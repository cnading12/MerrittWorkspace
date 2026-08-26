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
// A run leaves a receipt either way: a `cron_runs` row (best effort, see
// lib/portal/cronRuns) and, when the run throws, a staff alert naming the
// error. Before that, a failed run was indistinguishable from a month
// nobody read their mail — the August 2026 report went missing exactly
// that quietly.
//
// Pass `?month=YYYY-MM` to re-run a past month, which is how a missed or
// lost report gets sent after the fact. Omitted, it reports the current
// Denver month, which is what Vercel Cron asks for on the 7th.
//
// Set CRON_SECRET in the Vercel env — Vercel Cron sends it as
// `Authorization: Bearer <CRON_SECRET>` and we reject anything else.
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { Resend } from 'resend';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import {
  buildDuesSummary,
  formatUsd,
  resolveReportMonth,
  type DuesChargeEntry,
  type DuesMemberRow,
  type DuesPaymentRow,
  type ReportMonth,
} from '@/lib/portal/duesSummary';
import { recordCronRun, utcDayKey } from '@/lib/portal/cronRuns';
import {
  getTransactionalEmailHeaders,
  monthlyDuesSummaryEmail,
  monthlyDuesSummaryFailureEmail,
  PORTAL_FROM,
  PORTAL_REPLY_TO,
  STAFF_NOTIFICATION_EMAILS,
  type DuesSummaryEmailEntry,
} from '@/lib/portal/emails';

export const dynamic = 'force-dynamic';

const DENVER_TZ = 'America/Denver';

// Job name written to `cron_runs`, so "did the 7th fire?" is answerable
// months later, long after Vercel's cron dashboard has rolled over.
const DUES_SUMMARY_JOB = 'monthly-dues-summary';

// Constant-time comparison of the incoming bearer token against CRON_SECRET.
// A plain `!==` on secrets leaks their content through response timing; the
// window is small over a network, but the fix is one line.
function bearerMatches(header: string, secret: string): boolean {
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;
  const provided = Buffer.from(header.slice(prefix.length));
  const expected = Buffer.from(secret);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}


const formatDenverDate = (iso: string | null): string =>
  iso
    ? new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: DENVER_TZ,
      })
    : '';

const denverTimestamp = (d: Date): string =>
  d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: DENVER_TZ,
    timeZoneName: 'short',
  });

// Best effort: the alert must never be the reason a failed run fails
// differently. The 500 below is the primary signal either way.
async function sendFailureAlert(opts: {
  monthLabel: string;
  monthKey: string;
  errorMessage: string;
  ranAt: Date;
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping dues summary failure alert');
    return false;
  }
  try {
    const email = monthlyDuesSummaryFailureEmail({
      monthLabel: opts.monthLabel,
      errorMessage: opts.errorMessage,
      ranAtLabel: denverTimestamp(opts.ranAt),
    });
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send(
      {
        from: PORTAL_FROM,
        to: STAFF_NOTIFICATION_EMAILS,
        replyTo: PORTAL_REPLY_TO,
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: getTransactionalEmailHeaders(),
        tags: [{ name: 'category', value: 'monthly_dues_summary_failure' }],
      },
      {
        // Scoped to the UTC day *and* the report month: a same-day retry
        // dedupes, but re-running a different month still alerts, and a
        // problem that persists alerts again tomorrow rather than going
        // silent after the first message.
        idempotencyKey: `${DUES_SUMMARY_JOB}-failure-${opts.monthKey}-${utcDayKey(
          opts.ranAt
        )}`,
      }
    );
    if (error) throw new Error(`Resend error: ${error.message}`);
    return true;
  } catch (e) {
    console.error('Failed to send dues summary failure alert:', e);
    return false;
  }
}

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
    if (!bearerMatches(auth, secret)) {
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
  const ranAt = new Date();

  // Report month: the current Denver month by default (what Cron wants on
  // the 7th), or the `?month=YYYY-MM` asked for when re-running a month
  // whose report never arrived. A bad value is the caller's mistake, so it
  // is a 400 — not a failed run, and not worth alerting staff about.
  let reportMonth: ReportMonth;
  try {
    reportMonth = resolveReportMonth({
      now: ranAt,
      month: req.nextUrl.searchParams.get('month'),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Invalid month' },
      { status: 400 }
    );
  }
  const monthLabel = reportMonth.label;
  const monthKey = `${reportMonth.year}-${String(reportMonth.month).padStart(2, '0')}`;

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
      .gte('created_at', reportMonth.startIso)
      .lt('created_at', reportMonth.endIso);
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
      .lt('created_at', reportMonth.startIso);
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

    // The send is the verdict; the audit row is the receipt. A failed
    // insert here must never make a delivered report look undelivered, so
    // recordCronRun swallows its own errors and we only report whether the
    // row landed.
    const audited = await recordCronRun(sb, {
      job: DUES_SUMMARY_JOB,
      ok: true,
      detail:
        `${monthKey}: ${summary.paid.length} paid, ${summary.failed.length} failed, ` +
        `${summary.pending.length} pending, ${summary.refunded.length} refunded, ` +
        `${summary.noCharge.length} no-charge, ` +
        `$${formatUsd(summary.totalCollectedCents)} collected`,
    });

    return NextResponse.json({
      sent: true,
      month: monthLabel,
      monthKey,
      audited,
      ranAt: ranAt.toISOString(),
      paid: summary.paid.length,
      failed: summary.failed.length,
      pending: summary.pending.length,
      refunded: summary.refunded.length,
      noCharge: summary.noCharge.length,
      totalCollectedCents: summary.totalCollectedCents,
    });
  } catch (err: any) {
    const message = err?.message || 'Monthly dues summary failed';
    console.error('Monthly dues summary failed:', err);

    // Both best effort, and both independent of each other: whichever one
    // gets through is the trace that this month's report did not.
    const audited = await recordCronRun(sb, {
      job: DUES_SUMMARY_JOB,
      ok: false,
      detail: `${monthKey}: ${message}`,
    });
    const alerted = await sendFailureAlert({
      monthLabel,
      monthKey,
      errorMessage: message,
      ranAt,
    });

    return NextResponse.json(
      {
        error: message,
        month: monthLabel,
        monthKey,
        audited,
        alerted,
        ranAt: ranAt.toISOString(),
      },
      { status: 500 }
    );
  }
}
