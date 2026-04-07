import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const sb = getServiceSupabase();
    const url = new URL(req.url);
    const status = url.searchParams.get('status'); // pending | approved | declined | all
    let query = sb
      .from('member_applications')
      .select('*')
      .order('created_at', { ascending: false });
    if (status && status !== 'all') {
      query = query.eq('status', status);
    } else if (!status) {
      query = query.eq('status', 'pending');
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ applications: data || [] });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
