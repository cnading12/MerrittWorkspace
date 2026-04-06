import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('access_code_requests')
      .select('id, member_id, requested_at, member:members(first_name,last_name,email)')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ requests: data || [] });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
