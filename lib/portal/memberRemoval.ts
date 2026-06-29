// Lifecycle helpers for never-paid members (typically trial-day applicants).
//
// Two distinct actions, deliberately decoupled:
//
//   • CANCEL — the member (via the reminder email's cancel link) OR an admin
//     marks the signup cancelled. The member STAYS in the system as a
//     `status='cancelled'` row so the team can see who dropped off; staff are
//     emailed. Nothing is deleted.
//
//   • DELETE — admin-only. Permanently removes the member and all their data
//     (documents, agreements, payment history, application, login). This is the
//     cleanup step after a never-paid member has cancelled. Members who ever
//     paid are KEPT/archived instead, never deleted, so their financial records
//     are preserved.
//
// "Never paid anything" = no successful or refunded charge has ever been
// recorded for the member. A fully-refunded member is treated as having paid.
import type { SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  neverPaidCancelledStaffEmail,
  getTransactionalEmailHeaders,
  PORTAL_FROM,
  PORTAL_REPLY_TO,
  STAFF_NOTIFICATION_EMAILS,
} from './emails';
import { DESIGNATION_LABELS } from './types';
import { readTrialFlag, readTrialDate } from './trial';

export interface RemovableMember {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string | null;
  designation: string | null;
  desk_number: string | null;
  office_number: string | null;
  application_id: string | null;
  stripe_subscription_id: string | null;
  status?: string;
  cancellation_effective_date?: string | null;
}

// Has this member ever actually paid? True if any payment_history row records a
// charge that succeeded (or succeeded then got refunded). Failed/pending rows,
// and the $0 final-month credit, don't count.
export async function memberHasEverPaid(
  sb: SupabaseClient<any, any, any>,
  memberId: string,
): Promise<boolean> {
  const { data, error } = await sb
    .from('payment_history')
    .select('id')
    .eq('member_id', memberId)
    .in('status', ['succeeded', 'refunded'])
    .gt('amount_cents', 0)
    .limit(1);
  if (error) {
    // Fail safe: if we can't tell, assume they paid so we never delete a member
    // we shouldn't.
    console.error('memberHasEverPaid lookup failed for', memberId, error);
    return true;
  }
  return !!(data && data.length > 0);
}

async function loadApplication(
  sb: SupabaseClient<any, any, any>,
  applicationId: string | null,
): Promise<{ wants_trial_day?: boolean | null; trial_date?: string | null; payload?: Record<string, unknown> | null } | null> {
  if (!applicationId) return null;
  const { data } = await sb
    .from('member_applications')
    .select('wants_trial_day, trial_date, payload')
    .eq('id', applicationId)
    .maybeSingle();
  return data ?? null;
}

