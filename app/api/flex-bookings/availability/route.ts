// Read-only availability endpoint that powers the visual calendar on the
// flex space page. Returns the busy windows in a date range so members can
// see when the space is already reserved before submitting a booking.
//
// Privacy: only time ranges (and an `is_self` flag for the caller's own
// bookings) are returned — no member names or emails.
//
// This endpoint does NOT change booking logic. Source of truth for booking
// validation is still the POST /api/flex-bookings handler.
import { NextRequest, NextResponse } from 'next/server';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { checkFreebusy } from '@/lib/calendar/freebusy';

export const dynamic = 'force-dynamic';

const MAX_RANGE_DAYS = 31;

export async function GET(req: NextRequest) {
  try {
    const member = await requireMember(req);

    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get('start');
    const endParam = searchParams.get('end');
    if (!startParam || !endParam) {
      return NextResponse.json(
        { error: 'start and end query params are required (ISO timestamps)' },
        { status: 400 }
      );
    }

    const start = new Date(startParam);
    const end = new Date(endParam);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: 'Invalid range' }, { status: 400 });
    }
    const rangeDays = (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
    if (rangeDays > MAX_RANGE_DAYS) {
      return NextResponse.json(
        { error: `Range cannot exceed ${MAX_RANGE_DAYS} days` },
        { status: 400 }
      );
    }

    const sb = getServiceSupabase();
    const { data: rows, error } = await sb
      .from('flex_bookings')
      .select('id, member_id, start_time, end_time, status')
      .neq('status', 'cancelled')
      .lt('start_time', end.toISOString())
      .gt('end_time', start.toISOString())
      .order('start_time', { ascending: true });

    if (error) throw new Error(error.message);

    const flexRows = (rows || []).map((r: any) => ({
      start_time: r.start_time as string,
      end_time: r.end_time as string,
      is_self: r.member_id === member.id,
      source: 'flex' as const,
    }));

    // Also include busy windows from the wellness + flex Google calendars so
    // the calendar reflects everything the booking POST will reject. The
    // freebusy lookup is best-effort; if it fails we still return DB rows.
    const wellnessId = process.env.WELLNESS_CALENDAR_ID;
    const flexId = process.env.FLEX_CALENDAR_ID;
    const calendarIds = [flexId, wellnessId].filter(
      (id): id is string => Boolean(id)
    );

    let externalBusy: Array<{
      start_time: string;
      end_time: string;
      is_self: boolean;
      source: 'calendar';
    }> = [];

    if (calendarIds.length > 0) {
      try {
        const fb = await checkFreebusy(start, end, calendarIds);
        externalBusy = fb.conflicts.map((c) => ({
          start_time: c.start,
          end_time: c.end,
          is_self: false,
          source: 'calendar' as const,
        }));
      } catch (e) {
        console.error('availability freebusy lookup failed', e);
      }
    }

    return NextResponse.json({
      busy: [...flexRows, ...externalBusy],
      range: { start: start.toISOString(), end: end.toISOString() },
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status }
    );
  }
}
