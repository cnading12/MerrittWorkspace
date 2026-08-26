"use client";

// Read-only weekly availability calendar for the flex space page. Shows
// Mon–Fri 8:00 AM – 4:00 PM Mountain Time and overlays busy windows fetched
// from /api/flex-bookings/availability so members can see what's already
// reserved before booking. Booking submission is unchanged — this is a
// purely visual aid.
//
// `authToken` is OPTIONAL. The page around this is public, and "is the hall
// free on Thursday" is a question a prospective member or an event enquirer
// has every right to ask without an account — the endpoint returns time ranges
// and nothing else. A token only changes which blocks come back flagged
// `is_self`, so signing in adds "that one is yours", not the calendar itself.
import { useEffect, useMemo, useState } from 'react';
// The grid must span exactly the bookable window, so it reads the same
// constants the booking endpoint validates against rather than its own copy.
import { FLEX_OPEN_MINUTES, FLEX_CLOSE_MINUTES } from '@/lib/hours';

const MT_TZ = 'America/Denver';
const OPEN_MINUTES = FLEX_OPEN_MINUTES;   // 8:00 AM
const CLOSE_MINUTES = FLEX_CLOSE_MINUTES; // 4:00 PM
const SLOT_MINUTES = 30;
const SLOT_COUNT = (CLOSE_MINUTES - OPEN_MINUTES) / SLOT_MINUTES; // 16
const CELL_HEIGHT_PX = 28;

interface BusyWindow {
  start_time: string;
  end_time: string;
  is_self: boolean;
  source: 'flex' | 'calendar';
}

interface AvailabilityResponse {
  busy: BusyWindow[];
}

interface DayCol {
  weekdayShort: string;
  monthDay: string;
  isoDate: string; // YYYY-MM-DD in MT
  startMs: number; // 8:00 MT instant
  endMs: number;   // 4:00 MT instant
  isToday: boolean;
}

interface MtParts {
  year: number;
  month: number;
  day: number;
  weekday: number; // 0=Sun..6=Sat
}

function mtParts(d: Date): MtParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: MT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  });
  const parts = fmt.formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
  const wkMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    weekday: wkMap[get('weekday')] ?? 0,
  };
}

function mtOffset(d: Date): string {
  const local = new Date(d.toLocaleString('en-US', { timeZone: MT_TZ }));
  const utc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }));
  const offMin = Math.round((local.getTime() - utc.getTime()) / 60000);
  const sign = offMin >= 0 ? '+' : '-';
  const abs = Math.abs(offMin);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(
    abs % 60
  ).padStart(2, '0')}`;
}

// Build the UTC instant for a given MT wall-clock date/time. Offset is
// resolved at noon of the same date so DST flips on the displayed day are
// handled correctly without ambiguity.
function mtInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  const ymd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
    2,
    '0'
  )}`;
  const probe = new Date(`${ymd}T12:00:00Z`);
  const offset = mtOffset(probe);
  const hhmm = `${String(hour).padStart(2, '0')}:${String(minute).padStart(
    2,
    '0'
  )}`;
  return new Date(`${ymd}T${hhmm}:00${offset}`);
}

// Y/M/D of the Monday of the MT week containing `target`.
function mondayOfMtWeek(target: Date): { y: number; m: number; d: number } {
  const p = mtParts(target);
  const back = (p.weekday + 6) % 7;
  const utc = new Date(Date.UTC(p.year, p.month - 1, p.day));
  utc.setUTCDate(utc.getUTCDate() - back);
  return {
    y: utc.getUTCFullYear(),
    m: utc.getUTCMonth() + 1,
    d: utc.getUTCDate(),
  };
}

function addDays(
  y: number,
  m: number,
  d: number,
  delta: number
): { y: number; m: number; d: number } {
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + delta);
  return {
    y: utc.getUTCFullYear(),
    m: utc.getUTCMonth() + 1,
    d: utc.getUTCDate(),
  };
}

