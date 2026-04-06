"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Member, MemberDocument, PaymentHistoryRow } from '@/lib/portal/types';
import { DESIGNATION_LABELS } from '@/lib/portal/types';

type Tab = 'documents' | 'payments' | 'onboarding';

export default function PortalDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryRow[]>([]);
  const [tab, setTab] = useState<Tab>('documents');
  const [accessRequestStatus, setAccessRequestStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/portal/login');
        return;
      }
      const token = session.access_token;
      try {
        const res = await fetch('/api/portal/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to load portal');
        const data = await res.json();
        setMember(data.member);
        setDocuments(data.documents);
        setPayments(data.payments);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/portal/login');
  }

  if (loading) return <div className="text-gray-500">Loading…</div>;
  if (!member) {
    return (
      <div className="bg-white border rounded p-6">
        <p className="text-gray-700">
          We couldn&apos;t find a member record for your account. If you&apos;ve just submitted an
          application, please wait for approval—you&apos;ll receive an email when your portal is
          ready.
        </p>
        <button onClick={signOut} className="mt-4 text-sm text-gray-500 underline">
          Sign out
        </button>
      </div>
    );
  }

  const onboardingLocked = !member.onboarding_unlocked;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome, {member.first_name}
          </h1>
          <p className="text-sm text-gray-500">
            Status:{' '}
            <span className="font-medium capitalize">{member.status}</span>
            {member.designation && ` · ${DESIGNATION_LABELS[member.designation]}`}
            {member.monthly_cost_cents != null &&
              ` · $${(member.monthly_cost_cents / 100).toFixed(2)}/mo`}
          </p>
        </div>
        <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-900">
          Sign out
        </button>
      </div>

      <ProgressBar member={member} />

      <div className="border-b">
        <nav className="flex gap-6">
          <TabButton active={tab === 'documents'} onClick={() => setTab('documents')}>
            Documents
          </TabButton>
          <TabButton active={tab === 'payments'} onClick={() => setTab('payments')}>
            Payments
          </TabButton>
          <TabButton
            active={tab === 'onboarding'}
            onClick={() => setTab('onboarding')}
            disabled={onboardingLocked}
          >
            Onboarding {onboardingLocked && '🔒'}
          </TabButton>
        </nav>
      </div>

      {tab === 'documents' && (
        <DocumentsTab
          member={member}
          documents={documents}
          onChange={(d) => setDocuments(d)}
        />
      )}

      {tab === 'payments' && <PaymentsTab member={member} payments={payments} />}

      {tab === 'onboarding' && !onboardingLocked && (
        <OnboardingTab
          member={member}
          accessRequestStatus={accessRequestStatus}
          setAccessRequestStatus={setAccessRequestStatus}
        />
      )}
    </div>
  );
}

