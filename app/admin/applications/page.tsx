"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { MemberApplication } from '@/lib/portal/types';
import { readTrialDate } from '@/lib/portal/trial';
import { isTrialApplication, trialPhotoIdMissing } from '@/lib/portal/trialApplication';

// Two tabs, not one list with a band on top.
//
// A trial day and a membership application are two different jobs — someone
// arriving on Thursday versus a decision to make — and they were sharing a
// screen, a query and a `status = 'pending'` filter. Splitting them means a
// visit can never be hidden by anything happening to the approve/decline
// queue, and each tab gets an empty state that says why it is empty.

type Tab = 'trial' | 'standard';

interface Diagnostics {
  trialRowsFound: number;
  trialRowsHandled: number;
  trialShown: number;
  standardShown: number;
  readVia: string;
  includeHandled: boolean;
  warnings: string[];
}

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
  // The visit still stands when the ID did not save — it is checked at the
  // door instead — but staff have to know that before the person arrives.
  const idMissing = trialPhotoIdMissing(app);
  const handled = app.status === 'approved' || app.status === 'declined';
  return (
    <div className={`bg-orange-50 border-2 border-orange-500 border-l-8 rounded-lg p-4 shadow-sm ${handled ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-extrabold tracking-wider bg-orange-600 text-white">
              TRIAL DAY APPLICANT
            </span>
            {handled && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-gray-200 text-gray-700">
                {app.status === 'declined' ? 'DISMISSED' : 'APPROVED'}
              </span>
            )}
            <span className="text-xs text-orange-800">
              {shortForm
                ? `Trial info emailed · ${idMissing ? 'no photo ID on file' : 'photo ID on file'} · nothing to approve`
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

          {idMissing && (
            <div className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              <span className="font-semibold">Photo ID did not save.</span> Check their
              government-issued ID when they arrive.
            </div>
          )}

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
          {!handled && (
            <button
              onClick={() => onDecide(app.id, 'decline')}
              className="border border-red-600 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-50"
            >
              {shortForm ? 'Dismiss' : 'Decline'}
            </button>
          )}
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
  const [trialApps, setTrialApps] = useState<MemberApplication[]>([]);
  const [standardApps, setStandardApps] = useState<MemberApplication[]>([]);
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('trial');
  const [showHandled, setShowHandled] = useState(false);

  const load = useCallback(
    async (accessToken: string, includeHandled: boolean) => {
      setError(null);
      // `t` is a cache-buster on top of `cache: 'no-store'` and the
      // `Cache-Control: no-store` this route sends. A stale queue once hid
      // newly submitted trial days for hours; a unique URL cannot be served
      // from any cache at all.
      const params = new URLSearchParams({ t: String(Date.now()) });
      if (includeHandled) params.set('include', 'all');
      const res = await fetch(`/api/admin/applications?${params}`, {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 401 || res.status === 403) {
        router.replace('/admin');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Anything other than "you are not an admin" is shown here rather
        // than bounced to the sign-in page. A failing query that looks like
        // a logout is how a broken queue stays broken quietly.
        setError(data.error || `The applications queue failed to load (HTTP ${res.status}).`);
        setLoading(false);
        return;
      }
      setTrialApps(data.trial || []);
      setStandardApps(data.standard || []);
      setDiagnostics(data.diagnostics || null);
      setLoading(false);
    },
    [router]
  );

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin');
        return;
      }
      setToken(session.access_token);
      await load(session.access_token, showHandled);
    })();
    // `showHandled` is applied by its own toggle handler below, so this runs
    // once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, load]);

  async function refresh(includeHandled = showHandled) {
    if (!token) return;
    setLoading(true);
    await load(token, includeHandled);
  }

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
    setTrialApps((prev) => prev.filter((a) => a.id !== id));
    setStandardApps((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Applications</h1>
          <p className="text-sm text-gray-600 mt-1">
            Trial days are visits to expect. Membership applications are decisions to make.
          </p>
        </div>
        <button
          onClick={() => refresh()}
          className="text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded border-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="font-semibold">The queue did not load.</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      {diagnostics?.warnings?.map((w) => (
        <div
          key={w}
          className="rounded border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <span className="font-semibold">Database migration missing.</span> {w}
        </div>
      ))}

      <div className="flex gap-1 border-b border-gray-200" role="tablist">
        <TabButton
          active={tab === 'trial'}
          onClick={() => setTab('trial')}
          activeClass="border-orange-600 text-orange-700"
        >
          🟧 Trial days
          <Count value={trialApps.length} active={tab === 'trial'} tone="orange" />
        </TabButton>
        <TabButton
          active={tab === 'standard'}
          onClick={() => setTab('standard')}
          activeClass="border-gray-800 text-gray-900"
        >
          Membership applications
          <Count value={standardApps.length} active={tab === 'standard'} tone="gray" />
        </TabButton>
      </div>

      {tab === 'trial' && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-gray-600">
              Sorted by upcoming trial date. These are visits, not decisions — there is
              nothing to approve.
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={showHandled}
                onChange={(e) => {
                  setShowHandled(e.target.checked);
                  refresh(e.target.checked);
                }}
              />
              Show dismissed
            </label>
          </div>

          {trialApps.length === 0 ? (
            <EmptyTrial diagnostics={diagnostics} showHandled={showHandled} />
          ) : (
            trialApps.map((a) => (
              <TrialCard
                key={a.id}
                app={a}
                shortForm={isTrialApplication(a)}
                onDecide={decide}
                onView={viewApplication}
                onSendApplication={sendMembershipApplication}
                sending={sendingId === a.id}
              />
            ))
          )}
        </section>
      )}

      {tab === 'standard' && (
        <section className="space-y-3">
          <p className="text-sm text-gray-600">
            Pending membership applications, sorted by preferred start date.
          </p>
          {standardApps.length === 0 ? (
            <p className="text-gray-500">No membership applications are awaiting a decision.</p>
          ) : (
            standardApps.map((a) => (
              <StandardCard key={a.id} app={a} onDecide={decide} onView={viewApplication} />
            ))
          )}
        </section>
      )}

      {diagnostics && (
        <p className="text-xs text-gray-400 border-t pt-3">
          {diagnostics.trialRowsFound} trial row(s) in the database
          {diagnostics.trialRowsHandled > 0 && `, ${diagnostics.trialRowsHandled} already handled`}
          {' · '}read via {diagnostics.readVia}
          {' · '}loaded {new Date().toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}

// An empty trial queue has three different meanings and staff cannot tell
// them apart from the word "none". Say which one it is.
function EmptyTrial({
  diagnostics,
  showHandled,
}: {
  diagnostics: Diagnostics | null;
  showHandled: boolean;
}) {
  if (diagnostics && diagnostics.trialRowsFound > 0 && !showHandled) {
    return (
      <p className="text-gray-500">
        No trial days waiting. {diagnostics.trialRowsFound} have been submitted and all of
        them are dismissed or approved — tick “Show dismissed” to see them.
      </p>
    );
  }
  return (
    <p className="text-gray-500">
      No trial day applications have been submitted. Anything sent through the trial form
      appears here immediately, whatever happens to its photo ID.
    </p>
  );
}

function TabButton({
  active,
  onClick,
  activeClass,
  children,
}: {
  active: boolean;
  onClick: () => void;
  activeClass: string;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
        active ? activeClass : 'border-transparent text-gray-500 hover:text-gray-800'
      }`}
    >
      {children}
    </button>
  );
}

function Count({ value, active, tone }: { value: number; active: boolean; tone: 'orange' | 'gray' }) {
  const on = tone === 'orange' ? 'bg-orange-600 text-white' : 'bg-gray-800 text-white';
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-xs font-bold ${
        active || value > 0 ? on : 'bg-gray-200 text-gray-600'
      }`}
    >
      {value}
    </span>
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
