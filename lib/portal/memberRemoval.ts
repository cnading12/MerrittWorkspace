// Removal of never-paid members on cancellation.
//
// Policy (see the admin request that introduced this): members who signed up
// but never paid anything — typically trial-day applicants — should be removed
// from the system entirely when they cancel (client- or admin-side), rather
// than lingering as `status='cancelled'` rows and crowding the admin panel.
// Members who actually paid are KEPT (their cancellation goes through the
// normal Stripe wind-down elsewhere). Either way, staff are emailed so nobody
// is left in the dark about who dropped off.
//
// "Never paid anything" = no successful or refunded charge has ever been
// recorded for the member. A fully-refunded member is treated as having paid
// (and is kept), erring toward preserving data — deletion is irreversible.
import type { SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  membershipRemovedStaffEmail,
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
    // we shouldn't. The caller will fall back to the normal cancel flow.
    console.error('memberHasEverPaid lookup failed for', memberId, error);
    return true;
  }
  return !!(data && data.length > 0);
}

// Best-effort cancel of any Stripe subscription attached to a never-paid
// member before we delete them locally. A never-paid member usually has no
// live subscription, but if subscription creation succeeded and no invoice
// ever cleared, we still want it stopped in Stripe so it can't bill later.
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

// Permanently delete a member and everything tied to them. Order matters:
//   1. Storage objects (not covered by SQL cascades).
//   2. Linked applications + payment_history (their FKs are ON DELETE SET NULL,
//      so without this they'd be orphaned, not removed).
//   3. The member row (cascades documents, agreements, access-code requests,
//      flex bookings, subscription-creation-failure rows).
//   4. The auth.users login (frees the email for reuse).
async function hardDeleteMember(
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
  //    Applications can be linked either by the member's application_id or by
  //    member_id on the application; clear both.
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

async function notifyStaffOfRemoval(opts: {
  member: RemovableMember;
  cancelledBy: 'member' | 'admin';
  application: { wants_trial_day?: boolean | null; trial_date?: string | null; payload?: Record<string, unknown> | null } | null;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping member-removed staff email');
    return;
  }
  const { member, cancelledBy, application } = opts;
  const designationLabel = member.designation
    ? DESIGNATION_LABELS[member.designation as keyof typeof DESIGNATION_LABELS] ?? null
    : null;
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const tpl = membershipRemovedStaffEmail({
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
    // Never let a mail failure block the removal itself.
    console.error('Failed to send member-removed staff notification', member.id, e);
  }
}

/**
 * Remove a never-paid member as part of a cancellation: stop any stray Stripe
 * subscription, email staff so they're aware, then hard-delete the member and
 * all their data.
 *
 * Callers should only invoke this after confirming the member has never paid
 * (via {@link memberHasEverPaid}); paid members must go through the normal
 * cancellation wind-down instead.
 */
export async function removeUnpaidMember(opts: {
  sb: SupabaseClient<any, any, any>;
  member: RemovableMember;
  cancelledBy: 'member' | 'admin';
}): Promise<void> {
  const { sb, member, cancelledBy } = opts;

  // Pull the linked application so the staff email can note "trial-day signup"
  // before we delete it.
  let application:
    | { wants_trial_day?: boolean | null; trial_date?: string | null; payload?: Record<string, unknown> | null }
    | null = null;
  if (member.application_id) {
    const { data } = await sb
      .from('member_applications')
      .select('wants_trial_day, trial_date, payload')
      .eq('id', member.application_id)
      .maybeSingle();
    application = data ?? null;
  }

  await cancelStripeSubscriptionBestEffort(member.stripe_subscription_id);
  // Notify staff before deletion so the email is built from live data.
  await notifyStaffOfRemoval({ member, cancelledBy, application });
  await hardDeleteMember(sb, member);
}
