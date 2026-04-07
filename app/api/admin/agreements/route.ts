import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

// List signed agreements across all members. Used by the admin Documents
// tab so that member_agreement, terms_and_conditions, and fee_agreement
// signature records (which live in member_agreements, not member_documents)
// can be referenced from the same place as uploaded files.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const sb = getServiceSupabase();

    const { data, error } = await sb
      .from('member_agreements')
      .select(
        'id, member_id, agreement_type, signature_name, signed_at, ip_address, user_agent, document_version, metadata, member:members(id, first_name, last_name, email)'
      )
      .order('signed_at', { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ agreements: data || [] });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
