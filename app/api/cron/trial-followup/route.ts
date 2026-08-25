// Daily trial-day follow-up.
//
// NOT currently registered in vercel.json. Vercel's Hobby plan caps a project
// at two cron jobs and both slots are taken by jobs that cannot move:
// monthly-dues-summary, and supabase-keep-alive, which CLAUDE.md forbids
// folding into another job for good reasons (its read is the verdict on
// whether the database is up, and entangling it with anything else muddies
// that signal).
//
// So this runs on demand for now. Three ways to schedule it, in the order I
// would try them:
//   1. Any external scheduler — a GitHub Actions workflow on a cron, say —
//      GETs this path with `Authorization: Bearer $CRON_SECRET`. No Vercel
//      slot needed, and it is the same contract Vercel Cron would use.
//   2. A Vercel Pro plan lifts the cap; add it to vercel.json and relax the
//      assertion in __tests__/supabase-keep-alive.test.ts.
//   3. If the Supabase project is ever upgraded off the Free plan, the
//      keep-alive becomes optional (CLAUDE.md says so explicitly) and can be
//      retired deliberately, freeing its slot.
//
// Until then staff send follow-ups by hand from /admin/applications, which
// works and is one click.
//
// The day after someone's trial day, this emails them a link that opens a
// membership application already filled in with what they gave us for the
// trial — name, contact details, and their photo ID carried across. It is
// what makes the short trial form safe to ship: the long questions still get
// asked, just later, and never twice.
//
// Deduped by `conversion_email_sent_at`, which is stamped before the send is
// attempted. A daily job over a small table would otherwise nag someone every
// morning for the rest of their life, which is a far worse failure than one
// person missing a follow-up because a send failed after the stamp.
//
// Unlike the keep-alive job this one is not load-bearing: a missed run costs
// one follow-up email, and staff can send it by hand from
// /admin/applications. It still refuses to run without CRON_SECRET, because
// an open endpoint that emails applicants is a spam vector.

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { getTransactionalEmailHeaders } from '@/lib/portal/emails';
import { recordCronRun } from '@/lib/portal/keepAlive';
import { denverToday } from '@/lib/portal/trialApplication';
import { selectFollowupTargets, type TrialFollowupRow } from '@/lib/portal/trialFollowup';
import { trialConversionEmail } from '@/lib/portal/trialConversionEmail';

export const dynamic = 'force-dynamic';

const JOB = 'trial-followup';
const MANAGER_EMAIL = 'manager@merrittworkspace.net';

// How far back to look. A trial from six months ago does not want a "how was
// it?" email, and the window keeps the query bounded.
const LOOKBACK_DAYS = 30;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('CRON_SECRET is not set — /api/cron/trial-followup refuses to run unauthenticated');
    return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if ((req.headers.get('authorization') || '') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const today = denverToday(now);
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  try {
    const sb = getServiceSupabase();

    const { data, error } = await sb
      .from('member_applications')
      .select(
        'id, first_name, email, trial_date, resume_token, application_kind, conversion_email_sent_at, converted_to_application_id, payload'
      )
      .eq('application_kind', 'trial')
      .is('conversion_email_sent_at', null)
      .is('converted_to_application_id', null)
      .gte('trial_date', since)
      .lt('trial_date', today);

    if (error) throw new Error(error.message);

    const targets = selectFollowupTargets((data || []) as TrialFollowupRow[], today);
    if (targets.length === 0) {
      await recordCronRun(sb, { job: JOB, ok: true, detail: 'no trial follow-ups due' });
      return NextResponse.json({ ok: true, sent: 0 });
    }

    if (!process.env.RESEND_API_KEY) {
      const detail = `RESEND_API_KEY not configured; ${targets.length} follow-up(s) skipped`;
      console.error(detail);
      await recordCronRun(sb, { job: JOB, ok: false, detail });
      return NextResponse.json({ ok: false, error: detail }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    let sent = 0;
    const failures: string[] = [];

    for (const target of targets) {
      // Stamp before sending. A double-send is worse than a miss here: the
      // miss is recoverable by hand from the admin panel, the double-send is
      // an automated job emailing the same person every day.
      const { error: stampError } = await sb
        .from('member_applications')
        .update({ conversion_email_sent_at: new Date().toISOString() })
        .eq('id', target.id)
        .is('conversion_email_sent_at', null);
      if (stampError) {
        failures.push(`${target.id}: could not stamp (${stampError.message})`);
        continue;
      }

      const { subject, html, text } = trialConversionEmail({
        firstName: target.firstName,
        trialDate: target.trialDate,
        resumeToken: target.resumeToken,
        seating: target.seating,
      });

      try {
        await resend.emails.send({
          from: 'Merritt Workspace Membership <manager@merrittworkspace.net>',
          replyTo: MANAGER_EMAIL,
          to: target.email,
          subject,
          html,
          text,
          headers: getTransactionalEmailHeaders(),
          tags: [{ name: 'category', value: 'trial_conversion' }],
        });
        sent += 1;
      } catch (e) {
        failures.push(`${target.id}: send failed (${e instanceof Error ? e.message : 'unknown'})`);
      }

      // Resend's free plan allows 2 requests/second.
      await delay(600);
    }

    const detail = `sent ${sent}/${targets.length}${failures.length ? `; ${failures.join('; ')}` : ''}`;
    await recordCronRun(sb, { job: JOB, ok: failures.length === 0, detail });

    return NextResponse.json({
      ok: failures.length === 0,
      sent,
      due: targets.length,
      failures,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('💥 Trial follow-up cron failed:', message);
    try {
      await recordCronRun(getServiceSupabase(), { job: JOB, ok: false, detail: message });
    } catch {
      /* audit row is best effort — the non-2xx below is the signal */
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