function ProgressBar({ member }: { member: Member }) {
  const steps = [
    { label: 'Required documents', done: member.required_docs_complete },
    { label: 'Agreement signed', done: member.agreement_signed },
    { label: 'Payment set up', done: !!member.stripe_subscription_id },
    { label: 'Onboarding unlocked', done: member.onboarding_unlocked },
  ];
  return (
    <div className="bg-white border rounded p-4">
      <div className="flex items-center gap-3 flex-wrap">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs ${
                s.done ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 text-gray-400'
              }`}
            >
              {s.done ? '✓' : i + 1}
            </div>
            <span className={`text-sm ${s.done ? 'text-gray-900' : 'text-gray-500'}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <span className="text-gray-300">→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function TabButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`pb-3 text-sm border-b-2 -mb-px ${
        active
          ? 'border-gray-900 text-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-900'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

// --- Documents tab ---
import { REQUIRED_DOC_TYPES, DOC_TYPE_LABELS, DocType } from '@/lib/portal/types';

function DocumentsTab({
  member,
  documents,
  onChange,
}: {
  member: Member;
  documents: MemberDocument[];
  onChange: (d: MemberDocument[]) => void;
}) {
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [signing, setSigning] = useState(false);
  const [signatureName, setSignatureName] = useState(`${member.first_name} ${member.last_name}`);

  async function uploadDoc(docType: DocType, file: File) {
    setUploading(docType);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Upload to storage via API (server uses service role to keep paths consistent).
      const fd = new FormData();
      fd.append('file', file);
      fd.append('doc_type', docType);
      const res = await fetch('/api/portal/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }
      const { documents: updated } = await res.json();
      onChange(updated);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setUploading(null);
    }
  }

  async function signAgreement(type: 'member_agreement' | 'terms_and_conditions') {
    setSigning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/portal/sign-agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ agreement_type: type, signature_name: signatureName }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to sign');
      }
      window.location.reload();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSigning(false);
    }
  }

  const hasDoc = (t: DocType) => documents.some((d) => d.doc_type === t);

  return (
    <div className="space-y-6">
      <section className="bg-white border rounded p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Required documents</h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload these before you can sign your member agreement and set up payment.
        </p>
        <div className="space-y-3">
          {REQUIRED_DOC_TYPES.map((t) => (
            <div key={t} className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="text-sm font-medium text-gray-900">{DOC_TYPE_LABELS[t]}</div>
                {hasDoc(t) && <div className="text-xs text-green-700">Submitted</div>}
              </div>
              <label className="text-sm cursor-pointer text-gray-700 hover:text-gray-900">
                {uploading === t ? 'Uploading…' : hasDoc(t) ? 'Replace' : 'Upload'}
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadDoc(t, f);
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white border rounded p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Member agreement & terms</h2>
        <p className="text-sm text-gray-500 mb-4">
          Available once your required documents are submitted.
        </p>
        <fieldset disabled={!member.required_docs_complete} className="space-y-3 disabled:opacity-50">
          <div>
            <label className="block text-xs text-gray-600">Type your full legal name to sign</label>
            <input
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => signAgreement('member_agreement')}
              disabled={signing}
              className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
            >
              Sign Member Agreement
            </button>
            <button
              onClick={() => signAgreement('terms_and_conditions')}
              disabled={signing}
              className="border px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Sign Terms & Conditions
            </button>
          </div>
        </fieldset>
      </section>
    </div>
  );
}

// --- Payments tab ---
function PaymentsTab({ member, payments }: { member: Member; payments: PaymentHistoryRow[] }) {
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const canSetUp =
    member.agreement_signed && member.monthly_cost_cents != null && !member.stripe_subscription_id;

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/portal/billing-portal-session', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to open billing portal');
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      alert(e.message);
      setPortalLoading(false);
    }
  }

  async function startCheckout() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/portal/create-subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create checkout');
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      alert(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border rounded p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Monthly membership</h2>
        {member.monthly_cost_cents != null ? (
          <p className="text-sm text-gray-700">
            Your monthly cost is{' '}
            <span className="font-semibold">
              ${(member.monthly_cost_cents / 100).toFixed(2)}
            </span>
            , billed on the 1st of each month (first charge prorated).
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            Your administrator hasn&apos;t assigned a monthly cost yet.
          </p>
        )}

        {member.stripe_subscription_id ? (
          <div className="mt-4 space-y-2">
            <div className="text-sm text-green-700">
              ✓ Auto-pay is set up. Status: {member.subscription_status || 'active'}
            </div>
            <button
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              {portalLoading ? 'Opening…' : 'Manage payment method'}
            </button>
          </div>
        ) : (
          <button
            onClick={startCheckout}
            disabled={!canSetUp || loading}
            className="mt-4 bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Set up auto-pay'}
          </button>
        )}
        {!member.agreement_signed && (
          <p className="mt-2 text-xs text-gray-500">
            You must sign the member agreement before setting up payment.
          </p>
        )}
      </section>

      <section className="bg-white border rounded p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Payment history</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="py-2">Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2">{p.paid_at?.slice(0, 10) || p.created_at.slice(0, 10)}</td>
                  <td>{p.description || '—'}</td>
                  <td>${(p.amount_cents / 100).toFixed(2)}</td>
                  <td className="capitalize">{p.status}</td>
                  <td>
                    {p.invoice_pdf_url && (
                      <a className="text-blue-600 hover:underline" href={p.invoice_pdf_url}>
                        Invoice
                      </a>
                    )}
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

// --- Onboarding tab ---
function OnboardingTab({
  member,
  accessRequestStatus,
  setAccessRequestStatus,
}: {
  member: Member;
  accessRequestStatus: string | null;
  setAccessRequestStatus: (s: string | null) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function requestAccessCode() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/portal/request-access-code', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
      }
      setAccessRequestStatus('Requested! We&apos;ll email your code shortly.');
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border rounded p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Welcome to Merritt Workspace</h2>
        <p className="text-sm text-gray-700">
          Now that your membership is complete, here&apos;s everything you need to get started.
        </p>
      </section>

      <section className="bg-white border rounded p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Building info</h3>
        <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
          <li>WiFi network: <code>merrittcowork</code> &nbsp; Password: <code>Merritt23X</code></li>
          <li>Building hours (open to public): 8:00 AM – 6:00 PM</li>
          <li>Kitchen, snack shop, and conference rooms available to all members</li>
          <li>Need a cubby? Just ask the management team.</li>
        </ul>
      </section>

      <section className="bg-white border rounded p-6">
        <h3 className="font-semibold text-gray-900 mb-2">24/7 building access code</h3>
        {member.access_code ? (
          <div>
            <p className="text-sm text-gray-700">Your personal access code:</p>
            <div className="mt-2 text-2xl font-mono font-bold tracking-widest text-gray-900">
              {member.access_code}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Keep this code confidential. Use it to enter outside business hours.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-700">
              Request a personal access code for entry outside business hours. Our team will set
              it up and email it to you.
            </p>
            <button
              onClick={requestAccessCode}
              disabled={loading}
              className="mt-3 bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
            >
              {loading ? 'Requesting…' : 'Request access code'}
            </button>
            {accessRequestStatus && (
              <p className="mt-2 text-sm text-green-700">{accessRequestStatus}</p>
            )}
          </div>
        )}
      </section>

      <section className="bg-white border rounded p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Member referral program</h3>
        <p className="text-sm text-gray-700">
          Love your workspace? Refer a friend and save $200 on next month&apos;s fee when they sign up.
        </p>
      </section>
    </div>
  );
}
