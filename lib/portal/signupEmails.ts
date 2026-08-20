// Emails sent the moment a member OFFICIALLY signs up — that is, when they
// finish the onboarding portal (required documents + signed agreements +
// payment/auto-pay set up). That moment is Stripe's `checkout.session.completed`
// for a `membership_subscription` order, which is also where we flip
// `onboarding_unlocked` and `status = 'active'`.
//
// Two emails go out:
//   1. The new member gets a welcome/orientation email: what they signed up
//      for, what it costs, how to claim their desk, when an access code is
//      actually needed, WiFi, and who to contact.
//   2. The management team (member services + manager) gets a notification
//      with the same facts plus a short to-do list.
//
// Both sends are AT MOST ONCE per member, claimed via a conditional UPDATE on
// members.signup_email_{member,staff}_sent_at — Stripe retries webhooks on any
// non-2xx response, so without the claim a retry would re-send both emails.

import { Resend } from 'resend';
import { getServiceSupabase } from './supabaseAdmin';
import {
  signupCompletedMemberEmail,
  signupCompletedStaffEmail,
  getTransactionalEmailHeaders,
  PORTAL_FROM,
  PORTAL_REPLY_TO,
  STAFF_NOTIFICATION_EMAILS,
} from './emails';
import { DESIGNATION_LABELS, type MemberDesignation } from './types';
import { isOneTimeDesignation } from './pricing';
import { DAY_PASS_INCLUDED_HOURS_PER_DAY } from '@/lib/bookings/conference-hours';
import {
  conferenceHoursPerMonth,
  fallbackConferenceHours,
} from '@/lib/bookings/allocations';
import { listAvailableDesks, formatDeskList } from './deskAvailability';

// Plain-English "what you signed up for" — the desks/office count behind each
// designation, so both emails state it without the reader decoding a label.
const SPACE_SUMMARY: Record<MemberDesignation, string> = {
  dedicated_desk: '1 dedicated desk in the shared coworking space',
  one_day_dedicated_desk: '1 dedicated desk for a single day (day pass)',
  private_dedicated_desk:
    '1 dedicated desk in a private, lockable office area (outside the shared coworking floor)',
  private_office_single: 'Private office — 1 desk',
  private_office_double: 'Private office — 2 desks',
  private_office_large: 'Private office — 4 to 8 desks',
  office_member: "Additional occupant of a private office (billed to the office's primary member)",
  flex: 'Flex membership — no fixed seat',
  other: 'Custom membership',
};

// Money for human eyes. Deliberately NOT pricing.formatUsd, which omits
// thousand separators — a large-office signup would read "$1106.45" there.
// Fee-agreement amounts still use pricing.formatUsd so the signed document's
// numbers stay byte-identical.
function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function seatTypeFor(designation: MemberDesignation | null): 'desk' | 'office' | null {
  switch (designation) {
    case 'dedicated_desk':
    case 'one_day_dedicated_desk':
      return 'desk';
    // Private dedicated desks sit in a converted office, so their seat is
    // recorded in office_number and assigned by member services. Reporting
    // 'office' here also keeps the free-DD-number list out of their welcome
    // email — those desks are not theirs to pick.
    case 'private_dedicated_desk':
    case 'private_office_single':
    case 'private_office_double':
    case 'private_office_large':
    case 'office_member':
      return 'office';
    default:
      return null;
  }
}

// `hours` is the live allowance from tier_allocations, resolved by the async
// caller. This builder is synchronous (it composes one string inside a
// template), so when the caller can't resolve it we fall back to the built-in
// number rather than making the whole email chain async.
function conferenceHoursLine(
  designation: MemberDesignation | null,
  hours: number | null | undefined,
): string | null {
  if (!designation) return null;
  if (designation === 'one_day_dedicated_desk') {
    return `${DAY_PASS_INCLUDED_HOURS_PER_DAY} hour of conference-room time on each day you hold a pass`;
  }
  if (designation === 'office_member') {
    return "conference-room time shared from your office's monthly pool";
  }
  const resolved = hours ?? fallbackConferenceHours(designation);
  return resolved > 0
    ? `${resolved} hours of conference-room time per month`
    : null;
}

// Format a Unix-seconds billing anchor as a display date. Pinned to UTC
// because the anchor is always midnight UTC on the 1st.
function formatAnchor(anchorSeconds: number | null): string | null {
  if (!anchorSeconds || !Number.isFinite(anchorSeconds)) return null;
  return new Date(anchorSeconds * 1000).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Format a stored YYYY-MM-DD date; pinned to UTC so the label doesn't drift a
// day in negative-offset timezones.
function formatIsoDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export interface SignupEmailMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  designation: MemberDesignation | null;
  monthly_cost_cents: number | null;
  desk_number: string | null;
  office_number: string | null;
  access_code: string | null;
  is_legacy_member?: boolean | null;
}

