// POST /api/membership-application/trial
//
// The short path. Someone who wants to spend one day at a desk before
// deciding anything fills in seven fields and attaches a photo ID, and this
// route stores them and sends the trial-day email in the same request.
//
// Differences vs. /api/membership-application:
//   • No plan selection and no pricing. A trial day is free, so there is
//     nothing to itemize and no billing notice to agree to.
//   • No references, emergency contact, or professional details. Those exist
//     to inform the admin approve/decline decision, and a trial day has
//     never been gated on one — the trial-day email has always gone out
//     immediately on submit. Collecting them here only cost us applicants.
//   • A photo ID is REQUIRED, where the full application collects it later
//     in the portal. It is the only identity check before someone spends a
//     day in the building, so it is the one thing this form will not skip.
//   • The row is written with `application_kind = 'trial'` so it stays out
//     of the admin approve/decline queue, and with a `resume_token` so the
//     follow-up email can prefill a full application from it.
//
// Note this is a separate route rather than a branch inside the main one
// because the payload is multipart (it carries a file) where the full
// application is JSON — the same reason /existing-member is its own route.

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { getTransactionalEmailHeaders } from '@/lib/portal/emails';
import { generateTrialDayEmailHTML, generateTrialDayEmailText } from '@/lib/portal/trialDayEmail';
import {
  MAX_ID_FILE_BYTES,
  denverToday,
  generateResumeToken,
  isAcceptedIdMimeType,
  trialIdDocumentPath,
  validateTrialSubmission,
  type TrialSeating,
} from '@/lib/portal/trialApplication';

export const dynamic = 'force-dynamic';

const MANAGER_EMAIL = 'manager@merrittworkspace.net';
const MEMBER_SERVICES_EMAIL = 'memberservices@merrittworkspace.net';

let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

