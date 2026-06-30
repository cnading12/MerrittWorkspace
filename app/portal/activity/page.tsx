"use client";

// Member portal "My Activity": conference included-hours remaining plus the
// member's conference-room bookings and snack purchases from the last 30 days.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, ShoppingBag, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SnackOrder {
  id: string;
  order_number: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  total_cents: number;
  payment_method: string;
  status: string;
  created_at: string;
  office_number: string | null;
}

interface ConferenceBooking {
  id: string;
  booking_ref: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  included_hours: number;
  billed_hours: number;
  total_cents: number;
  payment_status: string;
  status: string;
  created_at: string;
}

interface HoursSummary {
  included: number;
  used: number;
  remaining: number;
  hourly_rate: number;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function fmtDate(value: string) {
  // booking_date is a plain YYYY-MM-DD; treat as a calendar date.
  const [y, m, d] = value.split('-').map(Number);
  if (y && m && d) {
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function fmtTime(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function ActivityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackOrders, setSnackOrders] = useState<SnackOrder[]>([]);
  const [bookings, setBookings] = useState<ConferenceBooking[]>([]);
  const [hours, setHours] = useState<HoursSummary | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/portal/login');
        return;
      }
      try {
        const res = await fetch('/api/portal/activity', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load your activity');
        }
        const data = await res.json();
        setSnackOrders(data.snack_orders || []);
        setBookings(data.conference_bookings || []);
        setHours(data.hours || null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-burnt-orange-600 mx-auto mb-3" />
        <p className="text-gray-600">Loading your activity…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Activity</h1>
        <p className="text-gray-500 text-sm mt-1">Your conference bookings and snack purchases from the last 30 days.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {/* Conference hours summary */}
      {hours && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-burnt-orange-600" />
            <h2 className="font-semibold text-gray-900">Conference room hours this month</h2>
          </div>
          {hours.included > 0 ? (
            <>
              <p className="text-gray-700">
                <span className="text-2xl font-bold text-gray-900">{hours.remaining}</span>
                <span className="text-gray-500"> of {hours.included} included hours left</span>
              </p>
              <div className="mt-3 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-burnt-orange-500"
                  style={{ width: `${Math.min(100, (hours.used / hours.included) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Used {hours.used} hr{hours.used === 1 ? '' : 's'}. Extra time is billed at ${hours.hourly_rate}/hr. Resets the 1st of each month.
              </p>
            </>
          ) : (
            <p className="text-gray-600 text-sm">
              Your membership doesn&apos;t include free conference hours — bookings are billed at ${hours.hourly_rate}/hr.
            </p>
          )}
        </div>
      )}

      {/* Conference bookings */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CalendarClock className="w-5 h-5 text-gray-700" />
          <h2 className="font-semibold text-gray-900">Conference room bookings</h2>
        </div>
        {bookings.length === 0 ? (
          <p className="text-gray-500 text-sm bg-white border border-gray-200 rounded-xl p-5">
            No conference room bookings in the last 30 days.
          </p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {bookings.map((b) => (
              <div key={b.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900">
                    {fmtDate(b.booking_date)} · {fmtTime(b.start_time)}–{fmtTime(b.end_time)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {b.duration_hours} hr{Number(b.duration_hours) === 1 ? '' : 's'}
                    {Number(b.included_hours) > 0 && ` · ${b.included_hours} included`}
                    {Number(b.billed_hours) > 0 && ` · ${b.billed_hours} billed`}
                    {b.status === 'cancelled' && ' · cancelled'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {b.total_cents > 0 ? money(b.total_cents) : 'Free'}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{b.payment_status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Snack purchases */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag className="w-5 h-5 text-gray-700" />
          <h2 className="font-semibold text-gray-900">Snack shop purchases</h2>
        </div>
        {snackOrders.length === 0 ? (
          <p className="text-gray-500 text-sm bg-white border border-gray-200 rounded-xl p-5">
            No snack shop purchases in the last 30 days.
          </p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
            {snackOrders.map((o) => (
              <div key={o.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{fmtDateTime(o.created_at)}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {(o.items || [])
                      .map((it) => (it.quantity > 1 ? `${it.name} ×${it.quantity}` : it.name))
                      .join(', ') || `Order ${o.order_number}`}
                  </p>
                </div>
                <div className="text-right whitespace-nowrap">
                  <p className="font-semibold text-gray-900">{money(o.total_cents)}</p>
                  <p className="text-xs text-gray-500">
                    {o.payment_method === 'saved_card' ? 'Card on file' : 'Card'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