// The signup-payment facts, read from the Stripe Checkout session metadata we
// set in app/api/portal/create-subscription.
export interface SignupCheckoutFacts {
  oneTime: boolean;
  legacySetup: boolean;
  initialTotalCents: number | null;
  proratedFirstMonthCents: number | null;
  lastMonthDepositCents: number | null;
  ccFeeCents: number | null;
  billingCycleAnchor: number | null;
  startDateIso: string | null;
  selectedPaymentMethod: 'card' | 'ach' | null;
}

// Pull the facts above off a Stripe session's metadata bag (all values are
// strings there, and any of them may be absent on legacy/one-time sessions).
export function checkoutFactsFromMetadata(
  metadata: Record<string, string> | null | undefined
): SignupCheckoutFacts {
  const md = metadata || {};
  const num = (key: string): number | null => {
    const raw = md[key];
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };
  return {
    oneTime: md.one_time === '1',
    legacySetup: md.legacy_setup === '1',
    initialTotalCents: num('initial_total_cents'),
    proratedFirstMonthCents: num('prorated_first_charge_cents'),
    lastMonthDepositCents: num('last_month_deposit_cents'),
    ccFeeCents: num('cc_fee_cents'),
    billingCycleAnchor: num('billing_cycle_anchor'),
    startDateIso: md.start_date || null,
    selectedPaymentMethod:
      md.selected_payment_method === 'ach'
        ? 'ach'
        : md.selected_payment_method === 'card'
          ? 'card'
          : null,
  };
}

// Everything both templates need, derived once from the member + checkout
// facts. Exported so it can be unit-tested without Supabase or Resend.
export function buildSignupEmailFields(opts: {
  member: SignupEmailMember;
  facts: SignupCheckoutFacts;
  availableDesks: string[];
  // Live monthly conference allowance from tier_allocations. Omit and the
  // built-in fallback is used — fine for tests, but a caller that can await
  // should pass it so an edited allowance shows up in the email.
  conferenceHours?: number | null;
}) {
  const { member, facts } = opts;
  const designation = member.designation;
  const oneTime = facts.oneTime || isOneTimeDesignation(designation);
  const cost = member.monthly_cost_cents ?? 0;

  const designationLabel = designation ? DESIGNATION_LABELS[designation] : 'Membership';
  const spaceSummary = designation ? SPACE_SUMMARY[designation] : 'Membership';
  const seatType = seatTypeFor(designation);
  const seatNumber = seatType === 'office' ? member.office_number : member.desk_number;

  const costLine = oneTime
    ? `${money(cost)} one-time (single day pass)`
    : cost === 0
      ? "$0.00 — billed to the office's primary member"
      : `${money(cost)} per month`;

  // What was actually collected at signup. Legacy members set up auto-pay
  // without an upfront charge, so there's nothing to report for them.
  let initialChargeLabel: string | null = null;
  if (oneTime) {
    initialChargeLabel =
      facts.initialTotalCents != null
        ? `${money(facts.initialTotalCents)} (day pass)`
        : `${money(cost)} (day pass)`;
  } else if (facts.legacySetup) {
    initialChargeLabel = null;
  } else if (facts.initialTotalCents != null) {
    const parts: string[] = [];
    if (facts.proratedFirstMonthCents != null) {
      parts.push(`prorated first month ${money(facts.proratedFirstMonthCents)}`);
    }
    if (facts.lastMonthDepositCents != null) {
      parts.push(`last month's fee held as deposit ${money(facts.lastMonthDepositCents)}`);
    }
    if (facts.ccFeeCents) {
      parts.push(`3.5% card processing fee ${money(facts.ccFeeCents)}`);
    }
    initialChargeLabel = parts.length
      ? `${money(facts.initialTotalCents)} — ${parts.join(' + ')}`
      : money(facts.initialTotalCents);
  }

  const nextChargeLabel = oneTime ? null : formatAnchor(facts.billingCycleAnchor);
  const startDateLabel = formatIsoDate(facts.startDateIso);

  const paymentMethodLabel =
    facts.selectedPaymentMethod === 'ach'
      ? 'Bank account (ACH — no processing fee)'
      : facts.selectedPaymentMethod === 'card'
        ? 'Credit/debit card'
        : null;

  // Only surface the free-desk list when it's actionable: a desk member who
  // hasn't claimed one yet.
  const showDesks = seatType === 'desk' && !seatNumber;
  const availableDesksLabel = showDesks ? formatDeskList(opts.availableDesks) || null : null;

  return {
    designationLabel,
    spaceSummary,
    seatType,
    seatNumber: seatNumber || null,
    costLine,
    initialChargeLabel,
    nextChargeLabel,
    startDateLabel,
    paymentMethodLabel,
    availableDesksLabel,
    conferenceHoursLine: conferenceHoursLine(designation, opts.conferenceHours),
  };
}

