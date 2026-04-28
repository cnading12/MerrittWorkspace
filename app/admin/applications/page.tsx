"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { MemberApplication } from '@/lib/portal/types';

function formatDate(value: string | null): string {
  if (!value) return '—';
  // start_date / trial_date are stored as DATE; format as a calendar day in
  // local time without letting toLocaleDateString shift across timezones.
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [apps, setApps] = useState<MemberApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin');
        return;
      }
      setToken(session.access_token);
      const res = await fetch('/api/admin/applications', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        router.replace('/admin');
        return;
      }
      const data = await res.json();
      setApps(data.applications);
      setLoading(false);
    })();
  }, [router]);

  async function decide(id: string, action: 'approve' | 'decline') {
    if (!token) return;
    const res = await fetch(`/api/admin/applications/${id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Failed');
      return;
    }
    setApps((prev) => prev.filter((a) => a.id !== id));
  }

  // Sort trial-day applicants first, then by preferred start date ascending
  // (soonest first) so admins know who to chase about finishing.
  const sortedApps = useMemo(() => {
    return [...apps].sort((a, b) => {
      if (a.wants_trial_day !== b.wants_trial_day) {
        return a.wants_trial_day ? -1 : 1;
      }
      const aDate = a.start_date || '9999-12-31';
      const bDate = b.start_date || '9999-12-31';
      return aDate.localeCompare(bDate);
    });
  }, [apps]);

  const trialCount = apps.filter((a) => a.wants_trial_day).length;
  const regularCount = apps.length - trialCount;

  if (loading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Pending applications</h1>
        {apps.length > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium text-orange-700">{trialCount} trial day</span>
            {' · '}
            <span>{regularCount} standard</span>
            {' · sorted by preferred start date'}
          </p>
        )}
      </div>

      {apps.length === 0 && <p className="text-gray-500">No pending applications.</p>}

      <div className="space-y-3">
        {sortedApps.map((a) => (
          <div
            key={a.id}
            className={`bg-white border rounded p-4 ${
              a.wants_trial_day ? 'border-orange-400 border-2 shadow-sm' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold text-gray-900">
                    {a.first_name} {a.last_name}
                  </div>
                  {a.wants_trial_day && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-orange-600 text-white">
                      TRIAL DAY
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-600">{a.email} · {a.phone}</div>
                <div className="text-sm text-gray-600">
                  {a.company_name && `${a.company_name} · `}
                  {a.membership_type}
                </div>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Preferred Start
                    </div>
                    <div className="text-base font-semibold text-gray-900">
                      {formatDate(a.start_date)}
                    </div>
                  </div>
                  {a.wants_trial_day && (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-orange-700">
                        Trial Day
                      </div>
                      <div className="text-base font-semibold text-orange-700">
                        {formatDate(a.trial_date)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-xs text-gray-400 mt-2">
                  Submitted {new Date(a.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => decide(a.id, 'approve')}
                  className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => decide(a.id, 'decline')}
                  className="border border-red-600 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-50"
                >
                  Decline
                </button>
              </div>
            </div>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-gray-500">Full submission</summary>
              <pre className="mt-2 bg-gray-50 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(a.payload, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
