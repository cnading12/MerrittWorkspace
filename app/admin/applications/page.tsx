"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { MemberApplication } from '@/lib/portal/types';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  // start_date / trial_date are stored as DATE; format as a calendar day in
  // local time without letting toLocaleDateString shift across timezones.
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return value;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

// Trial info is mirrored into `payload` so we can display it even on
// databases where the trial-day migration hasn't been applied yet.
function readTrialFlag(a: MemberApplication): boolean {
  if (typeof a.wants_trial_day === 'boolean') return a.wants_trial_day;
  const fromPayload = (a.payload as { wants_trial_day?: unknown } | null)?.wants_trial_day;
  return !!fromPayload;
}

function readTrialDate(a: MemberApplication): string | null {
  if (a.trial_date) return a.trial_date;
  const fromPayload = (a.payload as { trial_date?: unknown } | null)?.trial_date;
  return typeof fromPayload === 'string' ? fromPayload : null;
}

function byStartDateAsc(a: MemberApplication, b: MemberApplication) {
  const aDate = a.start_date || '9999-12-31';
  const bDate = b.start_date || '9999-12-31';
  return aDate.localeCompare(bDate);
}

function byTrialDateAsc(a: MemberApplication, b: MemberApplication) {
  const aDate = readTrialDate(a) || '9999-12-31';
  const bDate = readTrialDate(b) || '9999-12-31';
  return aDate.localeCompare(bDate);
}

interface CardProps {
  app: MemberApplication;
  onDecide: (id: string, action: 'approve' | 'decline') => void;
}

function TrialCard({ app, onDecide }: CardProps) {
  return (
    <div className="bg-orange-50 border-2 border-orange-500 border-l-8 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-extrabold tracking-wider bg-orange-600 text-white">
              TRIAL DAY APPLICANT
            </span>
            <span className="text-xs text-orange-800">
              Trial info already emailed to applicant
            </span>
          </div>
          <div className="font-semibold text-gray-900 text-lg">
            {app.first_name} {app.last_name}
          </div>
          <div className="text-sm text-gray-700">{app.email} · {app.phone}</div>
          <div className="text-sm text-gray-700">
            {app.company_name && `${app.company_name} · `}
            {app.membership_type}
          </div>

          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <div className="bg-white border border-orange-200 rounded p-2.5">
              <div className="text-xs uppercase tracking-wide text-orange-700 font-semibold">
                Trial Day
              </div>
              <div className="text-base font-bold text-orange-700">
                {formatDate(readTrialDate(app))}
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded p-2.5">
              <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
                Preferred Start
              </div>
              <div className="text-base font-bold text-gray-900">
                {formatDate(app.start_date)}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-2">
            Submitted {new Date(app.created_at).toLocaleString()}
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => onDecide(app.id, 'approve')}
            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
          >
            Approve
          </button>
          <button
            onClick={() => onDecide(app.id, 'decline')}
            className="border border-red-600 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-50"
          >
            Decline
          </button>
        </div>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-gray-600">Full submission</summary>
        <pre className="mt-2 bg-white border border-orange-200 p-3 rounded text-xs overflow-auto">
          {JSON.stringify(app.payload, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function StandardCard({ app, onDecide }: CardProps) {
  return (
    <div className="bg-white border rounded p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900">
            {app.first_name} {app.last_name}
          </div>
          <div className="text-sm text-gray-600">{app.email} · {app.phone}</div>
          <div className="text-sm text-gray-600">
            {app.company_name && `${app.company_name} · `}
            {app.membership_type}
          </div>

          <div className="mt-3">
            <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
              Preferred Start
            </div>
            <div className="text-base font-bold text-gray-900">
              {formatDate(app.start_date)}
            </div>
          </div>

          <div className="text-xs text-gray-400 mt-2">
            Submitted {new Date(app.created_at).toLocaleString()}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => onDecide(app.id, 'approve')}
            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
          >
            Approve
          </button>
          <button
            onClick={() => onDecide(app.id, 'decline')}
            className="border border-red-600 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-50"
          >
            Decline
          </button>
        </div>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-gray-500">Full submission</summary>
        <pre className="mt-2 bg-gray-50 p-3 rounded text-xs overflow-auto">
          {JSON.stringify(app.payload, null, 2)}
        </pre>
      </details>
    </div>
  );
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

  // Trial-day applicants get their own pinned section (sorted by upcoming
  // trial date, soonest first). Standard applicants are sorted by their
  // preferred membership start date so admins know who to chase.
  const { trialApps, standardApps } = useMemo(() => {
    const trial: MemberApplication[] = [];
    const standard: MemberApplication[] = [];
    for (const a of apps) {
      if (readTrialFlag(a)) trial.push(a);
      else standard.push(a);
    }
    trial.sort(byTrialDateAsc);
    standard.sort(byStartDateAsc);
    return { trialApps: trial, standardApps: standard };
  }, [apps]);

  if (loading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pending applications</h1>
        {apps.length > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-semibold text-orange-700">{trialApps.length} trial day</span>
            {' · '}
            <span>{standardApps.length} standard</span>
          </p>
        )}
      </div>

      {apps.length === 0 && <p className="text-gray-500">No pending applications.</p>}

      {trialApps.length > 0 && (
        <section>
          <div className="bg-orange-600 text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between">
            <h2 className="font-bold text-base tracking-wide">
              🟧 TRIAL DAY APPLICANTS · {trialApps.length}
            </h2>
            <span className="text-xs opacity-90">
              Sorted by upcoming trial date · trial info already emailed
            </span>
          </div>
          <div className="bg-orange-100/40 border-2 border-t-0 border-orange-600 rounded-b-lg p-3 space-y-3">
            {trialApps.map((a) => (
              <TrialCard key={a.id} app={a} onDecide={decide} />
            ))}
          </div>
        </section>
      )}

      {standardApps.length > 0 && (
        <section>
          <div className="bg-gray-700 text-white px-4 py-2.5 rounded-t-lg flex items-center justify-between">
            <h2 className="font-bold text-base tracking-wide">
              STANDARD APPLICANTS · {standardApps.length}
            </h2>
            <span className="text-xs opacity-90">
              Sorted by preferred start date
            </span>
          </div>
          <div className="bg-gray-50 border-2 border-t-0 border-gray-700 rounded-b-lg p-3 space-y-3">
            {standardApps.map((a) => (
              <StandardCard key={a.id} app={a} onDecide={decide} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
