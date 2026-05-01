import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { readTrialFlag, readTrialDate } from '@/lib/portal/trial';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const sb = getServiceSupabase();
    const { data: members, error } = await sb
      .from('members')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    // Attach trial-applicant info pulled from the linked member_applications
    // row. We read the flag from the dedicated columns when present and fall
    // back to `payload.wants_trial_day` so this works on databases where the
    // trial-day migration hasn't been applied yet.
    const annotated = await annotateWithTrialInfo(sb, members || []);
    return NextResponse.json({ members: annotated });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

type MemberRow = Record<string, any> & {
  id: string;
  application_id: string | null;
};

async function annotateWithTrialInfo(
  sb: ReturnType<typeof getServiceSupabase>,
  members: MemberRow[]
) {
  if (members.length === 0) return members;

  const appIds = Array.from(
    new Set(members.map((m) => m.application_id).filter((id): id is string => !!id))
  );
  const memberIds = members.map((m) => m.id);

  const [appsRes, agreementsRes] = await Promise.all([
    appIds.length
      ? sb
          .from('member_applications')
          .select('id, wants_trial_day, trial_date, start_date, created_at, payload')
          .in('id', appIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    sb
      .from('member_agreements')
      .select('member_id, metadata')
      .eq('agreement_type', 'fee_agreement')
      .in('member_id', memberIds),
  ]);

  const apps = appsRes.error ? [] : appsRes.data || [];
  const agreements = agreementsRes.error ? [] : agreementsRes.data || [];

  const byAppId = new Map(apps.map((a: any) => [a.id, a]));
  const feeStartByMemberId = new Map<string, string | null>();
  for (const ag of agreements as any[]) {
    const raw = (ag?.metadata as any)?.start_date;
    feeStartByMemberId.set(
      ag.member_id,
      typeof raw === 'string' && raw ? raw : null
    );
  }

  return members.map((m) => {
    const app = m.application_id ? byAppId.get(m.application_id) : null;
    // Prefer the fee agreement start_date (legal source of truth, signed most
    // recently) over the original application's preferred start_date.
    const feeStart = feeStartByMemberId.get(m.id) ?? null;
    return {
      ...m,
      was_trial_applicant: readTrialFlag(app),
      trial_date: readTrialDate(app),
      applied_at: app?.created_at ?? null,
      intended_start_date: feeStart ?? app?.start_date ?? null,
    };
  });
}
