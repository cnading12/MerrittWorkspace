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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      .eq('id', params.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ member: data });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
