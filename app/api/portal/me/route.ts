import { NextRequest, NextResponse } from 'next/server';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const member = await requireMember(req);
    const sb = getServiceSupabase();
    const [{ data: documents }, { data: payments }, { data: agreements }, applicationRes] = await Promise.all([
      sb.from('member_documents').select('*').eq('member_id', member.id).order('created_at', { ascending: false }),
      sb.from('payment_history').select('*').eq('member_id', member.id).order('created_at', { ascending: false }),
      sb.from('member_agreements').select('agreement_type, signed_at, signature_name, metadata').eq('member_id', member.id),
      member.application_id
        ? sb.from('member_applications').select('start_date').eq('id', member.application_id).maybeSingle()
        : Promise.resolve({ data: null } as { data: { start_date: string | null } | null }),
    ]);
    return NextResponse.json({
      member,
      documents: documents || [],
      payments: payments || [],
      agreements: agreements || [],
      application_start_date: applicationRes?.data?.start_date ?? null,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
