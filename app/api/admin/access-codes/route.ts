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
      .select(
        'id, member_id, requested_at, member:members(first_name,last_name,email,application_id)'
      )
      .eq('status', 'pending')
      .order('requested_at', { ascending: true });
    if (error) throw new Error(error.message);

    const requests = (data || []) as any[];
    const memberIds = requests
      .map((r) => r.member_id)
      .filter((id): id is string => !!id);
    const appIds = Array.from(
      new Set(
        requests
          .map((r) => r.member?.application_id)
          .filter((id: any): id is string => !!id)
      )
    );

    const [appsRes, agreementsRes] = await Promise.all([
      appIds.length
        ? sb
            .from('member_applications')
            .select('id, start_date')
            .in('id', appIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      memberIds.length
        ? sb
            .from('member_agreements')
            .select('member_id, metadata')
            .eq('agreement_type', 'fee_agreement')
            .in('member_id', memberIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    const appStartById = new Map<string, string | null>();
    for (const a of (appsRes.data || []) as any[]) {
      appStartById.set(a.id, a.start_date ?? null);
    }
    const feeStartByMemberId = new Map<string, string | null>();
    for (const ag of (agreementsRes.data || []) as any[]) {
      const raw = (ag?.metadata as any)?.start_date;
      feeStartByMemberId.set(
        ag.member_id,
        typeof raw === 'string' && raw ? raw : null
      );
    }

    const annotated = requests.map((r) => {
      const appId = r.member?.application_id ?? null;
      const appStart = appId ? appStartById.get(appId) ?? null : null;
      const feeStart = feeStartByMemberId.get(r.member_id) ?? null;
      return {
        ...r,
        intended_start_date: feeStart ?? appStart ?? null,
      };
    });

    return NextResponse.json({ requests: annotated });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
