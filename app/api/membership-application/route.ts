// app/api/membership-application/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getTransactionalEmailHeaders } from '@/lib/portal/emails';
import { generateTrialDayEmailHTML, generateTrialDayEmailText } from '@/lib/portal/trialDayEmail';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { OFFICE_SIZE_FOR_PLAN } from '@/lib/portal/officeSizes';

export const dynamic = 'force-dynamic';

// Lazy-load Resend client to avoid build-time errors
let resendClient: Resend | null = null;

function getResend(): Resend {
    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

const resend = {
    emails: {
        send: (params: Parameters<Resend['emails']['send']>[0]) => getResend().emails.send(params)
    }
};

const MANAGER_EMAIL = 'manager@merrittworkspace.net';
const MEMBER_SERVICES_EMAIL = 'memberservices@merrittworkspace.net';

// Staff notifications go to both desks. Member services leads the list and is
// the desk that answers fastest; the manager is copied on everything so
// nothing is invisible to them.
const STAFF_EMAILS = [MEMBER_SERVICES_EMAIL, MANAGER_EMAIL];

// Plan catalog used to label & price the items in `selected_plans`. Kept in
// lockstep with app/membership/apply/page.tsx and lib/portal/pricing.ts.
const PLAN_CATALOG: Record<string, { label: string; price_cents: number; recurrence: 'monthly' | 'one_time' }> = {
  dedicated_desk:          { label: 'Dedicated Desk',             price_cents: 20000,  recurrence: 'monthly'  },
  // A dedicated desk in a private, lockable office area rather than on the
  // shared coworking floor. Only offered on the application form once all 25
  // floor desks are spoken for — see lib/portal/deskAvailability.ts.
  private_dedicated_desk:  { label: 'Private Dedicated Desk',     price_cents: 30000,  recurrence: 'monthly'  },
  // Open seating on the café side of the flex space — no desk, half a desk's
  // booking allowance, capped at CAFE_MEMBER_LIMIT places.
  cafe_membership:         { label: 'Café Membership',            price_cents: 10000,  recurrence: 'monthly'  },
  // NOTE: 'one_day_dedicated_desk' is deliberately absent. Day passes are no
  // longer sold, and itemizeSelectedPlans drops any plan_id missing from this
  // catalog — so a stale form that still posts one prices it at nothing rather
  // than quietly selling a product we retired.
  private_office_single:   { label: 'Private Office — Single',    price_cents: 50000,  recurrence: 'monthly'  },
  private_office_double:   { label: 'Private Office — Double',    price_cents: 70000,  recurrence: 'monthly'  },
  private_office_large:    { label: 'Private Office — Large',     price_cents: 120000, recurrence: 'monthly'  },
};

interface SelectedPlanInput { plan_id?: string; quantity?: number }

interface ItemizedLine {
  plan_id: string;
  label: string;
  quantity: number;
  unit_price_cents: number;
  subtotal_cents: number;
  recurrence: 'monthly' | 'one_time';
}

function itemizeSelectedPlans(selected: SelectedPlanInput[] | undefined, fallbackMembershipType?: string): {
  lines: ItemizedLine[];
  total_monthly_cents: number;
  total_one_time_cents: number;
} {
  const list = Array.isArray(selected) && selected.length > 0
    ? selected
    : fallbackMembershipType
      ? [{ plan_id: fallbackMembershipType, quantity: 1 }]
      : [];

  const lines: ItemizedLine[] = [];
  let monthly = 0;
  let oneTime = 0;
  for (const item of list) {
    const planId = item?.plan_id;
    const qty = Math.max(0, Math.floor(Number(item?.quantity) || 0));
    if (!planId || qty <= 0) continue;
    const def = PLAN_CATALOG[planId];
    if (!def) continue;
    const subtotal = def.price_cents * qty;
    lines.push({
      plan_id: planId,
      label: def.label,
      quantity: qty,
      unit_price_cents: def.price_cents,
      subtotal_cents: subtotal,
      recurrence: def.recurrence,
    });
    if (def.recurrence === 'monthly') monthly += subtotal;
    else oneTime += subtotal;
  }
  return { lines, total_monthly_cents: monthly, total_one_time_cents: oneTime };
}

function formatUsdCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// Public form: every submission emails staff, so throttle per IP to keep a
// script from flooding the manager's inbox. Generous enough that a real
// applicant retrying a failed submit is never affected.
const APPLICATION_RATE_LIMIT = { windowMs: 60 * 60 * 1000, max: 5 };

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(
      `membership-application:${getClientIp(request)}`,
      APPLICATION_RATE_LIMIT
    );
    if (limit.limited) {
      return NextResponse.json(
        { error: 'Too many applications submitted. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
      );
    }

    const applicationData = await request.json();

    console.log('📝 Processing membership application:', {
      applicant: applicationData.first_name + ' ' + applicationData.last_name,
      email: applicationData.customer_email,
      membership_type: applicationData.membership_type
    });

    // Validate required fields
    const requiredFields = [
      'first_name', 'last_name', 'email', 'phone', 
      'company_name', 'membership_type', 'start_date'
    ];

    for (const field of requiredFields) {
      if (!applicationData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate application ID
    const applicationId = `APP-${Date.now()}`;
    const submittedAt = new Date();

    // Itemize the applicant's selected plans server-side so the totals stored
    // and emailed are authoritative — never trust the numbers the client sent.
    const itemized = itemizeSelectedPlans(applicationData.selected_plans, applicationData.membership_type);

    // Applications for a shared floor desk are still accepted when all 25 are
    // spoken for — we may convert an office and take them on as a private
    // dedicated desk instead — but staff must not approve one at the $200 rate
    // believing a floor desk is waiting. The form hides that option once we're
    // full; this catches a stale page, and flags it for the reviewer either
    // way. Best-effort: an availability failure never blocks an application.
    let deskFloorFull = false;
    if (itemized.lines.some((l) => l.plan_id === 'dedicated_desk')) {
      try {
        const { getServiceSupabase } = await import('@/lib/portal/supabaseAdmin');
        const { getDeskCapacity } = await import('@/lib/portal/deskAvailability');
        deskFloorFull = (await getDeskCapacity(getServiceSupabase())).isFull;
      } catch (e) {
        console.error('Could not check dedicated-desk availability for application', e);
      }
    }
    applicationData.dedicated_desk_floor_full = deskFloorFull;

    // Same treatment for the cafe tier, and for the same reason: the form hides
    // it once the fifteen places are gone, but a stale page can still post one.
    // We take the application either way — someone may be about to leave — and
    // flag it so the reviewer knows approving it makes a sixteenth member
    // rather than discovering that later.
    let cafeFull = false;
    if (itemized.lines.some((l) => l.plan_id === 'cafe_membership')) {
      try {
        const { getServiceSupabase } = await import('@/lib/portal/supabaseAdmin');
        const { getCafeCapacity } = await import('@/lib/portal/cafeAvailability');
        cafeFull = (await getCafeCapacity(getServiceSupabase())).isFull;
      } catch (e) {
        console.error('Could not check cafe-membership availability for application', e);
      }
    }
    applicationData.cafe_membership_full = cafeFull;

    // And once more for private offices, which are three pools rather than
    // one: an application for a 2-desk office when both single-desk rooms are
    // taken is perfectly fine, so the question is per size. The form greys out
    // a size with nothing free; this catches a stale page.
    //
    // Taken either way, and flagged, for the same reason as the two above: an
    // office may be about to come free, and a waitlist applicant is a lead
    // rather than an error. What must not happen is a reviewer approving a
    // room that does not exist.
    const officePlansApplied = itemized.lines
      .map((l) => l.plan_id)
      .filter((id) => OFFICE_SIZE_FOR_PLAN[id]);
    let fullOfficeSizes: string[] = [];
    if (officePlansApplied.length > 0) {
      try {
        const { getServiceSupabase } = await import('@/lib/portal/supabaseAdmin');
        const { getOfficeAvailability } = await import('@/lib/portal/officeAvailability');
        const { public: pub } = await getOfficeAvailability(getServiceSupabase());
        if (pub.bySize) {
          fullOfficeSizes = officePlansApplied.filter((id) => {
            const count = pub.bySize![OFFICE_SIZE_FOR_PLAN[id]];
            return count && count.capacity > 0 && count.remaining === 0;
          });
        }
      } catch (e) {
        console.error('Could not check private-office availability for application', e);
      }
    }
    applicationData.full_office_plans = fullOfficeSizes;

    // Make these available to email helpers below by attaching them onto the
    // applicationData object passed through.
    applicationData.itemized_lines = itemized.lines;
    applicationData.total_monthly_cost_cents = itemized.total_monthly_cents;
    applicationData.total_one_time_cost_cents = itemized.total_one_time_cents;

    // Persist to member_applications so the admin panel can review it.
    // Core fields land in dedicated columns; everything else (housing
    // reference, membership reference, emergency contact, etc.) goes into
    // the `payload` JSON catch-all so the admin detail view can still see it.
    //
    // Trial info is stored in BOTH the new dedicated columns AND inside
    // `payload`, so the admin panel still sees the trial flag even on
    // databases where the trial-day migration has not been applied yet.
    //
    // THIS WRITE IS THE POINT OF THE REQUEST. Everything after it — three
    // emails — is a copy of something the row already says. It used to be
    // the other way round: a failed insert was logged to a console nobody
    // reads and the route returned `success: true` anyway, so an applicant
    // saw "Application Submitted!", staff got a cheerful "🆕 New Membership
    // Application", and the admin queue had nothing in it. Nobody involved
    // could tell that had happened.
    //
    // So the outcome is tracked, the ladder below is walked properly rather
    // than in one hopeful retry, and if the row genuinely cannot be written
    // the staff email says so in its subject line — the same contract
    // /api/membership-application/trial has for a trial day.
    let savedApplicationRowId: string | null = null;
    let persistError: string | null = null;
    // Set when this application came in off a post-trial "finish your
    // application" link, so the emails can say where the person came from.
    let trialOrigin: { application_id: string; trial_date: string | null } | null = null;

    try {
      const { getServiceSupabase } = await import('@/lib/portal/supabaseAdmin');
      const { isMissingColumnError } = await import('@/lib/portal/applicationQueue');
      const sb = getServiceSupabase();
      const {
        email,
        first_name,
        last_name,
        phone,
        company_name,
        membership_type,
        start_date,
        wants_trial_day,
        trial_date,
        resume_token,
        ...rest
      } = applicationData;

      const wantsTrial = !!wants_trial_day;
      const trialDate = trial_date || null;

      // Look the trial row up BEFORE inserting, not after.
      //
      // Two things depend on it, and both belong in the new row at the
      // moment it is written: the photo ID they already handed over, and the
      // fact that this application came out of a trial day at all. Doing it
      // afterwards meant a second write that could fail on its own, leaving
      // a membership application in the queue with no sign of the visit
      // behind it and a trial card still inviting staff to send them an
      // application they had already filled in.
      const resumeToken = typeof resume_token === 'string' ? resume_token.trim() : '';
      let carriedIdDocumentPath: string | null = null;
      if (resumeToken) {
        const { data: trialRow, error: trialLookupError } = await sb
          .from('member_applications')
          .select('id, trial_date, id_document_path, payload')
          .eq('resume_token', resumeToken)
          .maybeSingle();
        if (trialLookupError) {
          // A database without 20260824 has no resume_token column. The
          // application is still a perfectly good application.
          console.error('⚠️ Could not look up the trial row for this resume token:', trialLookupError);
        } else if (trialRow) {
          carriedIdDocumentPath = trialRow.id_document_path || null;
          const payloadTrialDate = (trialRow.payload as { trial_date?: unknown } | null)?.trial_date;
          trialOrigin = {
            application_id: trialRow.id,
            trial_date:
              trialRow.trial_date ||
              (typeof payloadTrialDate === 'string' && payloadTrialDate ? payloadTrialDate : null),
          };
        }
      }

      const baseRow = {
        email,
        first_name,
        last_name,
        phone,
        company_name,
        membership_type,
        start_date,
        // Mirror trial fields into payload so the admin UI can fall back to
        // them if the DB hasn't been migrated yet. Also stash the itemized
        // selected plans + computed totals so the admin/approval flow can
        // reconstruct the combined charge across multiple offices/desks
        // without recomputing from scratch.
        //
        // `resume_token` is deliberately NOT spread in here: it is a bearer
        // credential that prefills someone's details, and the admin detail
        // view prints payload verbatim.
        payload: {
          ...rest,
          application_kind: 'full',
          wants_trial_day: wantsTrial,
          trial_date: trialDate,
          selected_plans: rest.selected_plans ?? null,
          itemized_lines: itemized.lines,
          total_monthly_cost_cents: itemized.total_monthly_cents,
          total_one_time_cost_cents: itemized.total_one_time_cents,
          // Read back by readTrialOrigin() so the membership card can say
          // "came in from a trial day on the 12th" — see
          // lib/portal/trialApplication.ts.
          ...(trialOrigin ? { converted_from_trial: trialOrigin } : {}),
        },
      };

      // Written down the migration ladder, newest columns first — the same
      // shape, and the same shared predicate, as the trial route's insert.
      // Each rung drops the columns a database that is one migration behind
      // does not have; everything dropped is mirrored in `payload`, which
      // the admin panel reads as a fallback.
      //
      // It used to be a single retry that dropped all three trial columns at
      // once on a hand-rolled regex over the error message. That covered a
      // database missing 20260824 and silently lost the whole application on
      // one missing 20260428 as well.
      const insertAttempts: Array<{ row: Record<string, unknown>; missing: string }> = [
        {
          row: {
            ...baseRow,
            wants_trial_day: wantsTrial,
            trial_date: trialDate,
            application_kind: 'full',
            ...(carriedIdDocumentPath ? { id_document_path: carriedIdDocumentPath } : {}),
          },
          missing: '20260824_trial_application_split.sql',
        },
        {
          row: { ...baseRow, wants_trial_day: wantsTrial, trial_date: trialDate },
          missing: '20260428_trial_day_applicants.sql',
        },
        { row: baseRow, missing: '' },
      ];

      for (const attempt of insertAttempts) {
        const { data, error } = await sb
          .from('member_applications')
          .insert(attempt.row)
          .select('id')
          .single();
        if (!error) {
          savedApplicationRowId = data!.id;
          persistError = null;
          break;
        }
        persistError = error.message || 'unknown error';
        if (!isMissingColumnError(error)) break;
        if (attempt.missing) {
          console.warn(
            `⚠️ member_applications is missing columns this route writes. Apply migration ${attempt.missing}. Retrying without them.`
          );
        }
      }

      if (!savedApplicationRowId) {
        console.error('❌ Failed to persist application to member_applications:', persistError);
      }

      // Close the loop on the trial row: mark it converted so the follow-up
      // cron stops chasing them and the trial card stops offering staff a
      // "send membership application" button for an application that is
      // already sitting in the other tab.
      //
      // Best effort, and deliberately after the insert: a full application
      // that saved is a full application whether or not we managed to tie it
      // back to a trial from weeks ago.
      if (trialOrigin && savedApplicationRowId) {
        const { error: linkError } = await sb
          .from('member_applications')
          .update({ converted_to_application_id: savedApplicationRowId })
          .eq('id', trialOrigin.application_id);
        if (linkError) {
          console.error('⚠️ Could not link trial application to full application:', linkError);
        }
      }
    } catch (e) {
      persistError = e instanceof Error ? e.message : 'unknown error';
      console.error('❌ Unexpected error persisting application:', e);
      // Non-fatal — the emails below still go out, and now say what happened.
    }

    // The id staff can actually search for. `applicationId` above is a
    // timestamp reference minted before the row exists; printing it in the
    // staff email as "Application ID" and having it match nothing in the
    // admin panel is its own small piece of this confusion.
    const applicationRef = savedApplicationRowId || applicationId;

    // Check if Resend API key is configured.
    //
    // What this means to the applicant depends entirely on whether the row
    // saved. With a row, staff have the application in the panel and only
    // the confirmation email is missing; without one, nothing anywhere
    // records that they applied, and the only useful thing we can say is
    // "call us".
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      return NextResponse.json({
        success: false,
        saved: !!savedApplicationRowId,
        error: savedApplicationRowId
          ? 'Your application was received, but our email system is unavailable, so you will not get a confirmation email. Our team can see your application and will be in touch.'
          : 'We could not record your application. Please call us at (303) 359-8337 so we can take it down directly.',
        application_id: applicationRef
      }, { status: 500 });
    }

    let emailResults = {
      applicant_sent: false,
      trial_info_sent: false,
      manager_sent: false,
      member_services_sent: false,
      applicant_error: null as string | null,
      trial_info_error: null as string | null,
      manager_error: null as string | null,
      member_services_error: null as string | null
    };

    // Format membership type for display. When the applicant selected
    // multiple offices/desks, prefer a compact summary like
    //   "1× Private Office Single + 2× Dedicated Desk"
    // so emails clearly reflect the combined application.
    const membershipTypeDisplay = (() => {
      if (itemized.lines.length > 1 || (itemized.lines.length === 1 && itemized.lines[0].quantity > 1)) {
        return itemized.lines.map(l => `${l.quantity}× ${l.label}`).join(' + ');
      }
      if (itemized.lines.length === 1) {
        return itemized.lines[0].label;
      }
      // Fallback for legacy clients that didn't send selected_plans.
      return applicationData.membership_type
        .replace(/_/g, ' ')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    })();

    // Helper to avoid Resend rate limit (2 req/sec on free plan)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Send confirmation email to applicant
    try {
      console.log('📧 Sending applicant confirmation email...');
      
      const applicantEmail = await resend.emails.send({
        from: 'Merritt Workspace Membership <manager@merrittworkspace.net>',
        replyTo: MEMBER_SERVICES_EMAIL,
        to: applicationData.email,
        subject: 'Membership Application Received | Merritt Workspace',
        html: generateApplicantEmailHTML({
          firstName: applicationData.first_name,
          lastName: applicationData.last_name,
          email: applicationData.email,
          membershipType: membershipTypeDisplay,
          applicationId,
          submittedAt
        }),
        text: generateApplicantEmailText({
          firstName: applicationData.first_name,
          lastName: applicationData.last_name,
          email: applicationData.email,
          membershipType: membershipTypeDisplay,
          applicationId,
          submittedAt
        }),
        headers: getTransactionalEmailHeaders(),
        tags: [{ name: 'category', value: 'application_received' }],
      });

      emailResults.applicant_sent = true;
      console.log('✅ Applicant email sent:', applicantEmail.data?.id);
    } catch (error: any) {
      console.error('❌ Applicant email failed:', error);
      emailResults.applicant_error = error.message;
    }

    // Wait to avoid Resend rate limit
    await delay(1000);

    // If the applicant wants a trial day, send them practical trial-day info
    // immediately so they can show up and work without waiting on application
    // review. They still receive the standard onboarding flow.
    if (applicationData.wants_trial_day) {
      // Trial users applying for a private office need a different email than
      // dedicated-desk trial users: offices must be unlocked and equipped
      // ahead of time, so they need to coordinate with Member Services before
      // the trial day to confirm an office number.
      const isOfficeTrial = itemized.lines.some(line =>
        typeof line.plan_id === 'string' && line.plan_id.startsWith('private_office')
      );

      // A café applicant works from the 1905 building next door, not the
      // coworking floor, so their trial day needs the café instructions. An
      // application carrying both a café membership and an office takes the
      // office variant above, which is the one with a step to complete
      // before the visit.
      const isCafeTrial =
        !isOfficeTrial && itemized.lines.some(line => line.plan_id === 'cafe_membership');

      // Tell a desk trial visitor exactly which desks they can sit at. Two
      // cases send them to a team member instead of a DD number: the shared
      // floor is fully claimed, or they applied for a private dedicated desk,
      // which lives in a converted office that member services assigns (see
      // lib/portal/deskAvailability.ts). Best-effort — if the lookup fails we
      // leave both unset and the email falls back to its generic "sit at any
      // completely empty desk" guidance rather than guessing either way.
      let availableDesksLabel: string | null = null;
      let allDesksTaken = false;
      if (!isOfficeTrial && !isCafeTrial) {
        if (itemized.lines.some(line => line.plan_id === 'private_dedicated_desk')) {
          allDesksTaken = true;
        } else {
          try {
            const { getServiceSupabase } = await import('@/lib/portal/supabaseAdmin');
            const { listAvailableDesks, formatDeskList } = await import('@/lib/portal/deskAvailability');
            const freeDesks = await listAvailableDesks(getServiceSupabase());
            availableDesksLabel = formatDeskList(freeDesks) || null;
            allDesksTaken = freeDesks.length === 0;
          } catch (e) {
            console.error('Could not list available desks for trial-day email', e);
          }
        }
      }

      try {
        console.log(`📧 Sending trial-day info email (${isOfficeTrial ? 'office' : 'dedicated desk'} variant)...`);
        const trialEmail = await resend.emails.send({
          from: 'Merritt Workspace Membership <manager@merrittworkspace.net>',
          replyTo: MEMBER_SERVICES_EMAIL,
          to: applicationData.email,
          subject: isOfficeTrial
            ? 'Your Office Trial Day at Merritt Workspace | Confirm Your Office'
            : isCafeTrial
              ? 'Your Café Trial Day at Merritt Workspace | What to Expect'
              : allDesksTaken
                ? 'Your Trial Day at Merritt Workspace | Confirm Your Desk'
                : 'Your Trial Day at Merritt Workspace | What to Expect',
          html: generateTrialDayEmailHTML({
            firstName: applicationData.first_name,
            trialDate: applicationData.trial_date,
            isOfficeTrial,
            isCafeTrial,
            availableDesksLabel,
            allDesksTaken,
            // This route only ever fires for a full membership application,
            // so the closing "we're reviewing it" paragraph is true here.
            hasFullApplication: true,
          }),
          text: generateTrialDayEmailText({
            firstName: applicationData.first_name,
            trialDate: applicationData.trial_date,
            isOfficeTrial,
            isCafeTrial,
            availableDesksLabel,
            allDesksTaken,
            // This route only ever fires for a full membership application,
            // so the closing "we're reviewing it" paragraph is true here.
            hasFullApplication: true,
          }),
          headers: getTransactionalEmailHeaders(),
          tags: [{ name: 'category', value: 'trial_day_info' }],
        });
        emailResults.trial_info_sent = true;
        console.log('✅ Trial-day info email sent:', trialEmail.data?.id);
      } catch (error: any) {
        console.error('❌ Trial-day info email failed:', error);
        emailResults.trial_info_error = error.message;
      }
      await delay(1000);
    }

    // Send notification to both staff inboxes with full application details.
    // One send addressed to both, rather than two identical sends: it halves
    // the calls against Resend's rate limit and makes it impossible for the
    // two desks to end up with different copies of the same application.
    try {
      console.log('📧 Sending staff notification email...');

      // When the row did not save, this email is the only record that this
      // person applied at all — so it says so first, in the subject line,
      // where a phone shows it without scrolling. Same contract as
      // 🚨 TRIAL DAY NOT SAVED in the trial route.
      const subjectPrefix = !savedApplicationRowId
        ? '🚨 APPLICATION NOT SAVED —'
        : applicationData.wants_trial_day
          ? '🟧 TRIAL DAY'
          : '🆕';
      const staffEmail = await resend.emails.send({
        from: 'Merritt Workspace Membership <manager@merrittworkspace.net>',
        to: STAFF_EMAILS,
        subject: `${subjectPrefix} New Membership Application - ${applicationData.first_name} ${applicationData.last_name} (${membershipTypeDisplay})`,
        html: generateManagerEmailHTML({
          applicationData,
          membershipTypeDisplay,
          applicationId: applicationRef,
          submittedAt,
          notSaved: !savedApplicationRowId,
          trialOrigin
        }),
        text: generateManagerEmailText({
          applicationData,
          membershipTypeDisplay,
          applicationId: applicationRef,
          submittedAt,
          notSaved: !savedApplicationRowId,
          trialOrigin
        })
      });

      emailResults.manager_sent = true;
      emailResults.member_services_sent = true;
      console.log('✅ Staff email sent:', staffEmail.data?.id);
    } catch (error: any) {
      console.error('❌ Staff email failed:', error);
      emailResults.manager_error = error.message;
      emailResults.member_services_error = error.message;
    }

    console.log('📊 Email results:', emailResults);

    // Return success if at least one email was sent.
    //
    // `saved` is the honest half of that: staff were told either way, but
    // only a saved row puts this application in front of them on the admin
    // panel, and the form says something different when it is missing.
    if (emailResults.applicant_sent || emailResults.manager_sent) {
      return NextResponse.json({
        success: true,
        saved: !!savedApplicationRowId,
        application_id: applicationRef,
        message: emailResults.applicant_sent
          ? `Application submitted successfully! Check your email at ${applicationData.email} for confirmation.`
          : 'Application submitted successfully! You will receive confirmation shortly.',
        email_status: emailResults
      });
    } else {
      // Both emails failed
      return NextResponse.json({
        success: false,
        saved: !!savedApplicationRowId,
        error: savedApplicationRowId
          ? 'Failed to send confirmation emails. Application received but email system unavailable.'
          : 'We could not record your application or email it to us. Please call us at (303) 359-8337 so we can take it down directly.',
        application_id: applicationRef,
        email_status: emailResults
      }, { status: 500 });
    }

  } catch (error) {
    console.error('💥 Membership Application API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process application. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Membership Application API is working!', 
    timestamp: new Date().toISOString(),
    resend_configured: !!process.env.RESEND_API_KEY
  });
}

// Email template functions
function generateApplicantEmailHTML(data: {
  firstName: string;
  lastName: string;
  email: string;
  membershipType: string;
  applicationId: string;
  submittedAt: Date;
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Membership Application Confirmation</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
          .application-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .next-steps { background: #fff8e1; padding: 20px; border-radius: 8px; border-left: 4px solid #ed7611; margin: 20px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #ed7611; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Merritt Workspace!</h1>
            <p>Your membership application has been received</p>
          </div>
          
          <div class="content">
            <p>Hi ${data.firstName},</p>
            
            <p>Thank you for your interest in joining the Merritt Workspace community! We've received your membership application and are excited to review it.</p>
            
            <div class="application-info">
              <h3 style="margin-top: 0;">Application Details</h3>
              <p><strong>Applicant:</strong> ${data.firstName} ${data.lastName}</p>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Membership Type:</strong> ${data.membershipType}</p>
              <p><strong>Application ID:</strong> ${data.applicationId}</p>
              <p><strong>Submitted:</strong> ${data.submittedAt.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Denver',
                timeZoneName: 'short'
              })}</p>
            </div>

            <div class="next-steps">
              <h3 style="margin-top: 0;">🎯 What's Next?</h3>
              <ol>
                <li><strong>Review Process:</strong> Our team will review your application within 1-2 business days</li>
                <li><strong>Schedule Tour:</strong> We'll contact you to schedule a complimentary workspace tour</li>
                <li><strong>Meet the Team:</strong> Get to know our community and see our burnt orange floors firsthand!</li>
                <li><strong>Free Trial Day:</strong> Experience working in our space with a full day trial</li>
              </ol>
            </div>

            <p>While you wait, feel free to explore our amenities:</p>
            <ul>
              <li>Premium conference room with A/V equipment</li>
              <li>High-speed WiFi throughout the building</li>
              <li>On-site snackshop with fresh coffee and meals</li>
              <li>Secure building with 24/7 access</li>
              <li>Networking events and community gatherings</li>
              <li>Prime Sloan's Lake location - just 3 minutes to I-25</li>
            </ul>

            <p>We'll be in touch soon to move forward with your membership. Thank you for choosing Merritt Workspace!</p>
            
            <a href="mailto:memberservices@merrittworkspace.net" class="button">Questions? Contact Us</a>
          </div>

          <div class="footer">
            <p><strong>Merritt Workspace</strong></p>
            <p>Where Work Meets Community</p>
            <p>2246 Irving Street, Denver, CO 80211</p>
            <p>Email: memberservices@merrittworkspace.net | Phone: (303) 359-8337</p>
            <p>Manager: manager@merrittworkspace.net | (720) 357-9499</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateApplicantEmailText(data: {
  firstName: string;
  lastName: string;
  email: string;
  membershipType: string;
  applicationId: string;
  submittedAt: Date;
}) {
  return `
Membership Application Received - Merritt Workspace

Hi ${data.firstName},

Thank you for applying to join Merritt Workspace! We've received your application and are excited to review it.

Application Details:
- Applicant: ${data.firstName} ${data.lastName}
- Email: ${data.email}
- Membership Type: ${data.membershipType}
- Application ID: ${data.applicationId}
- Submitted: ${data.submittedAt.toLocaleString('en-US', { timeZone: 'America/Denver', timeZoneName: 'short' })}

What's Next:
1. Review Process: Our team will review your application within 1-2 business days
2. Schedule Tour: We'll contact you to schedule a complimentary workspace tour
3. Meet the Team: Get to know our community and see our burnt orange floors!
4. Free Trial Day: Experience working in our space with a full day trial

Our Amenities:
- Premium conference room with A/V equipment
- High-speed WiFi throughout the building
- On-site snackshop with fresh coffee and meals
- Secure building with 24/7 access
- Networking events and community gatherings
- Prime Sloan's Lake location - just 3 minutes to I-25

We'll be in touch soon to move forward with your membership.

Questions? Contact us at memberservices@merrittworkspace.net or (303) 359-8337
Prefer the manager? manager@merrittworkspace.net or (720) 357-9499

Welcome to the community!

Merritt Workspace Team
2246 Irving Street, Denver, CO 80211
  `;
}

function generateManagerEmailHTML(data: {
  applicationData: any;
  membershipTypeDisplay: string;
  applicationId: string;
  submittedAt: Date;
  // True when the row could not be written to member_applications, so this
  // email is the only record that the person applied.
  notSaved?: boolean;
  // Set when they came back off a post-trial "finish your application" link.
  trialOrigin?: { application_id: string; trial_date: string | null } | null;
}) {
  const app = data.applicationData;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background: #ed7611; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .alert { background: #fff8e1; padding: 15px; border-radius: 8px; border-left: 4px solid #ed7611; margin: 15px 0; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          td { padding: 8px; border-bottom: 1px solid #e5e5e5; }
          td:first-child { font-weight: bold; width: 200px; }
          .reference-box { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">🆕 New Membership Application</h2>
            <p style="margin: 5px 0 0 0;">Action Required: Follow up within 1-2 business days</p>
          </div>

          ${data.notSaved ? `
          <div style="background: #fdecea; border: 2px solid #c62828; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin: 0 0 6px 0; color: #b71c1c;">🚨 This application did NOT save</h3>
            <p style="margin: 0;">It will <strong>not</strong> appear under Membership applications in the admin panel. This email is the only record of it.</p>
            <p style="margin: 6px 0 0 0; font-size: 13px;">Please reply to the applicant directly and take their details down by hand.</p>
          </div>
          ` : ''}

          ${data.trialOrigin ? `
          <div style="background: #fff4e5; border: 2px solid #ed7611; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin: 0 0 6px 0; color: #ad4a00;">↩️ This is a trial visitor coming back to join</h3>
            <p style="margin: 0;">They came in for a trial day${data.trialOrigin.trial_date ? ` on <strong>${new Date(`${data.trialOrigin.trial_date}T00:00:00`).toLocaleDateString()}</strong>` : ''} and have now completed the full application.</p>
            <p style="margin: 6px 0 0 0; font-size: 13px;">Their trial card in the Trial days tab is marked as converted — the decision to make is on this application, under <strong>Membership applications</strong>. Their photo ID from the trial day is already on file.</p>
          </div>
          ` : ''}

          ${app.wants_trial_day ? `
          <div style="background: #fff4e5; border: 2px solid #ed7611; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin: 0 0 6px 0; color: #ad4a00;">🟧 Trial Day Requested</h3>
            <p style="margin: 0;"><strong>Trial date:</strong> ${app.trial_date ? new Date(app.trial_date).toLocaleDateString() : 'not specified'}</p>
            <p style="margin: 6px 0 0 0; font-size: 13px;">A trial-day info email has already been sent directly to the applicant. They may show up on the date above before the application has been reviewed.</p>
          </div>
          ` : ''}

          ${app.full_office_plans?.length ? `
          <div style="background: #fdecea; border: 2px solid #c62828; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin: 0 0 6px 0; color: #b71c1c;">⚠️ No office of that size is free</h3>
            <p style="margin: 0;">This application asks for <strong>${app.full_office_plans.map((id: string) => PLAN_CATALOG[id]?.label || id).join(', ')}</strong>, and every office of that size is currently occupied.</p>
            <p style="margin: 6px 0 0 0; font-size: 13px;">Do not approve it expecting a room to hand over. Either offer another size, or hold them until one comes free.</p>
          </div>
          ` : ''}

          ${app.dedicated_desk_floor_full ? `
          <div style="background: #fdecea; border: 2px solid #c62828; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin: 0 0 6px 0; color: #b71c1c;">⚠️ Dedicated desks are FULL</h3>
            <p style="margin: 0;">This application includes a <strong>shared-floor Dedicated Desk ($200/mo)</strong>, but every one of our dedicated desks is already spoken for — including members who have paid but not yet picked a desk number.</p>
            <p style="margin: 6px 0 0 0; font-size: 13px;">Do not approve this at the $200 shared rate expecting a desk on the floor plan. If you want to take them on, convert an empty private office into a dedicated-desk area and approve them as a <strong>Private Dedicated Desk ($300/mo)</strong>.</p>
          </div>
          ` : ''}

          <div class="alert">
            <h3 style="margin-top: 0;">Application Summary</h3>
            <p><strong>Applicant:</strong> ${app.first_name} ${app.last_name}</p>
            <p><strong>Email:</strong> ${app.email}</p>
            <p><strong>Phone:</strong> ${app.phone}</p>
            <p><strong>Preferred Start Date:</strong> ${new Date(app.start_date).toLocaleDateString()}</p>
            ${app.wants_trial_day ? `<p><strong>Trial Day Date:</strong> ${app.trial_date ? new Date(app.trial_date).toLocaleDateString() : 'not specified'}</p>` : ''}
            <p><strong>Application ID:</strong> ${data.applicationId}</p>
            <p><strong>Submitted:</strong> ${data.submittedAt.toLocaleString('en-US', { timeZone: 'America/Denver', timeZoneName: 'short' })}</p>
          </div>

          <div class="section">
            <h3>Selected Offices &amp; Dedicated Desks</h3>
            ${Array.isArray(app.itemized_lines) && app.itemized_lines.length > 0 ? `
              <table>
                <tr style="background:#fff8e1;"><td>Plan</td><td>Quantity</td><td>Unit</td><td>Subtotal</td></tr>
                ${app.itemized_lines.map((line: ItemizedLine) => `
                  <tr>
                    <td style="font-weight: normal;">${line.label}</td>
                    <td style="font-weight: normal;">${line.quantity}</td>
                    <td style="font-weight: normal;">${formatUsdCents(line.unit_price_cents)}${line.recurrence === 'monthly' ? '/mo' : ' one-time'}</td>
                    <td style="font-weight: normal;">${formatUsdCents(line.subtotal_cents)}${line.recurrence === 'monthly' ? '/mo' : ' one-time'}</td>
                  </tr>
                `).join('')}
              </table>
              <div style="margin-top: 12px; padding: 12px; background: #fff; border: 1px solid #ed7611; border-radius: 6px;">
                ${app.total_monthly_cost_cents > 0 ? `<p style="margin: 0;"><strong>Total monthly charge:</strong> <span style="font-size: 18px; color: #ad4a00;">${formatUsdCents(app.total_monthly_cost_cents)}/month</span></p>` : ''}
                ${app.total_one_time_cost_cents > 0 ? `<p style="margin: 4px 0 0 0;"><strong>One-time charges:</strong> <span style="font-size: 18px; color: #ad4a00;">${formatUsdCents(app.total_one_time_cost_cents)}</span></p>` : ''}
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #555;">All offices and dedicated desks selected by the applicant are billed together as a single combined charge.</p>
              </div>
            ` : `
              <p>Membership Type: ${data.membershipTypeDisplay}</p>
            `}
          </div>

          <div class="section">
            <h3>Personal Information</h3>
            <table>
              <tr><td>Name</td><td>${app.first_name} ${app.last_name}</td></tr>
              <tr><td>Email</td><td>${app.email}</td></tr>
              <tr><td>Phone</td><td>${app.phone}</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>Professional Information</h3>
            <table>
              <tr><td>Company</td><td>${app.company_name}</td></tr>
              <tr><td>Job Title</td><td>${app.job_title}</td></tr>
              <tr><td>Industry</td><td>${app.industry}</td></tr>
              <tr><td>Team Size</td><td>${app.team_size}</td></tr>
              ${app.linkedin_url ? `<tr><td>LinkedIn</td><td><a href="${app.linkedin_url}">${app.linkedin_url}</a></td></tr>` : ''}
              ${app.website_url ? `<tr><td>Website</td><td><a href="${app.website_url}">${app.website_url}</a></td></tr>` : ''}
            </table>
          </div>

          <div class="section">
            <h3>Work Preferences</h3>
            <table>
              <tr><td>Work Style</td><td>${app.work_style?.join(', ') || 'Not specified'}</td></tr>
              <tr><td>Meeting Frequency</td><td>${app.meeting_frequency}</td></tr>
              <tr><td>Referral Source</td><td>${app.referral_source}</td></tr>
            </table>
          </div>

          ${app.housing_reference && app.housing_reference.type ? `
          <div class="section">
            <h3>Housing Reference</h3>
            <table>
              <tr><td>Type</td><td>${app.housing_reference.type === 'mortgage' ? 'Mortgage Company' : 'Landlord'}</td></tr>
              <tr><td>${app.housing_reference.type === 'mortgage' ? 'Mortgage Company' : 'Landlord / Property Manager'}</td><td>${app.housing_reference.company_name || ''}</td></tr>
              <tr><td>Contact Name</td><td>${app.housing_reference.contact_name || ''}</td></tr>
              <tr><td>Contact Phone</td><td>${app.housing_reference.contact_phone || ''}</td></tr>
              <tr><td>Contact Email</td><td>${app.housing_reference.contact_email || ''}</td></tr>
              ${app.housing_reference.property_address ? `<tr><td>Property Address</td><td>${app.housing_reference.property_address}</td></tr>` : ''}
              ${app.housing_reference.start_date || app.housing_reference.end_date ? `<tr><td>Dates</td><td>${app.housing_reference.start_date || 'N/A'} to ${app.housing_reference.end_date || 'Present'}</td></tr>` : ''}
            </table>
          </div>
          ` : ''}

          ${app.membership_reference && app.membership_reference.type ? `
          <div class="section">
            <h3>Membership Reference</h3>
            <table>
              <tr><td>Type</td><td>${app.membership_reference.type === 'gym' ? 'Gym' : 'Other Workspace'}</td></tr>
              <tr><td>${app.membership_reference.type === 'gym' ? 'Gym Name' : 'Workspace Name'}</td><td>${app.membership_reference.facility_name || ''}</td></tr>
              <tr><td>Contact Name</td><td>${app.membership_reference.contact_name || ''}</td></tr>
              <tr><td>Contact Phone</td><td>${app.membership_reference.contact_phone || ''}</td></tr>
              <tr><td>Contact Email</td><td>${app.membership_reference.contact_email || ''}</td></tr>
              ${app.membership_reference.start_date || app.membership_reference.end_date ? `<tr><td>Dates</td><td>${app.membership_reference.start_date || 'N/A'} to ${app.membership_reference.end_date || 'Present'}</td></tr>` : ''}
            </table>
          </div>
          ` : ''}

          <div class="section">
            <h3>Emergency Contact</h3>
            <table>
              <tr><td>Name</td><td>${app.emergency_contact_name}</td></tr>
              <tr><td>Phone</td><td>${app.emergency_contact_phone}</td></tr>
              <tr><td>Relationship</td><td>${app.emergency_contact_relationship}</td></tr>
            </table>
          </div>

          ${app.special_requirements ? `
          <div class="section">
            <h3>Special Requirements</h3>
            <p>${app.special_requirements}</p>
          </div>
          ` : ''}

          <div class="section">
            <h3>Consents & Agreements</h3>
            <ul>
              <li>Terms & Conditions: ${app.agrees_to_terms ? '✅ Agreed' : '❌ Not Agreed'}</li>
              <li>Marketing Communications: ${app.marketing_consent ? '✅ Opted In' : '❌ Opted Out'}</li>
            </ul>
          </div>

          <div class="alert">
            <h3 style="margin-top: 0;">📋 Next Steps</h3>
            <ol>
              <li>Review the application details above</li>
              <li>Contact ${app.first_name} at ${app.email} or ${app.phone} to schedule a tour</li>
              <li>Arrange their free trial day</li>
              <li>Verify housing and membership references</li>
              <li>Send membership agreement for signature</li>
            </ol>
            <p><strong>⏰ Action Required:</strong> Please follow up within 1-2 business days as promised to the applicant.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateManagerEmailText(data: {
  applicationData: any;
  membershipTypeDisplay: string;
  applicationId: string;
  submittedAt: Date;
  notSaved?: boolean;
  trialOrigin?: { application_id: string; trial_date: string | null } | null;
}) {
  const app = data.applicationData;

  return `
NEW MEMBERSHIP APPLICATION

${data.notSaved ? `*** THIS APPLICATION DID NOT SAVE ***
It will NOT appear under Membership applications in the admin panel. This
email is the only record of it — please reply to the applicant directly and
take their details down by hand.

` : ''}${data.trialOrigin ? `*** TRIAL VISITOR COMING BACK TO JOIN ***
They came in for a trial day${data.trialOrigin.trial_date ? ` on ${new Date(`${data.trialOrigin.trial_date}T00:00:00`).toLocaleDateString()}` : ''} and have now completed the full
application. Their trial card is marked converted; the decision to make is on
this application, under Membership applications. Their photo ID from the trial
day is already on file.

` : ''}${app.full_office_plans?.length ? `*** NO OFFICE OF THAT SIZE IS FREE ***
This application asks for ${app.full_office_plans.map((id: string) => PLAN_CATALOG[id]?.label || id).join(', ')}, and every office of
that size is currently occupied. Do not approve it expecting a room to hand
over — offer another size, or hold them until one comes free.

` : ''}${app.dedicated_desk_floor_full ? `*** DEDICATED DESKS ARE FULL ***
This application includes a shared-floor Dedicated Desk ($200/mo), but every
dedicated desk is already spoken for (including members who have paid but not
yet picked a desk number). Do not approve at the $200 shared rate expecting a
desk on the floor plan — convert an empty private office and approve them as a
Private Dedicated Desk ($300/mo) instead.

` : ''}${app.wants_trial_day ? `*** TRIAL DAY REQUESTED ***
Trial date: ${app.trial_date ? new Date(app.trial_date).toLocaleDateString() : 'not specified'}
A trial-day info email has been sent to the applicant directly.

` : ''}Applicant: ${app.first_name} ${app.last_name}
Email: ${app.email}
Phone: ${app.phone}
Preferred Start Date: ${new Date(app.start_date).toLocaleDateString()}

SELECTED OFFICES & DEDICATED DESKS
${Array.isArray(app.itemized_lines) && app.itemized_lines.length > 0
  ? app.itemized_lines.map((line: ItemizedLine) =>
      `- ${line.quantity} × ${line.label} @ ${formatUsdCents(line.unit_price_cents)}${line.recurrence === 'monthly' ? '/mo' : ' one-time'} = ${formatUsdCents(line.subtotal_cents)}${line.recurrence === 'monthly' ? '/mo' : ' one-time'}`
    ).join('\n')
  : `- ${data.membershipTypeDisplay}`}
${app.total_monthly_cost_cents > 0 ? `TOTAL MONTHLY CHARGE: ${formatUsdCents(app.total_monthly_cost_cents)}/month` : ''}
${app.total_one_time_cost_cents > 0 ? `ONE-TIME CHARGES:     ${formatUsdCents(app.total_one_time_cost_cents)}` : ''}
(All selected offices/desks are billed together as a single combined charge.)

${app.wants_trial_day ? `Trial Day Date: ${app.trial_date ? new Date(app.trial_date).toLocaleDateString() : 'not specified'}\n` : ''}Application ID: ${data.applicationId}
Submitted: ${data.submittedAt.toLocaleString('en-US', { timeZone: 'America/Denver', timeZoneName: 'short' })}

PERSONAL INFORMATION
Name: ${app.first_name} ${app.last_name}
Email: ${app.email}
Phone: ${app.phone}

PROFESSIONAL INFORMATION
Company: ${app.company_name}
Job Title: ${app.job_title}
Industry: ${app.industry}
Team Size: ${app.team_size}
${app.linkedin_url ? `LinkedIn: ${app.linkedin_url}` : ''}
${app.website_url ? `Website: ${app.website_url}` : ''}

WORK PREFERENCES
Work Style: ${app.work_style?.join(', ') || 'Not specified'}
Meeting Frequency: ${app.meeting_frequency}
Referral Source: ${app.referral_source}

${app.housing_reference && app.housing_reference.type ? `
HOUSING REFERENCE
Type: ${app.housing_reference.type === 'mortgage' ? 'Mortgage Company' : 'Landlord'}
${app.housing_reference.type === 'mortgage' ? 'Mortgage Company' : 'Landlord / Property Manager'}: ${app.housing_reference.company_name || ''}
Contact: ${app.housing_reference.contact_name || ''}
Phone: ${app.housing_reference.contact_phone || ''}
Email: ${app.housing_reference.contact_email || ''}
${app.housing_reference.property_address ? `Property Address: ${app.housing_reference.property_address}` : ''}
${app.housing_reference.start_date || app.housing_reference.end_date ? `Dates: ${app.housing_reference.start_date || 'N/A'} to ${app.housing_reference.end_date || 'Present'}` : ''}
` : ''}

${app.membership_reference && app.membership_reference.type ? `
MEMBERSHIP REFERENCE
Type: ${app.membership_reference.type === 'gym' ? 'Gym' : 'Other Workspace'}
${app.membership_reference.type === 'gym' ? 'Gym Name' : 'Workspace Name'}: ${app.membership_reference.facility_name || ''}
Contact: ${app.membership_reference.contact_name || ''}
Phone: ${app.membership_reference.contact_phone || ''}
Email: ${app.membership_reference.contact_email || ''}
${app.membership_reference.start_date || app.membership_reference.end_date ? `Dates: ${app.membership_reference.start_date || 'N/A'} to ${app.membership_reference.end_date || 'Present'}` : ''}
` : ''}

EMERGENCY CONTACT
Name: ${app.emergency_contact_name}
Phone: ${app.emergency_contact_phone}
Relationship: ${app.emergency_contact_relationship}

${app.special_requirements ? `
SPECIAL REQUIREMENTS
${app.special_requirements}
` : ''}

CONSENTS & AGREEMENTS
- Terms & Conditions: ${app.agrees_to_terms ? 'Agreed' : 'Not Agreed'}
- Marketing Communications: ${app.marketing_consent ? 'Opted In' : 'Opted Out'}

NEXT STEPS:
1. Review the application details
2. Contact ${app.first_name} at ${app.email} or ${app.phone} to schedule a tour
3. Arrange their free trial day
4. Verify housing and membership references
5. Send membership agreement for signature

ACTION REQUIRED: Please follow up within 1-2 business days.
  `;
}
