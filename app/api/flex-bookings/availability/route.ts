// Read-only availability endpoint that powers the visual calendar on the
// flex space page. Returns the busy windows in a date range so anyone can see
// when the space is already reserved before submitting a booking.
//
// PUBLIC, deliberately. The calendar lives on /member-resources/flex-space,
// which is a marketing page: the two people most likely to ask "is the hall
// free on Thursday" are a prospective member deciding whether the room is
// worth joining for, and someone weighing an event booking. Both used to see
// a sign-in wall where the calendar should have been. Requiring an account to
// look at whether a room is busy protected nothing.
//
// Privacy: only time ranges are returned — never a name, an email, a member id
// or an event title. Authentication is OPTIONAL and changes exactly one thing:
// with a valid member token, that member's own bookings come back flagged
// `is_self` so the calendar can colour them differently. A bad or absent token
// is not an error; it just means nothing is flagged.
//
// Anonymous callers are rate limited per IP. The handler runs two Supabase
// reads and a Google freebusy lookup, so it is worth more than a static asset
// to serve; a signed-in member is exempt, since they are already identified.
//
// This endpoint does NOT change booking logic. Source of truth for booking
// validation is still the POST /api/flex-bookings handler.
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { checkFreebusy } from '@/lib/calendar/freebusy';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const MAX_RANGE_DAYS = 31;

// Generous: the calendar fires one request per week the visitor pages through,
// so a person browsing a couple of months ahead stays well inside it.
const ANON_RATE_LIMIT = { windowMs: 60_000, max: 30 };

/**
 * The member id whose bookings should be marked `is_self`, or null.
 *
 * Never throws. An expired, malformed or missing token is the normal case for
 * a public visitor, not a failure — it simply means no booking belongs to the
 * caller.
 */
async function optionalMemberId(req: NextRequest): Promise<string | null> {
  if (!req.headers.get('authorization')) return null;
  try {
    const user = await getUserFromRequest(req);
    if (!user) return null;
    const sb = getServiceSupabase();
    const { data } = await sb
      .from('members')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    return (data?.id as string | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const memberId = await optionalMemberId(req);

    if (!memberId) {
      const { limited, retryAfterSeconds } = checkRateLimit(
        `flex-availability:${getClientIp(req)}`,
        ANON_RATE_LIMIT,
      );
      if (limited) {
        return NextResponse.json(
          { error: 'Too many requests. Please try again shortly.' },
          { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
        );
      }
    }

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
      is_self: memberId !== null && r.member_id === memberId,
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