// Resend's free plan allows 2 requests/second; the main application route
// paces its sends the same way.
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function str(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();

    const input = {
      first_name: str(form.get('first_name')),
      last_name: str(form.get('last_name')),
      email: str(form.get('email')),
      phone: str(form.get('phone')),
      company_name: str(form.get('company_name')),
      seating: str(form.get('seating')),
      trial_date: str(form.get('trial_date')),
      agrees_to_terms: str(form.get('agrees_to_terms')) === 'true',
    };
    const marketingConsent = str(form.get('marketing_consent')) === 'true';

    const problem = validateTrialSubmission(input, { today: denverToday(new Date()) });
    if (problem) {
      return NextResponse.json({ error: problem }, { status: 400 });
    }

    const idFile = form.get('id_document');
    if (!(idFile instanceof File) || idFile.size === 0) {
      return NextResponse.json(
        { error: 'Please attach a photo of your government-issued ID.' },
        { status: 400 }
      );
    }
    if (idFile.size > MAX_ID_FILE_BYTES) {
      return NextResponse.json({ error: 'That file is too large (max 10MB).' }, { status: 400 });
    }
    if (!isAcceptedIdMimeType(idFile.type)) {
      return NextResponse.json(
        { error: 'Please attach an image or a PDF of your ID.' },
        { status: 400 }
      );
    }

    const seating = input.seating as TrialSeating;
    const isOfficeTrial = seating === 'office';
    const resumeToken = generateResumeToken();

    const sb = getServiceSupabase();

    // Insert first so the storage path can be keyed on the row id. If the
    // upload then fails we delete the row again rather than leave a trial
    // applicant on the books with no ID against their name.
    const baseRow = {
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      phone: input.phone,
      company_name: input.company_name || null,
      // Representative designation for the downstream code paths that expect
      // one. A trial applicant picked no plan, so this records what they
      // asked to try, not anything they have agreed to pay for.
      membership_type: isOfficeTrial ? 'private_office_single' : 'dedicated_desk',
      start_date: null,
      wants_trial_day: true,
      trial_date: input.trial_date,
      payload: {
        application_kind: 'trial',
        trial_seating: seating,
        trial_date: input.trial_date,
        wants_trial_day: true,
        marketing_consent: marketingConsent,
        agrees_to_terms: true,
      },
    };

    let inserted: { id: string } | null = null;
    {
      const attempt = await sb
        .from('member_applications')
        .insert({ ...baseRow, application_kind: 'trial', resume_token: resumeToken })
        .select('id')
        .single();
      if (
        attempt.error &&
        /column .* does not exist|application_kind|resume_token/i.test(attempt.error.message || '')
      ) {
        // 20260824_trial_application_split.sql not applied yet. The kind and
        // the seating still live in `payload`, so the admin panel and the
        // prefill reader (which both fall back to it) keep working; only the
        // resume link is unavailable until the migration lands.
        console.warn(
          '⚠️ Trial-application columns missing; storing kind in payload only. Apply migration 20260824_trial_application_split.sql.'
        );
        const retry = await sb.from('member_applications').insert(baseRow).select('id').single();
        if (retry.error) throw new Error(retry.error.message);
        inserted = retry.data;
      } else if (attempt.error) {
        throw new Error(attempt.error.message);
      } else {
        inserted = attempt.data;
      }
    }

    const applicationId = inserted!.id;

    // Store the ID before anything else observable happens. Path prefix
    // `trial-applications/` can never collide with a members.id UUID, so the
    // member self-read storage policies never match it — see
    // lib/portal/trialApplication.ts and 20260406_storage_rls_policies.sql.
    const idDocumentPath = trialIdDocumentPath(applicationId, idFile.name, Date.now());
    const idBytes = new Uint8Array(await idFile.arrayBuffer());
    const { error: uploadError } = await sb.storage
      .from('member-documents')
      .upload(idDocumentPath, idBytes, { contentType: idFile.type, upsert: false });

    if (uploadError) {
      console.error('❌ Trial ID upload failed:', uploadError);
      const { error: cleanupError } = await sb
        .from('member_applications')
        .delete()
        .eq('id', applicationId);
      if (cleanupError) {
        console.error('⚠️ Failed to roll back trial application row:', cleanupError);
      }
      return NextResponse.json(
        { error: 'We could not upload your ID. Please try again.' },
        { status: 500 }
      );
    }

    const { error: pathError } = await sb
      .from('member_applications')
      .update({ id_document_path: idDocumentPath })
      .eq('id', applicationId);
    if (pathError) {
      // The file is stored and the application exists; losing the pointer
      // means staff have to find it by application id rather than from the
      // Documents page. Not worth failing a submission over.
      console.error('⚠️ Failed to record trial ID document path:', pathError);
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Your application was received, but our email system is unavailable. Please call us at (303) 359-8337 to confirm your trial day.',
          application_id: applicationId,
        },
        { status: 500 }
      );
    }

    // Tell a desk trial visitor which desks are free so they can walk in and
    // sit down. Best effort: on failure both stay unset and the email falls
    // back to its generic guidance rather than claiming desks are or are not
    // available on no information.
    let availableDesksLabel: string | null = null;
    let allDesksTaken = false;
    if (!isOfficeTrial) {
      try {
        const { listAvailableDesks, formatDeskList } = await import('@/lib/portal/deskAvailability');
        const freeDesks = await listAvailableDesks(sb);
        availableDesksLabel = formatDeskList(freeDesks) || null;
        allDesksTaken = freeDesks.length === 0;
      } catch (e) {
        console.error('Could not list available desks for trial-day email', e);
      }
    }

    let trialEmailSent = false;
    try {
      await getResend().emails.send({
        from: 'Merritt Workspace Membership <manager@merrittworkspace.net>',
        replyTo: MANAGER_EMAIL,
        to: input.email,
        subject: isOfficeTrial
          ? 'Your Office Trial Day at Merritt Workspace | Confirm Your Office'
          : allDesksTaken
            ? 'Your Trial Day at Merritt Workspace | Confirm Your Desk'
            : 'Your Trial Day at Merritt Workspace | What to Expect',
        html: generateTrialDayEmailHTML({
          firstName: input.first_name,
          trialDate: input.trial_date,
          isOfficeTrial,
          availableDesksLabel,
          allDesksTaken,
        }),
        text: generateTrialDayEmailText({
          firstName: input.first_name,
          trialDate: input.trial_date,
          isOfficeTrial,
          availableDesksLabel,
          allDesksTaken,
        }),
        headers: getTransactionalEmailHeaders(),
        tags: [{ name: 'category', value: 'trial_day_info' }],
      });
      trialEmailSent = true;
    } catch (error) {
      console.error('❌ Trial-day info email failed:', error);
    }

    await delay(1000);

    // One staff notification to both mailboxes. A trial application is a
    // heads-up that someone is coming in, not a decision to make, so it is
    // deliberately short — no "review this application" framing.
    const staffSubject = `🟧 TRIAL DAY — ${input.first_name} ${input.last_name} (${isOfficeTrial ? 'private office' : 'dedicated desk'}) on ${input.trial_date}`;
    const staffLines = [
      `${input.first_name} ${input.last_name} is coming in for a trial day.`,
      '',
      `Date: ${input.trial_date}`,
      `Trying: ${isOfficeTrial ? 'Private office' : 'Dedicated desk'}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone}`,
      ...(input.company_name ? [`Company: ${input.company_name}`] : []),
      '',
      'Photo ID is attached to the application and viewable on the admin Documents page.',
      ...(isOfficeTrial
        ? ['', 'ACTION: office trials need an office number confirmed with them before the day.']
        : []),
      '',
      `Application: ${applicationId}`,
    ];
    const staffText = staffLines.join('\n');
    const staffHtml = `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6">${staffLines
      .map((line) => (line ? `<p style="margin:0 0 8px 0">${escapeHtml(line)}</p>` : '<br/>'))
      .join('')}</div>`;

    try {
      await getResend().emails.send({
        from: 'Merritt Workspace Membership <manager@merrittworkspace.net>',
        to: [MANAGER_EMAIL, MEMBER_SERVICES_EMAIL],
        subject: staffSubject,
        html: staffHtml,
        text: staffText,
      });
    } catch (error) {
      console.error('❌ Trial staff notification failed:', error);
    }

    return NextResponse.json({
      success: true,
      application_id: applicationId,
      trial_email_sent: trialEmailSent,
      message: trialEmailSent
        ? `You're all set — check ${input.email} for everything you need for your trial day.`
        : "You're all set. We'll be in touch shortly with everything you need for your trial day.",
    });
  } catch (error) {
    console.error('💥 Trial application error:', error);
    return NextResponse.json(
      { error: 'Failed to submit your trial day application. Please try again.' },
      { status: 500 }
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
