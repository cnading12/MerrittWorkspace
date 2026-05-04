"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import FlexCalendar from '@/components/portal/FlexCalendar';

interface FlexBooking {
  id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  google_event_id: string | null;
}

const DURATION_OPTIONS = [
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '1.5 hours', minutes: 90 },
  { label: '2 hours', minutes: 120 },
  { label: '2.5 hours', minutes: 150 },
  { label: '3 hours', minutes: 180 },
  { label: '3.5 hours', minutes: 210 },
  { label: '4 hours', minutes: 240 },
];

function formatLocal(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Denver',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function fmtHours(minutes: number) {
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h}` : h.toFixed(1);
}

export default function FlexSpacePage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<FlexBooking[]>([]);
  const [usedMinutes, setUsedMinutes] = useState(0);
  const [allowedMinutes, setAllowedMinutes] = useState(240);

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/portal/login');
        return;
      }
      setToken(session.access_token);
    })();
  }, [router]);

  async function refresh(authToken: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/flex-bookings', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Failed to load bookings');
      const data = await res.json();
      setBookings(data.bookings || []);
      setUsedMinutes(data.weekly_minutes_used || 0);
      setAllowedMinutes(data.weekly_minutes_allowed || 240);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) refresh(token);
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSuccess(null);
    if (!date || !startTime) {
      setError('Please pick a date and start time.');
      return;
    }
    // datetime-local style string. The browser will interpret this in the
    // user's local timezone — for MT members this matches flex hours; the
    // server still validates against America/Denver explicitly.
    const startLocal = new Date(`${date}T${startTime}`);
    if (isNaN(startLocal.getTime())) {
      setError('Invalid date/time.');
      return;
    }
    const endLocal = new Date(startLocal.getTime() + duration * 60_000);

    setSubmitting(true);
    try {
      const res = await fetch('/api/flex-bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          start_time: startLocal.toISOString(),
          end_time: endLocal.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not create booking.');
        return;
      }
      setSuccess('Booking confirmed. Check your email for details.');
      setDate('');
      setCalendarRefreshKey((k) => k + 1);
      await refresh(token);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel(id: string) {
    if (!token) return;
    if (!confirm('Cancel this flex space booking?')) return;
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/flex-bookings/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not cancel.');
        return;
      }
      setSuccess('Booking cancelled.');
      setCalendarRefreshKey((k) => k + 1);
      await refresh(token);
    } catch (e: any) {
      setError(e?.message || 'Network error');
    }
  }

  if (!token || loading) {
    return <div className="text-gray-500">Loading…</div>;
  }

  const remainingMinutes = Math.max(0, allowedMinutes - usedMinutes);
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Flex Space</h1>
        <p className="text-sm text-gray-500">
          Reserve the church building for up to 4 hours per week. Available
          weekdays 9:00 AM – 4:30 PM Mountain Time.
        </p>
      </header>

      <div className="bg-white border rounded-lg p-5">
        <div className="flex items-baseline justify-between">
          <div className="text-lg font-medium text-gray-900">
            {fmtHours(usedMinutes)} of {fmtHours(allowedMinutes)} hours used
            this week
          </div>
          <div className="text-sm text-gray-500">
            {fmtHours(remainingMinutes)} hr remaining
          </div>
        </div>
        <div className="mt-3 h-2 bg-gray-100 rounded">
          <div
            className="h-2 rounded bg-orange-500"
            style={{
              width: `${Math.min(100, (usedMinutes / allowedMinutes) * 100)}%`,
            }}
          />
        </div>
      </div>

      <FlexCalendar authToken={token} refreshKey={calendarRefreshKey} />

      <form
        onSubmit={submit}
        className="bg-white border rounded-lg p-5 space-y-4"
      >
        <h2 className="text-lg font-medium text-gray-900">Book a time</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Date
            </label>
            <input
              type="date"
              required
              min={todayIso}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start time
            </label>
            <input
              type="time"
              required
              min="09:00"
              max="16:00"
              step={900}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 w-full border rounded px-3 py-2 text-base"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option
                  key={opt.minutes}
                  value={opt.minutes}
                  disabled={opt.minutes > remainingMinutes}
                >
                  {opt.label}
                  {opt.minutes > remainingMinutes ? ' (over weekly cap)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && <div className="text-sm text-green-700">{success}</div>}
        <button
          type="submit"
          disabled={submitting || remainingMinutes <= 0}
          className="w-full sm:w-auto bg-gray-900 text-white px-5 py-2.5 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {submitting ? 'Booking…' : 'Book flex space'}
        </button>
        {remainingMinutes <= 0 && (
          <p className="text-sm text-gray-500">
            You&apos;ve used your full weekly allowance. Cancel an existing
            booking or wait until next week.
          </p>
        )}
      </form>

      <section className="bg-white border rounded-lg p-5">
        <h2 className="text-lg font-medium text-gray-900 mb-3">
          Upcoming bookings
        </h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-gray-500">No upcoming flex bookings.</p>
        ) : (
          <ul className="divide-y">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatLocal(b.start_time)} – {formatLocal(b.end_time)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {fmtHours(b.duration_minutes)} hr · {b.status}
                  </div>
                </div>
                <button
                  onClick={() => cancel(b.id)}
                  className="text-sm text-red-600 hover:text-red-800 self-start sm:self-auto"
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
