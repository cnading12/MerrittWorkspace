import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const member = await requireMember(req);
    const sb = getServiceSupabase();

    const { data: booking, error } = await sb
      .from('flex_bookings')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    if (booking.member_id !== member.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (booking.status === 'cancelled') {
      return NextResponse.json({ booking });
    }

    const flexId = process.env.FLEX_CALENDAR_ID;
    if (booking.google_event_id && flexId) {
      try {
        const auth = getGoogleAuth();
        await google.calendar({ version: 'v3', auth }).events.delete({
          calendarId: flexId,
          eventId: booking.google_event_id,
          sendUpdates: 'none',
        });
      } catch (e: any) {
        // 404/410 from Google means the event is already gone — fine to
        // continue cancelling the row. Anything else is a real failure.
        const code = e?.code || e?.response?.status;
        if (code !== 404 && code !== 410) {
          console.error('flex calendar delete failed', e);
          return NextResponse.json(
            { error: 'Could not cancel calendar event. Please try again.' },
            { status: 502 }
          );
        }
      }
    }

    // Soft-cancel: keep the row so weekly-hours math (which filters out
    // cancelled rows anyway) and audit trail are both preserved.
    const { data: updated, error: updateErr } = await sb
      .from('flex_bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id)
      .select('*')
      .single();

    if (updateErr) {
      console.error('flex_bookings cancel update failed', updateErr);
      return NextResponse.json(
        { error: 'Could not cancel booking. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ booking: updated });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json(
      { error: e?.message || 'Server error' },
      { status }
    );
  }
}
