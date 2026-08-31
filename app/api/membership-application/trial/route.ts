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
//   • A photo ID is REQUIRED to submit, where the full application collects
//     it later in the portal. It is the identity check before someone spends
//     a day in the building. Note the asymmetry further down: the form will
//     not let anyone through without attaching one, but a failure to STORE
//     what they attached does not throw the application away — staff check
//     the ID at the door instead.
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
import { MEMBERSHIP_PLANS } from '@/lib/portal/pricing';
import { getOfficeAvailability } from '@/lib/portal/officeAvailability';
import { OFFICE_SIZE_FOR_PLAN } from '@/lib/portal/officeSizes';
import { getTransactionalEmailHeaders } from '@/lib/portal/emails';
import { generateTrialDayEmailHTML, generateTrialDayEmailText } from '@/lib/portal/trialDayEmail';
import { UploadValidationError, validateUpload } from '@/lib/portal/uploads';
import {
  MAX_ID_FILE_BYTES,
  MAX_ID_FILE_LABEL,
  denverToday,
  generateResumeToken,
  trialIdDocumentPath,
  trialPlanFor,
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
      trial_plan: str(form.get('trial_plan')),
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
      return NextResponse.json(
        { error: `That file is too large (max ${MAX_ID_FILE_LABEL}).` },
        { status: 400 }
      );
    }
    // Same strict allowlist the portal and guest-booking uploads use
    // (lib/portal/uploads.ts). It returns the content type to STORE and the
    // extension to name the object with, rather than trusting either from
    // the browser: staff open these files through a signed URL, and an
    // object stored as text/html — or an SVG carrying an inline script —
    // would render as a live page on the storage origin when they did.
    let validatedId;
    try {
      validatedId = validateUpload(idFile);
    } catch (e) {
      if (e instanceof UploadValidationError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    const seating = input.seating as TrialSeating;
    // The specific thing they asked to try: which office size, or a floor
    // desk vs a private one. Re-derived here rather than trusted from the
    // form, so a row can never carry a plan from another seating.
    const trialPlan = trialPlanFor(seating, input.trial_plan);
    const isOfficeTrial = seating === 'office';
    const isCafeTrial = seating === 'cafe';
    const resumeToken = generateResumeToken();

    const sb = getServiceSupabase();

    // An office trial needs a room to unlock. If every office of the size
    // they asked for is occupied there is nothing to show them for a day, so
    // the booking is refused here as well as greyed out on the form — the
    // form's numbers were read when the page loaded and the last free room
    // may have gone since.
    //
    // Fails open: an availability read that throws must not stop someone
    // booking a trial day. Staff can move a visit; a form that rejects a
    // legitimate applicant because the database hiccupped loses them.
    if (isOfficeTrial) {
      const size = OFFICE_SIZE_FOR_PLAN[trialPlan];
      try {
        const { public: pub } = await getOfficeAvailability(sb);
        const count = size && pub.bySize ? pub.bySize[size] : null;
        if (count && count.capacity > 0 && count.remaining === 0) {
          return NextResponse.json(
            {
              error:
                'Every office of that size is occupied right now, so there is no room to show you for the day. Please pick another size, or contact us about the waitlist.',
            },
            { status: 409 }
          );
        }
      } catch (e) {
        console.error('Could not check office availability for a trial booking', e);
      }
    }

    // Insert first so the storage path can be keyed on the row id.
    //
    // Nothing below this point is allowed to unwind that row. A submitted
    // trial application is a person who has told us they are coming in on a
    // named day, and the admin panel is the only place staff see that. A
    // storage hiccup or a column this database has not been migrated for is
    // not a reason to make them disappear — see the upload and fallback
    // notes below.
    const baseRow = {
      email: input.email,
      first_name: input.first_name,
      last_name: input.last_name,
      phone: input.phone,
      company_name: input.company_name || null,
      // Representative designation for the downstream code paths that expect
      // one. This records what they asked to TRY — the office size or the
      // kind of desk they chose on the form — not anything they have agreed
      // to pay for.
      membership_type: trialPlan,
      start_date: null,
      wants_trial_day: true,
      trial_date: input.trial_date,
      payload: {
        application_kind: 'trial',
        trial_seating: seating,
        trial_plan: trialPlan,
        trial_date: input.trial_date,
        wants_trial_day: true,
        marketing_consent: marketingConsent,
        agrees_to_terms: true,
      },
    };

    // Written down the migration ladder, newest columns first. Each rung
    // drops the columns a database that is one migration behind does not
    // have yet; every one of them is mirrored in `payload`, which the admin
    // panel and the prefill reader both read as a fallback, so a row written
    // on the bottom rung still shows up and still says what it is.
    //
    // Behind on a migration must never cost us the application. It nearly
    // did: the ladder used to stop after stripping the 20260824 columns, so
    // a database missing anything else — `wants_trial_day` and `trial_date`
    // from 20260428, say — threw, and the applicant was told to try again on
    // a submission that could never succeed.
    const insertAttempts: Array<{ row: Record<string, unknown>; missing: string }> = [
      {
        row: { ...baseRow, application_kind: 'trial', resume_token: resumeToken },
        missing: '20260824_trial_application_split.sql',
      },
      { row: baseRow, missing: '20260428_trial_day_applicants.sql' },
      {
        row: {
          ...baseRow,
          wants_trial_day: undefined,
          trial_date: undefined,
        },
        missing: '',
      },
    ];

    let applicationId: string | null = null;
    let insertError: string | null = null;
    for (const attempt of insertAttempts) {
      const row = Object.fromEntries(
        Object.entries(attempt.row).filter(([, v]) => v !== undefined)
      );
      const { data, error } = await sb
        .from('member_applications')
        .insert(row)
        .select('id')
        .single();
      if (!error) {
        applicationId = data!.id;
        insertError = null;
        break;
      }
      insertError = error.message || 'unknown error';
      if (!isMissingColumnError(error)) break;
      if (attempt.missing) {
        console.warn(
          `⚠️ member_applications is missing columns this route writes. Apply migration ${attempt.missing}. Retrying without them.`
        );
      }
    }

    if (!applicationId) {
      // The staff email below becomes the only record of this visit, so it
      // is sent anyway and says so. Failing the request instead would leave
      // the applicant retrying into the same error and nobody any the wiser.
      console.error(
        '❌ Failed to save a trial application to member_applications:',
        insertError
      );
    }

    // Store the ID. Path prefix `trial-applications/` can never collide with
    // a members.id UUID, so the member self-read storage policies never match
    // it — see lib/portal/trialApplication.ts and
    // 20260406_storage_rls_policies.sql. The object is named from the
    // canonical extension for the validated content type, not from whatever
    // the browser called the file.
    let idDocumentPath: string | null = null;
    let idUploadFailed = false;
    if (applicationId) {
      const path = trialIdDocumentPath(
        applicationId,
        `photo-id.${validatedId.extension}`,
        Date.now()
      );
      const idBytes = new Uint8Array(await idFile.arrayBuffer());
      const { error: uploadError } = await sb.storage
        .from('member-documents')
        .upload(path, idBytes, { contentType: validatedId.contentType, upsert: false });

      if (uploadError) {
        // Deliberately NOT fatal, and deliberately no rollback of the row.
        //
        // This used to delete the application and return a 500, on the
        // reasoning that a trial applicant should never be on the books with
        // no ID against their name. That trade is the wrong way round: the
        // ID is an identity check staff can complete at the door, where they
        // are standing in front of the person, but a deleted row means
        // nobody knows anyone is coming at all — the application vanishes
        // from the admin panel with no trace of who filled the form in.
        //
        // So the row stays, flagged, and the staff email says to collect the
        // ID on arrival.
        console.error('❌ Trial ID upload failed:', uploadError);
        idUploadFailed = true;
        const { error: flagError } = await sb
          .from('member_applications')
          .update({ payload: { ...baseRow.payload, id_upload_failed: true } })
          .eq('id', applicationId);
        if (flagError) {
          console.error('⚠️ Failed to flag the missing trial photo ID:', flagError);
        }
      } else {
        idDocumentPath = path;
        const { error: pathError } = await sb
          .from('member_applications')
          .update({ id_document_path: path })
          .eq('id', applicationId);
        if (pathError) {
          // The file is stored and the application exists; losing the pointer
          // means staff have to find it by application id rather than from the
          // Documents page. Not worth failing a submission over.
          console.error('⚠️ Failed to record trial ID document path:', pathError);
        }
      }
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
    if (seating === 'desk') {
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
          : isCafeTrial
            ? 'Your Café Trial Day at Merritt Workspace | What to Expect'
            : allDesksTaken
              ? 'Your Trial Day at Merritt Workspace | Confirm Your Desk'
              : 'Your Trial Day at Merritt Workspace | What to Expect',
        html: generateTrialDayEmailHTML({
          firstName: input.first_name,
          trialDate: input.trial_date,
          isOfficeTrial,
          isCafeTrial,
          availableDesksLabel,
          allDesksTaken,
          // This person filled in the short trial form. There is no
          // membership application of theirs under review, so the email must
          // not promise a decision on one.
          hasFullApplication: false,
        }),
        text: generateTrialDayEmailText({
          firstName: input.first_name,
          trialDate: input.trial_date,
          isOfficeTrial,
          isCafeTrial,
          availableDesksLabel,
          allDesksTaken,
          hasFullApplication: false,
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
    // Name the exact thing, not the category: an office trial means staff
    // have to unlock a specific room, and which room depends on whether the
    // person asked for a single, a double or a team office.
    const planLabel =
      MEMBERSHIP_PLANS[trialPlan]?.label ||
      (isOfficeTrial ? 'Private office' : isCafeTrial ? 'Café membership' : 'Dedicated desk');
    // Anything that went wrong on the way here is said at the TOP of this
    // email, and in the subject line. Staff read these on a phone: a trial
    // day that did not reach the admin panel has to be obvious without
    // scrolling, because this email is then the only record of it.
    const staffSubject = applicationId
      ? `🟧 TRIAL DAY — ${input.first_name} ${input.last_name} (${planLabel}) on ${input.trial_date}`
      : `🚨 TRIAL DAY NOT SAVED — ${input.first_name} ${input.last_name} (${planLabel}) on ${input.trial_date}`;
    const staffLines = [
      ...(applicationId
        ? []
        : [
            'ACTION: this trial day did NOT save to the admin panel, so it will not appear under Pending applications. This email is the only record of it — please add it to the calendar and reply to them directly.',
            '',
          ]),
      `${input.first_name} ${input.last_name} is coming in for a trial day.`,
      '',
      `Date: ${input.trial_date}`,
      `Trying: ${planLabel}${isCafeTrial ? ' (works from the 1905 building next door)' : ''}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone}`,
      ...(input.company_name ? [`Company: ${input.company_name}`] : []),
      '',
      idDocumentPath
        ? 'Photo ID is attached to the application and viewable on the admin Documents page.'
        : 'ACTION: their photo ID did not save. Check it at the door when they arrive.',
      ...(isOfficeTrial
        ? [
            '',
            `ACTION: office trials need an office number confirmed with them before the day — they asked for ${planLabel.toLowerCase()}.`,
          ]
        : []),
      '',
      ...(applicationId ? [`Application: ${applicationId}`] : []),
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

    // A valid submission is a confirmed trial day, whatever happened to the
    // row or the ID behind the scenes: staff have been emailed either way,
    // and telling this person to "try again" would only send them back
    // through the same failure.
    const idNote = idUploadFailed || !applicationId
      ? ' Please bring your photo ID with you on the day — we could not save the copy you attached.'
      : '';
    return NextResponse.json({
      success: true,
      application_id: applicationId,
      trial_email_sent: trialEmailSent,
      id_document_saved: !!idDocumentPath,
      message:
        (trialEmailSent
          ? `You're all set — check ${input.email} for everything you need for your trial day.`
          : "You're all set. We'll be in touch shortly with everything you need for your trial day.") +
        idNote,
    });
  } catch (error) {
    console.error('💥 Trial application error:', error);
    return NextResponse.json(
      { error: 'Failed to submit your trial day application. Please try again.' },
      { status: 500 }
    );
  }
}

// Is this PostgREST/Postgres error "this database does not have that column
// yet"? Two shapes to cover: PostgREST refusing an unknown key against its
// schema cache (PGRST204), and Postgres itself reporting an undefined column
// (42703).
function isMissingColumnError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  if (error.code === 'PGRST204' || error.code === '42703') return true;
  return /column .* does not exist|could not find the .* column|schema cache/i.test(
    error.message || ''
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