function buildWeek(anchor: Date): DayCol[] {
  const monday = mondayOfMtWeek(anchor);
  const todayMt = mtParts(new Date());
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const cols: DayCol[] = [];
  for (let i = 0; i < 5; i++) {
    const { y, m, d } = addDays(monday.y, monday.m, monday.d, i);
    // Must match the window the grid itself is drawn for (OPEN_MINUTES ..
    // CLOSE_MINUTES). DayColumn positions every busy block by interpolating
    // between these two instants and the grid's pixel height, so a column
    // window that differs from the grid window both drops bookings outside it
    // and misplaces the ones inside it.
    const startMs = mtInstant(y, m, d, Math.floor(OPEN_MINUTES / 60), OPEN_MINUTES % 60).getTime();
    const endMs = mtInstant(y, m, d, Math.floor(CLOSE_MINUTES / 60), CLOSE_MINUTES % 60).getTime();
    cols.push({
      weekdayShort: dayLabels[i],
      monthDay: `${m}/${d}`,
      isoDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      startMs,
      endMs,
      isToday:
        todayMt.year === y && todayMt.month === m && todayMt.day === d,
    });
  }
  return cols;
}

function formatRangeLabel(cols: DayCol[]): string {
  if (cols.length === 0) return '';
  const first = cols[0];
  const last = cols[cols.length - 1];
  const [fy, fm, fd] = first.isoDate.split('-').map(Number);
  const [ly, lm, ld] = last.isoDate.split('-').map(Number);
  const fmt = (y: number, m: number, d: number) =>
    new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  if (fm === lm) {
    return `${fmt(fy, fm, fd)} – ${ld}, ${ly}`;
  }
  return `${fmt(fy, fm, fd)} – ${fmt(ly, lm, ld)}, ${ly}`;
}

