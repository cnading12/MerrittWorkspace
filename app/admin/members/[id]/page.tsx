"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type {
  Member,
  MemberApplication,
  MemberDocument,
  PaymentHistoryRow,
} from '@/lib/portal/types';
import { DESIGNATION_LABELS, DOC_TYPE_LABELS } from '@/lib/portal/types';
import { readTrialFlag, readTrialDate } from '@/lib/portal/trial';
import { formatLastPingAgo } from '@/lib/portal/memberPriority';

type DocWithUrl = MemberDocument & { signed_url: string | null };

interface Agreement {
  id: string;
  agreement_type: string;
  signature_name: string;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  document_version: string | null;
  metadata: Record<string, any> | null;
}

interface Detail {
  member: Member;
  application: MemberApplication | null;
  documents: DocWithUrl[];
  payments: PaymentHistoryRow[];
  agreements: Agreement[];
}

export default function AdminMemberDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);

  async function load(authToken: string) {
    const res = await fetch(`/api/admin/members/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || 'Failed to load member');
      setLoading(false);
      return;
    }
    const json = await res.json();
    setData(json);
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
      await load(session.access_token);
    })();
  }, [id, router]);

  async function reviewDoc(docId: string, status: 'approved' | 'rejected') {
    if (!token) return;
    const notes =
      status === 'rejected' ? prompt('Rejection notes (optional):') || null : null;
    const res = await fetch(`/api/admin/documents/${docId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Failed');
      return;
    }
    const { document: updated } = await res.json();
    setData((prev) =>
      prev
        ? {
            ...prev,
            documents: prev.documents.map((d) =>
              d.id === updated.id ? { ...d, ...updated } : d
            ),
          }
        : prev
    );
  }

  async function openApplication(applicationId: string) {
    // Open the popup synchronously inside the click gesture so browsers
    // don't block it — `window.open()` after an `await` loses user activation.
    const win = window.open('', '_blank');
    if (!win) {
      alert(
        'Your browser blocked the popup. Please allow popups for this site, then try again.'
      );
      return;
    }
    win.document.write(
      '<!doctype html><title>Loading…</title><body style="font-family:sans-serif;padding:32px;color:#6b7280">Loading application…</body>'
    );
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      if (!authToken) {
        win.document.body.textContent = 'Not signed in.';
        return;
      }
      const res = await fetch(`/api/admin/applications/${applicationId}/view`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        win.document.body.textContent = err.error || 'Failed to load application';
        return;
      }
      const html = await res.text();
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (e: any) {
      try {
        win.document.body.textContent = e.message || 'Failed to open application';
      } catch {
        /* popup may already be closed */
      }
    }
  }

  async function resendInvitation() {
    if (!token) return;
    if (!confirm('Send a fresh sign-in link to this member?')) return;
    const res = await fetch(`/api/admin/members/${id}/resend-invitation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Failed to resend invitation');
      return;
    }
    alert('Invitation email sent.');
  }

  async function pingMember() {
    if (!token) return;
    if (
      !confirm(
        'Send a portal-completion reminder email with a checklist of remaining steps?'
      )
    )
      return;
    const res = await fetch(`/api/admin/members/${id}/ping`, {
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
    setData((prev) =>
      prev
        ? { ...prev, member: { ...prev.member, last_pinged_at: pingedAt } }
        : prev
    );
    alert('Reminder email sent.');
  }

  async function recreateSubscription() {
    if (!token || !data) return;
    const m = data.member;
    if (
      !confirm(
        `Create subscription for ${m.first_name} ${m.last_name} using saved payment method on Stripe customer ${m.stripe_customer_id}?`
      )
    )
      return;
    const res = await fetch(
      `/api/admin/members/${id}/recreate-subscription`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(json.error || 'Failed to create subscription');
      return;
    }
    alert(
      `Subscription created: ${json.subscription_id} (status: ${json.status}). Refreshing…`
    );
    await load(token);
  }

  async function cancelMembership() {
    if (!token || !data) return;
    const m = data.member;
    const hasSub = !!m.stripe_subscription_id;
    const ok = window.confirm(
      `Cancel membership for ${m.first_name} ${m.last_name}?\n\n` +
        (hasSub
          ? 'This will:\n' +
            '• Stop future Stripe charges by scheduling a hard cancel at the end of the next calendar month.\n' +
            "• Apply the Last Month's Membership Fee as a credit against the upcoming invoice (member is not billed for the final month).\n" +
            '• Set the member\'s status to cancelled and record the effective date.\n\n' +
            'This is the same flow the member sees when they cancel themselves.'
          : 'This member has no active Stripe subscription, so only their local status will be set to cancelled.')
    );
    if (!ok) return;
    const res = await fetch(`/api/admin/members/${id}/cancel-subscription`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(json.error || 'Failed to cancel membership');
      return;
    }
    if (json.already_cancelled) {
      alert(
        json.reconciled
          ? 'The Stripe subscription was already cancelled, but the member record was out of sync — status has now been updated to cancelled.' +
              (json.cancellation_effective_date
                ? ` Effective date: ${json.cancellation_effective_date}.`
                : '')
          : 'Membership was already cancelled.'
      );
    } else if (json.no_subscription) {
      alert('No active subscription — local status set to cancelled.');
    } else if (json.cancellation_effective_date) {
      alert(`Membership cancelled. Effective date: ${json.cancellation_effective_date}.`);
    }
    await load(token);
  }

  async function deletePaymentRow(paymentId: string) {
    if (!token) return;
    const ok = window.confirm(
      'Delete this payment row from our local records?\n\n' +
        "This does NOT refund the member or change anything in Stripe — it only removes the row from the admin/portal payment history. Use this for phantom or stale rows that don't correspond to a real Stripe charge."
    );
    if (!ok) return;
    const res = await fetch(`/api/admin/members/${id}/payments/${paymentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Failed to delete payment row');
      return;
    }
    setData((prev) =>
      prev
        ? { ...prev, payments: prev.payments.filter((p) => p.id !== paymentId) }
        : prev
    );
  }

  async function reconcilePayments() {
    if (!token) return;
    const ok = window.confirm(
      'Reconcile payment history with Stripe?\n\n' +
        'This pulls all real charges and invoices for this customer from Stripe and rewrites the local payment history to match:\n' +
        '  • Phantom rows (no matching Stripe charge) are deleted\n' +
        '  • Existing rows have their amount and status corrected\n' +
        '  • Missing real charges are added\n\n' +
        'Nothing in Stripe is changed — this is local-only.'
    );
    if (!ok) return;
    setReconciling(true);
    try {
      const res = await fetch(
        `/api/admin/members/${id}/reconcile-payments`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const json = await res.json();
      if (!res.ok) {
        alert(json.error || 'Failed to reconcile payments');
        return;
      }
      alert(
        `Reconcile complete:\n  • ${json.added} added\n  • ${json.updated} updated\n  • ${json.removed} removed (phantoms)\n  • ${json.stripe_payments_seen} real Stripe payments seen`
      );
      await load(token);
    } finally {
      setReconciling(false);
    }
  }

  async function patchMember(body: any) {
    if (!token) return;
    const res = await fetch(`/api/admin/members/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Failed');
      return;
    }
    const { member } = await res.json();
    setData((prev) => (prev ? { ...prev, member } : prev));
  }

  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!data) return null;

  const { member, application, documents, payments, agreements } = data;

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/dashboard" className="hover:text-gray-900">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/admin/members" className="hover:text-gray-900">
          Members
        </Link>
        <span>/</span>
        <span className="text-gray-700">
          {member.first_name} {member.last_name}
        </span>
      </nav>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <h1 className="text-2xl font-semibold">
              {member.first_name} {member.last_name}
            </h1>
            {readTrialFlag(application) && !member.onboarding_unlocked && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold tracking-wider bg-orange-600 text-white">
                TRIAL DAY
                {readTrialDate(application) && ` · ${readTrialDate(application)}`}
              </span>
            )}
            {member.is_legacy_member && (
              <span
                className="inline-flex items-center px-2 py-1 rounded text-xs font-bold tracking-wider bg-purple-600 text-white"
                title="Existing member who self-migrated into the portal via the 'Already a member?' flow. Photo ID / Proof of Address are not required and Stripe auto-pay is optional for legacy members."
              >
                LEGACY MEMBER
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{member.email}</p>
        </div>
        <div className="text-right text-sm text-gray-600">
          <div>Status: <span className="capitalize font-medium">{member.status}</span></div>
          {member.designation && <div>{DESIGNATION_LABELS[member.designation]}</div>}
          {member.monthly_cost_cents != null && (
            <div>${(member.monthly_cost_cents / 100).toFixed(2)}/mo</div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <section className="bg-white border rounded p-4 flex flex-wrap gap-2">
        <button
          onClick={() =>
            patchMember({ status: member.status === 'active' ? 'paused' : 'active' })
          }
          className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50"
        >
          {member.status === 'active' ? 'Pause' : 'Activate'}
        </button>
        <button
          onClick={resendInvitation}
          className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50"
          title="Send a fresh sign-in / set-password link to this member's email"
        >
          Resend sign-in link
        </button>
        {!member.onboarding_unlocked && (
          <button
            onClick={pingMember}
            className="text-sm border border-amber-300 text-amber-700 rounded px-3 py-1.5 hover:bg-amber-50"
            title={
              member.last_pinged_at
                ? `Email a reminder with the remaining onboarding steps and a fresh sign-in link. Last pinged ${formatLastPingAgo(member.last_pinged_at) ?? 'recently'}.`
                : 'Email a reminder with the remaining onboarding steps and a fresh sign-in link. Never pinged.'
            }
          >
            Ping to finish portal
            {member.last_pinged_at ? (
              <span className="ml-1 text-[10px] text-amber-600 font-normal">
                (last {formatLastPingAgo(member.last_pinged_at)})
              </span>
            ) : (
              <span className="ml-1 text-[10px] text-amber-600 font-normal italic">
                (never pinged)
              </span>
            )}
          </button>
        )}
        {member.stripe_customer_id &&
          !member.stripe_subscription_id &&
          member.agreement_signed &&
          member.subscription_status === 'creation_failed' && (
            <button
              onClick={recreateSubscription}
              className="text-sm border border-red-300 bg-red-50 text-red-700 rounded px-3 py-1.5 hover:bg-red-100 font-medium"
              title="Retry the Stripe subscription creation that failed during this member's original Checkout. Uses the saved payment method already on the Stripe customer."
            >
              Recreate subscription
            </button>
          )}
        <button
          onClick={cancelMembership}
          className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50 text-red-600"
          title="Stop the member's Stripe subscription, apply the Last Month's Fee credit, and schedule cancel at end of next calendar month"
        >
          Cancel membership
        </button>
      </section>

      {/* Application payload */}
      <section className="bg-white border rounded p-6">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <h2 className="font-semibold">Application</h2>
          {application && (
            <button
              type="button"
              onClick={() => openApplication(application.id)}
              className="text-sm bg-gray-900 text-white rounded px-3 py-1 hover:bg-gray-800"
            >
              View application
            </button>
          )}
        </div>
        {application ? (
          <div className="space-y-2 text-sm">
            <div className="text-gray-600">
              Submitted {new Date(application.created_at).toLocaleString()} ·{' '}
              <span className="capitalize">{application.status}</span>
            </div>
            {application.start_date && (
              <div className="text-gray-700">
                Intended start date:{' '}
                <span className="font-medium">{application.start_date}</span>
              </div>
            )}
            {application.decision_note && (
              <div className="text-gray-700">Note: {application.decision_note}</div>
            )}
            <details className="mt-2">
              <summary className="cursor-pointer text-gray-700 hover:text-gray-900">
                Full payload
              </summary>
              <pre className="mt-2 bg-gray-50 border rounded p-3 text-xs overflow-auto max-h-96">
                {JSON.stringify(application.payload, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No application linked.</p>
        )}
      </section>

      {/* Documents */}
      <section className="bg-white border rounded p-6">
        <h2 className="font-semibold mb-3">Uploaded documents</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-gray-500">No documents uploaded.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between border rounded p-3"
              >
                <div className="text-sm">
                  <div className="font-medium">{DOC_TYPE_LABELS[d.doc_type]}</div>
                  <div className="text-xs text-gray-500">
                    {d.file_name || d.file_path} ·{' '}
                    <span className="capitalize">{d.status}</span>
                    {d.notes && ` · ${d.notes}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  {d.signed_url && (
                    <a
                      href={d.signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm border rounded px-3 py-1 hover:bg-gray-50"
                    >
                      View
                    </a>
                  )}
                  <button
                    onClick={() => reviewDoc(d.id, 'approved')}
                    disabled={d.status === 'approved'}
                    className="text-sm border rounded px-3 py-1 hover:bg-green-50 text-green-700 disabled:opacity-40"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => reviewDoc(d.id, 'rejected')}
                    disabled={d.status === 'rejected'}
                    className="text-sm border rounded px-3 py-1 hover:bg-red-50 text-red-700 disabled:opacity-40"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Agreements */}
      <section className="bg-white border rounded p-6">
        <h2 className="font-semibold mb-3">Signed agreements</h2>
        {agreements.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing signed yet.</p>
        ) : (
          <div className="space-y-3">
            {agreements.map((a) => (
              <AgreementCard key={a.id} agreement={a} />
            ))}
          </div>
        )}
      </section>

      {/* Payments */}
      <section className="bg-white border rounded p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Payment history</h2>
          <button
            type="button"
            onClick={reconcilePayments}
            disabled={reconciling}
            className="text-xs border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            title="Pull real charges from Stripe and rewrite the local payment history to match. Removes phantom rows, corrects amounts/statuses, adds anything missing. Local-only — does not touch Stripe."
          >
            {reconciling ? 'Reconciling…' : 'Reconcile from Stripe'}
          </button>
        </div>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="py-2">Date</th>
                <th>Description</th>
                <th>Stripe IDs</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0 align-top">
                  <td className="py-2">
                    {(p.paid_at || p.created_at).slice(0, 10)}
                  </td>
                  <td>{p.description || '—'}</td>
                  <td className="font-mono text-[11px] text-gray-600 max-w-[260px]">
                    {p.stripe_invoice_id ? (
                      <div className="truncate" title={p.stripe_invoice_id}>
                        inv:{' '}
                        <a
                          href={`https://dashboard.stripe.com/invoices/${p.stripe_invoice_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {p.stripe_invoice_id}
                        </a>
                      </div>
                    ) : null}
                    {p.stripe_payment_intent_id ? (
                      <div className="truncate" title={p.stripe_payment_intent_id}>
                        pi:{' '}
                        <a
                          href={`https://dashboard.stripe.com/payments/${p.stripe_payment_intent_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {p.stripe_payment_intent_id}
                        </a>
                      </div>
                    ) : null}
                    {!p.stripe_invoice_id && !p.stripe_payment_intent_id && (
                      <span className="text-amber-600">no Stripe ID</span>
                    )}
                  </td>
                  <td>${(p.amount_cents / 100).toFixed(2)}</td>
                  <td className="capitalize">{p.status}</td>
                  <td className="space-x-3 whitespace-nowrap">
                    {p.invoice_pdf_url && (
                      <a
                        href={p.invoice_pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Invoice
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => deletePaymentRow(p.id)}
                      className="text-red-600 hover:underline"
                      title="Remove this row from the local payment_history. Use only for phantom/stale rows that don't match a real Stripe charge — does not refund anything."
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function AgreementCard({ agreement: a }: { agreement: Agreement }) {
  const [open, setOpen] = useState(false);
  const isFee = a.agreement_type === 'fee_agreement';
  const meta = a.metadata || {};
  const usd = (cents: any) =>
    typeof cents === 'number' ? `$${(cents / 100).toFixed(2)}` : '—';

  async function openSignedDocument() {
    // Open the popup synchronously inside the click gesture so browsers
    // don't block it — `window.open()` after `await` loses user activation.
    const win = window.open('', '_blank');
    if (!win) {
      alert(
        'Your browser blocked the popup. Please allow popups for this site, then try again.'
      );
      return;
    }
    win.document.write(
      '<!doctype html><title>Loading…</title><body style="font-family:sans-serif;padding:32px;color:#6b7280">Loading signed document…</body>'
    );
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        win.document.body.textContent = 'Not signed in.';
        return;
      }
      const res = await fetch(`/api/admin/agreements/${a.id}/view`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        win.document.body.textContent = err.error || 'Failed to load agreement';
        return;
      }
      const html = await res.text();
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (e: any) {
      try {
        win.document.body.textContent = e.message || 'Failed to open agreement';
      } catch {
        /* popup may already be closed */
      }
    }
  }

  return (
    <div className="border rounded">
      <div className="flex items-center justify-between p-3 gap-2">
        <div className="text-sm">
          <div className="font-medium capitalize">
            {a.agreement_type.replace(/_/g, ' ')}
          </div>
          <div className="text-xs text-gray-500">
            Signed by {a.signature_name} on {new Date(a.signed_at).toLocaleString()}
            {a.document_version && ` · ${a.document_version}`}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openSignedDocument}
            className="text-sm bg-gray-900 text-white rounded px-3 py-1 hover:bg-gray-800"
          >
            View signed doc
          </button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-sm border rounded px-3 py-1 hover:bg-gray-50"
          >
            {open ? 'Hide details' : 'Details'}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t bg-gray-50 p-4 text-xs space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-700">
            <div>Signed at: {new Date(a.signed_at).toLocaleString()}</div>
            <div>IP: {a.ip_address || '—'}</div>
            <div className="md:col-span-2 truncate">User agent: {a.user_agent || '—'}</div>
          </div>

          {isFee && (
            <div className="bg-white border rounded p-3 space-y-2">
              <div className="font-semibold text-gray-900 text-sm">
                Fee Agreement snapshot
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-gray-700">
                <div>Designation: {meta.designation_label || '—'}</div>
                <div>Monthly cost: {usd(meta.monthly_cost_cents)}</div>
                <div>Term start: {meta.term_start || '—'}</div>
                <div>Term end: {meta.term_end || '—'}</div>
                <div>Payment method: {meta.payment_method || '—'}</div>
                <div>Member title: {meta.member_title || '—'}</div>
                <div>Street: {meta.street || '—'}</div>
                <div>City/State/ZIP: {meta.city_state_zip || '—'}</div>
                <div>Phone: {meta.phone || '—'}</div>
                <div>Email: {meta.email || '—'}</div>
                <div>Federal ID: {meta.federal_id || '—'}</div>
              </div>
              <div className="border-t pt-2">
                <div className="font-semibold text-gray-900">Totals</div>
                <div className="flex justify-between">
                  <span>First month</span>
                  <span>{usd(meta.first_month_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last month</span>
                  <span>{usd(meta.last_month_cents)}</span>
                </div>
                <div className="flex justify-between">
                  <span>3.5% credit card fee</span>
                  <span>{usd(meta.cc_fee_cents)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t mt-1 pt-1">
                  <span>Grand total</span>
                  <span>{usd(meta.grand_total_cents)}</span>
                </div>
              </div>
              {meta.invoicing && (
                <div className="border-t pt-2">
                  <div className="font-semibold text-gray-900">Invoicing details</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-gray-700">
                    <div>Company: {meta.invoicing.company_name || '—'}</div>
                    <div>Contact: {meta.invoicing.contact_name || '—'}</div>
                    <div>Street: {meta.invoicing.street || '—'}</div>
                    <div>Phone: {meta.invoicing.phone || '—'}</div>
                    <div>City/State/ZIP: {meta.invoicing.city_state_zip || '—'}</div>
                    <div>Email: {meta.invoicing.email || '—'}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {a.metadata && (
            <details>
              <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                Raw metadata
              </summary>
              <pre className="mt-2 bg-white border rounded p-2 overflow-auto max-h-64">
                {JSON.stringify(a.metadata, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
