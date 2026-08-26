// Server helpers for portal/admin auth using Supabase access tokens.
// The portal client stores the Supabase session in localStorage (default
// supabase-js behavior). For API routes the client sends the access token
// in the `Authorization: Bearer <token>` header.
import { NextRequest } from 'next/server';
import { getServiceSupabase } from './supabaseAdmin';
import type { Member } from './types';

// A token that Supabase actively rejects and a Supabase we simply could not
// reach are different answers, and collapsing them into "unauthorized" is what
// makes a lockout impossible to diagnose: the client responds to 401 by
// bouncing you back to the sign-in page, so an outage reads as a password
// problem. supabase-js flags the retryable transport failures by name.
function isUpstreamAuthFailure(error: { name?: string; status?: number }) {
  return error.name === 'AuthRetryableFetchError' || (error.status ?? 0) >= 500;
}

export async function getUserFromRequest(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const sb = getServiceSupabase();
  const { data, error } = await sb.auth.getUser(token);
  if (error && isUpstreamAuthFailure(error)) {
    throw new PortalError(
      `Could not reach Supabase Auth to verify your session: ${error.message}`,
      503
    );
  }
  if (error || !data.user) return null;
  return data.user;
}

export async function requireMember(req: NextRequest): Promise<Member> {
  const user = await getUserFromRequest(req);
  if (!user) throw new PortalError('Unauthorized', 401);
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('members')
    .select('*')
    .eq('user_id', user.id)
    .single();
  if (error || !data) throw new PortalError('Member not found', 404);
  return data as unknown as Member;
}

export async function requireAdmin(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) throw new PortalError('Unauthorized', 401);
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  // A lookup that failed is not an authorization that was refused. Reporting
  // 403 for a paused project, a bad service-role key or a missing table tells
  // whoever is locked out that their account lacks permission, which is the one
  // thing they cannot fix by looking at permissions.
  if (error) {
    throw new PortalError(
      `Could not verify admin access: ${error.message}`,
      503
    );
  }
  // Naming the account is the whole diagnosis when the real story is "signed in
  // as the wrong one". The caller already holds a valid token for this user, so
  // this discloses nothing they don't have.
  if (!data) {
    throw new PortalError(
      `Signed in as ${user.email || user.id}, which is not an admin account.`,
      403
    );
  }
  return user;
}

export class PortalError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
