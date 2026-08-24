// Daily Supabase keep-alive, triggered by Vercel Cron (see vercel.json).
//
// Supabase pauses Free-plan projects after ~7 consecutive days with no
// database activity, and restoring one is a manual dashboard action this app
// cannot trigger. This route issues one cheap read (see lib/portal/keepAlive)
// so the inactivity timer never gets near 7 days. Daily — not weekly — is
// deliberate: it leaves ~6 days of slack, so several failed runs in a row
// still cannot cost us the project.
//
// Failure is loud on purpose: a non-2xx makes the run show red in Vercel's
// cron dashboard, and staff also get an email with the restore steps.
//
// Set CRON_SECRET in the Vercel env — Vercel Cron sends it as
// `Authorization: Bearer <CRON_SECRET>` and we reject anything else. Unlike
// /api/cron/monthly-dues-summary, which runs unauthenticated (with a warning)
// when the secret is unset, this route refuses to run at all: an open
// keep-alive endpoint is a free way for anyone to hammer the database, and a
// skipped run is cheap here given the slack above.
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { Resend } from 'resend';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import {
  KEEP_ALIVE_JOB,
  KEEP_ALIVE_TABLE,
  pingDatabase,
  recordCronRun,
  utcDayKey,
} from '@/lib/portal/keepAlive';
import {
  getTransactionalEmailHeaders,
  supabaseKeepAliveFailureEmail,
  PORTAL_FROM,
  PORTAL_REPLY_TO,
  STAFF_NOTIFICATION_EMAILS,
} from '@/lib/portal/emails';

export const dynamic = 'force-dynamic';

const DENVER_TZ = 'America/Denver';

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


// Best effort: the alert must never be the reason a failed run fails
// differently, and the non-2xx below is the primary signal either way.
async function sendFailureAlert(opts: {
  errorMessage: string;
  ranAt: Date;
}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping keep-alive failure alert');
    return false;
  }
  try {
    const email = supabaseKeepAliveFailureEmail({
      errorMessage: opts.errorMessage,
      tableName: KEEP_ALIVE_TABLE,
      ranAtLabel: opts.ranAt.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: DENVER_TZ,
        timeZoneName: 'short',
      }),
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
        tags: [{ name: 'category', value: 'supabase_keep_alive_failure' }],
      },
      {
        // Scoped to the UTC day: a same-day retry (Vercel re-run, manual
        // curl) dedupes, but a multi-day outage still alerts once per day
        // rather than going silent after the first message.
        idempotencyKey: `${KEEP_ALIVE_JOB}-failure-${utcDayKey(opts.ranAt)}`,
      }
    );
    if (error) throw new Error(`Resend error: ${error.message}`);
    return true;
  } catch (e) {
    console.error('Failed to send keep-alive failure alert:', e);
    return false;
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error(
      'CRON_SECRET is not set — /api/cron/supabase-keep-alive refuses to run unauthenticated'
    );
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }
  const auth = req.headers.get('authorization') || '';
  if (!bearerMatches(auth, secret)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const ranAt = new Date();
  let sb: ReturnType<typeof getServiceSupabase> | null = null;

  try {
    sb = getServiceSupabase();
    // THE read. Its success or failure — and nothing else below — is what
    // decides whether we report the database as up.
    const ping = await pingDatabase(sb);

    const audited = await recordCronRun(sb, {
      job: KEEP_ALIVE_JOB,
      ok: true,
      detail: `${ping.table} count=${ping.count ?? 'unknown'}`,
    });

    return NextResponse.json({
      ok: true,
      table: ping.table,
      count: ping.count,
      audited,
      ranAt: ranAt.toISOString(),
    });
  } catch (err: any) {
    const message = err?.message || 'Supabase keep-alive failed';
    console.error('Supabase keep-alive failed:', err);

    // Both best effort; the audit write almost certainly fails too when the
    // database is the thing that's down.
    if (sb) {
      await recordCronRun(sb, { job: KEEP_ALIVE_JOB, ok: false, detail: message });
    }
    const alerted = await sendFailureAlert({ errorMessage: message, ranAt });

    return NextResponse.json(
      { ok: false, error: message, alerted, ranAt: ranAt.toISOString() },
      { status: 500 }
    );
  }
}
