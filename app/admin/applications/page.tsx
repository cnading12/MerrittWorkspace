"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { MemberApplication } from '@/lib/portal/types';
import { readTrialFlag, readTrialDate } from '@/lib/portal/trial';
import { isTrialApplication } from '@/lib/portal/trialApplication';

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

// What a short-form trial applicant asked to try. Read off membership_type,
// which the trial route sets from their answer — they selected no plan and
// owe nothing, so this is an intent, not a designation.
function trialSeatingLabel(app: MemberApplication): string {
  if (app.membership_type === 'cafe_membership') return 'Café';
  if (app.membership_type?.startsWith('private_office')) return 'Private office';
  return 'Dedicated desk';
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
  onView: (id: string) => void;
}

interface TrialCardProps extends CardProps {
  // Short-form trial applications (application_kind = 'trial') carry no plan,
  // no references and no emergency contact, so there is nothing to approve —
  // the API refuses it. They convert by completing the full application,
  // which is what `onSendApplication` invites them to do.
  //
  // Legacy rows — full applications submitted before the split, which ticked
  // the old "this is a trial day application" radio — do have all of that,
  // so they keep Approve.
  shortForm: boolean;
  onSendApplication: (id: string) => void;
  sending: boolean;
}

function TrialCard({ app, onDecide, onView, shortForm, onSendApplication, sending }: TrialCardProps) {
  return (
    <div className="bg-orange-50 border-2 border-orange-500 border-l-8 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-extrabold tracking-wider bg-orange-600 text-white">
              TRIAL DAY APPLICANT
            </span>
            <span className="text-xs text-orange-800">
              {shortForm
                ? 'Trial info emailed · photo ID on file · nothing to approve'
                : 'Trial info already emailed to applicant'}
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
                {shortForm ? 'Wants to try' : 'Preferred Start'}
              </div>
              <div className="text-base font-bold text-gray-900">
                {shortForm ? trialSeatingLabel(app) : formatDate(app.start_date)}
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 mt-2">
            Submitted {new Date(app.created_at).toLocaleString()}
          </div>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => onView(app.id)}
            className="bg-gray-900 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-800"
          >
            View application
          </button>
          {shortForm ? (
            <button
              onClick={() => onSendApplication(app.id)}
              disabled={sending}
              className="bg-orange-600 text-white px-3 py-1.5 rounded text-sm hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Emails them a membership application prefilled with what they gave us for the trial day"
            >
              {sending ? 'Sending…' : 'Send membership application'}
            </button>
          ) : (
            <button
              onClick={() => onDecide(app.id, 'approve')}
              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
            >
              Approve
            </button>
          )}
          <button
            onClick={() => onDecide(app.id, 'decline')}
            className="border border-red-600 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-50"
          >
            {shortForm ? 'Dismiss' : 'Decline'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StandardCard({ app, onDecide, onView }: CardProps) {
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
        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <button
            onClick={() => onView(app.id)}
            className="bg-gray-900 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-800"
          >
            View application
          </button>
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
    </div>
  );
}

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [apps, setApps] = useState<MemberApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

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

  async function viewApplication(id: string) {
    if (!token) return;
    // Open the popup synchronously inside the click gesture so the browser
    // doesn't block it — window.open() after an await loses user activation.
    const win = window.open('', '_blank');
    if (!win) {
      alert(
        'Your browser blocked the popup. Please allow popups for this site, then try again.'
      );
      return;
    }
    win.document.write(loadingHtml());
    try {
      const res = await fetch(`/api/admin/applications/${id}/view`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        writeError(win, err.error || 'Failed to load application');
        return;
      }
      const html = await res.text();
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (e: any) {
      writeError(win, e.message || 'Failed to open application');
    }
  }

  // Email a trial applicant a membership application prefilled from their
  // trial day. The row stays in the list — they have not applied yet, and
  // staff may well want to send it again.
  async function sendMembershipApplication(id: string) {
    if (!token) return;
    setSendingId(id);
    try {
      const res = await fetch(`/api/admin/applications/${id}/send-membership-application`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Failed to send the membership application');
        return;
      }
      alert(`Membership application sent to ${data.sent_to}.`);
    } finally {
      setSendingId(null);
    }
  }

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
              Sorted by upcoming trial date · these are visits, not decisions
            </span>
          </div>
          <div className="bg-orange-100/40 border-2 border-t-0 border-orange-600 rounded-b-lg p-3 space-y-3">
            {trialApps.map((a) => (
              <TrialCard
                key={a.id}
                app={a}
                shortForm={isTrialApplication(a)}
                onDecide={decide}
                onView={viewApplication}
                onSendApplication={sendMembershipApplication}
                sending={sendingId === a.id}
              />
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
              <StandardCard key={a.id} app={a} onDecide={decide} onView={viewApplication} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function loadingHtml(): string {
  return `<!doctype html><html><head><title>Loading application…</title>
<style>body{font-family:ui-sans-serif,system-ui,sans-serif;color:#6b7280;padding:32px;background:#f9fafb}</style>
</head><body><p>Loading application…</p></body></html>`;
}

function writeError(win: Window, message: string) {
  try {
    win.document.open();
    win.document.write(
      `<!doctype html><html><head><title>Error</title>
<style>body{font-family:ui-sans-serif,system-ui,sans-serif;color:#991b1b;padding:32px;background:#fef2f2}</style>
</head><body><p><strong>Error:</strong> ${escapeHtml(message)}</p></body></html>`
    );
    win.document.close();
  } catch {
    // Popup may have been closed before the error came back — ignore.
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
