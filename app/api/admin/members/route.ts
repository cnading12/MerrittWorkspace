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

type MemberRow = Record<string, any> & { application_id: string | null };

async function annotateWithTrialInfo(
  sb: ReturnType<typeof getServiceSupabase>,
  members: MemberRow[]
) {
  const appIds = Array.from(
    new Set(members.map((m) => m.application_id).filter((id): id is string => !!id))
  );
  if (appIds.length === 0) return members;

  const { data: apps, error } = await sb
    .from('member_applications')
    .select('id, wants_trial_day, trial_date, payload')
    .in('id', appIds);
  if (error || !apps) return members;

  const byId = new Map(apps.map((a: any) => [a.id, a]));
  return members.map((m) => {
    const app = m.application_id ? byId.get(m.application_id) : null;
    return {
      ...m,
      was_trial_applicant: readTrialFlag(app),
      trial_date: readTrialDate(app),
    };
  });
}