async function notifyStaffOfNeverPaidCancellation(opts: {
  member: RemovableMember;
  cancelledBy: 'member' | 'admin';
  application: { wants_trial_day?: boolean | null; trial_date?: string | null; payload?: Record<string, unknown> | null } | null;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping never-paid cancellation staff email');
    return;
  }
  const { member, cancelledBy, application } = opts;
  const designationLabel = member.designation
    ? DESIGNATION_LABELS[member.designation as keyof typeof DESIGNATION_LABELS] ?? null
    : null;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const tpl = neverPaidCancelledStaffEmail({
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email,
      companyName: member.company_name,
      designationLabel,
      deskNumber: member.desk_number,
      officeNumber: member.office_number,
      cancelledBy,
      wasTrialApplicant: readTrialFlag(application),
      trialDate: readTrialDate(application),
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
    // Never let a mail failure block the cancellation itself.
    console.error('Failed to send never-paid cancellation staff notification', member.id, e);
  }
}

/**
 * Mark a never-paid member's signup as cancelled (member- or admin-initiated)
 * and notify staff. The member is KEPT in the system as a cancelled row — an
 * admin can later permanently delete them with {@link deleteMemberCompletely}.
 *
 * Idempotent: if the member is already cancelled, this is a no-op and does not
 * re-notify staff (so repeated clicks on the email link don't re-send).
 */
export async function cancelNeverPaidMember(opts: {
  sb: SupabaseClient<any, any, any>;
  member: RemovableMember;
  cancelledBy: 'member' | 'admin';
}): Promise<{ alreadyCancelled: boolean }> {
  const { sb, member, cancelledBy } = opts;

  if (member.status === 'cancelled') {
    return { alreadyCancelled: true };
  }

  const nowIso = new Date().toISOString();
  // Never-paid members have no billing period, so cancellation is effective
  // immediately (today).
  const todayIso = nowIso.slice(0, 10);
  await sb
    .from('members')
    .update({
      status: 'cancelled',
      cancellation_notice_received_at: nowIso,
      cancellation_effective_date: member.cancellation_effective_date ?? todayIso,
    })
    .eq('id', member.id);

  const application = await loadApplication(sb, member.application_id);
  await notifyStaffOfNeverPaidCancellation({ member, cancelledBy, application });

  return { alreadyCancelled: false };
}

// Best-effort cancel of any Stripe subscription attached to a member before we
// delete them. A never-paid member usually has no live subscription, but if
// subscription creation succeeded and no invoice ever cleared, we still want it
// stopped in Stripe so it can't bill later.
async function cancelStripeSubscriptionBestEffort(
  subscriptionId: string | null,
): Promise<void> {
  if (!subscriptionId || !process.env.STRIPE_SECRET_KEY) return;
  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-08-27.basil' as any,
    });
    await stripe.subscriptions.cancel(subscriptionId);
  } catch (e) {
    console.error('Best-effort Stripe subscription cancel failed', subscriptionId, e);
  }
}

/**
 * Permanently delete a member and everything tied to them. Order matters:
 *   1. Storage objects (not covered by SQL cascades).
 *   2. Linked applications + payment_history (their FKs are ON DELETE SET NULL,
 *      so without this they'd be orphaned, not removed).
 *   3. The member row (cascades documents, agreements, access-code requests,
 *      flex bookings, subscription-creation-failure rows).
 *   4. The auth.users login (frees the email for reuse).
 */
export async function hardDeleteMember(
  sb: SupabaseClient<any, any, any>,
  member: RemovableMember,
): Promise<void> {
  // 1. Remove uploaded documents from storage.
  try {
    const { data: docs } = await sb
      .from('member_documents')
      .select('file_path')
      .eq('member_id', member.id);
    const paths = (docs || [])
      .map((d: any) => d.file_path)
      .filter((p: string | null): p is string => !!p);
    if (paths.length > 0) {
      await sb.storage.from('member-documents').remove(paths);
    }
  } catch (e) {
    console.error('Failed to remove member documents from storage', member.id, e);
  }

  // 2. Delete rows whose FK would otherwise null-orphan instead of cascade.
  try {
    await sb.from('payment_history').delete().eq('member_id', member.id);
  } catch (e) {
    console.error('Failed to delete payment_history for member', member.id, e);
  }
  try {
    await sb.from('member_applications').delete().eq('member_id', member.id);
    if (member.application_id) {
      await sb.from('member_applications').delete().eq('id', member.application_id);
    }
  } catch (e) {
    console.error('Failed to delete member_applications for member', member.id, e);
  }

  // 3. Delete the member row (cascades the remaining child tables).
  const { error: memberErr } = await sb.from('members').delete().eq('id', member.id);
  if (memberErr) {
    throw new Error(`Failed to delete member ${member.id}: ${memberErr.message}`);
  }

  // 4. Delete the auth login so the email is freed for reuse.
  if (member.user_id) {
    try {
      await sb.auth.admin.deleteUser(member.user_id);
    } catch (e) {
      console.error('Failed to delete auth user for member', member.id, e);
    }
  }
}

/**
 * Admin-only: permanently delete a member. Stops any stray Stripe subscription
 * first, then hard-deletes. No staff email — staff were already notified at
 * cancellation time, and the admin is performing this deliberately.
 */
export async function deleteMemberCompletely(opts: {
  sb: SupabaseClient<any, any, any>;
  member: RemovableMember;
}): Promise<void> {
  const { sb, member } = opts;
  await cancelStripeSubscriptionBestEffort(member.stripe_subscription_id);
  await hardDeleteMember(sb, member);
}
