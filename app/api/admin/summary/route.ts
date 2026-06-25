import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { readTrialFlag, readTrialDate } from '@/lib/portal/trial';
import { isMissingArchivedColumnError } from '@/lib/portal/archive';

export const dynamic = 'force-dynamic';

// Returns top-level counts and recent activity for the admin home dashboard.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const sb = getServiceSupabase();

    const RECENT_COLS =
      'id, application_id, first_name, last_name, email, status, designation, monthly_cost_cents, required_docs_complete, agreement_signed, stripe_subscription_id, subscription_status, onboarding_unlocked, created_at, last_pinged_at';

    // Member counts/lists exclude archived (former, once-paying) members so
    // they don't inflate "total members" or the onboarding queues. If the
    // archive migration hasn't been applied yet, the archived_at filter errors
    // out; we then retry without it so the dashboard keeps working instead of
    // showing all zeros.
    const memberCount = async (
      applyFilters: (q: any) => any = (q) => q
    ): Promise<number> => {
      const base = () =>
        applyFilters(sb.from('members').select('id', { count: 'exact', head: true }));
      let { count, error } = await base().is('archived_at', null);
      if (error && isMissingArchivedColumnError(error)) {
        ({ count, error } = await base());
      }
      return count || 0;
    };
    const recentMembersQuery = async () => {
      let res = await sb
        .from('members')
        .select(RECENT_COLS)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(25);
      if (res.error && isMissingArchivedColumnError(res.error)) {
        res = await sb
          .from('members')
          .select(RECENT_COLS)
          .order('created_at', { ascending: false })
          .limit(25);
      }
      return res;
    };

    const [
      pendingApps,
      totalMembers,
      activeMembers,
      pendingDocs,
      pendingAccessCodes,
      awaitingAgreements,
      recentMembers,
    ] = await Promise.all([
      sb
        .from('member_applications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      memberCount(),
      memberCount((q) => q.eq('status', 'active')),
      sb
        .from('member_documents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'submitted'),
      sb
        .from('access_code_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      memberCount((q) => q.eq('agreement_signed', false).neq('status', 'declined')),
      recentMembersQuery(),
    ]);

    // Annotate recent members with trial-applicant info from their linked
    // applications so the dashboard can flag trial-origin members until
    // they're fully onboarded.
    const recent = recentMembers.data || [];
    const appIds = Array.from(
      new Set(
        recent.map((m: any) => m.application_id).filter((id: any): id is string => !!id)
      )
    );
    const memberIds = recent.map((m: any) => m.id);
    const [appsRes, feeAgreementsRes] = await Promise.all([
      appIds.length > 0
        ? sb
            .from('member_applications')
            .select('id, wants_trial_day, trial_date, start_date, created_at, payload')
            .in('id', appIds)
        : Promise.resolve({ data: [] as any[] }),
      memberIds.length > 0
        ? sb
            .from('member_agreements')
            .select('member_id, metadata')
            .eq('agreement_type', 'fee_agreement')
            .in('member_id', memberIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const appsById = new Map<string, any>(
      ((appsRes.data || []) as any[]).map((a: any) => [a.id, a])
    );
    // Prefer the fee agreement start_date (legal source of truth) over the
    // application's preferred start_date so admin views reflect the most
    // recently signed agreement.
    const feeStartByMemberId = new Map<string, string | null>();
    for (const ag of (feeAgreementsRes.data || []) as any[]) {
      const raw = (ag?.metadata as any)?.start_date;
      feeStartByMemberId.set(
        ag.member_id,
        typeof raw === 'string' && raw ? raw : null
      );
    }
    const annotatedRecent = recent.map((m: any) => {
      const app = m.application_id ? appsById.get(m.application_id) : null;
      const feeStart = feeStartByMemberId.get(m.id) ?? null;
      return {
        ...m,
        was_trial_applicant: readTrialFlag(app),
        trial_date: readTrialDate(app),
        applied_at: app?.created_at ?? null,
        intended_start_date: feeStart ?? app?.start_date ?? null,
      };
    });

    return NextResponse.json({
      counts: {
        pendingApplications: pendingApps.count || 0,
        // totalMembers / activeMembers / awaitingAgreements are already
        // resolved to numbers by memberCount() (with archive-column fallback).
        totalMembers,
        activeMembers,
        pendingDocReviews: pendingDocs.count || 0,
        pendingAccessCodes: pendingAccessCodes.count || 0,
        awaitingAgreements,
      },
      recentMembers: annotatedRecent,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
