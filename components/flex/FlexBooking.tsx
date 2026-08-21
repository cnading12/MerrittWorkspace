"use client";

// The flex-space booking widget.
//
// Lifted out of app/portal/flex-space so it can live on the public
// /member-resources/flex-space page alongside the marketing copy, which is
// where members now go to book. The portal route redirects there.
//
// Because the page around it is public, this component handles the signed-out
// case itself — it renders a sign-in prompt rather than redirecting, so a
// prospect reading about the room isn't bounced to a login screen.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import FlexCalendar from '@/components/portal/FlexCalendar';

interface FlexBooking {
  id: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  google_event_id: string | null;
  event_title: string | null;
}

const EVENT_TITLE_MAX_LENGTH = 120;

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

export default function FlexBooking() {
  const [token, setToken] = useState<string | null>(null);
  // Distinguishes "still checking the session" from "checked, nobody signed
  // in" — without it the sign-in prompt flashes for members on every load.
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  // Set when the member's plan doesn't include flex space (e.g. one-day desk
  // passes) — the API answers 403 and we show a notice instead of the form.
  const [accessBlocked, setAccessBlocked] = useState<string | null>(null);
  const [bookings, setBookings] = useState<FlexBooking[]>([]);
  const [usedMinutes, setUsedMinutes] = useState(0);
  const [allowedMinutes, setAllowedMinutes] = useState(240);

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState(60);
  const [eventTitle, setEventTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setToken(data.session?.access_token ?? null);
      setAuthChecked(true);
      if (!data.session) setLoading(false);
    });
    // Signing in or out in another tab should swap this widget over without a
    // page reload.
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setToken(session?.access_token ?? null);
      setAuthChecked(true);
      if (!session) setLoading(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function refresh(authToken: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/flex-bookings', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        setAccessBlocked(
          data.error || 'Flex space access is not included with your membership.'
        );
        return;
      }
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
    const trimmedTitle = eventTitle.trim();
    if (!trimmedTitle) {
      setError('Please describe your event (e.g. team meeting, art class, workshop).');
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
          event_title: trimmedTitle,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not create booking.');
        return;
      }
      setSuccess('Booking confirmed. Check your email for details.');
      setDate('');
      setEventTitle('');
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

  if (!authChecked || (token && loading)) {
    return <p className="text-ink-60">Loading&hellip;</p>;
  }

  // Signed out: the room is described in full above this point, so all that's
  // missing is a way in. Two audiences land here — members who aren't signed
  // in, and non-members who just want to rent the hall. The second group used
  // to hit a dead end; they now get pointed at Merritt Wellness, which handles
  // public bookings of the same building outside member hours.
  if (!token) {
    return (
      <div className="border border-clay bg-bone p-6 md:p-8">
        <h3 className="mw-h3">Members book here.</h3>
        <p className="mt-4 mw-body">
          Sign in to see the calendar, check your remaining hours for the week,
          and reserve the room. Flex space is included with every recurring
          membership.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link href="/portal/login" className="mw-btn-primary">
            Member sign in
          </Link>
          <Link href="/membership" className="mw-btn-ghost">
            See membership options
          </Link>
        </div>

        <div className="mt-8 border-t border-clay pt-6">
          <h4 className="font-display text-lg font-semibold text-ink">
            Not a member?
          </h4>
          <p className="mt-3 mw-body">
            You can still book the hall. Evening, weekend and public bookings
            run through Merritt Wellness, which shares the building.
          </p>
          <a
            href="https://www.merrittwellness.net/booking"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block border-b border-accent pb-1 text-[15px] font-medium text-accent-deep transition hover:border-accent-deep"
          >
            Book as a non-member at Merritt Wellness
          </a>
        </div>
      </div>
    );
  }

  if (accessBlocked) {
    return (
      <div className="border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-semibold">Not included with your day pass</p>
        <p className="mt-2">{accessBlocked}</p>
        <p className="mt-2">
          Interested in flex space and other member perks? A recurring
          membership includes them — email{' '}
          <a className="underline" href="mailto:memberservices@merrittworkspace.net">
            memberservices@merrittworkspace.net
          </a>{' '}
          and we&apos;ll help you upgrade.
        </p>
      </div>
    );
  }

  const remainingMinutes = Math.max(0, allowedMinutes - usedMinutes);
  const todayIso = new Date().toISOString().slice(0, 10);
  // Members can book at most 60 days out (enforced server-side too).
  const maxDateIso = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="border border-clay bg-bone p-5">
        <div className="flex items-baseline justify-between">
          <div className="text-lg font-medium text-ink">
            {fmtHours(usedMinutes)} of {fmtHours(allowedMinutes)} hours used
            this week
          </div>
          <div className="text-sm text-ink-60">
            {fmtHours(remainingMinutes)} hr remaining
          </div>
        </div>
        <div className="mt-3 h-2 bg-linen">
          <div
            className="h-2 bg-accent"
            style={{
              width: `${Math.min(100, (usedMinutes / allowedMinutes) * 100)}%`,
            }}
          />
        </div>
      </div>

      <FlexCalendar authToken={token} refreshKey={calendarRefreshKey} />

      <form onSubmit={submit} className="border border-clay bg-bone p-5 space-y-4">
        <h3 className="font-display text-lg font-medium text-ink">Book a time</h3>
        <div>
          <label className="block text-sm font-medium text-ink-60">
            Event title
          </label>
          <input
            type="text"
            required
            maxLength={EVENT_TITLE_MAX_LENGTH}
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="e.g. Team meeting, art class, workshop"
            className="mt-1 w-full border border-clay px-3 py-2 text-base"
          />
          <p className="mt-1 text-xs text-ink-60">
            Tell us what you&apos;re using the space for so staff and other
            members know what&apos;s happening.
          </p>
        </div>
        <div className="border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Heads up:</strong> all setup and breakdown for your event
          must happen within your booked window. Please plan your arrival and
          cleanup time accordingly so the next member can start on time.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink-60">Date</label>
            <input
              type="date"
              required
              min={todayIso}
              max={maxDateIso}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full border border-clay px-3 py-2 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-60">
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
              className="mt-1 w-full border border-clay px-3 py-2 text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-60">
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-1 w-full border border-clay px-3 py-2 text-base"
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
          className="w-full sm:w-auto bg-ink text-white px-5 py-2.5 hover:bg-ink disabled:opacity-50"
        >
          {submitting ? 'Booking…' : 'Book flex space'}
        </button>
        {remainingMinutes <= 0 && (
          <p className="text-sm text-ink-60">
            You&apos;ve used your full weekly allowance. Cancel an existing
            booking or wait until next week.
          </p>
        )}
      </form>

      <section className="border border-clay bg-bone p-5">
        <h3 className="font-display text-lg font-medium text-ink mb-3">
          Upcoming bookings
        </h3>
        {bookings.length === 0 ? (
          <p className="text-sm text-ink-60">No upcoming flex bookings.</p>
        ) : (
          <ul className="divide-y divide-clay">
            {bookings.map((b) => (
              <li
                key={b.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  {b.event_title && (
                    <div className="text-sm font-semibold text-ink">
                      {b.event_title}
                    </div>
                  )}
                  <div className="text-sm text-ink">
                    {formatLocal(b.start_time)} – {formatLocal(b.end_time)}
                  </div>
                  <div className="text-xs text-ink-60">
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
