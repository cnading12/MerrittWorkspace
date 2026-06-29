// Member-only flex space booking endpoint.
//
// Flow:
//   1. Validate the proposed window (within Mon–Fri 9:00–16:30 MT, future,
//      no more than 60 days out, 30 min – 4 hr).
//   2. Confirm the member is still under their 4-hour weekly cap.
//   3. Ask Google freebusy whether the wellness or legacy flex calendars are
//      already busy.
//   4. Insert a pending row, then create the Google Calendar event directly on
//      the shared wellness calendar (labeled "[Coworking Member]" so wellness
//      staff can tell it apart from a wellness reservation). If the calendar
//      write fails we delete the pending row so the weekly-hours math stays
//      accurate.
//   5. Mark the row confirmed with the event id + calendar id, then send Resend
//      confirmation emails to both the member and staff.
import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Resend } from 'resend';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { checkFreebusy } from '@/lib/calendar/freebusy';
import { getWeeklyMinutes } from '@/lib/bookings/weekly-hours';
import {
  flexBookingConfirmedEmail,
  flexBookingStaffEmail,
  getTransactionalEmailHeaders,
  PORTAL_FROM,
  PORTAL_REPLY_TO,
  STAFF_NOTIFICATION_EMAILS,
} from '@/lib/portal/emails';

export const dynamic = 'force-dynamic';

const MT_TZ = 'America/Denver';
const MAX_WEEKLY_MINUTES = 240;
const MIN_BOOKING_MINUTES = 30;
const MAX_BOOKING_MINUTES = 240;
const MAX_EVENT_TITLE_LENGTH = 120;
// Members can reserve the space at most this far in advance.
const MAX_ADVANCE_DAYS = 60;
const MAX_ADVANCE_MS = MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000;
// Google Calendar colorId used to make coworking flex reservations visually
// distinct from wellness bookings on the shared calendar (6 = Tangerine).
const COWORKING_EVENT_COLOR_ID = '6';

// Flex hours: weekdays 9:00 AM – 4:30 PM Mountain Time.
const FLEX_OPEN_MINUTES = 9 * 60;
const FLEX_CLOSE_MINUTES = 16 * 60 + 30;

function getGoogleAuth() {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Missing Google Calendar credentials');
  }
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
}

