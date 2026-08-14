// app/api/membership-application/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getTransactionalEmailHeaders } from '@/lib/portal/emails';

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

// Plan catalog used to label & price the items in `selected_plans`. Kept in
// lockstep with app/membership/apply/page.tsx and lib/portal/pricing.ts.
const PLAN_CATALOG: Record<string, { label: string; price_cents: number; recurrence: 'monthly' | 'one_time' }> = {
  dedicated_desk:          { label: 'Dedicated Desk',             price_cents: 20000,  recurrence: 'monthly'  },
  // A dedicated desk in a private, lockable office area rather than on the
  // shared coworking floor. Only offered on the application form once all 25
  // floor desks are spoken for — see lib/portal/deskAvailability.ts.
  private_dedicated_desk:  { label: 'Private Dedicated Desk',     price_cents: 30000,  recurrence: 'monthly'  },
  one_day_dedicated_desk:  { label: 'One Day Dedicated Desk',     price_cents: 3000,   recurrence: 'one_time' },
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

export async function POST(request: NextRequest) {
  try {
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
    try {
      const { getServiceSupabase } = await import('@/lib/portal/supabaseAdmin');
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
        ...rest
      } = applicationData;

      const wantsTrial = !!wants_trial_day;
      const trialDate = trial_date || null;

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
        payload: {
          ...rest,
          wants_trial_day: wantsTrial,
          trial_date: trialDate,
          selected_plans: rest.selected_plans ?? null,
          itemized_lines: itemized.lines,
          total_monthly_cost_cents: itemized.total_monthly_cents,
          total_one_time_cost_cents: itemized.total_one_time_cents,
        },
      };

      // First attempt: include the new dedicated trial columns.
      let { error } = await sb.from('member_applications').insert({
        ...baseRow,
        wants_trial_day: wantsTrial,
        trial_date: trialDate,
      });

      // If the trial columns don't exist yet (migration not applied), retry
      // without them — the trial info is still preserved in `payload`.
      if (error && /column .* does not exist|wants_trial_day|trial_date/i.test(error.message || '')) {
        console.warn('⚠️ Trial-day columns missing; persisting trial info to payload only. Apply migration 20260428_trial_day_applicants.sql to enable column-level filtering.');
        const retry = await sb.from('member_applications').insert(baseRow);
        error = retry.error;
      }

      if (error) {
        console.error('❌ Failed to persist application to member_applications:', error);
      }
    } catch (e) {
      console.error('❌ Unexpected error persisting application:', e);
      // Non-fatal — emails still go out below.
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      return NextResponse.json({
        success: false,
        error: 'Email system not configured. Please contact support.',
        application_id: applicationId
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
        replyTo: MANAGER_EMAIL,
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

      try {
        console.log(`📧 Sending trial-day info email (${isOfficeTrial ? 'office' : 'dedicated desk'} variant)...`);
        const trialEmail = await resend.emails.send({
          from: 'Merritt Workspace Membership <manager@merrittworkspace.net>',
          replyTo: MANAGER_EMAIL,
          to: applicationData.email,
          subject: isOfficeTrial
            ? 'Your Office Trial Day at Merritt Workspace | Confirm Your Office'
            : 'Your Trial Day at Merritt Workspace | What to Expect',
          html: generateTrialDayEmailHTML({
            firstName: applicationData.first_name,
            trialDate: applicationData.trial_date,
            isOfficeTrial,
          }),
          text: generateTrialDayEmailText({
            firstName: applicationData.first_name,
            trialDate: applicationData.trial_date,
            isOfficeTrial,
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

    // Send notification to manager with full application details
    try {
      console.log('📧 Sending manager notification email...');
      
      const subjectPrefix = applicationData.wants_trial_day ? '🟧 TRIAL DAY' : '🆕';
      const managerEmail = await resend.emails.send({
        from: 'Merritt Workspace Membership <manager@merrittworkspace.net>',
        to: MANAGER_EMAIL,
        subject: `${subjectPrefix} New Membership Application - ${applicationData.first_name} ${applicationData.last_name} (${membershipTypeDisplay})`,
        html: generateManagerEmailHTML({
          applicationData,
          membershipTypeDisplay,
          applicationId,
          submittedAt
        }),
        text: generateManagerEmailText({
          applicationData,
          membershipTypeDisplay,
          applicationId,
          submittedAt
        })
      });

      emailResults.manager_sent = true;
      console.log('✅ Manager email sent:', managerEmail.data?.id);
    } catch (error: any) {
      console.error('❌ Manager email failed:', error);
      emailResults.manager_error = error.message;
    }

    // Wait to avoid Resend rate limit
    await delay(1000);

    // Send notification to member services with full application details
    try {
      console.log('📧 Sending member services notification email...');

      const memberServicesSubjectPrefix = applicationData.wants_trial_day ? '🟧 TRIAL DAY' : '🆕';
      const memberServicesEmail = await resend.emails.send({
        from: 'Merritt Workspace Membership <manager@merrittworkspace.net>',
        to: MEMBER_SERVICES_EMAIL,
        subject: `${memberServicesSubjectPrefix} New Membership Application - ${applicationData.first_name} ${applicationData.last_name} (${membershipTypeDisplay})`,
        html: generateManagerEmailHTML({
          applicationData,
          membershipTypeDisplay,
          applicationId,
          submittedAt
        }),
        text: generateManagerEmailText({
          applicationData,
          membershipTypeDisplay,
          applicationId,
          submittedAt
        })
      });

      emailResults.member_services_sent = true;
      console.log('✅ Member services email sent:', memberServicesEmail.data?.id);
    } catch (error: any) {
      console.error('❌ Member services email failed:', error);
      emailResults.member_services_error = error.message;
    }

    console.log('📊 Email results:', emailResults);

    // Return success if at least one email was sent
    if (emailResults.applicant_sent || emailResults.manager_sent) {
      return NextResponse.json({
        success: true,
        application_id: applicationId,
        message: emailResults.applicant_sent 
          ? `Application submitted successfully! Check your email at ${applicationData.email} for confirmation.`
          : 'Application submitted successfully! You will receive confirmation shortly.',
        email_status: emailResults
      });
    } else {
      // Both emails failed
      return NextResponse.json({
        success: false,
        error: 'Failed to send confirmation emails. Application received but email system unavailable.',
        application_id: applicationId,
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
              <li>Premium meeting rooms with A/V equipment</li>
              <li>High-speed WiFi throughout the building</li>
              <li>On-site snackshop with fresh coffee and meals</li>
              <li>Secure building with 24/7 access</li>
              <li>Networking events and community gatherings</li>
              <li>Prime Sloan's Lake location - just 3 minutes to I-25</li>
            </ul>

            <p>We'll be in touch soon to move forward with your membership. Thank you for choosing Merritt Workspace!</p>
            
            <a href="mailto:manager@merrittworkspace.net" class="button">Questions? Contact Us</a>
          </div>

          <div class="footer">
            <p><strong>Merritt Workspace</strong></p>
            <p>Where Work Meets Community</p>
            <p>2246 Irving Street, Denver, CO 80211</p>
            <p>Email: manager@merrittworkspace.net | Phone: (720) 357-9499</p>
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
- Premium meeting rooms with A/V equipment
- High-speed WiFi throughout the building
- On-site snackshop with fresh coffee and meals
- Secure building with 24/7 access
- Networking events and community gatherings
- Prime Sloan's Lake location - just 3 minutes to I-25

We'll be in touch soon to move forward with your membership.

Questions? Contact us at manager@merrittworkspace.net or (720) 357-9499

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
          
          ${app.wants_trial_day ? `
          <div style="background: #fff4e5; border: 2px solid #ed7611; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
            <h3 style="margin: 0 0 6px 0; color: #ad4a00;">🟧 Trial Day Requested</h3>
            <p style="margin: 0;"><strong>Trial date:</strong> ${app.trial_date ? new Date(app.trial_date).toLocaleDateString() : 'not specified'}</p>
            <p style="margin: 6px 0 0 0; font-size: 13px;">A trial-day info email has already been sent directly to the applicant. They may show up on the date above before the application has been reviewed.</p>
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
}) {
  const app = data.applicationData;
  
  return `
NEW MEMBERSHIP APPLICATION

${app.dedicated_desk_floor_full ? `*** DEDICATED DESKS ARE FULL ***
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

function generateTrialDayEmailHTML(data: { firstName: string; trialDate: string; isOfficeTrial?: boolean }) {
  const trialDateDisplay = data.trialDate
    ? new Date(data.trialDate).toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : 'the date you selected';

  const headerTitle = data.isOfficeTrial
    ? 'Your Office Trial Day is Almost Set'
    : "You're Set for Your Trial Day";

  const headerSubtitle = data.isOfficeTrial
    ? 'One quick step — confirm your office number with us'
    : 'Everything you need to show up and get to work';

  const introParagraph = data.isOfficeTrial
    ? `Thanks for signing up for an office trial day at Merritt Workspace. We're looking forward to having you in for <strong>${trialDateDisplay}</strong>. Because you're trialing a private office, there's one important step before your visit — see below.`
    : `Thanks for signing up for a trial day at Merritt Workspace. We're looking forward to having you in for <strong>${trialDateDisplay}</strong>. Everything below is what you need to walk in and get to work.`;

  const officeConfirmationBlock = data.isOfficeTrial
    ? `
            <div class="info-block" style="background: #fde6d4; border-left-color: #de5f07;">
              <h3 style="color: #8a3a00;">⚠️ Please confirm your office before your trial day</h3>
              <p style="margin: 0 0 10px 0;">Private offices need to be unlocked and stocked with the right equipment ahead of time, so we need to coordinate with you in advance.</p>
              <p style="margin: 0 0 10px 0;"><strong>Before ${trialDateDisplay}, please reach out to the Manager of Member Services to confirm your office number:</strong></p>
              <ul>
                <li>Email <a href="mailto:memberservices@merrittworkspace.net">memberservices@merrittworkspace.net</a></li>
                <li>Or text/call <strong>(303) 359-8337</strong></li>
              </ul>
              <p style="margin: 10px 0 0 0;">Once your office is confirmed, it will be unlocked and ready with everything you need on the day of your trial.</p>
            </div>`
    : '';

  const arrivalBlock = data.isOfficeTrial
    ? `
            <div class="info-block">
              <h3>When you arrive</h3>
              <ul>
                <li>No front desk — just let yourself in through the main entrance during building hours (8:00 AM – 6:00 PM).</li>
                <li>Head to your confirmed office — it will be unlocked and equipped for you.</li>
                <li>Feel free to explore: kitchen, snack shop, meeting rooms, phone booths, and bathrooms are all available for your use.</li>
              </ul>
            </div>`
    : `
            <div class="info-block">
              <h3>When you arrive</h3>
              <ul>
                <li>No front desk — just let yourself in through the main entrance during building hours (8:00 AM – 6:00 PM).</li>
                <li>Pick any open desk in the dedicated-desk or flex area and settle in. An open desk is one that's <strong>completely empty</strong> — desks with anything on them (even just a business card or sticky note) belong to a member.</li>
                <li>Feel free to explore: kitchen, snack shop, meeting rooms, phone booths, and bathrooms are all available for your use.</li>
              </ul>
            </div>`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Trial Day at Merritt Workspace</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
          .info-block { background: #fff8e1; padding: 18px; border-radius: 8px; border-left: 4px solid #ed7611; margin: 18px 0; }
          .info-block h3 { margin-top: 0; color: #ad4a00; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-radius: 0 0 8px 8px; font-size: 13px; }
          ul { padding-left: 20px; }
          li { margin: 4px 0; }
          .kv td { padding: 6px 4px; border-bottom: 1px solid #eee; }
          .kv td:first-child { font-weight: 600; width: 140px; color: #555; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${headerTitle}</h1>
            <p style="margin: 8px 0 0 0;">${headerSubtitle}</p>
          </div>

          <div class="content">
            <p>Hi ${data.firstName},</p>

            <p>${introParagraph}</p>
${officeConfirmationBlock}
            <div class="info-block">
              <h3>Where to find us</h3>
              <table class="kv">
                <tr><td>Address</td><td>2246 Irving Street, Denver, CO 80211</td></tr>
                <tr><td>Neighborhood</td><td>Sloan's Lake — 3 minutes to I-25</td></tr>
                <tr><td>Hours</td><td>Building open Mon–Fri, 8:00 AM – 6:00 PM</td></tr>
                <tr><td>Parking</td><td>Onsite parking available</td></tr>
              </table>
            </div>
${arrivalBlock}

            <div class="info-block">
              <h3>WiFi</h3>
              <table class="kv">
                <tr><td>Network</td><td><code>merrittcowork</code></td></tr>
                <tr><td>Password</td><td><code>Merritt23X</code></td></tr>
              </table>
            </div>

            <div class="info-block">
              <h3>What to bring</h3>
              <ul>
                <li>Laptop, charger, and headphones</li>
                <li>A water bottle (filtered water on tap)</li>
              </ul>
            </div>

            <div class="info-block">
              <h3>What's on us</h3>
              <ul>
                <li>Coffee, tea, and beer — help yourself in the kitchen</li>
              </ul>
            </div>

            <div class="info-block">
              <h3>Snacks &amp; other beverages (available for purchase)</h3>
              <ul>
                <li>Snacks and other drinks in the kitchen are not included in your trial.</li>
                <li>Scan the QR code posted in the kitchen — it takes you to our website where you can check out and pay.</li>
                <li>Snack shop: <a href="https://www.merrittworkspace.net/snackshop">www.merrittworkspace.net/snackshop</a></li>
              </ul>
            </div>

            <div class="info-block">
              <h3>A few house notes</h3>
              <ul>
                <li>Phone calls and video calls: please use a phone booth or empty meeting room out of courtesy to other members.</li>
                <li>Printers are by the kitchen.</li>
              </ul>
            </div>

            <div class="info-block">
              <h3>Thinking about membership?</h3>
              <p style="margin: 0;">Members get <strong>24/7 building access with a personal access code</strong> to our security system — in addition to everything you'll experience today.</p>
            </div>

            <div class="info-block">
              <h3>Questions or need anything day-of?</h3>
              <p style="margin: 0;">Text or call Member Services at <strong>(303) 359-8337</strong> or email <a href="mailto:memberservices@merrittworkspace.net">memberservices@merrittworkspace.net</a> and we'll get back to you quickly.</p>
            </div>

            <p style="margin-top: 24px;">Your full membership application is being reviewed in parallel. You'll hear from us within 1–2 business days about next steps regardless of how the trial day goes — no pressure to decide on the spot.</p>

            <p>See you soon!</p>
            <p style="margin: 0;">— The Merritt Workspace team</p>
          </div>

          <div class="footer">
            <p style="margin: 0;"><strong>Merritt Workspace</strong> · 2246 Irving Street, Denver, CO 80211</p>
            <p style="margin: 4px 0 0 0;">memberservices@merrittworkspace.net · (303) 359-8337</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateTrialDayEmailText(data: { firstName: string; trialDate: string; isOfficeTrial?: boolean }) {
  const trialDateDisplay = data.trialDate
    ? new Date(data.trialDate).toLocaleDateString()
    : 'the date you selected';

  const headerLine = data.isOfficeTrial
    ? 'YOUR OFFICE TRIAL DAY AT MERRITT WORKSPACE'
    : "YOU'RE SET FOR YOUR TRIAL DAY AT MERRITT WORKSPACE";

  const intro = data.isOfficeTrial
    ? `Thanks for signing up for an office trial day at Merritt Workspace. We're
looking forward to having you in for ${trialDateDisplay}. Because you're
trialing a private office, there's one important step before your visit.`
    : `Thanks for signing up for a trial day at Merritt Workspace. We're looking
forward to having you in for ${trialDateDisplay}. Everything below is what
you need to walk in and get to work.`;

  const officeConfirmationSection = data.isOfficeTrial
    ? `
PLEASE CONFIRM YOUR OFFICE BEFORE YOUR TRIAL DAY
Private offices need to be unlocked and stocked with the right equipment
ahead of time, so we need to coordinate with you in advance.

Before ${trialDateDisplay}, please reach out to the Manager of Member
Services to confirm your office number:
- Email: memberservices@merrittworkspace.net
- Text/call: (303) 359-8337

Once your office is confirmed, it will be unlocked and ready with
everything you need on the day of your trial.
`
    : '';

  const arrivalSection = data.isOfficeTrial
    ? `WHEN YOU ARRIVE
- No front desk — just let yourself in through the main entrance during
  building hours (8:00 AM – 6:00 PM).
- Head to your confirmed office — it will be unlocked and equipped for you.
- Feel free to explore: kitchen, snack shop, meeting rooms, phone booths,
  and bathrooms are all available for your use.`
    : `WHEN YOU ARRIVE
- No front desk — just let yourself in through the main entrance during
  building hours (8:00 AM – 6:00 PM).
- Pick any open desk in the dedicated-desk or flex area and settle in. An
  open desk is one that's completely empty — desks with anything on them
  (even just a business card or sticky note) belong to a member.
- Feel free to explore: kitchen, snack shop, meeting rooms, phone booths,
  and bathrooms are all available for your use.`;

  return `
${headerLine}

Hi ${data.firstName},

${intro}
${officeConfirmationSection}
WHERE TO FIND US
Address:      2246 Irving Street, Denver, CO 80211
Neighborhood: Sloan's Lake — 3 minutes to I-25
Hours:        Building open Mon–Fri, 8:00 AM – 6:00 PM
Parking:      Onsite parking available

${arrivalSection}

WIFI
- Network:  merrittcowork
- Password: Merritt23X

WHAT TO BRING
- Laptop, charger, and headphones
- A water bottle (filtered water on tap)

WHAT'S ON US
- Coffee, tea, and beer — help yourself in the kitchen

SNACKS & OTHER BEVERAGES (available for purchase)
- Snacks and other drinks in the kitchen are not included in your trial.
- Scan the QR code posted in the kitchen — it takes you to our website
  where you can check out and pay.
- Snack shop: www.merrittworkspace.net/snackshop

A FEW HOUSE NOTES
- Phone calls and video calls: please use a phone booth or empty meeting
  room out of courtesy to other members.
- Printers are by the kitchen.

THINKING ABOUT MEMBERSHIP?
Members get 24/7 building access with a personal access code to our
security system — in addition to everything you'll experience today.

QUESTIONS OR NEED ANYTHING DAY-OF?
Text or call Member Services at (303) 359-8337 or email
memberservices@merrittworkspace.net and we'll get back to you quickly.

Your full membership application is being reviewed in parallel. You'll hear
from us within 1–2 business days about next steps regardless of how the
trial day goes — no pressure to decide on the spot.

See you soon!
— The Merritt Workspace team

Merritt Workspace · 2246 Irving Street, Denver, CO 80211
memberservices@merrittworkspace.net · (303) 359-8337
  `;
}