// Shared helpers for issuing one-time sign-in links.
//
// Magic links expire (Supabase default ~24h), so this is reused by:
//   • the application-approval route (initial invite),
//   • the admin resend-invitation route,
//   • the public self-service resend endpoint.
//
// We always build a custom `/portal/auth/confirm` URL from the
// `hashed_token` rather than relying on Supabase's `/auth/v1/verify`
// redirect — that endpoint silently rewrites `redirect_to` to the
// project Site URL when it isn't on the dashboard allowlist, which
// breaks the set-password handoff.
import { Resend } from 'resend';
import {
  getTransactionalEmailHeaders,
  membershipApprovedEmail,
  portalCompletionReminderEmail,
  PORTAL_ONBOARDING_FROM,
  PORTAL_REPLY_TO,
} from './emails';
import { getServiceSupabase } from './supabaseAdmin';

export async function generateMagicLinkUrl(email: string): Promise<string | null> {
  const sb = getServiceSupabase();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const redirectTo = `${baseUrl}/portal/set-password`;

  const { data, error } = await sb.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  });
  if (error) {
    console.error('generateLink error', error);
    return null;
  }
  const hashedToken = data?.properties?.hashed_token;
  if (!hashedToken) return null;

  const params = new URLSearchParams({
    token_hash: hashedToken,
    type: 'magiclink',
    next: '/portal/set-password',
  });
  return `${baseUrl}/portal/auth/confirm?${params.toString()}`;
}

// Generate a fresh magic link and email the welcome / sign-in template
// via Resend. Returns true if the email was dispatched.
export async function sendOnboardingMagicLink(opts: {
  email: string;
  firstName: string;
}): Promise<boolean> {
  const confirmUrl = await generateMagicLinkUrl(opts.email);
  if (!confirmUrl) return false;
  if (!process.env.RESEND_API_KEY) return false;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const resend = new Resend(process.env.RESEND_API_KEY);
  const tpl = membershipApprovedEmail({
    firstName: opts.firstName,
    portalUrl: confirmUrl,
    loginUrl: `${baseUrl}/portal/login`,
  });
  try {
    await resend.emails.send({
      from: PORTAL_ONBOARDING_FROM,
      to: opts.email,
      replyTo: PORTAL_REPLY_TO,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      headers: getTransactionalEmailHeaders(),
      tags: [{ name: 'category', value: 'membership_approval' }],
    });
    return true;
  } catch (e) {
    console.error('Resend error', e);
    return false;
  }
}

// Generate a fresh magic link and send a portal-completion reminder. Used by
// the admin "ping" action for members who haven't finished setting up their
// portal. Returns true if the email was dispatched.
export async function sendPortalCompletionReminder(opts: {
  email: string;
  firstName: string;
  missingSteps: string[];
  startDateLabel?: string | null;
}): Promise<boolean> {
  const confirmUrl = await generateMagicLinkUrl(opts.email);
  if (!confirmUrl) return false;
  if (!process.env.RESEND_API_KEY) return false;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const resend = new Resend(process.env.RESEND_API_KEY);
  const tpl = portalCompletionReminderEmail({
    firstName: opts.firstName,
    portalUrl: confirmUrl,
    loginUrl: `${baseUrl}/portal/login`,
    missingSteps: opts.missingSteps,
    startDateLabel: opts.startDateLabel ?? null,
  });
  try {
    await resend.emails.send({
      from: PORTAL_ONBOARDING_FROM,
      to: opts.email,
      replyTo: PORTAL_REPLY_TO,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      headers: getTransactionalEmailHeaders(),
      tags: [{ name: 'category', value: 'portal_completion_reminder' }],
    });
    return true;
  } catch (e) {
    console.error('Resend error', e);
    return false;
  }
}
