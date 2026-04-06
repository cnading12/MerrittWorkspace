import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

const ALLOWED_FIELDS = [
  'designation',
  'monthly_cost_cents',
  'status',
  'access_code',
] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireAdmin(req);
    const sb = getServiceSupabase();

    const { data: member, error: memErr } = await sb
      .from('members')
      .select('*')
      .eq('id', id)
      .single();
    if (memErr || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const [appRes, docsRes, paymentsRes, agreementsRes] = await Promise.all([
      member.application_id
        ? sb.from('member_applications').select('*').eq('id', member.application_id).maybeSingle()
        : Promise.resolve({ data: null }),
      sb.from('member_documents').select('*').eq('member_id', id).order('created_at', { ascending: false }),
      sb.from('payment_history').select('*').eq('member_id', id).order('created_at', { ascending: false }),
      sb.from('member_agreements').select('*').eq('member_id', id).order('signed_at', { ascending: false }),
    ]);

    // Generate signed URLs (1h) for each document.
    const documents = await Promise.all(
      (docsRes.data || []).map(async (d: any) => {
        const { data: signed } = await sb.storage
          .from('member-documents')
          .createSignedUrl(d.file_path, 3600);
        return { ...d, signed_url: signed?.signedUrl || null };
      })
    );

    return NextResponse.json({
      member,
      application: (appRes as any).data || null,
      documents,
      payments: paymentsRes.data || [],
      agreements: agreementsRes.data || [],
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireAdmin(req);
    const body = await req.json();
    const update: Record<string, any> = {};
    for (const k of ALLOWED_FIELDS) {
      if (k in body) update[k] = body[k];
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No allowed fields' }, { status: 400 });
    }
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('members')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ member: data });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
