"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { MemberApplication } from '@/lib/portal/types';
import { readTrialDate } from '@/lib/portal/trial';
import {
  isTrialApplication,
  readConvertedApplicationId,
  readTrialOrigin,
  trialPhotoIdMissing,
} from '@/lib/portal/trialApplication';
import { isHandled, isDismissedInPayload } from '@/lib/portal/applicationQueue';

// Two tabs, not one list with a band on top.
//
// A trial day and a membership application are two different jobs — someone
// arriving on Thursday versus a decision to make — and they were sharing a
// screen, a query and a `status = 'pending'` filter. Splitting them means a
// visit can never be hidden by anything happening to the approve/decline
// queue, and each tab gets an empty state that says why it is empty.

type Tab = 'trial' | 'standard';

interface DiagnosticRow {
  id: string;
  created_at: string | null;
  status: string | null;
  kind: 'trial' | 'membership';
  dismissed_marker: boolean;
  shown_in: string;
}

interface Diagnostics {
  trialRowsFound: number;
  trialRowsHandled: number;
  trialShown: number;
  standardShown: number;
  // Added alongside the standard-queue fix; absent from an older API bundle,
  // so everything reading them tolerates undefined.
  membershipRowsFound?: number;
  membershipRowsHandled?: number;
  windowSize?: number;
  statusCounts?: Record<string, number>;
  recentRows?: DiagnosticRow[];
  hiddenRowsFound?: number;
  recentRowLimit?: number;
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

type Decision = 'approve' | 'decline' | 'restore';

interface CardProps {
  app: MemberApplication;
  onDecide: (id: string, action: Decision) => void;
  onView: (id: string) => void;
  // True while this row's decision is in flight. Every button on the card is
  // disabled until the server has confirmed the write, so a second click
  // cannot fire against a row that is already changing.
  busy?: boolean;
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

function TrialCard({ app, onDecide, onView, shortForm, onSendApplication, sending, busy }: TrialCardProps) {
  // The visit still stands when the ID did not save — it is checked at the
  // door instead — but staff have to know that before the person arrives.
  const idMissing = trialPhotoIdMissing(app);
  // Same definition the queue uses: the status column, or the payload
  // marker the Dismiss button writes alongside it.
  const handled = isHandled(app);
  // Dismissed can mean either of those two writes landed, so the badge is
  // read the same way rather than off `status` alone — a payload-only
  // dismissal would otherwise be labelled APPROVED.
  const dismissed = app.status === 'declined' || isDismissedInPayload(app);
  // They have already come back and filled in the full application. Without
  // this the card looks exactly as it did the day they visited — still
  // offering "Send membership application" — while the application they
  // actually submitted sits one tab over. That is how a submitted
  // application reads as a lost one.
  const converted = !!readConvertedApplicationId(app);
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
                {dismissed ? 'DISMISSED' : 'APPROVED'}
              </span>
            )}
            {converted && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold bg-green-600 text-white">
                APPLIED FOR MEMBERSHIP
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

          {converted && (
            <div className="mt-3 rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900">
              <span className="font-semibold">They have completed a membership application.</span>{' '}
              It is waiting for a decision under <strong>Membership applications</strong> — there is
              nothing left to do on this card.
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
            // Not offered once they have converted: the API refuses it
            // anyway, and a button that invites staff to chase someone who
            // has already applied is the confusion itself.
            !converted && (
              <button
                onClick={() => onSendApplication(app.id)}
                disabled={sending || busy}
                className="bg-orange-600 text-white px-3 py-1.5 rounded text-sm hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Emails them a membership application prefilled with what they gave us for the trial day"
              >
                {sending ? 'Sending…' : 'Send membership application'}
              </button>
            )
          ) : (
            <button
              onClick={() => onDecide(app.id, 'approve')}
              disabled={busy}
              className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Approve
            </button>
          )}
          {handled ? (
            // Dismiss sits one click away from View, and a visit dismissed by
            // a misclick is the exact thing this screen exists to stop losing.
            <button
              onClick={() => onDecide(app.id, 'restore')}
              disabled={busy}
              className="border border-gray-500 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Restoring…' : 'Restore'}
            </button>
          ) : (
            <button
              onClick={() => onDecide(app.id, 'decline')}
              disabled={busy}
              className="border border-red-600 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? 'Saving…' : shortForm ? 'Dismiss' : 'Decline'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StandardCard({ app, onDecide, onView, busy }: CardProps) {
  // The other half of the trial card's badge: this application grew out of a
  // trial day, and saying so here is what stops staff hunting for it in the
  // trial tab, where it deliberately is not.
  const trialOrigin = readTrialOrigin(app);
  return (
    <div className="bg-white border rounded p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900">
            {app.first_name} {app.last_name}
          </div>
          {trialOrigin && (
            <div className="mt-1 inline-flex items-center gap-1.5 rounded bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-800">
              Came in from a trial day
              {trialOrigin.trial_date ? ` on ${formatDate(trialOrigin.trial_date)}` : ''}
            </div>
          )}
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
            disabled={busy}
            className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Approve
          </button>
          <button
            onClick={() => onDecide(app.id, 'decline')}
            disabled={busy}
            className="border border-red-600 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Saving…' : 'Decline'}
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
  const [decidingId, setDecidingId] = useState<string | null>(null);
  // Why the last decision did not go through, shown on the page rather than
  // in an alert(). Browsers suppress alerts in some contexts (and always
  // after a few in a row), which turns a reported failure into a button that
  // appears to do nothing at all — the worst possible symptom to debug.
  const [decisionError, setDecisionError] = useState<string | null>(null);
  // What the last decision actually did. Shown on success as well as
  // failure: a button whose effect is invisible is indistinguishable from a
  // button that does nothing, which is exactly how this one was reported.
  const [decisionNote, setDecisionNote] = useState<string | null>(null);
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
        return null;
      }
      const trial: MemberApplication[] = data.trial || [];
      const standard: MemberApplication[] = data.standard || [];
      setTrialApps(trial);
      setStandardApps(standard);
      setDiagnostics(data.diagnostics || null);
      setLoading(false);
      // Returned as well as set: a caller that has just changed a row needs
      // the fresh lists NOW (React state lands on the next render, after the
      // caller's closure is done with them) — see the duplicate check in
      // decide().
      return { trial, standard };
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
        setDecisionError(data.error || 'Failed to send the membership application.');
        return;
      }
      setDecisionError(null);
      alert(`Membership application sent to ${data.sent_to}.`);
    } finally {
      setSendingId(null);
    }
  }

