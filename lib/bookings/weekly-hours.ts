// Compute how many minutes of flex-space booking a member has used in a
// given Mountain Time week (Monday 00:00 MT through next Monday 00:00 MT).
// Cancelled bookings are excluded so cancelling frees up the time again.
//
// Pass several member ids to sum usage across an office's occupants — flex
// allowances pool per office exactly as conference hours do. See
// lib/bookings/officePool.ts.
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

const MT_TZ = 'America/Denver';

// UTC offset of the given instant in Mountain Time, formatted as +HH:MM /
// -HH:MM. Auto-handles DST since the offset is derived from the actual
// wall-clock difference at that instant.
function denverOffsetAt(instant: Date): string {
  const denverWall = new Date(
    instant.toLocaleString('en-US', { timeZone: MT_TZ })
  );
  const utcWall = new Date(instant.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offsetMinutes = Math.round(
    (denverWall.getTime() - utcWall.getTime()) / 60000
  );
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${sign}${hh}:${mm}`;
}

// Y-M-D and weekday (0=Sun..6=Sat) for the given instant in Mountain Time.
function denverDateParts(instant: Date) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: MT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: weekdayMap[get('weekday')] ?? 0,
  };
}

// Returns the [start, end) timestamps of the Mountain Time week containing
// `target` (Monday 00:00 MT inclusive, next Monday 00:00 MT exclusive).
export function mountainWeekBounds(target: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const { year, month, day, weekday } = denverDateParts(target);
  // Days back to Monday: Mon=0, Tue=1, ... Sun=6.
  const daysBackToMonday = (weekday + 6) % 7;
  const mondayUtcMidnight = Date.UTC(year, month - 1, day - daysBackToMonday);

  // Build the "Monday 00:00 in Denver" instant using the offset that
  // applies on that local date.
  const probeMondayUtc = new Date(mondayUtcMidnight);
  const offset = denverOffsetAt(probeMondayUtc);
  const mondayY = new Date(probeMondayUtc).getUTCFullYear();
  const mondayM = String(new Date(probeMondayUtc).getUTCMonth() + 1).padStart(2, '0');
  const mondayD = String(new Date(probeMondayUtc).getUTCDate()).padStart(2, '0');
  const start = new Date(`${mondayY}-${mondayM}-${mondayD}T00:00:00${offset}`);

  // End = Monday + 7 days, again interpreted in Denver wall time. Use the
  // offset of that later instant (DST may have flipped mid-week).
  const nextMondayProbe = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const endOffset = denverOffsetAt(nextMondayProbe);
  const endParts = denverDateParts(nextMondayProbe);
  const endY = endParts.year;
  const endM = String(endParts.month).padStart(2, '0');
  const endD = String(endParts.day).padStart(2, '0');
  const end = new Date(`${endY}-${endM}-${endD}T00:00:00${endOffset}`);

  return { start, end };
}

export async function getWeeklyMinutes(
  memberId: string | string[],
  target: Date = new Date()
): Promise<{ minutes: number; weekStart: Date; weekEnd: Date }> {
  const { start, end } = mountainWeekBounds(target);
  const memberIds = Array.isArray(memberId) ? memberId : [memberId];
  if (memberIds.length === 0) {
    return { minutes: 0, weekStart: start, weekEnd: end };
  }
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('flex_bookings')
    .select('duration_minutes,start_time,status')
    .in('member_id', memberIds)
    .neq('status', 'cancelled')
    .gte('start_time', start.toISOString())
    .lt('start_time', end.toISOString());

  if (error) throw new Error(`weekly-hours query failed: ${error.message}`);

  const minutes = (data || []).reduce(
    (sum, row: any) => sum + (row.duration_minutes || 0),
    0
  );

  return { minutes, weekStart: start, weekEnd: end };
}
