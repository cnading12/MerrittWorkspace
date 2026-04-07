import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

// List everything the admin might need to reference for a member's paper trail:
//   - Uploaded files (member_documents): ID, proof of address, etc.
//   - Signed agreements (member_agreements): member agreement, T&C, fee agreement.
// Both kinds come back under `documents`/`agreements` in the response with a
// unified `view_url` field so the admin Documents page can render them side
// by side.
//
// ?status=submitted|approved|rejected|all — applies to uploaded files only.
// Agreements are always included unless ?include_agreements=0.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const sb = getServiceSupabase();
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'submitted';
    const includeAgreements = url.searchParams.get('include_agreements') !== '0';

    // Uploaded files
    let query = sb
      .from('member_documents')
      .select(
        'id, member_id, doc_type, file_path, file_name, mime_type, size_bytes, status, reviewed_at, notes, created_at, member:members(id, first_name, last_name, email)'
      )
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: docData, error: docErr } = await query;
    if (docErr) throw new Error(docErr.message);

    const documents = await Promise.all(
      (docData || []).map(async (d: any) => {
        const { data: signed } = await sb.storage
          .from('member-documents')
          .createSignedUrl(d.file_path, 3600);
        return { ...d, view_url: signed?.signedUrl || null };
      })
    );

    // Signed agreements
    let agreements: any[] = [];
    if (includeAgreements) {
      const { data: agData, error: agErr } = await sb
        .from('member_agreements')
        .select(
          'id, member_id, agreement_type, signature_name, signed_at, document_version, member:members(id, first_name, last_name, email)'
        )
        .order('signed_at', { ascending: false });
      if (agErr) throw new Error(agErr.message);
      agreements = (agData || []).map((a: any) => ({
        ...a,
        view_url: `/api/admin/agreements/${a.id}/view`,
      }));
    }

    return NextResponse.json({ documents, agreements });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
