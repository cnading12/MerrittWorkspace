// The list of dedicated desks the signed-in member may actually choose.
//
// Backs the desk dropdown in the portal (app/portal/page.tsx,
// WorkspaceAssignmentSection). Members used to type a DD number by hand and
// only found out it was taken after saving; now they only ever see desks that
// are free. The member's own current desk is included so re-saving it is not
// blocked, and the same occupancy rules the assignment API enforces are used
// here, so what the dropdown offers is exactly what the server will accept.
//
// Also returns the building-wide capacity numbers so the portal can tell a
// desk member how full the floor is ("24 of 25 dedicated desks are spoken
// for"). See lib/portal/deskAvailability.ts.

import { NextRequest, NextResponse } from 'next/server';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { getDeskCapacity } from '@/lib/portal/deskAvailability';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const member = await requireMember(req);
    const capacity = await getDeskCapacity(getServiceSupabase(), {
      excludeMemberId: member.id,
    });
    return NextResponse.json({
      desks: capacity.availableDesks,
      current: member.desk_number,
      capacity: capacity.capacity,
      taken: capacity.takenCount,
      remaining: capacity.remainingCount,
      isFull: capacity.isFull,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
