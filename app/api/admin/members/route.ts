import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { readTrialFlag, readTrialDate } from '@/lib/portal/trial';
import { isMissingArchivedColumnError } from '@/lib/portal/archive';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const sb = getServiceSupabase();

    // Archived (former, once-paying) members are hidden from the roster by
    // default. `?archived=only` returns just the archived members so the admin
    // can review/restore them; `?archived=all` returns everyone.
    const archivedParam = new URL(req.url).searchParams.get('archived');
    const runQuery = (withArchivedFilter: boolean) => {
      let q = sb.from('members').select('*');
      if (withArchivedFilter) {
        if (archivedParam === 'only') {
          q = q.not('archived_at', 'is', null);
        } else if (archivedParam !== 'all') {
          q = q.is('archived_at', null);
        }
      }
      return q.order('created_at', { ascending: false });
    };

    let { data: members, error } = await runQuery(true);
    // If the archive migration hasn't been applied yet, the archived_at filter
    // errors out and would otherwise blank the whole member list. Fall back to
    // the unfiltered query so the panel keeps working until the migration runs.
    if (error && isMissingArchivedColumnError(error)) {
      if (archivedParam === 'only') {
        // No archived members can exist without the column — return empty.
        members = [];
        error = null as any;
      } else {
        ({ data: members, error } = await runQuery(false));
      }
    }
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
