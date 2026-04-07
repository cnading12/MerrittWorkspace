import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

// List documents across all members. Optional ?status=submitted|approved|rejected|all
// Default returns submitted (pending review).
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const sb = getServiceSupabase();
    const url = new URL(req.url);
    const status = url.searchParams.get('status') || 'submitted';

    let query = sb
      .from('member_documents')
      .select(
        'id, member_id, doc_type, file_path, file_name, mime_type, size_bytes, status, reviewed_at, notes, created_at, member:members(id, first_name, last_name, email)'
      )
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Add signed URL (1h expiry) for each document so admin can preview/download.
    const documents = await Promise.all(
      (data || []).map(async (d: any) => {
        const { data: signed } = await sb.storage
          .from('member-documents')
          .createSignedUrl(d.file_path, 3600);
        return { ...d, signed_url: signed?.signedUrl || null };
      })
    );

    return NextResponse.json({ documents });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