function timeLabel(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

interface FlexCalendarProps {
  authToken: string | null;
  refreshKey?: number;
}

export default function FlexCalendar({
  authToken,
  refreshKey = 0,
}: FlexCalendarProps) {
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [busy, setBusy] = useState<BusyWindow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const week = useMemo(() => buildWeek(anchor), [anchor]);

  const rangeStartIso = week[0]?.isoDate;
  const rangeEndIso = week[week.length - 1]?.isoDate;

  useEffect(() => {
    if (week.length === 0) return;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const start = new Date(week[0].startMs - 1).toISOString();
        // End of Friday window plus a small buffer.
        const end = new Date(week[week.length - 1].endMs + 1).toISOString();
        const res = await fetch(
          `/api/flex-bookings/availability?start=${encodeURIComponent(
            start
          )}&end=${encodeURIComponent(end)}`,
          {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
            signal: controller.signal,
          }
        );
        if (!res.ok) throw new Error('Could not load availability');
        const data: AvailabilityResponse = await res.json();
        setBusy(data.busy || []);
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message || 'Network error');
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
    // refreshKey re-runs the effect when the parent reports new bookings.
  }, [authToken, rangeStartIso, rangeEndIso, refreshKey]);

  const slotRows = Array.from({ length: SLOT_COUNT + 1 }, (_, i) => i);

  function shiftWeek(days: number) {
    setAnchor((prev) => {
      const next = new Date(prev);
      next.setUTCDate(next.getUTCDate() + days);
      return next;
    });
  }

  const isViewingThisWeek = week.some((c) => c.isToday);

  return (
    <section className="bg-bone border p-5">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="font-display text-lg font-medium text-ink">Availability</h2>
          <p className="text-sm text-ink-60">
            {formatRangeLabel(week)} · Mountain Time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftWeek(-7)}
            className="px-3 py-1.5 text-sm border hover:bg-linen"
            aria-label="Previous week"
          >
            ‹ Prev
          </button>
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            disabled={isViewingThisWeek}
            className="px-3 py-1.5 text-sm border hover:bg-linen disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(7)}
            className="px-3 py-1.5 text-sm border hover:bg-linen"
            aria-label="Next week"
          >
            Next ›
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-600">{error}</div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div
            className="grid"
            style={{ gridTemplateColumns: '64px repeat(5, minmax(0, 1fr))' }}
          >
            <div />
            {week.map((col) => (
              <div
                key={col.isoDate}
                className={`text-center pb-2 border-b ${
                  col.isToday ? 'border-orange-500' : 'border-gray-200'
                }`}
              >
                <div
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    col.isToday ? 'text-orange-600' : 'text-gray-500'
                  }`}
                >
                  {col.weekdayShort}
                </div>
                <div className="text-sm text-ink">{col.monthDay}</div>
              </div>
            ))}
          </div>

          <div
            className="grid relative"
            style={{ gridTemplateColumns: '64px repeat(5, minmax(0, 1fr))' }}
          >
            <div className="relative">
              {slotRows.map((i) => {
                const minutes = OPEN_MINUTES + i * SLOT_MINUTES;
                if (minutes > CLOSE_MINUTES) return null;
                const showLabel = i % 2 === 0 || minutes === CLOSE_MINUTES;
                return (
                  <div
                    key={i}
                    className="text-[11px] text-ink-60 text-right pr-2 -translate-y-1.5"
                    style={{ height: CELL_HEIGHT_PX }}
                  >
                    {showLabel ? timeLabel(minutes) : ''}
                  </div>
                );
              })}
            </div>

            {week.map((col) => (
              <DayColumn key={col.isoDate} col={col} busy={busy} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-ink-60 flex-wrap">
        {authToken && <Legend className="bg-orange-200 border-orange-400" label="Your booking" />}
        <Legend className="bg-gray-300 border-gray-400" label="Booked" />
        <Legend className="bg-bone border-clay" label="Available" />
        {loading && <span className="text-ink-60">Loading…</span>}
      </div>
    </section>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`inline-block w-3 h-3 rounded-sm border ${className}`}
      />
      {label}
    </span>
  );
}

function DayColumn({ col, busy }: { col: DayCol; busy: BusyWindow[] }) {
  const totalHeight = CELL_HEIGHT_PX * SLOT_COUNT;
  const dayWindow = col.endMs - col.startMs; // ms

  // Find blocks that overlap this day's flex window and compute pixel rects.
  const blocks = busy
    .map((b, idx) => {
      const startMs = new Date(b.start_time).getTime();
      const endMs = new Date(b.end_time).getTime();
      if (isNaN(startMs) || isNaN(endMs)) return null;
      const overlapStart = Math.max(startMs, col.startMs);
      const overlapEnd = Math.min(endMs, col.endMs);
      if (overlapEnd <= overlapStart) return null;
      const top =
        ((overlapStart - col.startMs) / dayWindow) * totalHeight;
      const height = ((overlapEnd - overlapStart) / dayWindow) * totalHeight;
      return {
        key: `${idx}-${b.start_time}`,
        top,
        height: Math.max(height, 4),
        is_self: b.is_self,
        startMs: overlapStart,
        endMs: overlapEnd,
        truncatedStart: startMs < col.startMs,
        truncatedEnd: endMs > col.endMs,
      };
    })
    .filter(Boolean) as Array<{
    key: string;
    top: number;
    height: number;
    is_self: boolean;
    startMs: number;
    endMs: number;
    truncatedStart: boolean;
    truncatedEnd: boolean;
  }>;

  return (
    <div className="relative border-l border-clay">
      {Array.from({ length: SLOT_COUNT }).map((_, i) => (
        <div
          key={i}
          className={`border-b ${
            i % 2 === 1 ? 'border-gray-100' : 'border-gray-200'
          }`}
          style={{ height: CELL_HEIGHT_PX }}
        />
      ))}
      {blocks.map((b) => {
        const label = formatBusyLabel(b.startMs, b.endMs);
        const tooltip = b.is_self
          ? `Your booking: ${label}`
          : `Booked: ${label}`;
        return (
          <div
            key={b.key}
            title={tooltip}
            className={`absolute left-0.5 right-0.5 border text-[10px] leading-tight px-1 py-0.5 overflow-hidden ${
              b.is_self
                ? 'bg-orange-200 border-orange-400 text-orange-900'
                : 'bg-gray-300 border-gray-400 text-gray-800'
            }`}
            style={{ top: b.top, height: b.height }}
          >
            {b.height >= 18 ? (
              <span className="font-medium">
                {b.is_self ? 'You' : 'Booked'}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function formatBusyLabel(startMs: number, endMs: number): string {
  const fmt = (ms: number) =>
    new Date(ms).toLocaleTimeString('en-US', {
      timeZone: MT_TZ,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  return `${fmt(startMs)} – ${fmt(endMs)}`;
}
