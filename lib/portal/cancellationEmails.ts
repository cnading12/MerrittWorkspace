import { Resend } from 'resend';
import { getServiceSupabase } from './supabaseAdmin';
import {
  membershipCancelledMemberEmail,
  membershipCancelledStaffEmail,
  getTransactionalEmailHeaders,
  PORTAL_FROM,
  PORTAL_REPLY_TO,
} from './emails';
import { DESIGNATION_LABELS, MemberDesignation } from './types';

// Staff inboxes that receive the cancellation notification. Both the
// member-services and onboarding/manager mailboxes are notified so whoever
// handles offboarding (inspection, key return, freeing the seat) sees it.
const STAFF_NOTIFICATION_EMAILS = [
  'memberservices@merrittworkspace.net',
  'manager@merrittworkspace.net',
];

function formatEffectiveDate(effectiveDateIso: string | null): string | null {
  if (!effectiveDateIso) return null;
  // Stored as a plain YYYY-MM-DD date; pin to UTC so the label doesn't drift a
  // day in negative-offset timezones.
  return new Date(effectiveDateIso + 'T00:00:00Z').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// Atomically claim the right to send a given recipient's cancellation email.
// The UPDATE only matches while the column is still null, so when the Cancel
// button is pressed multiple times (or a route is re-entered via its
// idempotent reconcile path) exactly one caller's UPDATE affects a row and is
// allowed to send. Returns true if THIS caller won the claim.
async function claimRecipient(
  memberId: string,
  column: 'cancellation_email_member_sent_at' | 'cancellation_email_staff_sent_at',
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

// Release a claim so a later cancellation attempt can retry this recipient.
// Used when the email send itself throws after we'd already claimed it.
async function releaseRecipient(
  memberId: string,
  column: 'cancellation_email_member_sent_at' | 'cancellation_email_staff_sent_at',
): Promise<void> {
  const sb = getServiceSupabase();
  try {
    await sb
      .from('members')
      .update({ [column]: null })
      .eq('id', memberId);
  } catch (e) {
    console.error(`Failed to release ${column} for member ${memberId}`, e);
  }
}

export interface CancellationEmailMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string | null;
  designation: MemberDesignation | null;
  desk_number: string | null;
  office_number: string | null;
}

/**
 * Send the cancellation confirmation to the member and a notification to staff,
 * each AT MOST ONCE. Safe to call on every cancellation code path (fresh
 * cancel, idempotent "already cancelled" reconcile, and the no-subscription
 * admin path) — the per-recipient claim prevents duplicate sends if the Cancel
 * button is pressed repeatedly.
 *
 * Never throws: email delivery is best-effort and must not block or fail the
 * cancellation itself.
 */
export async function sendCancellationEmailsOnce(opts: {
  member: CancellationEmailMember;
  effectiveDateIso: string | null;
  cancelledBy: 'member' | 'admin';
}): Promise<void> {
  const { member, effectiveDateIso, cancelledBy } = opts;

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping cancellation emails');
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const effectiveDateLabel = formatEffectiveDate(effectiveDateIso);
  const designationLabel = member.designation
    ? DESIGNATION_LABELS[member.designation]
    : null;

  // --- Member email -------------------------------------------------------
  if (member.email && (await claimRecipient(member.id, 'cancellation_email_member_sent_at'))) {
    try {
      const tpl = membershipCancelledMemberEmail({
        firstName: member.first_name,
        effectiveDateLabel,
      });
      await resend.emails.send({
        from: PORTAL_FROM,
        to: member.email,
        replyTo: PORTAL_REPLY_TO,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        headers: getTransactionalEmailHeaders(),
      });
    } catch (e) {
      console.error('Failed to send cancellation email to member', e);
      // Roll back the claim so a future attempt can retry this recipient.
      await releaseRecipient(member.id, 'cancellation_email_member_sent_at');
    }
  }

  // --- Staff notification -------------------------------------------------
  if (await claimRecipient(member.id, 'cancellation_email_staff_sent_at')) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      const tpl = membershipCancelledStaffEmail({
        firstName: member.first_name,
        lastName: member.last_name,
        email: member.email,
        companyName: member.company_name,
        designationLabel,
        deskNumber: member.desk_number,
        officeNumber: member.office_number,
        cancelledBy,
        effectiveDateLabel,
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
      });
    } catch (e) {
      console.error('Failed to send cancellation notification to staff', e);
      await releaseRecipient(member.id, 'cancellation_email_staff_sent_at');
    }
  }
}
