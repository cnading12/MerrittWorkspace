import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

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
          'id, first_name, last_name, email, status, designation, monthly_cost_cents, required_docs_complete, agreement_signed, stripe_subscription_id, subscription_status, onboarding_unlocked, created_at'
        )
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      counts: {
        pendingApplications: pendingApps.count || 0,
        totalMembers: totalMembers.count || 0,
        activeMembers: activeMembers.count || 0,
        pendingDocReviews: pendingDocs.count || 0,
        pendingAccessCodes: pendingAccessCodes.count || 0,
        awaitingAgreements: awaitingAgreements.count || 0,
      },
      recentMembers: recentMembers.data || [],
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
