// POST /api/membership-application/existing-member
//
// Onboarding endpoint for the "Already a member?" migration flow on the
// portal sign-in page. These are folks who originally signed up on paper
// and have been invoiced manually by the accountant — we want to migrate
// them into the portal so they can (optionally) move to Stripe auto-pay
// and so admins can manage them alongside new members.
//
// Differences vs. /api/membership-application:
//   • The user creates their auth account inline (email + password) — no
//     magic link, no admin approval step.
//   • A `members` row is created immediately with `is_legacy_member = true`
//     and `status = 'active'`.
//   • The corresponding `member_applications` row is auto-marked
//     `status = 'approved'` and tagged `is_existing_member = true` so it
//     never shows up in the admin pending queue.
//   • Photo ID / Proof of Address are NOT required — the portal dashboard
//     reads `is_legacy_member` and unlocks the agreement step without them.
//   • Stripe auto-pay is optional; the portal exposes a "keep my current
//     billing" path that leaves the member without a Stripe subscription.

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { planForMembershipType } from '@/lib/portal/pricing';
import { normalizeDeskNumber } from '@/lib/portal/desks';
import { PORTAL_ONBOARDING_FROM, PORTAL_REPLY_TO } from '@/lib/portal/emails';

export const dynamic = 'force-dynamic';

const MANAGER_EMAIL = 'manager@merrittworkspace.net';
const MEMBER_SERVICES_EMAIL = 'memberservices@merrittworkspace.net';

interface ExistingMemberPayload {
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_name?: string;
  membership_type?: string;
  office_number?: string;
  desk_number?: string;
  agrees_to_terms?: boolean;
}