  // Approve, dismiss/decline, or restore.
  //
  // The result is read back from the server rather than assumed. Dropping
  // the card on a 200 and moving on is how "Dismiss" appeared to work while
  // the row was never written: the queue is re-read here so what is on
  // screen after the click is what the database actually holds, counts and
  // diagnostics included.
  async function decide(id: string, action: Decision) {
    if (!token || decidingId) return;
    // Who this card is, held on to before anything changes: the banner
    // names the person whose card just left, and the duplicate check below
    // needs their email after the lists have been replaced.
    const target = [...trialApps, ...standardApps].find((a) => a.id === id) || null;
    setDecidingId(id);
    setDecisionError(null);
    setDecisionNote(null);
    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });
      const raw = await res.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        // A non-JSON body means something upstream of the route answered —
        // a platform error page, a redirect to sign-in. Show it rather than
        // discarding it, truncated so a whole HTML page cannot fill the
        // screen.
        data = { error: `The server did not return JSON (HTTP ${res.status}): ${raw.slice(0, 200)}` };
      }
      if (!res.ok) {
        setDecisionError(
          data.error ||
            `That did not save (HTTP ${res.status}). The application has been left as it was.`
        );
        // Put the screen back in step with the database; the row is still
        // there, and pretending otherwise is what caused this.
        await load(token, showHandled);
        return;
      }
      const fresh = await load(token, showHandled);
      // The same person can be in the queue more than once — four test
      // submissions of the trial form are four rows, and four cards that
      // look identical apart from the "Submitted" line. Dismissing one of
      // them works, and then a twin card is still on screen, which reads
      // as the dismissal not working at all. So the banner counts the
      // twins and says so, instead of leaving "Dismissed" next to what
      // looks like the same card.
      const remainingSameEmail =
        target && fresh
          ? [...fresh.trial, ...fresh.standard].filter(
              (a) =>
                a.id !== id &&
                a.email &&
                target.email &&
                a.email.toLowerCase() === target.email.toLowerCase()
            ).length
          : 0;
      setDecisionNote(describeDecision(action, data, showHandled, target, remainingSameEmail));
    } catch (e: any) {
      // A throw here is the network, not the route: fetch rejecting, or the
      // reload after it failing. Silence would look like a dead button.
      setDecisionError(
        `The request never completed: ${e?.message || 'unknown error'}. Nothing was changed.`
      );
    } finally {
      setDecidingId(null);
    }
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

      {decisionNote && !decisionError && (
        <div className="rounded border border-green-500 bg-green-50 px-4 py-3 text-sm text-green-900">
          <div className="flex items-start justify-between gap-4">
            <div>{decisionNote}</div>
            <button
              onClick={() => setDecisionNote(null)}
              className="text-green-800 hover:text-green-950 font-semibold"
              aria-label="Dismiss this message"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {decisionError && (
        <div className="rounded border-2 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold">That did not save.</div>
              <div className="mt-1">{decisionError}</div>
              <div className="mt-1 text-red-700">
                The application is unchanged and still in the queue below.
              </div>
            </div>
            <button
              onClick={() => setDecisionError(null)}
              className="text-red-700 hover:text-red-900 font-semibold"
              aria-label="Dismiss this message"
            >
              ×
            </button>
          </div>
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
                busy={decidingId === a.id}
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
            <EmptyStandard diagnostics={diagnostics} />
          ) : (
            standardApps.map((a) => (
              <StandardCard
                key={a.id}
                app={a}
                onDecide={decide}
                onView={viewApplication}
                busy={decidingId === a.id}
              />
            ))
          )}
        </section>
      )}

      {diagnostics && <DiagnosticsPanel diagnostics={diagnostics} />}
    </div>
  );
}

