// Server helpers for portal/admin auth using Supabase access tokens.
// The portal client stores the Supabase session in localStorage (default
// supabase-js behavior). For API routes the client sends the access token
// in the `Authorization: Bearer <token>` header.
import { NextRequest } from 'next/server';
import { getServiceSupabase } from './supabaseAdmin';
import type { Member } from './types';

export async function getUserFromRequest(req: NextRequest) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const sb = getServiceSupabase();
  const { data, error } = await sb.auth.getUser(token);
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
  const { data } = await sb
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!data) throw new PortalError('Forbidden', 403);
  return user;
}

export class PortalError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
