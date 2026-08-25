// POST /api/admin/applications/[id]/send-membership-application
//
// Manually send a trial applicant the "finish your application" email — the
// same one app/api/cron/trial-followup sends the day after a visit. Staff
// need this for the cases a daily job cannot cover: someone who decided on
// the spot, someone whose follow-up bounced, someone who asked for the link
// again a month later.
//
// Re-sends are allowed and deliberate. The cron dedupes on
// conversion_email_sent_at precisely so it cannot nag; a human clicking a
// button is not the failure mode that guard exists for.

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { getTransactionalEmailHeaders } from '@/lib/portal/emails';
import {
  generateResumeToken,
  isTrialApplication,
  readTrialSeating,
} from '@/lib/portal/trialApplication';
import { trialConversionEmail } from '@/lib/portal/trialConversionEmail';

export const dynamic = 'force-dynamic';

const MANAGER_EMAIL = 'manager@merrittworkspace.net';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireAdmin(req);

    const sb = getServiceSupabase();
    const { data: app, error } = await sb
      .from('member_applications')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (!isTrialApplication(app)) {
      return NextResponse.json(
        { error: 'This is already a full membership application.' },
        { status: 400 }
      );
    }
    if (app.converted_to_application_id) {
      return NextResponse.json(
        { error: 'They have already completed a membership application.' },
        { status: 400 }
      );
    }
    if (!app.email) {
      return NextResponse.json({ error: 'This application has no email address.' }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Email system not configured.' }, { status: 500 });
    }

    // Mint a token if the row has none. Rows created before the migration
    // landed have no resume_token, and this is how they get one.
    let resumeToken: string | null = app.resume_token ?? null;
    if (!resumeToken) {
      resumeToken = generateResumeToken();
      const { error: tokenError } = await sb
        .from('member_applications')
        .update({ resume_token: resumeToken })
        .eq('id', id);
      if (tokenError) {
        return NextResponse.json(
          { error: `Could not create the application link: ${tokenError.message}` },
          { status: 500 }
        );
      }
    }

    const { subject, html, text } = trialConversionEmail({
      firstName: app.first_name || '',
      trialDate: app.trial_date || null,
      resumeToken,
      seating: readTrialSeating(app.payload?.trial_seating),
    });

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Merritt Workspace Membership <manager@merrittworkspace.net>',
      replyTo: MANAGER_EMAIL,
      to: app.email,
      subject,
      html,
      text,
      headers: getTransactionalEmailHeaders(),
      tags: [{ name: 'category', value: 'trial_conversion' }],
    });

    // Stamp so the cron does not follow up behind a manual send.
    const { error: stampError } = await sb
      .from('member_applications')
      .update({ conversion_email_sent_at: new Date().toISOString() })
      .eq('id', id);
    if (stampError) {
      console.error('⚠️ Could not stamp conversion_email_sent_at:', stampError);
    }

    return NextResponse.json({ ok: true, sent_to: app.email });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