// Say what the decision actually wrote — and what the screen will do about
// it, which is the part a plain "Dismissed." kept leaving out. With "Show
// dismissed" ticked a dismissed card deliberately STAYS on screen (greyed
// out, with a Restore button), and a banner that says "Dismissed" over a
// card that is still visible reads as the button not working.
//
// The dismissal goes in as two independent writes — a `payload.dismissed_at`
// marker and the `status` column — and counts if either lands; the server
// then reads the row back and only reports success when the queue will
// actually treat it as handled.
function describeDecision(
  action: Decision,
  data: any,
  showHandled: boolean,
  target: MemberApplication | null,
  remainingSameEmail: number
): string {
  if (action === 'approve') {
    // The server reads the application row back after marking it approved.
    // If that mark failed, the member exists and was emailed but the card
    // will NOT leave this queue — without saying so, that reads as the
    // Approve button doing nothing, and invites a second approval.
    if (data?.application_marked === false) {
      return (
        data?.warning ||
        'The member was created and invited, but the application row could not be marked approved — its card will stay in the queue. Do not approve it again.'
      );
    }
    return 'Approved. The applicant has been emailed their portal invitation and now appears on the Members page.';
  }
  // Name the exact card, "Submitted" line included, so "Dismissed" can be
  // checked against the screen instead of taken on faith.
  const who = target
    ? `${target.first_name} ${target.last_name}’s card` +
      (target.created_at ? ` (submitted ${new Date(target.created_at).toLocaleString()})` : '')
    : 'The card';
  let msg: string;
  if (action === 'restore') {
    msg = `Restored — ${who} is back in the queue.`;
  } else if (showHandled) {
    msg =
      `Dismissed. Because “Show dismissed” is ticked, ${who} stays in the list — greyed out, ` +
      'with a DISMISSED badge and a Restore button. Untick “Show dismissed” to hide it.';
  } else {
    msg = `Dismissed — ${who} has left the queue.`;
  }
  if (action === 'decline' && remainingSameEmail > 0 && target) {
    msg +=
      ` Heads up: ${remainingSameEmail} other card(s) for ${target.email} are still in the ` +
      'queue. Each one is a separate submission — check its “Submitted” time — and is ' +
      'dismissed on its own.';
  }
  if (data?.status_written === false && data?.payload_written) {
    msg += ' (The status column would not take the change — worth reporting; the dismissal still counts.)';
  }
  return msg;
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

// The membership tab's empty state, with the same duty as EmptyTrial: an
// empty list has several different meanings and "none" does not say which.
function EmptyStandard({ diagnostics }: { diagnostics: Diagnostics | null }) {
  const found = diagnostics?.membershipRowsFound ?? 0;
  const handled = diagnostics?.membershipRowsHandled ?? 0;
  if (found > 0 && found === handled) {
    return (
      <p className="text-gray-500">
        No membership applications are awaiting a decision. {found} exist in the database and
        every one has already been approved or declined — the full list is on the{' '}
        <a href="/admin/documents" className="underline">Documents</a> page.
      </p>
    );
  }
  return (
    <p className="text-gray-500">
      No membership applications are awaiting a decision.
      {found === 0 && ' None exist in the database at all — see the diagnostics below.'}
    </p>
  );
}

// The database's own account of the queue, printed under it. When a
// submitted application is "not showing up", this block is the difference
// between guessing and knowing: it lists what the table holds, what each
// row's status is, and which tab (if any) each recent row landed in.
function DiagnosticsPanel({ diagnostics }: { diagnostics: Diagnostics }) {
  const counts = diagnostics.statusCounts
    ? Object.entries(diagnostics.statusCounts)
        .map(([status, n]) => `${status}: ${n}`)
        .join(' · ')
    : null;
  return (
    <details className="text-xs text-gray-500 border-t pt-3">
      <summary className="cursor-pointer select-none text-gray-400 hover:text-gray-600">
        {diagnostics.trialRowsFound} trial row(s)
        {diagnostics.membershipRowsFound !== undefined &&
          ` and ${diagnostics.membershipRowsFound} membership application(s)`}{' '}
        in the database
        {diagnostics.trialRowsHandled > 0 && `, ${diagnostics.trialRowsHandled} trial(s) handled`}
        {(diagnostics.membershipRowsHandled ?? 0) > 0 &&
          `, ${diagnostics.membershipRowsHandled} application(s) decided`}
        {' · '}read via {diagnostics.readVia}
        {' · '}loaded {new Date().toLocaleTimeString()} — click for details
      </summary>
      <div className="mt-2 space-y-1.5">
        {counts && <div>Status counts across the recent window: {counts}</div>}
        {diagnostics.recentRows && diagnostics.recentRows.length > 0 && (
          <div>
            <div className="font-semibold text-gray-600">
              Rows in the database, newest first
              {diagnostics.windowSize !== undefined &&
                diagnostics.recentRows.length < diagnostics.windowSize &&
                ` (showing ${diagnostics.recentRows.length} of ${diagnostics.windowSize}; every hidden row is listed first)`}
              :
            </div>
            <ul className="mt-1 space-y-0.5 font-mono">
              {diagnostics.recentRows.map((r) => (
                <li key={r.id}>
                  {r.created_at ? new Date(r.created_at).toLocaleString() : 'no date'}
                  {' · '}{r.kind}
                  {' · '}status {r.status === null ? 'NULL' : JSON.stringify(r.status)}
                  {r.dismissed_marker ? ' · dismissed marker' : ''}
                  {' → '}{r.shown_in}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          Rows the tabs are not showing are listed first and say why, so a missing application
          should appear above with its reason. If it is not there at all — and the list is not
          truncated — its row never reached the database: check the staff email for a 🚨 NOT SAVED
          subject, and run <span className="font-mono">npm run diagnose:trial</span> for the full
          write-path check.
        </div>
      </div>
    </details>
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
