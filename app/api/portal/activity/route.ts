// app/api/portal/activity/route.ts
//
// Powers the member portal "My Activity" view: the member's snack purchases
// and conference-room bookings from the last 30 days, plus their current
// conference included-hours summary.

import { NextRequest, NextResponse } from 'next/server';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { getMemberHoursSummary, HOURLY_RATE_DOLLARS } from '@/lib/bookings/conference-hours';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const member = await requireMember(req);
    const sb = getServiceSupabase();

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Resilient to a not-yet-applied migration: if a table is missing, that
    // section degrades to empty / null rather than failing the whole page.
    const [snackRes, conferenceRes, hoursRes] = await Promise.allSettled([
      sb
        .from('snack_orders')
        .select(
          'id, order_number, items, total_cents, payment_method, status, created_at, paid_at, office_number',
        )
        .eq('member_id', member.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false }),
      sb
        .from('conference_bookings')
        .select(
          'id, booking_ref, booking_date, start_time, end_time, duration_hours, included_hours, billed_hours, total_cents, payment_status, status, created_at',
        )
        .eq('member_id', member.id)
        .gte('created_at', since)
        .order('booking_date', { ascending: false }),
      getMemberHoursSummary(member),
    ]);

    const snackOrders =
      snackRes.status === 'fulfilled' ? snackRes.value.data || [] : [];
    const conferenceBookings =
      conferenceRes.status === 'fulfilled' ? conferenceRes.value.data || [] : [];
    const hours =
      hoursRes.status === 'fulfilled'
        ? { ...hoursRes.value, hourly_rate: HOURLY_RATE_DOLLARS }
        : null;

    return NextResponse.json({
      snack_orders: snackOrders,
      conference_bookings: conferenceBookings,
      hours,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