function normalizeAssignment(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  return v ? v : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExistingMemberPayload;

    const required: (keyof ExistingMemberPayload)[] = [
      'email',
      'password',
      'first_name',
      'last_name',
      'phone',
      'membership_type',
    ];
    for (const field of required) {
      if (!body[field] || (typeof body[field] === 'string' && !(body[field] as string).trim())) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }
    if (!body.agrees_to_terms) {
      return NextResponse.json(
        { error: 'You must agree to the Terms & Conditions to continue.' },
        { status: 400 }
      );
    }
    if ((body.password as string).length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    const plan = planForMembershipType(body.membership_type);
    if (!plan) {
      return NextResponse.json(
        { error: `Unknown membership type: ${body.membership_type}` },
        { status: 400 }
      );
    }

    // Existing dedicated-desk members must declare a desk number; existing
    // private-office members must declare an office number. This matches
    // how the admin members list expects the assignment columns to be set.
    const officeNumber = normalizeAssignment(body.office_number);
    let deskNumber = normalizeAssignment(body.desk_number);
    const designation = plan.designation;
    if (designation === 'dedicated_desk' && !deskNumber) {
      return NextResponse.json(
        { error: 'Please enter your desk number.' },
        { status: 400 }
      );
    }
    if (designation === 'dedicated_desk' && deskNumber) {
      // Canonicalize to the building-wide DD# convention (e.g. "dd04" → "DD4")
      // so the seating chart and uniqueness checks match across sources.
      const result = normalizeDeskNumber(deskNumber);
      if (!result.ok) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      deskNumber = result.value;
    }
    if (
      (designation === 'private_office_single' ||
        designation === 'private_office_double' ||
        designation === 'private_office_large') &&
      !officeNumber
    ) {
      return NextResponse.json(
        { error: 'Please enter your office number.' },
        { status: 400 }
      );
    }

    const email = (body.email as string).trim().toLowerCase();
    const sb = getServiceSupabase();

    // 1. Ensure an auth.users row exists. If the email is already in use
    //    we surface a clear error so the user signs in instead of trying
    //    to migrate twice.
    let userId: string | null = null;
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
    });
    if (created?.user?.id) {
      userId = created.user.id;
    } else if (createErr) {
      const msg = (createErr.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
        return NextResponse.json(
          {
            error:
              'An account with this email already exists. Please sign in with your existing password, or use the "Forgot password?" link on the sign-in page.',
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }
    if (!userId) {
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    // 2. Insert the member_applications row (auto-approved, tagged as
    //    existing-member so admins can audit the migration if needed).
    const { data: appRow, error: appErr } = await sb
      .from('member_applications')
      .insert({
        email,
        first_name: body.first_name,
        last_name: body.last_name,
        phone: body.phone,
        company_name: body.company_name || null,
        membership_type: body.membership_type,
        status: 'approved',
        is_existing_member: true,
        decided_at: new Date().toISOString(),
        payload: {
          existing_member: true,
          office_number: officeNumber,
          desk_number: deskNumber,
          designation_label: plan.label,
          monthly_cost_cents: plan.monthly_cost_cents,
          submitted_at: new Date().toISOString(),
        },
      })
      .select()
      .single();
    if (appErr) {
      console.error('❌ Failed to insert member_applications row (legacy):', appErr);
      return NextResponse.json(
        { error: 'Could not save your migration submission. Please try again.' },
        { status: 500 }
      );
    }

    // 3. Create the members row. Legacy members start as `active` so they
    //    show up alongside other active members in the admin list, but
    //    `onboarding_unlocked` is left false until they've signed the
    //    three required agreements (see app/api/portal/sign-agreement).
    const { data: member, error: memErr } = await sb
      .from('members')
      .upsert(
        {
          user_id: userId,
          email,
          first_name: body.first_name,
          last_name: body.last_name,
          phone: body.phone,
          company_name: body.company_name || null,
          status: 'active',
          application_id: appRow.id,
          designation,
          monthly_cost_cents: plan.monthly_cost_cents,
          office_number: officeNumber,
          desk_number: deskNumber,
          is_legacy_member: true,
        },
        { onConflict: 'email' }
      )
      .select()
      .single();
    if (memErr) {
      console.error('❌ Failed to upsert members row (legacy):', memErr);
      return NextResponse.json({ error: memErr.message }, { status: 500 });
    }

    // Backlink the application to the new member row.
    await sb
      .from('member_applications')
      .update({ member_id: member.id })
      .eq('id', appRow.id);

    // 4. Notify staff so they know an existing-member migration came in.
    //    Best-effort; never block the migration on email failures.
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const subject = `Existing Member Migrated — ${body.first_name} ${body.last_name}`;
        const assignment =
          designation === 'dedicated_desk'
            ? `Dedicated Desk #${deskNumber}`
            : officeNumber
              ? `${plan.label} (Office #${officeNumber})`
              : plan.label;
        const html = `
          <div style="font-family:Arial,sans-serif;line-height:1.5;color:#333;">
            <h2 style="color:#ed7611;">Existing Member Migrated to Portal</h2>
            <p>An existing member has just self-migrated into the portal via the
            "Already a member?" flow on /portal/login.</p>
            <table style="border-collapse:collapse;">
              <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Name</td><td>${body.first_name} ${body.last_name}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email</td><td>${email}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Phone</td><td>${body.phone}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Company</td><td>${body.company_name || '—'}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Membership</td><td>${assignment}</td></tr>
              <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Plan rate</td><td>$${(plan.monthly_cost_cents / 100).toFixed(2)}/mo</td></tr>
            </table>
            <p style="margin-top:18px;">They are flagged as <strong>legacy_member</strong>
            in the database — billing remains on the manual/accountant track unless
            they choose to set up Stripe auto-pay from the portal.</p>
          </div>
        `;
        await resend.emails.send({
          from: PORTAL_ONBOARDING_FROM,
          to: [MANAGER_EMAIL, MEMBER_SERVICES_EMAIL],
          replyTo: PORTAL_REPLY_TO,
          subject,
          html,
        });
      } catch (e) {
        console.error('❌ Failed to send legacy-migration admin email:', e);
      }
    }

    return NextResponse.json({
      ok: true,
      member_id: member.id,
      email,
    });
  } catch (e: any) {
    console.error('💥 Existing-member migration error:', e);
    return NextResponse.json(
      { error: e?.message || 'Failed to process migration. Please try again.' },
      { status: 500 }
    );
  }
}
