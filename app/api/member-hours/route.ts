// app/api/member-hours/route.ts
//
// Returns the signed-in member's conference-hour allotment.
//
// This route used to take an arbitrary `email` in the request body and answer
// for whoever that email belonged to, with no authentication at all. That let
// anyone probe an address and learn whether it held an active membership —
// plus the member's internal id, tier and status — so it doubled as a
// membership-list oracle. The email is now ignored entirely: the member is
// resolved from the portal session, so a caller can only ever read their own
// hours.
//
// The allotment itself comes from getMemberHoursSummary, the same helper the
// booking routes use, rather than the stale `monthly_meeting_hours` column
// this route used to read — so office pooling, day passes and admin overrides
// are all reflected correctly.
import { NextRequest, NextResponse } from 'next/server';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getMemberHoursSummary } from '@/lib/bookings/conference-hours';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const member = await requireMember(request);

    if (member.status !== 'active') {
      return NextResponse.json(
        { error: 'No active membership found for this account' },
        { status: 404 }
      );
    }

    const summary = await getMemberHoursSummary({
      id: member.id,
      designation: member.designation,
      office_number: member.office_number,
      conference_hours_override: member.conference_hours_override,
    });

    return NextResponse.json({
      memberHours: {
        total_hours: summary.included,
        used_hours: summary.used,
        remaining_hours: summary.remaining,
        membership_type: member.designation,
      },
      member: {
        id: member.id,
        email: member.email,
        membership_type: member.designation,
        status: member.status,
      },
    });
  } catch (error: any) {
    if (error instanceof PortalError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Member hours API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
