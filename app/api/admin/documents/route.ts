import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

// List everything the admin might need to reference for a member's paper trail:
//   - Uploaded files (member_documents): ID, proof of address, etc.
//   - Signed agreements (member_agreements): member agreement, T&C, fee agreement.
//   - Submitted applications (member_applications): the original membership
//     application form so reference info (housing, gym, emergency contact) can
//     be pulled up months later.
// All three kinds come back with a unified `view_url` field so the admin
// Documents page can render them side by side.
//
// ?status=submitted|approved|rejected|all — applies to uploaded files only.
// Agreements and applications are always included unless their respective
// ?include_agreements=0 / ?include_applications=0 flag is set.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const sb = getServiceSupabase();
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'submitted';
    const includeAgreements = url.searchParams.get('include_agreements') !== '0';
    const includeApplications = url.searchParams.get('include_applications') !== '0';

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

    // Submitted applications. member_applications isn't joined to members
    // directly (the link goes the other way, via members.application_id set on
    // approval), so we fetch the applications and then hydrate member info for
    // any that have been approved.
    let applications: any[] = [];
    if (includeApplications) {
      const { data: appData, error: appErr } = await sb
        .from('member_applications')
        .select(
          'id, email, first_name, last_name, phone, company_name, membership_type, start_date, status, created_at, decided_at'
        )
        .order('created_at', { ascending: false });
      if (appErr) throw new Error(appErr.message);

      const rawApps = appData || [];
      const emails = Array.from(new Set(rawApps.map((a: any) => a.email).filter(Boolean)));
      let membersByEmail = new Map<string, any>();
      if (emails.length > 0) {
        const { data: memberRows } = await sb
          .from('members')
          .select('id, first_name, last_name, email')
          .in('email', emails);
        for (const m of memberRows || []) {
          membersByEmail.set(m.email, m);
        }
      }

      applications = rawApps.map((a: any) => ({
        ...a,
        view_url: `/api/admin/applications/${a.id}/view`,
        member: membersByEmail.get(a.email) || null,
      }));
    }

    return NextResponse.json({ documents, agreements, applications });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