// Atomically claim the right to send one recipient's signup email. The UPDATE
// only matches while the column is still null, so exactly one caller wins even
// when Stripe redelivers the same webhook concurrently.
async function claimRecipient(
  memberId: string,
  column: 'signup_email_member_sent_at' | 'signup_email_staff_sent_at'
): Promise<boolean> {
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('members')
    .update({ [column]: new Date().toISOString() })
    .eq('id', memberId)
    .is(column, null)
    .select('id');
  if (error) {
    console.error(`Failed to claim ${column} for member ${memberId}`, error);
    return false;
  }
  return !!(data && data.length > 0);
}

// Release a claim so a later attempt can retry this recipient. Used when the
// send itself throws after we'd already claimed it.
async function releaseRecipient(
  memberId: string,
  column: 'signup_email_member_sent_at' | 'signup_email_staff_sent_at'
): Promise<void> {
  const sb = getServiceSupabase();
  try {
    await sb.from('members').update({ [column]: null }).eq('id', memberId);
  } catch (e) {
    console.error(`Failed to release ${column} for member ${memberId}`, e);
  }
}

/**
 * Send the new member's welcome email and the management-team signup
 * notification, each AT MOST ONCE.
 *
 * Never throws: email delivery is best-effort and must not fail the Stripe
 * webhook (a non-2xx there would make Stripe retry and re-run the payment
 * bookkeeping).
 */
export async function sendSignupEmailsOnce(opts: {
  member: SignupEmailMember;
  facts: SignupCheckoutFacts;
}): Promise<void> {
  const { member, facts } = opts;

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping signup completion emails');
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://merrittworkspace.net';

  // Free-desk list is only needed for a desk member who hasn't claimed one.
  // Failure here must not block the emails — fall back to no list.
  let availableDesks: string[] = [];
  if (seatTypeFor(member.designation) === 'desk' && !member.desk_number) {
    try {
      availableDesks = await listAvailableDesks(getServiceSupabase(), {
        excludeMemberId: member.id,
      });
    } catch (e) {
      console.error('Failed to list available desks for signup email', e);
    }
  }

  // Resolve the live allowance so the welcome email quotes whatever
  // tier_allocations currently says, not the built-in fallback.
  const conferenceHours = await conferenceHoursPerMonth(member.designation);
  const fields = buildSignupEmailFields({
    member,
    facts,
    availableDesks,
    conferenceHours,
  });

  // --- Member welcome -----------------------------------------------------
  if (member.email && (await claimRecipient(member.id, 'signup_email_member_sent_at'))) {
    try {
      const tpl = signupCompletedMemberEmail({
        firstName: member.first_name || 'there',
        designationLabel: fields.designationLabel,
        spaceSummary: fields.spaceSummary,
        costLine: fields.costLine,
        initialChargeLabel: fields.initialChargeLabel,
        nextChargeLabel: fields.nextChargeLabel,
        startDateLabel: fields.startDateLabel,
        seatType: fields.seatType,
        seatNumber: fields.seatNumber,
        availableDesksLabel: fields.availableDesksLabel,
        conferenceHoursLine: fields.conferenceHoursLine,
        portalUrl: `${baseUrl}/portal`,
      });
      await resend.emails.send({
        from: PORTAL_FROM,
        to: member.email,
        replyTo: PORTAL_REPLY_TO,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        headers: getTransactionalEmailHeaders(),
        tags: [{ name: 'category', value: 'signup_welcome' }],
      });
    } catch (e) {
      console.error('Failed to send signup welcome email to member', e);
      await releaseRecipient(member.id, 'signup_email_member_sent_at');
    }
  }

  // --- Management team notification ---------------------------------------
  if (await claimRecipient(member.id, 'signup_email_staff_sent_at')) {
    try {
      const tpl = signupCompletedStaffEmail({
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        phone: member.phone,
        companyName: member.company_name,
        designationLabel: fields.designationLabel,
        spaceSummary: fields.spaceSummary,
        costLine: fields.costLine,
        initialChargeLabel: fields.initialChargeLabel,
        nextChargeLabel: fields.nextChargeLabel,
        startDateLabel: fields.startDateLabel,
        paymentMethodLabel: fields.paymentMethodLabel,
        seatType: fields.seatType,
        seatNumber: fields.seatNumber,
        availableDesksLabel: fields.availableDesksLabel,
        hasAccessCode: !!member.access_code,
        isLegacyMember: !!member.is_legacy_member,
        adminUrl: `${baseUrl}/admin/members/${member.id}`,
      });
      await resend.emails.send({
        from: PORTAL_FROM,
        to: STAFF_NOTIFICATION_EMAILS,
        replyTo: PORTAL_REPLY_TO,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        headers: getTransactionalEmailHeaders(),
        tags: [{ name: 'category', value: 'signup_notification' }],
      });
    } catch (e) {
      console.error('Failed to send signup notification to staff', e);
      await releaseRecipient(member.id, 'signup_email_staff_sent_at');
    }
  }
}
