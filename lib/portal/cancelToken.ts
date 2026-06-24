// Stateless, signed tokens for the one-click "cancel my signup" link we put
// in onboarding reminder emails. The link is handed to not-yet-paid members,
// so it must be safe to expose publicly: a token authorizes cancelling exactly
// one member id and nothing else, and can't be forged without the server
// secret.
//
// We deliberately keep this stateless (HMAC over the member id) rather than
// storing a token column so the link keeps working across re-pings without DB
// churn, and so there's nothing to expire/clean up. The member id is already a
// random UUID; the HMAC stops anyone from swapping in a different id.
import { createHmac, timingSafeEqual } from 'node:crypto';

function getSecret(): string {
  // A dedicated secret is preferred, but fall back to the service-role key,
  // which is always present server-side, so this works without extra config.
  const secret =
    process.env.PORTAL_CANCEL_TOKEN_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error(
      'Missing PORTAL_CANCEL_TOKEN_SECRET / SUPABASE_SERVICE_ROLE_KEY for cancel-token signing'
    );
  }
  return secret;
}

export function signCancelToken(memberId: string): string {
  return createHmac('sha256', getSecret())
    .update(`cancel-onboarding:${memberId}`)
    .digest('base64url');
}

export function verifyCancelToken(memberId: string, token: string): boolean {
  if (!memberId || !token) return false;
  const expected = signCancelToken(memberId);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  // timingSafeEqual throws on length mismatch — guard first.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Build the public confirmation-page URL we drop into reminder emails. The
// link points at a PAGE (not a mutating endpoint) so email scanners that
// prefetch links can't accidentally remove a member — the actual removal only
// happens after the member clicks the confirm button on that page.
export function buildCancelOnboardingUrl(opts: {
  baseUrl: string;
  memberId: string;
}): string {
  const params = new URLSearchParams({
    member: opts.memberId,
    token: signCancelToken(opts.memberId),
  });
  return `${opts.baseUrl}/portal/cancel-onboarding?${params.toString()}`;
}
