import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { readTrialFlag, readTrialDate } from '@/lib/portal/trial';

export const dynamic = 'force-dynamic';

// Returns top-level counts and recent activity for the admin home dashboard.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const sb = getServiceSupabase();

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
      sb.from('members').select('id', { count: 'exact', head: true }),
      sb
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
      sb
        .from('member_documents')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'submitted'),
      sb
        .from('access_code_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      sb
        .from('members')
        .select('id', { count: 'exact', head: true })
        .eq('agreement_signed', false)
        .neq('status', 'declined'),
      sb
        .from('members')
        .select(
          'id, application_id, first_name, last_name, email, status, designation, monthly_cost_cents, required_docs_complete, agreement_signed, stripe_subscription_id, subscription_status, onboarding_unlocked, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(25),
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
    let appsById = new Map<string, any>();
    if (appIds.length > 0) {
      const { data: apps } = await sb
        .from('member_applications')
        .select('id, wants_trial_day, trial_date, start_date, created_at, payload')
        .in('id', appIds);
      if (apps) appsById = new Map(apps.map((a: any) => [a.id, a]));
    }
    const annotatedRecent = recent.map((m: any) => {
      const app = m.application_id ? appsById.get(m.application_id) : null;
      return {
        ...m,
        was_trial_applicant: readTrialFlag(app),
        trial_date: readTrialDate(app),
        applied_at: app?.created_at ?? null,
        intended_start_date: app?.start_date ?? null,
      };
    });

    return NextResponse.json({
      counts: {
        pendingApplications: pendingApps.count || 0,
        totalMembers: totalMembers.count || 0,
        activeMembers: activeMembers.count || 0,
        pendingDocReviews: pendingDocs.count || 0,
        pendingAccessCodes: pendingAccessCodes.count || 0,
        awaitingAgreements: awaitingAgreements.count || 0,
      },
      recentMembers: annotatedRecent,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
