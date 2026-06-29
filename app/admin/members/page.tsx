"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Member } from '@/lib/portal/types';
import { DESIGNATION_LABELS } from '@/lib/portal/types';
import { shouldShowTrialBadge } from '@/lib/portal/trial';
import SeatingChart from './SeatingChart';
import {
  compareMembersByPriority,
  formatAppliedAgo,
  formatLastPingAgo,
  formatStartDateRelative,
} from '@/lib/portal/memberPriority';

type StatusFilter = 'all' | Member['status'];
type SortMode = 'priority' | 'newest' | 'office' | 'desk';

// Natural compare for assignment labels: leading numeric portion sorted
// numerically, then the rest lexicographically. Empty values sort last.
function compareAssignments(a: string | null | undefined, b: string | null | undefined) {
  const av = (a || '').trim();
  const bv = (b || '').trim();
  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  const am = av.match(/^(\d+)(.*)$/);
  const bm = bv.match(/^(\d+)(.*)$/);
  if (am && bm) {
    const diff = parseInt(am[1], 10) - parseInt(bm[1], 10);
    if (diff !== 0) return diff;
    return am[2].localeCompare(bm[2]);
  }
  return av.localeCompare(bv);
}

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('priority');
  const [pinging, setPinging] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  // When on, the list shows archived (former, once-paying) members so they can
  // be reviewed/restored, instead of the active roster.
  const [viewArchived, setViewArchived] = useState(false);

  async function load(authToken: string, archived: boolean) {
    setLoading(true);
    const res = await fetch(
      `/api/admin/members${archived ? '?archived=only' : ''}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    if (!res.ok) {
      router.replace('/admin');
      return;
    }
    const { members } = await res.json();
    setMembers(members);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin');
        return;
      }
      setToken(session.access_token);
      await load(session.access_token, viewArchived);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, viewArchived]);

  async function archiveMember(m: Member) {
    if (!token) return;
    if (
      !confirm(
        `Archive ${m.first_name} ${m.last_name}?\n\n` +
          'They will be hidden from the member list and will no longer count toward total members. ' +
          'Their desk/office will be freed up for reassignment. ' +
          'All of their information — documents, agreements, and payment history — is kept and can be restored later.'
      )
    )
      return;
    setArchivingId(m.id);
    try {
      const res = await fetch(`/api/admin/members/${m.id}/archive`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to archive member');
        return;
      }
      // Drop it from the current (active) view.
      setMembers((prev) => prev.filter((mm) => mm.id !== m.id));
    } finally {
      setArchivingId(null);
    }
  }

  async function restoreMember(m: Member) {
    if (!token) return;
    if (
      !confirm(
        `Restore ${m.first_name} ${m.last_name} to the member list? They will count toward total members again.`
      )
    )
      return;
    setArchivingId(m.id);
    try {
      const res = await fetch(`/api/admin/members/${m.id}/archive`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to restore member');
        return;
      }
      // Drop it from the current (archived) view.
      setMembers((prev) => prev.filter((mm) => mm.id !== m.id));
    } finally {
      setArchivingId(null);
    }
  }

  async function deleteMember(m: Member) {
    if (!token) return;
    if (
      !confirm(
        `Permanently delete ${m.first_name} ${m.last_name}?\n\n` +
          'This never-paid member will be removed from the system entirely — their record, ' +
          'login, documents, agreements, and application are deleted and their email is freed. ' +
          'This cannot be undone. (Members who have paid cannot be deleted — archive them instead.)'
      )
    )
      return;
    setArchivingId(m.id);
    try {
      const res = await fetch(`/api/admin/members/${m.id}/delete`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to delete member');
        return;
      }
      setMembers((prev) => prev.filter((mm) => mm.id !== m.id));
    } finally {
      setArchivingId(null);
    }
  }

  async function patchMember(id: string, body: any) {
    if (!token) return;
    const res = await fetch(`/api/admin/members/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Failed');
      return;
    }
    const { member } = await res.json();
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...member } : m)));
  }

  async function reconcileStripe() {
    if (!token || reconciling) return;
    if (
      !confirm(
        'Reconcile every member with Stripe? This reads each member’s subscription state from Stripe and writes it back. Safe to run anytime.'
      )
    )
      return;
    setReconciling(true);
    try {
      const res = await fetch('/api/admin/members/reconcile-stripe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json.error || 'Reconcile failed');
        return;
      }
      const counts = json.counts || {};
      const outcomes: any[] = json.outcomes || [];
      const interesting = outcomes.filter(
        (o: any) =>
          o.verdict === 'updated' ||
          o.verdict === 'no_stripe_customer' ||
          o.verdict === 'no_subscriptions' ||
          o.verdict === 'errored'
      );
      const lines = [
        `Scanned ${json.scanned} members.`,
        `  Updated: ${counts.updated || 0}`,
        `  Already in sync: ${counts.no_change || 0}`,
        `  No Stripe customer matched email: ${counts.no_stripe_customer || 0}`,
        `  Customer found but no subscription in Stripe: ${counts.no_subscriptions || 0}`,
        `  Errored: ${counts.errored || 0}`,
        '',
        'Notable members:',
        ...interesting.slice(0, 30).map((o: any) => `• ${o.email}: ${o.detail}`),
      ];
      alert(lines.join('\n'));
      console.log('Reconcile result', json);
      const refreshed = await fetch('/api/admin/members', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (refreshed.ok) {
        const { members: next } = await refreshed.json();
        setMembers(next);
      }
    } finally {
      setReconciling(false);
    }
  }

  async function backfillReceipts() {
    if (!token || backfilling) return;
    if (
      !confirm(
        'Backfill missing receipt URLs for older successful payments? This reads each row’s PaymentIntent or Invoice from Stripe and saves the receipt PDF link. Safe to run anytime.'
      )
    )
      return;
    setBackfilling(true);
    try {
      const res = await fetch('/api/admin/payment-history/backfill-receipts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json.error || 'Backfill failed');
        return;
      }
      const counts = json.counts || {};
      const lines = [
        `Scanned ${json.scanned} payments missing a receipt URL.`,
        `  Updated: ${counts.updated || 0}`,
        `  No URL available from Stripe: ${counts.no_url_available || 0}`,
        `  Errored: ${counts.errored || 0}`,
      ];
      alert(lines.join('\n'));
      console.log('Backfill receipts result', json);
    } finally {
      setBackfilling(false);
    }
  }

  async function pingMember(m: Member) {
    if (!token) return;
    if (
      !confirm(
        `Send a portal-completion reminder email to ${m.first_name} ${m.last_name}?`
      )
    )
      return;
    setPinging(m.id);
    try {
      const res = await fetch(`/api/admin/members/${m.id}/ping`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to send reminder');
        return;
      }
      const json = await res.json().catch(() => ({}));
      const pingedAt: string = json.last_pinged_at || new Date().toISOString();
      setMembers((prev) =>
        prev.map((mm) => (mm.id === m.id ? { ...mm, last_pinged_at: pingedAt } : mm))
      );
      alert('Reminder email sent.');
    } finally {
      setPinging(null);
    }
  }

  const filtered = useMemo(() => {
    const list = members.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = `${m.first_name} ${m.last_name}`.toLowerCase();
        if (!name.includes(q) && !m.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    if (sortMode === 'priority') {
      return [...list].sort(compareMembersByPriority);
    }
    if (sortMode === 'office') {
      return [...list].sort((a, b) => compareAssignments(a.office_number, b.office_number));
    }
    if (sortMode === 'desk') {
      return [...list].sort((a, b) => compareAssignments(a.desk_number, b.desk_number));
    }
    return list;
  }, [members, search, statusFilter, sortMode]);

  const statuses: StatusFilter[] = ['all', 'pending', 'approved', 'active', 'paused', 'cancelled', 'declined'];

  if (loading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {viewArchived ? 'Archived members' : 'Members'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {filtered.length} {filtered.length === 1 ? 'member' : 'members'}
            {(search || statusFilter !== 'all') && ` (filtered from ${members.length})`}
            {viewArchived && ' · archived (hidden from totals)'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SeatingChart members={members} token={token} />
          <input
            type="text"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="border rounded px-3 py-1.5 text-sm capitalize"
          >
            {statuses.map((s) => (
              <option key={s} value={s} className="capitalize">
                {s === 'all' ? 'All statuses' : s}
              </option>
            ))}
          </select>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="border rounded px-3 py-1.5 text-sm"
            title="Sort order"
          >
            <option value="priority">Sort: Priority</option>
            <option value="newest">Sort: Newest</option>
            <option value="office">Sort: Office #</option>
            <option value="desk">Sort: Desk #</option>
          </select>
          <button
            onClick={reconcileStripe}
            disabled={reconciling}
            className="border rounded px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Pull each member’s current subscription state from Stripe and write it back to the database. Use this when Auto-pay dots look wrong."
          >
            {reconciling ? 'Reconciling…' : 'Reconcile with Stripe'}
          </button>
          <button
            onClick={backfillReceipts}
            disabled={backfilling}
            className="border rounded px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Fill in missing Invoice/receipt PDF links on past successful payments. Use this once after deploying the receipt fix to surface buttons for older charges."
          >
            {backfilling ? 'Backfilling…' : 'Backfill receipts'}
          </button>
          <button
            onClick={() => setViewArchived((v) => !v)}
            className={`border rounded px-3 py-1.5 text-sm ${
              viewArchived
                ? 'bg-gray-900 text-white border-gray-900 hover:bg-gray-800'
                : 'hover:bg-gray-50'
            }`}
            title="Archived members are former, once-paying members who have been hidden from the roster and totals. Their data is preserved and they can be restored."
          >
            {viewArchived ? 'Back to active members' : 'View archived'}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border rounded p-6 text-sm text-gray-500">
          No members match the current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => {
            const showTrial = shouldShowTrialBadge(m);
            const appliedAgo = formatAppliedAgo(m.applied_at);
            const startRel = formatStartDateRelative(m.intended_start_date);
            const lastPingAgo = formatLastPingAgo(m.last_pinged_at);
            const canPing = !m.onboarding_unlocked && m.status !== 'cancelled' && m.status !== 'declined';
            return (
            <div
              key={m.id}
              className={`bg-white border rounded-lg p-4 ${
                showTrial ? 'border-l-4 border-l-orange-500' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/admin/members/${m.id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {m.first_name} {m.last_name}
                    </Link>
                    <StatusBadge status={m.status} />
                    {showTrial && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-wider bg-orange-600 text-white">
                        TRIAL DAY
                      </span>
                    )}
                    {m.subscription_status === 'creation_failed' && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-wider bg-red-600 text-white"
                        title="Member paid through Checkout but subscription creation failed. Open this member to recover."
                      >
                        SUB FAILED
                      </span>
                    )}
                    {m.is_legacy_member && (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold tracking-wider bg-purple-600 text-white"
                        title="Existing member who self-migrated into the portal. Billing may still be on the manual/accountant track until they set up Stripe auto-pay."
                      >
                        LEGACY
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">{m.email}</div>
                  {(appliedAgo || m.intended_start_date || canPing) && (
                    <div className="flex items-center gap-3 text-xs text-gray-600 mt-1.5 flex-wrap">
                      {appliedAgo && (
                        <span>
                          <span className="text-gray-500">Applied</span>{' '}
                          <span className="font-medium">{appliedAgo}</span>
                        </span>
                      )}
                      {m.intended_start_date && (
                        <span>
                          <span className="text-gray-500">Start</span>{' '}
                          <span className="font-medium">
                            {m.intended_start_date}
                            {startRel && ` (${startRel})`}
                          </span>
                        </span>
                      )}
                      {canPing && (
                        <span>
                          <span className="text-gray-500">Last pinged</span>{' '}
                          {lastPingAgo ? (
                            <span className="font-medium">{lastPingAgo}</span>
                          ) : (
                            <span className="italic text-gray-400">never</span>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-2 flex-wrap">
                    <ProgressDot
                      state={m.required_docs_complete ? 'done' : 'pending'}
                      label="Documents"
                    />
                    <ProgressDot
                      state={m.agreement_signed ? 'done' : 'pending'}
                      label="Agreements"
                    />
                    <ProgressDot
                      state={autoPayState(m)}
                      label="Auto-pay"
                      title={autoPayTooltip(m)}
                    />
                    <ProgressDot
                      state={m.onboarding_unlocked ? 'done' : 'pending'}
                      label="Onboarded"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 min-w-[300px]">
                  <select
                    value={m.designation || ''}
                    onChange={(e) => patchMember(m.id, { designation: e.target.value || null })}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="">— designation —</option>
                    {Object.entries(DESIGNATION_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Monthly $"
                    defaultValue={m.monthly_cost_cents != null ? m.monthly_cost_cents / 100 : ''}
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v))
                        patchMember(m.id, { monthly_cost_cents: Math.round(v * 100) });
                    }}
                    className="border rounded px-2 py-1 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Office #"
                    defaultValue={m.office_number || ''}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (m.office_number || ''))
                        patchMember(m.id, { office_number: v || null });
                    }}
                    className="border rounded px-2 py-1 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Desk #"
                    defaultValue={m.desk_number || ''}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (m.desk_number || ''))
                        patchMember(m.id, { desk_number: v || null });
                    }}
                    className="border rounded px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() =>
                      patchMember(m.id, {
                        status: m.status === 'active' ? 'paused' : 'active',
                      })
                    }
                    className="text-sm border rounded px-2 py-1 hover:bg-gray-50"
                  >
                    {m.status === 'active' ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    onClick={() => pingMember(m)}
                    disabled={!canPing || pinging === m.id}
                    className="text-sm border rounded px-2 py-1 hover:bg-amber-50 text-amber-700 border-amber-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={
                      canPing
                        ? lastPingAgo
                          ? `Email a portal-completion reminder with a fresh sign-in link. Last pinged ${lastPingAgo}.`
                          : 'Email a portal-completion reminder with a fresh sign-in link. Never pinged.'
                        : 'Member has finished onboarding'
                    }
                  >
                    {pinging === m.id ? 'Pinging…' : 'Ping'}
                  </button>
                  {viewArchived ? (
                    <button
                      onClick={() => restoreMember(m)}
                      disabled={archivingId === m.id}
                      className="text-sm border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 disabled:opacity-50 col-span-2"
                      title="Restore this member to the active roster. They will count toward total members again."
                    >
                      {archivingId === m.id ? 'Restoring…' : 'Restore to members'}
                    </button>
                  ) : m.status === 'cancelled' ? (
                    m.has_paid ? (
                      <button
                        onClick={() => archiveMember(m)}
                        disabled={archivingId === m.id}
                        className="text-sm border border-gray-300 text-gray-600 rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-50 col-span-2"
                        title="Hide this former member from the roster and totals. Keeps all their data (documents, agreements, payments) and can be restored later."
                      >
                        {archivingId === m.id ? 'Archiving…' : 'Archive member'}
                      </button>
                    ) : (
                      <button
                        onClick={() => deleteMember(m)}
                        disabled={archivingId === m.id}
                        className="text-sm border border-red-600 bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700 disabled:opacity-50 col-span-2 font-medium"
                        title="Permanently delete this never-paid member and all their data. Frees their email. Cannot be undone."
                      >
                        {archivingId === m.id ? 'Deleting…' : 'Delete permanently'}
                      </button>
                    )
                  ) : null}
                  <Link
                    href={`/admin/members/${m.id}`}
                    className="text-sm border border-gray-900 bg-gray-900 text-white rounded px-2 py-1 hover:bg-gray-800 text-center font-medium col-span-2"
                  >
                    View details
                  </Link>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type ProgressDotState = 'done' | 'warn' | 'pending';

function ProgressDot({
  state,
  label,
  title,
}: {
  state: ProgressDotState;
  label: string;
  title?: string;
}) {
  const dotClass =
    state === 'done'
      ? 'bg-green-500'
      : state === 'warn'
        ? 'bg-amber-500'
        : 'bg-gray-300';
  const textClass =
    state === 'done'
      ? 'text-green-700 font-medium'
      : state === 'warn'
        ? 'text-amber-700 font-medium'
        : '';
  return (
    <span className="inline-flex items-center gap-1" title={title}>
      <span className={`w-2 h-2 rounded-full ${dotClass}`} />
      <span className={textClass}>{label}</span>
    </span>
  );
}

// Auto-pay reflects whether the member has an active Stripe subscription
// configured to charge their saved payment method. We derive it from
// `subscription_status` (synced from Stripe webhooks) rather than just the
// presence of `stripe_subscription_id`, because:
//   - ACH subscriptions sit in `incomplete` for 3-5 days during bank
//     verification but are still "set up"; they should read as done.
//   - Canceled subscriptions still have an ID stored on the row (the
//     webhook overwrites it on delete) and should read as not set up.
//   - `unpaid` / `incomplete_expired` mean auto-pay was attempted but is
//     broken — the admin needs to act, so we surface those as warn.
function autoPayState(m: Member): ProgressDotState {
  const s = (m.subscription_status || '').toLowerCase();
  if (s === 'active' || s === 'trialing' || s === 'incomplete' || s === 'past_due')
    return 'done';
  if (s === 'unpaid' || s === 'incomplete_expired' || s === 'creation_failed')
    return 'warn';
  return 'pending';
}

function autoPayTooltip(m: Member): string {
  const s = m.subscription_status || 'none';
  if (!m.stripe_customer_id) return 'No Stripe customer on file';
  if (s === 'creation_failed')
    return 'Member paid through Checkout but subscription creation failed. Use "Recreate subscription" on the member page.';
  if (!m.stripe_subscription_id && (s === 'none' || s === ''))
    return 'Stripe customer on file but no subscription yet (syncing or in-flight)';
  switch (s) {
    case 'active':
      return 'Auto-pay active';
    case 'trialing':
      return 'Auto-pay active (trial)';
    case 'incomplete':
      return 'Auto-pay set up; payment processing (typical for ACH, 3–5 business days)';
    case 'past_due':
      return 'Auto-pay set up; latest invoice is past due';
    case 'unpaid':
      return 'Auto-pay broken: invoice unpaid';
    case 'incomplete_expired':
      return 'Auto-pay setup expired before completing';
    case 'canceled':
      return 'Subscription canceled';
    default:
      return 'No active subscription';
  }
}

function StatusBadge({ status }: { status: Member['status'] }) {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    approved: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
    declined: 'bg-red-100 text-red-700',
  };
  const cls = colors[status] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}
