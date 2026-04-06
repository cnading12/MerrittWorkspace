import { NextRequest, NextResponse } from 'next/server';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const member = await requireMember(req);
    const sb = getServiceSupabase();
    const [{ data: documents }, { data: payments }] = await Promise.all([
      sb.from('member_documents').select('*').eq('member_id', member.id).order('created_at', { ascending: false }),
      sb.from('payment_history').select('*').eq('member_id', member.id).order('created_at', { ascending: false }),
    ]);
    return NextResponse.json({
      member,
      documents: documents || [],
      payments: payments || [],
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