// Wall-clock view of an instant in Mountain Time.
function denverParts(d: Date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: MT_TZ,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    weekday: weekdayMap[get('weekday')] ?? 0,
    minutesOfDay: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

function formatLocal(d: Date) {
  return d.toLocaleString('en-US', {
    timeZone: MT_TZ,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

export async function POST(req: NextRequest) {
  try {
    const member = await requireMember(req);
    const body = await req.json();
    const { start_time, end_time, event_title } = body || {};

    if (typeof start_time !== 'string' || typeof end_time !== 'string') {
      return NextResponse.json(
        { error: 'start_time and end_time are required ISO timestamps' },
        { status: 400 }
      );
    }

    if (typeof event_title !== 'string' || !event_title.trim()) {
      return NextResponse.json(
        { error: 'Please describe your event (e.g. team meeting, art class, workshop).' },
        { status: 400 }
      );
    }
    const eventTitle = event_title.trim().slice(0, MAX_EVENT_TITLE_LENGTH);

    const start = new Date(start_time);
    const end = new Date(end_time);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid timestamps' }, { status: 400 });
    }

    if (end <= start) {
      return NextResponse.json(
        { error: 'end_time must be after start_time' },
        { status: 400 }
      );
    }
    if (start.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'Bookings must be in the future' },
        { status: 400 }
      );
    }
    if (start.getTime() > Date.now() + MAX_ADVANCE_MS) {
      return NextResponse.json(
        { error: `Bookings can only be made up to ${MAX_ADVANCE_DAYS} days in advance.` },
        { status: 400 }
      );
    }

    const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
    if (
      durationMinutes < MIN_BOOKING_MINUTES ||
      durationMinutes > MAX_BOOKING_MINUTES
    ) {
      return NextResponse.json(
        { error: 'Bookings must be between 30 minutes and 4 hours' },
        { status: 400 }
      );
    }

    // Window must fall on a single weekday inside flex hours.
    const startMt = denverParts(start);
    const endMt = denverParts(end);
    const isWeekday = (w: number) => w >= 1 && w <= 5;
    if (!isWeekday(startMt.weekday) || !isWeekday(endMt.weekday)) {
      return NextResponse.json(
        { error: 'Flex space is only available Monday–Friday' },
        { status: 400 }
      );
    }
    if (startMt.weekday !== endMt.weekday) {
      return NextResponse.json(
        { error: 'Bookings cannot span multiple days' },
        { status: 400 }
      );
    }
    if (
      startMt.minutesOfDay < FLEX_OPEN_MINUTES ||
      endMt.minutesOfDay > FLEX_CLOSE_MINUTES
    ) {
      return NextResponse.json(
        { error: 'Flex hours are 9:00 AM – 4:30 PM Mountain Time' },
        { status: 400 }
      );
    }

    // Weekly cap.
    const { minutes: usedMinutes } = await getWeeklyMinutes(member.id, start);
    if (usedMinutes + durationMinutes > MAX_WEEKLY_MINUTES) {
      const remaining = Math.max(0, MAX_WEEKLY_MINUTES - usedMinutes);
      return NextResponse.json(
        {
          error: `This booking would exceed your 4-hour weekly limit. You have ${remaining} minutes left this week.`,
          weekly_minutes_used: usedMinutes,
          weekly_minutes_allowed: MAX_WEEKLY_MINUTES,
        },
        { status: 400 }
      );
    }

    // Coworking flex reservations now live directly on the wellness calendar
    // so they share one source of truth with wellness bookings and can never
    // silently double-book the space.
    const wellnessId = process.env.WELLNESS_CALENDAR_ID;
    const flexId = process.env.FLEX_CALENDAR_ID;
    if (!wellnessId) {
      return NextResponse.json(
        { error: 'Server misconfigured: WELLNESS_CALENDAR_ID missing' },
        { status: 500 }
      );
    }
    const bookingCalendarId = wellnessId;

    // Conflict check across the wellness calendar (now the source of truth)
    // plus the legacy flex calendar, so any reservation still living on the
    // old calendar continues to block overlapping times during the transition.
    const calendarIds = [wellnessId, ...(flexId ? [flexId] : [])];
    const { busy } = await checkFreebusy(start, end, calendarIds);
    if (busy) {
      return NextResponse.json(
        {
          error:
            'That time slot is already booked. Please choose another window.',
        },
        { status: 409 }
      );
    }

    const sb = getServiceSupabase();

    // Insert a pending row first so concurrent requests racing on the same
    // window are visible in the table.
    const { data: inserted, error: insertErr } = await sb
      .from('flex_bookings')
      .insert({
        member_id: member.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        event_title: eventTitle,
        status: 'pending',
      })
      .select('*')
      .single();

    if (insertErr || !inserted) {
      console.error('flex_bookings insert failed', insertErr);
      return NextResponse.json(
        { error: 'Could not create booking. Please try again.' },
        { status: 500 }
      );
    }

    // Create the Google Calendar event on the wellness calendar.
    let eventId: string | null = null;
    try {
      const auth = getGoogleAuth();
      const calendar = google.calendar({ version: 'v3', auth });
      const memberLabel = `${member.first_name} ${member.last_name}`.trim();
      const ev = await calendar.events.insert({
        calendarId: bookingCalendarId,
        requestBody: {
          // "[Coworking Member]" prefix + a distinct color make this clearly
          // distinguishable from wellness reservations on the shared calendar.
          summary: `[Coworking Member] ${eventTitle} — ${memberLabel || member.email}`,
          colorId: COWORKING_EVENT_COLOR_ID,
          description: [
            'Coworking member flex space reservation (booked via the Merritt Workspace member portal).',
            `Event: ${eventTitle}`,
            `Member: ${memberLabel} <${member.email}>`,
            `Booking ID: ${inserted.id}`,
            '',
            'Reminder: all setup and breakdown for this event must happen within the booked window.',
          ].join('\n'),
          start: { dateTime: start.toISOString(), timeZone: MT_TZ },
          end: { dateTime: end.toISOString(), timeZone: MT_TZ },
          location: 'Merritt Workspace - 2246 Irving Street, Denver, CO 80211',
        },
        sendUpdates: 'none',
      });
      eventId = ev.data.id || null;
      if (!eventId) throw new Error('Calendar event id missing in response');
    } catch (calErr) {
      console.error('flex calendar insert failed', calErr);
      await sb.from('flex_bookings').delete().eq('id', inserted.id);
      return NextResponse.json(
        { error: 'Could not create calendar event. Please try again.' },
        { status: 502 }
      );
    }

    const { data: confirmed, error: updateErr } = await sb
      .from('flex_bookings')
      .update({
        google_event_id: eventId,
        google_calendar_id: bookingCalendarId,
        status: 'confirmed',
      })
      .eq('id', inserted.id)
      .select('*')
      .single();

    if (updateErr || !confirmed) {
      console.error('flex_bookings confirm update failed', updateErr);
      // Roll back the calendar event so we don't leave a phantom block.
      try {
        const auth = getGoogleAuth();
        await google.calendar({ version: 'v3', auth }).events.delete({
          calendarId: bookingCalendarId,
          eventId: eventId!,
          sendUpdates: 'none',
        });
      } catch (e) {
        console.error('rollback calendar delete failed', e);
      }
      await sb.from('flex_bookings').delete().eq('id', inserted.id);
      return NextResponse.json(
        { error: 'Could not finalize booking. Please try again.' },
        { status: 500 }
      );
    }

    // Confirmation email — best effort.
    if (process.env.RESEND_API_KEY) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
        const tpl = flexBookingConfirmedEmail({
          firstName: member.first_name,
          eventTitle,
          startLocal: formatLocal(start),
          endLocal: formatLocal(end),
          durationMinutes,
          weeklyMinutesUsed: usedMinutes + durationMinutes,
          weeklyMinutesAllowed: MAX_WEEKLY_MINUTES,
          cancelUrl: `${baseUrl}/portal/flex-space`,
        });
        const resend = new Resend(process.env.RESEND_API_KEY);
        const memberLabel =
          `${member.first_name} ${member.last_name}`.trim() || member.email;

        // Client confirmation.
        await resend.emails.send({
          from: PORTAL_FROM,
          to: member.email,
          replyTo: PORTAL_REPLY_TO,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          headers: getTransactionalEmailHeaders(),
          tags: [{ name: 'category', value: 'flex_booking_confirmation' }],
        });

        // Staff notification — so whoever manages the wellness calendar sees
        // the coworking reservation right away.
        const staffTpl = flexBookingStaffEmail({
          memberName: memberLabel,
          memberEmail: member.email,
          eventTitle,
          startLocal: formatLocal(start),
          endLocal: formatLocal(end),
          durationMinutes,
          bookingId: confirmed.id,
        });
        await resend.emails.send({
          from: PORTAL_FROM,
          to: STAFF_NOTIFICATION_EMAILS,
          replyTo: PORTAL_REPLY_TO,
          subject: staffTpl.subject,
          html: staffTpl.html,
          text: staffTpl.text,
          headers: getTransactionalEmailHeaders(),
          tags: [{ name: 'category', value: 'flex_booking_staff_notification' }],
        });
      } catch (e) {
        console.error('flex booking email failed', e);
      }
    }

    return NextResponse.json({ booking: confirmed });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const member = await requireMember(req);
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('flex_bookings')
      .select('*')
      .eq('member_id', member.id)
      .neq('status', 'cancelled')
      .gte('end_time', new Date().toISOString())
      .order('start_time', { ascending: true });
    if (error) throw new Error(error.message);

    const { minutes } = await getWeeklyMinutes(member.id);
    return NextResponse.json({
      bookings: data || [],
      weekly_minutes_used: minutes,
      weekly_minutes_allowed: MAX_WEEKLY_MINUTES,
    });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status }
    );
  }
}
