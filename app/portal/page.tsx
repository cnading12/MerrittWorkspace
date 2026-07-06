"use client";

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Member, MemberDocument, PaymentHistoryRow } from '@/lib/portal/types';
import { DESIGNATION_LABELS } from '@/lib/portal/types';
import {
  TERMS_AND_CONDITIONS_TEXT,
  calculateFeeAgreementTotals,
  calculateProratedFirstMonthCents,
  parseStartDate,
  startDateBounds,
  toIsoDate,
  MERRITT_SIGNATORY,
} from '@/lib/portal/legal';
import { formatUsd, isOneTimeDesignation } from '@/lib/portal/pricing';
import {
  normalizeDeskNumber,
  DD_MIN,
  DD_MAX,
  MEMBER_SERVICES_PHONE_DISPLAY,
  MEMBER_SERVICES_PHONE_TEL,
  MEMBER_SERVICES_EMAIL,
} from '@/lib/portal/desks';

type AgreementRow = {
  agreement_type: 'member_agreement' | 'terms_and_conditions' | 'fee_agreement';
  signed_at: string;
  signature_name: string;
  metadata?: Record<string, unknown> | null;
};

type Tab = 'documents' | 'payments' | 'onboarding';

export default function PortalDashboardPage() {
  return (
    <Suspense fallback={<div className="text-gray-500">Loading…</div>}>
      <PortalDashboard />
    </Suspense>
  );
}

function PortalDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryRow[]>([]);
  const [agreements, setAgreements] = useState<AgreementRow[]>([]);
  const [applicationStartDate, setApplicationStartDate] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('documents');
  const [accessRequestStatus, setAccessRequestStatus] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  // Post-checkout banner: shown after Stripe redirects back. We surface a
  // clear success/processing/canceled state independent of the auto-fading
  // flash message so the member never wonders whether their payment landed.
  const [paymentBanner, setPaymentBanner] = useState<
    | { kind: 'success'; ach: boolean }
    | { kind: 'processing' }
    | { kind: 'canceled' }
    | null
  >(null);
  // When set, the Documents tab opens the signed Fee Agreement in editable
  // "revise" mode so the member can change the start date and re-sign. Used
  // by the back-button on the Payments tab.
  const [reviseFeeAgreementRequest, setReviseFeeAgreementRequest] = useState(false);

  async function loadPortalData(token: string) {
    const res = await fetch('/api/portal/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to load portal');
    const data = await res.json();
    setMember(data.member);
    setDocuments(data.documents);
    setPayments(data.payments);
    setAgreements(data.agreements || []);
    setApplicationStartDate(data.application_start_date || null);
    return data.member as Member | null;
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/portal/login');
        return;
      }
      try {
        await loadPortalData(session.access_token);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // Handle the return from Stripe Checkout. The success URL is
  // `/portal?subscribed=1` and the cancel URL is `/portal?canceled=1`.
  //
  // The webhook (`checkout.session.completed`) flips
  // `onboarding_unlocked: true` and writes `stripe_subscription_id`, but
  // it can lag the browser redirect by a second or two — so we poll
  // `/api/portal/me` until that state lands, then jump the member to the
  // Onboarding tab. While we wait we render a prominent "Processing
  // payment…" banner so members never wonder whether the payment went
  // through.
  const handledCheckoutReturn = useRef(false);
  useEffect(() => {
    if (handledCheckoutReturn.current) return;
    if (loading) return;
    const subscribed = searchParams?.get('subscribed') === '1';
    const canceled = searchParams?.get('canceled') === '1';
    if (!subscribed && !canceled) return;
    handledCheckoutReturn.current = true;

    // Strip the query string from the URL so a refresh doesn't replay
    // this flow.
    router.replace('/portal');

    if (canceled) {
      setPaymentBanner({ kind: 'canceled' });
      return;
    }

    // Subscribed=1 flow.
    setPaymentBanner({ kind: 'processing' });

    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      // Poll up to ~24s (12 attempts × 2s) for the webhook to land.
      const maxAttempts = 12;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (cancelled) return;
        try {
          const m = await loadPortalData(token);
          if (m?.onboarding_unlocked || m?.stripe_subscription_id) {
            const isAch =
              (m?.subscription_status === 'incomplete' ||
                m?.subscription_status === 'past_due') &&
              !!m?.stripe_subscription_id;
            setPaymentBanner({ kind: 'success', ach: isAch });
            if (m?.onboarding_unlocked) {
              setTab('onboarding');
            }
            return;
          }
        } catch (e) {
          console.error('Polling /api/portal/me failed', e);
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      // Webhook still hasn't landed. Show the success banner anyway —
      // the charge succeeded on Stripe's side or we wouldn't be on the
      // success URL — and tell the member their access will activate
      // shortly.
      if (!cancelled) {
        setPaymentBanner({ kind: 'success', ach: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, loading, router]);

  // When the agreements become fully signed, jump the user straight to the
  // Payments tab so the next step is obvious. Track whether we've already
  // auto-jumped so a subsequent revise-flow (member returns to Documents to
  // re-sign the Fee Agreement) doesn't get yanked back to Payments.
  const autoJumpedToPayments = useRef(false);
  useEffect(() => {
    if (
      !autoJumpedToPayments.current &&
      member?.agreement_signed &&
      tab === 'documents' &&
      !member.stripe_subscription_id
    ) {
      autoJumpedToPayments.current = true;
      setTab('payments');
      setFlashMessage(
        member?.is_legacy_member
          ? 'All agreements signed. Auto-pay is optional below — you can also skip and keep your current billing.'
          : 'All agreements signed. Set up auto-pay below to finish onboarding.'
      );
    }
  }, [
    member?.agreement_signed,
    member?.stripe_subscription_id,
    member?.is_legacy_member,
    tab,
  ]);

  // Once the webhook unlocks onboarding, jump the member straight to the
  // Onboarding tab. This covers three cases:
  //   1. Just-paid members whose webhook landed during the polling above
  //      (we set tab='onboarding' there directly; this is a safety net).
  //   2. Members on the Payments tab whose subscription state refreshes
  //      mid-session.
  //   3. Members who experienced the old broken flow — paid successfully
  //      but were never advanced — and are now logging back in. They land
  //      on the default Documents tab with `onboarding_unlocked: true`,
  //      so we move them to Onboarding so they can finally see the info
  //      they were stuck looking for.
  const autoJumpedToOnboarding = useRef(false);
  useEffect(() => {
    // Legacy members get onboarding_unlocked the moment they sign the three
    // agreements (no Stripe webhook gate). We don't want to skip them past
    // the Payments tab — they need to see and explicitly accept-or-skip the
    // optional auto-pay step. Auto-jump only applies once they've either
    // set up auto-pay (stripe_subscription_id present) OR for non-legacy
    // members where onboarding_unlocked already implies a paid checkout.
    if (member?.is_legacy_member && !member?.stripe_subscription_id) {
      return;
    }
    if (
      !autoJumpedToOnboarding.current &&
      member?.onboarding_unlocked &&
      tab !== 'onboarding'
    ) {
      autoJumpedToOnboarding.current = true;
      setTab('onboarding');
    }
  }, [
    member?.onboarding_unlocked,
    member?.is_legacy_member,
    member?.stripe_subscription_id,
    tab,
  ]);

  // When required docs become complete, show a confirmation toast.
  useEffect(() => {
    if (member?.required_docs_complete && !member.agreement_signed) {
      setFlashMessage('Documents received. Now review and sign the three agreements below.');
    }
  }, [member?.required_docs_complete, member?.agreement_signed]);

  useEffect(() => {
    if (!flashMessage) return;
    const t = setTimeout(() => setFlashMessage(null), 6000);
    return () => clearTimeout(t);
  }, [flashMessage]);

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
  const paymentsLocked = !member.agreement_signed;

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
        <div className="flex items-center gap-4">
          <a
            href="/portal/activity"
            className="text-sm font-medium text-burnt-orange-600 hover:text-burnt-orange-700"
          >
            My Activity →
          </a>
          <button onClick={signOut} className="text-sm text-gray-500 hover:text-gray-900">
            Sign out
          </button>
        </div>
      </div>

      <ProgressBar member={member} />

      {paymentBanner?.kind === 'processing' && (
        <div
          role="status"
          aria-live="polite"
          className="bg-blue-50 border-2 border-blue-300 text-blue-900 rounded-lg p-4 flex items-start gap-3"
        >
          <svg
            className="animate-spin h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <div>
            <div className="font-semibold">Processing your payment…</div>
            <div className="text-sm mt-0.5">
              Hang tight — we&apos;re confirming your payment with Stripe and unlocking your
              onboarding. This usually takes just a few seconds.
            </div>
          </div>
        </div>
      )}

      {paymentBanner?.kind === 'success' && (
        <div
          role="status"
          aria-live="polite"
          className="bg-green-50 border-2 border-green-400 text-green-900 rounded-lg p-4 flex items-start justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
              ✓
            </div>
            <div>
              <div className="font-semibold text-base">
                Payment successful — welcome to Merritt Workspace!
              </div>
              <div className="text-sm mt-1">
                {paymentBanner.ach ? (
                  <>
                    Your ACH bank transfer has been initiated. It can take 3–5 business days
                    to clear, but your onboarding is unlocked below — no further action
                    needed right now.
                  </>
                ) : (
                  <>
                    Your auto-pay is set up and your onboarding is unlocked below. You&apos;ll
                    receive a receipt by email shortly.
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setPaymentBanner(null)}
            className="text-green-700 hover:text-green-900 flex-shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {paymentBanner?.kind === 'canceled' && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-lg p-4 flex items-start justify-between gap-3"
        >
          <div>
            <div className="font-semibold">Checkout canceled</div>
            <div className="text-sm mt-0.5">
              You didn&apos;t complete payment. No charges were made — you can try again
              from the Payment tab below whenever you&apos;re ready.
            </div>
          </div>
          <button
            onClick={() => setPaymentBanner(null)}
            className="text-amber-700 hover:text-amber-900 flex-shrink-0"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {flashMessage && (
        <div className="bg-green-50 border border-green-300 text-green-900 rounded p-3 text-sm flex items-center justify-between">
          <span>{flashMessage}</span>
          <button
            onClick={() => setFlashMessage(null)}
            className="text-green-700 hover:text-green-900 ml-4"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div className="border-b">
        <nav className="flex gap-6">
          <TabButton active={tab === 'documents'} onClick={() => setTab('documents')}>
            1. Documents & Agreements
          </TabButton>
          <TabButton
            active={tab === 'payments'}
            onClick={() => setTab('payments')}
            disabled={paymentsLocked}
          >
            2. Payment {paymentsLocked && '🔒'}
          </TabButton>
          <TabButton
            active={tab === 'onboarding'}
            onClick={() => setTab('onboarding')}
            disabled={onboardingLocked}
          >
            3. Onboarding {onboardingLocked && '🔒'}
          </TabButton>
        </nav>
      </div>

      {tab === 'documents' && (
        <DocumentsTab
          member={member}
          documents={documents}
          agreements={agreements}
          applicationStartDate={applicationStartDate}
          onMemberChange={setMember}
          onDocumentsChange={setDocuments}
          onAgreementsChange={setAgreements}
          reviseFeeAgreementRequest={reviseFeeAgreementRequest}
          onReviseFeeAgreementHandled={() => setReviseFeeAgreementRequest(false)}
        />
      )}

      {tab === 'payments' && !paymentsLocked && (
        <PaymentsTab
          member={member}
          payments={payments}
          agreements={agreements}
          onReviseFeeAgreement={() => {
            setReviseFeeAgreementRequest(true);
            setTab('documents');
          }}
          onSkipPayment={
            member.is_legacy_member
              ? () => {
                  setTab('onboarding');
                  setFlashMessage(
                    'Got it — your billing stays on the existing arrangement. You can still set up auto-pay any time.'
                  );
                }
              : undefined
          }
        />
      )}
      {tab === 'payments' && paymentsLocked && (
        <div className="bg-amber-50 border border-amber-300 rounded p-6 text-sm text-amber-900">
          {member.is_legacy_member
            ? 'Sign all three agreements first, and then you can (optionally) set up auto-pay here.'
            : 'You must complete steps 1 (upload required documents and sign all three agreements) before you can set up payment.'}
          <button
            onClick={() => setTab('documents')}
            className="ml-2 underline font-medium hover:text-amber-700"
          >
            Go back to Documents & Agreements
          </button>
        </div>
      )}

      {tab === 'onboarding' && !onboardingLocked && (
        <OnboardingTab
          member={member}
          accessRequestStatus={accessRequestStatus}
          setAccessRequestStatus={setAccessRequestStatus}
          onMemberChange={setMember}
        />
      )}
    </div>
  );
}

function ProgressBar({ member }: { member: Member }) {
  // Legacy migration members skip the doc-upload step entirely (Photo ID /
  // Proof of Address are optional for them) and treat auto-pay setup as an
  // optional add-on rather than a gate. Their progress bar reflects that.
  const steps = member.is_legacy_member
    ? [
        { label: 'Sign 3 agreements', done: member.agreement_signed },
        {
          label: 'Set up auto-pay (optional)',
          done: !!member.stripe_subscription_id,
        },
        { label: 'Onboarding unlocked', done: member.onboarding_unlocked },
      ]
    : [
        { label: 'Upload ID & proof of address', done: member.required_docs_complete },
        { label: 'Sign 3 agreements', done: member.agreement_signed },
        { label: 'Set up auto-pay', done: !!member.stripe_subscription_id },
        { label: 'Onboarding unlocked', done: member.onboarding_unlocked },
      ];
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);
  return (
    <div className="bg-white border rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Onboarding progress</h2>
        <span className="text-xs text-gray-500">{completed} of {steps.length} steps complete</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-green-600 h-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 p-3 rounded border ${
              s.done
                ? 'bg-green-50 border-green-300'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold ${
                s.done
                  ? 'bg-green-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-500'
              }`}
            >
              {s.done ? '✓' : i + 1}
            </div>
            <span
              className={`text-xs leading-tight ${
                s.done ? 'text-green-900 font-medium' : 'text-gray-600'
              }`}
            >
              {s.label}
            </span>
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
  agreements,
  applicationStartDate,
  onMemberChange,
  onDocumentsChange,
  onAgreementsChange,
  reviseFeeAgreementRequest,
  onReviseFeeAgreementHandled,
}: {
  member: Member;
  documents: MemberDocument[];
  agreements: AgreementRow[];
  applicationStartDate: string | null;
  onMemberChange: (m: Member) => void;
  onDocumentsChange: (d: MemberDocument[]) => void;
  onAgreementsChange: (a: AgreementRow[]) => void;
  reviseFeeAgreementRequest: boolean;
  onReviseFeeAgreementHandled: () => void;
}) {
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [signing, setSigning] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState(`${member.first_name} ${member.last_name}`);
  const [error, setError] = useState<string | null>(null);
  const signedSet = new Set(agreements.map((a) => a.agreement_type));
  const hasSigned = (t: AgreementRow['agreement_type']) => signedSet.has(t);
  const signedCount = ['member_agreement', 'terms_and_conditions', 'fee_agreement'].filter(
    (t) => signedSet.has(t as AgreementRow['agreement_type'])
  ).length;

  async function uploadDoc(docType: DocType, file: File) {
    setError(null);
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
      const { documents: updatedDocs, member: updatedMember } = await res.json();
      onDocumentsChange(updatedDocs);
      if (updatedMember) onMemberChange(updatedMember);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(null);
    }
  }

  async function signAgreement(
    type: 'member_agreement' | 'terms_and_conditions' | 'fee_agreement',
    metadata?: Record<string, unknown>
  ): Promise<boolean> {
    setError(null);
    if (!signatureName.trim()) {
      setError('Type your full legal name above to sign.');
      return false;
    }
    setSigning(type);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/portal/sign-agreement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agreement_type: type,
          signature_name: signatureName,
          metadata,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to sign');
      }
      const data = await res.json();
      if (data.member) onMemberChange(data.member);
      if (data.agreements) onAgreementsChange(data.agreements);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setSigning(null);
    }
  }

  const hasDoc = (t: DocType) => documents.some((d) => d.doc_type === t);

  const memberName = `${member.first_name} ${member.last_name}`;
  const designationLabel = member.designation
    ? DESIGNATION_LABELS[member.designation]
    : '— not yet assigned —';

  const requiredDocsCount = REQUIRED_DOC_TYPES.filter((t) => hasDoc(t)).length;
  const totalRequiredDocs = REQUIRED_DOC_TYPES.length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-900 rounded p-3 text-sm flex items-center justify-between">
          <span><strong>Error:</strong> {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900 ml-4"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <section className="bg-white border rounded p-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="font-semibold text-gray-900">
              Step 1 ·{' '}
              {member.is_legacy_member
                ? 'Documents (optional)'
                : 'Required documents'}
              {!member.is_legacy_member && member.required_docs_complete && (
                <span className="ml-2 text-green-700 text-sm font-semibold">✓ Complete</span>
              )}
              {member.is_legacy_member && (
                <span className="ml-2 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  Optional for existing members
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-500 mb-4 mt-1">
              {member.is_legacy_member ? (
                <>
                  We have your information on file from your original paper
                  application, so uploading photo ID and proof of address is{' '}
                  <strong>not required</strong>. You may upload them if you&apos;d
                  like to keep everything in one place — otherwise skip ahead and
                  sign your agreements below.
                </>
              ) : (
                <>
                  Upload a photo ID and proof of address. Both are required before you can
                  sign your agreements.
                </>
              )}
            </p>
          </div>
          <div className="text-xs text-gray-500 whitespace-nowrap">
            {requiredDocsCount} / {totalRequiredDocs} uploaded
          </div>
        </div>
        <div className="space-y-3">
          {REQUIRED_DOC_TYPES.map((t) => {
            const submitted = hasDoc(t);
            return (
              <div
                key={t}
                className={`flex items-center justify-between border rounded p-3 ${
                  submitted ? 'border-green-300 bg-green-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      submitted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 border border-gray-300 text-gray-500'
                    }`}
                  >
                    {submitted ? '✓' : '•'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{DOC_TYPE_LABELS[t]}</div>
                    {submitted && (
                      <div className="text-xs text-green-700 font-medium">Submitted</div>
                    )}
                  </div>
                </div>
                <label className={`text-sm cursor-pointer rounded px-3 py-1.5 border ${
                  submitted
                    ? 'border-gray-300 text-gray-700 hover:bg-white'
                    : 'border-gray-900 bg-gray-900 text-white hover:bg-gray-800'
                }`}>
                  {uploading === t ? 'Uploading…' : submitted ? 'Replace' : 'Upload'}
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
            );
          })}
        </div>
      </section>

      <section className="bg-white border rounded p-6">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="font-semibold text-gray-900">
              Step 2 · Agreements
              {member.agreement_signed && (
                <span className="ml-2 text-green-700 text-sm font-semibold">✓ All signed</span>
              )}
            </h2>
            <p className="text-sm text-gray-500 mb-4 mt-1">
              Review and sign each document below. All three are required before you can set up
              payment.{' '}
              {!member.required_docs_complete && !member.is_legacy_member && (
                <span className="text-amber-700 font-medium">
                  Upload your required documents above first.
                </span>
              )}
            </p>
          </div>
          <div className="text-xs text-gray-500 whitespace-nowrap">
            {signedCount} / 3 signed
          </div>
        </div>

        <fieldset
          disabled={!member.required_docs_complete && !member.is_legacy_member}
          className="space-y-4 disabled:opacity-50"
        >
          <div>
            <label className="block text-xs text-gray-600">
              Type your full legal name (used as your signature on all documents)
            </label>
            <input
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
            />
          </div>

          {member.is_legacy_member ? (
            <LegacyFeeAgreementSection
              member={member}
              memberName={memberName}
              designationLabel={designationLabel}
              signedMetadata={
                (agreements.find((a) => a.agreement_type === 'fee_agreement')?.metadata as
                  | Record<string, unknown>
                  | null
                  | undefined) || null
              }
              signed={hasSigned('fee_agreement')}
              signedAt={agreements.find((a) => a.agreement_type === 'fee_agreement')?.signed_at || null}
              signedBy={agreements.find((a) => a.agreement_type === 'fee_agreement')?.signature_name || null}
              signing={signing === 'fee_agreement'}
              onSign={(metadata) => signAgreement('fee_agreement', metadata)}
            />
          ) : (
            <FeeAgreementSection
              member={member}
              memberName={memberName}
              designationLabel={designationLabel}
              applicationStartDate={applicationStartDate}
              signedMetadata={
                (agreements.find((a) => a.agreement_type === 'fee_agreement')?.metadata as
                  | Record<string, unknown>
                  | null
                  | undefined) || null
              }
              signed={hasSigned('fee_agreement')}
              signedAt={agreements.find((a) => a.agreement_type === 'fee_agreement')?.signed_at || null}
              signedBy={agreements.find((a) => a.agreement_type === 'fee_agreement')?.signature_name || null}
              signing={signing === 'fee_agreement'}
              onSign={(metadata) => signAgreement('fee_agreement', metadata)}
              reviseRequested={reviseFeeAgreementRequest}
              onReviseHandled={onReviseFeeAgreementHandled}
            />
          )}

          <SignableDoc
            title="Terms & Conditions"
            description="The standard Merritt Workspace house rules and policies."
            body={TERMS_AND_CONDITIONS_TEXT}
            signed={hasSigned('terms_and_conditions')}
            signedAt={agreements.find((a) => a.agreement_type === 'terms_and_conditions')?.signed_at || null}
            signedBy={agreements.find((a) => a.agreement_type === 'terms_and_conditions')?.signature_name || null}
            signing={signing === 'terms_and_conditions'}
            onSign={() => signAgreement('terms_and_conditions')}
          />

          <SignableDoc
            title="Member Agreement"
            description="Acknowledges your status as a Merritt Workspace member."
            body={`I, ${memberName}, agree to become a member of Merritt Workspace under the Fee Agreement and Terms & Conditions referenced above.`}
            signed={hasSigned('member_agreement')}
            signedAt={agreements.find((a) => a.agreement_type === 'member_agreement')?.signed_at || null}
            signedBy={agreements.find((a) => a.agreement_type === 'member_agreement')?.signature_name || null}
            signing={signing === 'member_agreement'}
            onSign={() => signAgreement('member_agreement')}
          />
        </fieldset>

        {member.agreement_signed && (
          <div className="mt-6 bg-green-50 border-2 border-green-400 rounded-lg p-4 text-center">
            <div className="text-2xl">✓</div>
            <div className="font-semibold text-green-900 mt-1">All three agreements signed!</div>
            <p className="text-sm text-green-800 mt-1">
              You can now move on to setting up your monthly auto-pay.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function SignableDoc({
  title,
  description,
  body,
  signed,
  signedAt,
  signedBy,
  signing,
  disabled,
  disabledReason,
  onSign,
}: {
  title: string;
  description: string;
  body: string;
  signed: boolean;
  signedAt?: string | null;
  signedBy?: string | null;
  signing: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  onSign: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-2 rounded-lg ${signed ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 ${
              signed ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400 border border-gray-300'
            }`}
          >
            {signed ? '✓' : '•'}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {title}
              {signed && (
                <span className="ml-2 text-green-700 text-xs font-bold uppercase tracking-wider">
                  Signed
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">{description}</div>
            {signed && signedBy && signedAt && (
              <div className="text-xs text-green-800 mt-1 font-medium">
                Signed by {signedBy} on {new Date(signedAt).toLocaleString()}
              </div>
            )}
            {disabledReason && (
              <div className="text-xs text-amber-700 mt-1">{disabledReason}</div>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-sm border rounded px-3 py-1.5 hover:bg-white bg-white"
          >
            {open ? 'Hide' : 'Review'}
          </button>
          {signed ? (
            <button
              type="button"
              disabled
              className="text-sm bg-green-600 text-white rounded px-4 py-1.5 cursor-default font-semibold"
            >
              ✓ Signed
            </button>
          ) : (
            <button
              type="button"
              onClick={onSign}
              disabled={signing || disabled}
              className="text-sm bg-gray-900 text-white rounded px-4 py-1.5 hover:bg-gray-800 disabled:opacity-50 font-semibold"
            >
              {signing ? 'Signing\u2026' : 'Sign'}
            </button>
          )}
        </div>
      </div>
      {open && (
        <pre className="border-t bg-white p-4 text-xs text-gray-800 whitespace-pre-wrap font-sans max-h-80 overflow-auto">
          {body}
        </pre>
      )}
    </div>
  );
}

// Legacy-member Fee Agreement.
//
// Existing members migrating from manual/paper billing don't pay a prorated
// first month or a last-month deposit. The only thing they're committing to
// is the monthly rate they're already paying — and, if/when they later set
// up auto-pay from the Payments tab, that the auto-charge will run on the
// 1st of each month starting on the next billing cycle.
function LegacyFeeAgreementSection({
  member,
  memberName,
  designationLabel,
  signedMetadata,
  signed,
  signedAt,
  signedBy,
  signing,
  onSign,
}: {
  member: Member;
  memberName: string;
  designationLabel: string;
  signedMetadata: Record<string, unknown> | null;
  signed: boolean;
  signedAt: string | null;
  signedBy: string | null;
  signing: boolean;
  onSign: (metadata: Record<string, unknown>) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [memberTitle, setMemberTitle] = useState(
    typeof (signedMetadata as any)?.member_title === 'string'
      ? ((signedMetadata as any).member_title as string)
      : ''
  );
  const [street, setStreet] = useState(
    typeof (signedMetadata as any)?.street === 'string'
      ? ((signedMetadata as any).street as string)
      : ''
  );
  const [cityStateZip, setCityStateZip] = useState(
    typeof (signedMetadata as any)?.city_state_zip === 'string'
      ? ((signedMetadata as any).city_state_zip as string)
      : ''
  );
  const [phone, setPhone] = useState(
    typeof (signedMetadata as any)?.phone === 'string'
      ? ((signedMetadata as any).phone as string)
      : member.phone || ''
  );
  const email = member.email;
  const [localError, setLocalError] = useState<string | null>(null);

  const monthlyCostCents = member.monthly_cost_cents || 0;
  const today = new Date();
  // Next billing cycle = 1st of next month, in local-server terms.
  const nextBillingCycleDate = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    1
  );
  const nextBillingCycleLabel = nextBillingCycleDate.toLocaleDateString(
    'en-US',
    { month: 'long', day: 'numeric', year: 'numeric' }
  );

  const disabled = member.monthly_cost_cents == null;

  async function handleSign() {
    setLocalError(null);
    if (!street.trim() || !cityStateZip.trim() || !phone.trim()) {
      setLocalError('Please fill in your street address, city/state/zip, and telephone.');
      return;
    }
    const metadata = {
      legacy_member: true,
      member_title: memberTitle,
      street,
      city_state_zip: cityStateZip,
      phone,
      email,
      designation_label: designationLabel,
      monthly_cost_cents: monthlyCostCents,
      next_billing_cycle: nextBillingCycleDate.toISOString().slice(0, 10),
    };
    await onSign(metadata);
  }

  return (
    <div
      className={`border-2 rounded-lg ${
        signed ? 'border-green-400 bg-green-50' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 ${
              signed ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400 border border-gray-300'
            }`}
          >
            {signed ? '✓' : '•'}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Fee Agreement
              {signed && (
                <span className="ml-2 text-green-700 text-xs font-bold uppercase tracking-wider">
                  Signed
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Existing member rate acknowledgement. No first/last-month deposit
              and no proration.
            </div>
            {signed && signedBy && signedAt && (
              <div className="text-xs text-green-800 mt-1 font-medium">
                Signed by {signedBy} on {new Date(signedAt).toLocaleString()}
              </div>
            )}
            {disabled && !signed && (
              <div className="text-xs text-amber-700 mt-1">
                Your administrator hasn&rsquo;t assigned a monthly cost yet.
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-sm border rounded px-3 py-1.5 hover:bg-white bg-white"
          >
            {open ? 'Hide' : signed ? 'Review' : 'Open & sign'}
          </button>
          {signed && (
            <button
              type="button"
              disabled
              className="text-sm bg-green-600 text-white rounded px-4 py-1.5 cursor-default font-semibold"
            >
              ✓ Signed
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t bg-gray-50 p-4 space-y-5">
          <div className="bg-gray-900 text-white text-center font-semibold py-2 rounded">
            MERRITT WORKSPACE FEE AGREEMENT — EXISTING MEMBER
          </div>

          <fieldset disabled={signed} className="space-y-3 disabled:opacity-70">
            <legend className="text-sm font-semibold text-gray-900">Member Information</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Contact Name" value={memberName} readOnly />
              <Field label="Telephone" value={phone} onChange={setPhone} required />
              <Field label="Street Address" value={street} onChange={setStreet} required />
              <Field
                label="City / State / ZIP"
                value={cityStateZip}
                onChange={setCityStateZip}
                required
              />
              <Field label="Email" value={email} readOnly />
              <Field
                label="Title (optional)"
                value={memberTitle}
                onChange={setMemberTitle}
                placeholder="Optional"
              />
            </div>
          </fieldset>

          <div className="bg-white border rounded overflow-hidden">
            <div className="bg-blue-100 text-gray-900 font-semibold text-sm px-3 py-2 flex justify-between">
              <span>MEMBERSHIP DESCRIPTION</span>
              <span>RATE</span>
            </div>
            <div className="px-3 py-2 text-sm">
              <div className="font-semibold text-gray-900">{designationLabel}</div>
            </div>
            <Row
              label="Monthly Membership Fee"
              value={`${formatUsd(monthlyCostCents)}/month`}
            />
          </div>

          <div className="bg-amber-50 border-2 border-amber-400 rounded p-3 text-sm text-amber-900 space-y-2">
            <div className="font-semibold uppercase tracking-wide text-xs">
              What you are agreeing to
            </div>
            <p>
              I, <span className="font-semibold">{memberName}</span>, am an
              existing Merritt Workspace member at the rate of{' '}
              <span className="font-semibold">
                {formatUsd(monthlyCostCents)}/month
              </span>
              . I agree to pay any amount currently owed and continue paying
              this monthly rate on the <span className="font-semibold">1st
              of each billing cycle</span>.
            </p>
            <p>
              <span className="font-semibold">No first/last-month deposit.</span>{' '}
              No proration. If I choose to set up auto-pay from the Payments
              tab, the auto-charge will run on the 1st of each month starting
              with the next billing cycle ({nextBillingCycleLabel}).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded p-3 text-sm">
              <div className="font-semibold mb-2">MEMBER</div>
              <div className="space-y-1 text-xs text-gray-700">
                <div>Name Printed: <span className="text-gray-900">{memberName}</span></div>
                <div className="flex items-center gap-2">
                  <span>Title:</span>
                  <input
                    disabled={signed}
                    value={memberTitle}
                    onChange={(e) => setMemberTitle(e.target.value)}
                    placeholder="Optional"
                    className="border rounded px-2 py-0.5 text-xs flex-1"
                  />
                </div>
                <div>Signature: <em>typed name on the form above</em></div>
                <div>Date: {today.toLocaleDateString()}</div>
              </div>
            </div>
            <div className="bg-white border rounded p-3 text-sm">
              <div className="font-semibold mb-2">MERRITT WORKSPACE</div>
              <div className="space-y-1 text-xs text-gray-700">
                <div>Name Printed: <span className="text-gray-900">{MERRITT_SIGNATORY.name}</span></div>
                <div>Title: {MERRITT_SIGNATORY.title}</div>
                <div>Signature: <em>on file</em></div>
                <div>Date: {today.toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {localError && (
            <div className="bg-red-50 border border-red-300 text-red-900 rounded p-3 text-sm">
              {localError}
            </div>
          )}

          {signed ? (
            <div className="bg-green-100 border border-green-400 rounded p-3 text-center">
              <div className="text-2xl">✓</div>
              <div className="text-sm font-semibold text-green-900">
                Fee Agreement signed
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSign}
                disabled={signing || disabled}
                className="text-sm bg-gray-900 text-white rounded px-6 py-3 hover:bg-gray-800 disabled:opacity-50 font-semibold"
              >
                {signing ? 'Signing…' : 'Sign Fee Agreement'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FeeAgreementSection({
  member,
  memberName,
  designationLabel,
  applicationStartDate,
  signedMetadata,
  signed,
  signedAt,
  signedBy,
  signing,
  onSign,
  reviseRequested,
  onReviseHandled,
}: {
  member: Member;
  memberName: string;
  designationLabel: string;
  applicationStartDate: string | null;
  signedMetadata: Record<string, unknown> | null;
  signed: boolean;
  signedAt: string | null;
  signedBy: string | null;
  signing: boolean;
  onSign: (metadata: Record<string, unknown>) => Promise<boolean>;
  reviseRequested?: boolean;
  onReviseHandled?: () => void;
}) {
  const [open, setOpen] = useState(false);
  // When `revising` is true, a previously-signed agreement is opened for
  // editing so the member can change details (e.g. start date) and re-sign.
  // The backend upserts on (member_id, agreement_type), so re-signing
  // overwrites the prior record.
  const [revising, setRevising] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const editable = !signed || revising;

  // The Payments tab can request that this agreement be opened in revise
  // mode (used by the "change start date" back-button). Honor the request
  // by opening + scrolling, then notify the parent so it doesn't fire again.
  useEffect(() => {
    if (reviseRequested && signed) {
      setRevising(true);
      setOpen(true);
      onReviseHandled?.();
      setTimeout(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }, [reviseRequested, signed, onReviseHandled]);
  const [memberTitle, setMemberTitle] = useState('');
  const [street, setStreet] = useState('');
  const [cityStateZip, setCityStateZip] = useState('');
  const [phone, setPhone] = useState(member.phone || '');
  const [email] = useState(member.email);
  const [federalId, setFederalId] = useState('');
  // If the member has already signed, hydrate the form from the saved
  // metadata so the preview displayed here matches what was actually signed
  // (and what Stripe + the Payments tab will use). Otherwise fall back to
  // sensible defaults for the unsigned/first-time case.
  const signedPaymentMethod: 'card' | 'ach' | null =
    (signedMetadata as any)?.payment_method === 'ach'
      ? 'ach'
      : (signedMetadata as any)?.payment_method === 'card'
        ? 'card'
        : null;
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'ach'>(
    signedPaymentMethod ?? 'card'
  );
  const [localError, setLocalError] = useState<string | null>(null);

  // Invoicing details — default "same as member"
  const [sameAsMember, setSameAsMember] = useState(true);
  const [invCompany, setInvCompany] = useState(member.company_name || '');
  const [invStreet, setInvStreet] = useState('');
  const [invCityStateZip, setInvCityStateZip] = useState('');
  const [invContact, setInvContact] = useState(memberName);
  const [invPhone, setInvPhone] = useState(member.phone || '');
  const [invEmail, setInvEmail] = useState(member.email);

  const monthlyCostCents = member.monthly_cost_cents || 0;
  const oneTime = isOneTimeDesignation(member.designation);

  const today = new Date();
  const { minIso, maxIso } = startDateBounds(today);
  // Prefer the start date that was actually signed (so the preview matches
  // what's saved in metadata and what Stripe will charge); otherwise default
  // to the date the member picked on their application, clamped to the
  // allowed window. Day passes don't have a recurring start date and stay
  // locked to today.
  const signedStartDate =
    typeof (signedMetadata as any)?.start_date === 'string'
      ? ((signedMetadata as any).start_date as string)
      : null;
  const defaultStartIso = (() => {
    if (oneTime) return minIso;
    if (signedStartDate) return signedStartDate;
    const candidate = applicationStartDate || minIso;
    if (candidate < minIso) return minIso;
    if (candidate > maxIso) return maxIso;
    return candidate;
  })();
  const [startDateIso, setStartDateIso] = useState(defaultStartIso);

  // Parse the picked start date into a UTC Date for proration math. Falls
  // back to today if the user clears the field.
  const startDate = (() => {
    try {
      return parseStartDate(startDateIso);
    } catch {
      return parseStartDate(minIso);
    }
  })();

  // Recurring memberships prorate from the chosen start date through the
  // end of that month, plus a one-month deposit. Day passes are a single
  // full-price charge.
  const proratedFirstMonthCents = oneTime
    ? monthlyCostCents
    : calculateProratedFirstMonthCents(monthlyCostCents, startDate);
  const totals = calculateFeeAgreementTotals(
    monthlyCostCents,
    paymentMethod,
    oneTime,
    proratedFirstMonthCents
  );

  const formatLong = (d: Date) =>
    d.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
  const termStart = formatLong(startDate);
  const lastDayOfStartMonth = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth() + 1,
    0,
  ));
  const termEnd = formatLong(lastDayOfStartMonth);
  const firstFullChargeDate = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth() + 1,
    1,
  ));
  const firstFullChargeLabel = formatLong(firstFullChargeDate);

  const disabled = member.monthly_cost_cents == null;

  async function handleSign() {
    setLocalError(null);
    if (!street.trim() || !cityStateZip.trim() || !phone.trim()) {
      setLocalError('Please fill in your street address, city/state/zip, and telephone.');
      return;
    }
    if (!oneTime) {
      if (!startDateIso || startDateIso < minIso || startDateIso > maxIso) {
        setLocalError('Pick a start date between today and 30 days from today.');
        return;
      }
    }
    const invoicing = sameAsMember
      ? {
          company_name: invCompany,
          street,
          city_state_zip: cityStateZip,
          contact_name: memberName,
          phone,
          email,
        }
      : {
          company_name: invCompany,
          street: invStreet,
          city_state_zip: invCityStateZip,
          contact_name: invContact,
          phone: invPhone,
          email: invEmail,
        };
    const metadata = {
      member_title: memberTitle,
      street,
      city_state_zip: cityStateZip,
      phone,
      email,
      federal_id: federalId,
      payment_method: paymentMethod,
      start_date: oneTime ? toIsoDate(today) : startDateIso,
      term_start: termStart,
      term_end: termEnd,
      designation_label: designationLabel,
      monthly_cost_cents: monthlyCostCents,
      one_time: oneTime,
      first_month_cents: totals.firstMonthCents,
      last_month_cents: totals.lastMonthCents,
      cc_fee_cents: totals.ccFeeCents,
      grand_total_cents: totals.grandTotalCents,
      invoicing,
    };
    const ok = await onSign(metadata);
    if (ok) setRevising(false);
  }

  return (
    <div
      ref={sectionRef}
      className={`border-2 rounded-lg ${
        revising
          ? 'border-amber-400 bg-amber-50'
          : signed
            ? 'border-green-400 bg-green-50'
            : 'border-gray-200'
      }`}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 ${
              signed ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400 border border-gray-300'
            }`}
          >
            {signed ? '✓' : '•'}
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              Fee Agreement
              {signed && !revising && (
                <span className="ml-2 text-green-700 text-xs font-bold uppercase tracking-wider">
                  Signed
                </span>
              )}
              {revising && (
                <span className="ml-2 text-amber-700 text-xs font-bold uppercase tracking-wider">
                  Revising — re-sign required
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500">
              {oneTime
                ? 'Auto-generated for your one-day pass. One-time charge (plus a 3.5% fee if paying by card).'
                : 'Auto-generated for your selected plan. Includes first + last month and (if paying by card) a 3.5% processing fee.'}
            </div>
            {signed && signedBy && signedAt && (
              <div className="text-xs text-green-800 mt-1 font-medium">
                Signed by {signedBy} on {new Date(signedAt).toLocaleString()}
              </div>
            )}
            {disabled && !signed && (
              <div className="text-xs text-amber-700 mt-1">
                Your administrator hasn&rsquo;t assigned a monthly cost yet.
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-sm border rounded px-3 py-1.5 hover:bg-white bg-white"
          >
            {open ? 'Hide' : signed ? 'Review' : 'Open & sign'}
          </button>
          {signed && !revising && (
            <button
              type="button"
              onClick={() => {
                setRevising(true);
                setOpen(true);
              }}
              className="text-sm border border-amber-500 text-amber-800 bg-white rounded px-3 py-1.5 hover:bg-amber-50 font-semibold"
            >
              Revise &amp; re-sign
            </button>
          )}
          {revising && (
            <button
              type="button"
              onClick={() => setRevising(false)}
              className="text-sm border rounded px-3 py-1.5 hover:bg-white bg-white"
            >
              Cancel revision
            </button>
          )}
          {signed && !revising && (
            <button
              type="button"
              disabled
              className="text-sm bg-green-600 text-white rounded px-4 py-1.5 cursor-default font-semibold"
            >
              ✓ Signed
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t bg-gray-50 p-4 space-y-5">
          {/* Document preview header */}
          <div className="bg-gray-900 text-white text-center font-semibold py-2 rounded">
            MERRITT WORKSPACE FEE AGREEMENT
          </div>

          {revising && (
            <div className="bg-amber-100 border border-amber-400 rounded p-3 text-xs text-amber-900">
              <strong>Revising your Fee Agreement.</strong> Update any details
              (most often the start date) and click <em>Re-sign Fee Agreement</em>{' '}
              to record a new signature with today&apos;s date. Your previous
              signature will be replaced.
            </div>
          )}

          {/* Member Information */}
          <fieldset disabled={!editable} className="space-y-3 disabled:opacity-70">
            <legend className="text-sm font-semibold text-gray-900">Member Information</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Contact Name" value={memberName} readOnly />
              <Field label="Company Federal ID #" value={federalId} onChange={setFederalId} placeholder="Optional" />
              <Field label="Street Address" value={street} onChange={setStreet} required />
              <Field label="Telephone" value={phone} onChange={setPhone} required />
              <Field label="City / State / ZIP" value={cityStateZip} onChange={setCityStateZip} required />
              <Field label="Email" value={email} readOnly />
            </div>

            {/* Invoicing Details */}
            <div className="pt-2">
              <div className="flex items-center justify-between">
                <legend className="text-sm font-semibold text-gray-900">Invoicing Details</legend>
                <label className="text-xs text-gray-600 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sameAsMember}
                    onChange={(e) => setSameAsMember(e.target.checked)}
                  />
                  Same as member info
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <Field label="Company Name" value={invCompany} onChange={setInvCompany} />
                <Field
                  label="Contact Name"
                  value={sameAsMember ? memberName : invContact}
                  onChange={setInvContact}
                  readOnly={sameAsMember}
                />
                <Field
                  label="Street Address"
                  value={sameAsMember ? street : invStreet}
                  onChange={setInvStreet}
                  readOnly={sameAsMember}
                />
                <Field
                  label="Telephone"
                  value={sameAsMember ? phone : invPhone}
                  onChange={setInvPhone}
                  readOnly={sameAsMember}
                />
                <Field
                  label="City / State / ZIP"
                  value={sameAsMember ? cityStateZip : invCityStateZip}
                  onChange={setInvCityStateZip}
                  readOnly={sameAsMember}
                />
                <Field
                  label="Email"
                  value={sameAsMember ? email : invEmail}
                  onChange={setInvEmail}
                  readOnly={sameAsMember}
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs text-gray-600 mb-1">Payment method</label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                  />
                  Credit card (3.5% processing fee applies)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={paymentMethod === 'ach'}
                    onChange={() => setPaymentMethod('ach')}
                  />
                  ACH / EFT (no fee)
                </label>
              </div>
            </div>

            {!oneTime && (
              <div className="pt-2">
                <label
                  htmlFor="fee-agreement-start-date"
                  className="block text-sm font-semibold text-gray-900"
                >
                  Membership Start Date
                </label>
                <p className="text-xs text-gray-600 mt-1">
                  Pick the day you want your membership to begin. Today through 30 days
                  from today are available.
                </p>
                <input
                  id="fee-agreement-start-date"
                  type="date"
                  value={startDateIso}
                  min={minIso}
                  max={maxIso}
                  onChange={(e) => setStartDateIso(e.target.value)}
                  disabled={!editable}
                  className="mt-2 border rounded px-3 py-2 text-sm"
                />

                <div className="mt-3 bg-amber-50 border-2 border-amber-400 rounded p-3 text-sm text-amber-900 space-y-2">
                  <div className="font-semibold uppercase tracking-wide text-xs text-amber-900">
                    Important — please read before signing
                  </div>
                  <p>
                    By signing today, you authorize Merritt Workspace to charge{' '}
                    <span className="font-semibold">{formatUsd(totals.grandTotalCents)}</span>{' '}
                    to your selected payment method <em>immediately</em>. This charge
                    covers a <span className="font-semibold">prorated first month</span>{' '}
                    ({formatUsd(totals.firstMonthCents)} for{' '}
                    {termStart} – {termEnd}) plus a{' '}
                    <span className="font-semibold">one-month deposit</span>{' '}
                    ({formatUsd(totals.lastMonthCents)})
                    {paymentMethod === 'card' && (
                      <> plus a 3.5% card processing fee ({formatUsd(totals.ccFeeCents)})</>
                    )}
                    .
                  </p>
                  <p>
                    Your <span className="font-semibold">first full-month charge</span>{' '}
                    of {formatUsd(monthlyCostCents)} will hit on{' '}
                    <span className="font-semibold">{firstFullChargeLabel}</span>, and
                    every 1st of the month thereafter.
                  </p>
                  <p className="font-semibold">
                    You will NOT have access to the workspace until {termStart}.
                    Building access codes, door entry, and on-site amenities only
                    activate on your selected start date.
                  </p>
                  <p className="text-xs text-amber-800">
                    Need to change your start date after signing? You'll need to
                    contact Merritt Workspace staff — members can't change it
                    themselves once the agreement is signed.
                  </p>
                </div>
              </div>
            )}
          </fieldset>

          {/* Description */}
          <div className="text-xs text-gray-700 bg-white border rounded p-3">
            <div className="font-semibold mb-1">DESCRIPTION OF SIGNATURE PAGE</div>
            This page shall act as a binding agreement between Merritt Workspace and the
            Member, as named above. By signing this CoWork Space Agreement (CSA), the member
            fully acknowledges and hereby agrees to be bound by the financial terms and
            conditions as stated in this Agreement and the accompanying CoWork Space Terms
            and Conditions.{' '}
            {oneTime ? (
              <>
                <em>*Please note*</em> This is a one-time, single-day day pass. It does not
                renew and is not a recurring membership.
              </>
            ) : (
              <>
                <em>*Please note*</em> When the stated term (timeframe) of the Agreement has
                ended, the financial terms shall renew automatically, less any discounts (if
                applicable).
              </>
            )}
          </div>

          {/* Membership Description / Totals */}
          <div className="bg-white border rounded overflow-hidden">
            <div className="bg-blue-100 text-gray-900 font-semibold text-sm px-3 py-2 flex justify-between">
              <span>MEMBERSHIP DESCRIPTION</span>
              <span>TOTAL</span>
            </div>
            <div className="px-3 py-2 text-sm">
              <div className="font-semibold text-gray-900">{designationLabel}</div>
            </div>
            {oneTime ? (
              <Row
                label={`One Day Membership Fee (${termStart})`}
                value={formatUsd(totals.firstMonthCents)}
              />
            ) : (
              <>
                <Row
                  label={`First Month's Membership Fee — prorated (${termStart} – ${termEnd})`}
                  value={formatUsd(totals.firstMonthCents)}
                />
                <Row label="Last Month's Membership Fee" value={formatUsd(totals.lastMonthCents)} />
              </>
            )}
            {paymentMethod === 'card' ? (
              <>
                <Row label="3.5% Credit Card Fee" value={formatUsd(totals.ccFeeCents)} />
                <div className="px-3 pb-2 text-xs text-amber-700 bg-yellow-50">
                  (Disregard if paying by ACH or EFT)
                </div>
              </>
            ) : (
              <div className="px-3 py-2 text-xs text-gray-600">
                Paying by ACH / EFT — no credit card fee.
              </div>
            )}
            <div className="bg-gray-100 px-3 py-2 text-sm font-semibold flex justify-between border-t">
              <span>GRAND TOTAL</span>
              <span>{formatUsd(totals.grandTotalCents)}</span>
            </div>
          </div>

          {/* Signature blocks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border rounded p-3 text-sm">
              <div className="font-semibold mb-2">MEMBER</div>
              <div className="space-y-1 text-xs text-gray-700">
                <div>Name Printed: <span className="text-gray-900">{memberName}</span></div>
                <div className="flex items-center gap-2">
                  <span>Title:</span>
                  <input
                    disabled={!editable}
                    value={memberTitle}
                    onChange={(e) => setMemberTitle(e.target.value)}
                    placeholder="Optional"
                    className="border rounded px-2 py-0.5 text-xs flex-1"
                  />
                </div>
                <div>Signature: <em>typed name on the form above</em></div>
                <div>Date: {today.toLocaleDateString()}</div>
              </div>
            </div>
            <div className="bg-white border rounded p-3 text-sm">
              <div className="font-semibold mb-2">MERRITT WORKSPACE</div>
              <div className="space-y-1 text-xs text-gray-700">
                <div>Name Printed: <span className="text-gray-900">{MERRITT_SIGNATORY.name}</span></div>
                <div>Title: {MERRITT_SIGNATORY.title}</div>
                <div>Signature: <em>on file</em></div>
                <div>Date: {today.toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {localError && (
            <div className="bg-red-50 border border-red-300 text-red-900 rounded p-3 text-sm">
              {localError}
            </div>
          )}

          {signed && !revising ? (
            <div className="bg-green-100 border border-green-400 rounded p-3 text-center">
              <div className="text-2xl">✓</div>
              <div className="text-sm font-semibold text-green-900">
                Fee Agreement signed
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              {revising && (
                <button
                  type="button"
                  onClick={() => setRevising(false)}
                  disabled={signing}
                  className="text-sm border rounded px-4 py-3 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleSign}
                disabled={signing || disabled}
                className="text-sm bg-gray-900 text-white rounded px-6 py-3 hover:bg-gray-800 disabled:opacity-50 font-semibold"
              >
                {signing
                  ? 'Signing\u2026'
                  : revising
                    ? 'Re-sign Fee Agreement'
                    : 'Sign Fee Agreement'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-600">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        placeholder={placeholder}
        className={`mt-1 w-full border rounded px-2 py-1.5 text-sm ${
          readOnly ? 'bg-gray-100 text-gray-700' : 'bg-white'
        }`}
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1.5 text-sm flex justify-between border-t">
      <span className="text-gray-700">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

// --- Payments tab ---
function PaymentsTab({
  member,
  payments,
  agreements,
  onReviseFeeAgreement,
  onSkipPayment,
}: {
  member: Member;
  payments: PaymentHistoryRow[];
  agreements: AgreementRow[];
  onReviseFeeAgreement: () => void;
  onSkipPayment?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  // A cancellation has been recorded once we have an effective end date on
  // file. We don't rely on subscription_status here because Stripe webhooks
  // sync that field back to whatever Stripe reports — and our new cancel
  // flow uses `cancel_at` (not `cancel_at_period_end`), so sub.status stays
  // 'active' until the cancel_at date is reached. The local
  // cancellation_effective_date is the source of truth for "notice given".
  const cancelPending = !!member.cancellation_effective_date;

  // Read the payment method the member selected when they signed the fee
  // agreement ("card" or "ach"). This drives the copy + button label below.
  const feeAgreement = agreements.find((a) => a.agreement_type === 'fee_agreement');
  const feeMeta = (feeAgreement?.metadata as Record<string, unknown> | null | undefined) || {};
  const selectedMethod: 'card' | 'ach' =
    (feeMeta as any)?.payment_method === 'ach' ? 'ach' : 'card';
  const isAch = selectedMethod === 'ach';

  // Compute the upfront amounts from the member's current monthly rate and
  // the signed start date. Stripe Checkout
  // (app/api/portal/create-subscription/route.ts) runs the same math against
  // member.monthly_cost_cents at charge time, and the Fee Agreement preview
  // re-renders from that field too, so all three surfaces stay in sync —
  // including when an admin adjusts the rate after the agreement was signed.
  const oneTime = isOneTimeDesignation(member.designation);
  const monthlyCostCents = member.monthly_cost_cents || 0;
  const startDateIso = typeof (feeMeta as any)?.start_date === 'string'
    ? ((feeMeta as any).start_date as string)
    : null;
  const startDate = (() => {
    if (!startDateIso) return new Date();
    try {
      return parseStartDate(startDateIso);
    } catch {
      return new Date();
    }
  })();
  const proratedCents = oneTime
    ? monthlyCostCents
    : calculateProratedFirstMonthCents(monthlyCostCents, startDate);
  const totals = calculateFeeAgreementTotals(
    monthlyCostCents,
    selectedMethod,
    oneTime,
    proratedCents,
  );
  const firstMonthCents = totals.firstMonthCents;
  const lastMonthCents = totals.lastMonthCents;
  const ccFeeCents = totals.ccFeeCents;
  const grandTotalCents = totals.grandTotalCents;

  // First recurring charge fires on the 1st of the month after the chosen
  // start date. Format that date for the next-charge note. Day passes don't
  // recur, so this isn't shown.
  const firstRecurringCharge = new Date(Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth() + 1,
    1,
  ));
  const firstRecurringChargeLabel = firstRecurringCharge.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  // Legacy members don't have a signed start_date — there's no proration and
  // no upfront charge. Their first auto-pay charge fires on the 1st of the
  // upcoming month, which is the only date we promise them on the agreement.
  const legacyAutoPayStartLabel = (() => {
    if (!member.is_legacy_member) return null;
    const today = new Date();
    const next = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return next.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  })();

  // ACH subscriptions start in `incomplete` and move to `active` only after
  // the first invoice settles (3–5 business days). Surface this so members
  // know their setup is in flight, not broken.
  const achProcessing =
    isAch &&
    !!member.stripe_subscription_id &&
    (member.subscription_status === 'incomplete' ||
      member.subscription_status === 'past_due');

  async function cancelMembership() {
    const ok = window.confirm(
      'Cancel your membership?\n\n' +
        'CANCELLATION POLICY (30-DAY NOTICE REQUIRED):\n' +
        '• Submitting this cancellation serves as your written 30-day notice.\n' +
        '• Your access continues through the end of the current billing period.\n' +
        '• You will NOT be billed for your final month — the Last Month\'s Membership Fee you paid at sign-up will be applied to that month.\n' +
        '• If you fail to provide a full 30 days\' notice (e.g. by abandoning the space sooner), the Last Month\'s Membership Fee is forfeited as liquidated damages.\n' +
        '• Starting the day after this notice and through your last day, Merritt Workspace may inspect the workspace and assess additional charges for damage, excessive wear, missing items, or restoration.\n\n' +
        'This cannot be undone from the portal — contact us to reactivate.'
    );
    if (!ok) return;
    setCancelLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/portal/cancel-subscription', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to cancel');
      }
      window.location.reload();
    } catch (e: any) {
      alert(e.message);
      setCancelLoading(false);
    }
  }

  // Detect a successful initial Checkout payment that hasn't yet been
  // attached to a subscription. Initial Checkout payments are recorded with
  // a stripe_payment_intent_id but no stripe_invoice_id (recurring invoice
  // charges have an invoice_id). If we find one, the member already paid
  // for sign-up — don't let them click "Set up auto-pay" again and incur a
  // second charge while we (or staff) finalize the subscription.
  const hasInitialPayment = payments.some(
    (p) => p.status === 'succeeded' && !p.stripe_invoice_id
  );

  const canSetUp =
    member.agreement_signed &&
    member.monthly_cost_cents != null &&
    !member.stripe_subscription_id &&
    !hasInitialPayment;

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

  // Members can step back to the agreements step to revise their Fee
  // Agreement (typically to update the start date if time has passed since
  // they originally signed). Hidden once auto-pay is set up — at that point
  // start-date changes need to go through the team.
  const canReviseFeeAgreement = !member.stripe_subscription_id;

  return (
    <div className="space-y-6">
      {canReviseFeeAgreement && (
        <div className="bg-white border rounded p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-gray-700">
            Need to change your start date or other Fee Agreement details before
            paying? You can go back and re-sign with new information.
          </div>
          <button
            type="button"
            onClick={onReviseFeeAgreement}
            className="text-sm border border-gray-300 rounded px-3 py-1.5 hover:bg-gray-50 font-medium"
          >
            ← Back &amp; revise Fee Agreement
          </button>
        </div>
      )}

      <section className="bg-white border rounded p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Monthly membership</h2>
        {member.monthly_cost_cents == null ? (
          <p className="text-sm text-gray-500">
            Your administrator hasn&apos;t assigned a monthly cost yet.
          </p>
        ) : !member.stripe_subscription_id ? (
          member.is_legacy_member ? (
            <>
              <p className="text-sm text-gray-700">
                Your monthly cost is{' '}
                <span className="font-semibold">{formatUsd(monthlyCostCents)}</span>
                . As an existing member, there is{' '}
                <span className="font-semibold">no first/last-month deposit</span>{' '}
                and no proration. Setting up auto-pay just authorizes the
                normal monthly charge on the 1st of each month going forward.
              </p>

              {legacyAutoPayStartLabel && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
                  <strong>If you set up auto-pay today,</strong> your first
                  auto-charge of{' '}
                  <span className="font-semibold">{formatUsd(monthlyCostCents)}</span>{' '}
                  will run on{' '}
                  <span className="font-semibold">{legacyAutoPayStartLabel}</span>{' '}
                  (the 1st of the next billing cycle), and on the 1st of every
                  month after that. Nothing is charged today.
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-gray-700">
                Your monthly cost is{' '}
                <span className="font-semibold">{formatUsd(monthlyCostCents)}</span>
                {oneTime
                  ? ' (one-time charge — day pass).'
                  : ', billed on the 1st of each month (first charge prorated).'}
              </p>

              <div className="mt-4 border rounded bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  Due today — matches your signed Fee Agreement
                </div>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-700">
                      {oneTime
                        ? 'One Day Membership Fee'
                        : 'First Month Membership Fee (prorated)'}
                    </dt>
                    <dd className="font-medium text-gray-900">
                      {formatUsd(firstMonthCents)}
                    </dd>
                  </div>
                  {!oneTime && (
                    <div className="flex justify-between">
                      <dt className="text-gray-700">
                        Last Month&apos;s Membership Fee (deposit)
                      </dt>
                      <dd className="font-medium text-gray-900">
                        {formatUsd(lastMonthCents)}
                      </dd>
                    </div>
                  )}
                  {selectedMethod === 'card' && (
                    <div className="flex justify-between">
                      <dt className="text-gray-700">
                        Credit Card Processing Fee (3.5%)
                      </dt>
                      <dd className="font-medium text-gray-900">
                        {formatUsd(ccFeeCents)}
                      </dd>
                    </div>
                  )}
                  {isAch && (
                    <div className="flex justify-between text-xs text-green-800">
                      <dt>Paying by ACH / EFT — no processing fee.</dt>
                      <dd>—</dd>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2 flex justify-between text-base">
                    <dt className="font-semibold text-gray-900">Total due today</dt>
                    <dd className="font-bold text-gray-900">
                      {formatUsd(grandTotalCents)}
                    </dd>
                  </div>
                </dl>
              </div>

              {!oneTime && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-900">
                  <strong>What happens next:</strong> After this initial payment,
                  you&apos;ll be charged{' '}
                  <span className="font-semibold">{formatUsd(monthlyCostCents)}/month</span>{' '}
                  automatically on the 1st of every month, starting{' '}
                  <span className="font-semibold">{firstRecurringChargeLabel}</span>.
                  {selectedMethod === 'card' && ' (No card processing fee on recurring charges.)'}
                </div>
              )}
            </>
          )
        ) : (
          <p className="text-sm text-gray-700">
            Your monthly cost is{' '}
            <span className="font-semibold">{formatUsd(monthlyCostCents)}</span>
            , billed on the 1st of each month.
          </p>
        )}

        {member.stripe_subscription_id ? (
          <div className="mt-4 space-y-2">
            <div className="text-sm text-green-700">
              ✓ Auto-pay is set up{isAch ? ' via ACH bank debit' : ''}. Status:{' '}
              {member.subscription_status || 'active'}
            </div>
            {achProcessing && (
              <div className="bg-blue-50 border border-blue-300 text-blue-900 rounded p-3 text-xs">
                Your ACH bank transfer is being verified. It can take 3–5 business
                days for your first payment to clear. You don&apos;t need to do
                anything — we&apos;ll email you once it settles.
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={openBillingPortal}
                disabled={portalLoading}
                className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
              >
                {portalLoading ? 'Opening…' : 'Manage payment method'}
              </button>
              {!cancelPending && !oneTime && (
                <button
                  onClick={cancelMembership}
                  disabled={cancelLoading}
                  className="text-sm border border-red-300 text-red-700 rounded px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
                >
                  {cancelLoading ? 'Cancelling…' : 'Cancel membership'}
                </button>
              )}
            </div>
            {!cancelPending && !oneTime && (
              <div className="mt-2 bg-gray-50 border border-gray-200 rounded p-3 text-xs text-gray-700 space-y-1">
                <p className="font-semibold text-gray-900">
                  Cancellation policy (30-day notice required)
                </p>
                <p>
                  Clicking <span className="font-semibold">Cancel membership</span>{' '}
                  serves as your written 30-day notice. Your access continues
                  through the end of the current billing period, and you will{' '}
                  <span className="font-semibold">not be billed</span> for your
                  final month — the Last Month&apos;s Membership Fee you paid at
                  sign-up is applied to that month.
                </p>
                <p>
                  If you do not provide a full 30 days&apos; notice (e.g. by
                  abandoning the space sooner), the Last Month&apos;s Membership
                  Fee is forfeited as liquidated damages. Beginning the day
                  after notice is received and through your last day of
                  membership, Merritt Workspace is entitled to inspect the
                  workspace and assess additional charges for damage, excessive
                  wear, missing items, or restoration.
                </p>
              </div>
            )}
            {cancelPending && (
              <div className="mt-2 bg-amber-50 border border-amber-300 rounded p-3 text-xs text-amber-900 space-y-1">
                <p className="font-semibold">
                  Your membership is set to end
                  {member.cancellation_effective_date
                    ? ` on ${new Date(member.cancellation_effective_date + 'T00:00:00Z').toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}.`
                    : ' at the end of your final billing month.'}
                </p>
                <p>
                  Your written 30-day cancellation notice has been received.
                  You will <span className="font-semibold">NOT be billed</span>{' '}
                  for your final month — the Last Month&apos;s Membership Fee
                  you paid at sign-up has been applied as a credit against the
                  upcoming invoice, which will net to{' '}
                  <span className="font-semibold">$0.00</span>. No further
                  charges will be issued.
                </p>
                <p>
                  Beginning the day after this notice and through your last day
                  of membership, Merritt Workspace is entitled to inspect the
                  workspace and assess additional charges for any damage,
                  excessive wear, missing items, or required restoration. Please
                  return all keys, access devices, and Merritt-provided
                  equipment by your last day (keys not returned within 48 hours
                  of your last day are subject to a $250 fee per item).
                </p>
              </div>
            )}
          </div>
        ) : hasInitialPayment ? (
          <div className="mt-4 bg-blue-50 border border-blue-300 text-blue-900 rounded p-3 text-sm">
            <strong>We&apos;ve received your initial payment.</strong> Your
            subscription is being finalized — please don&apos;t pay again. If
            this section hasn&apos;t updated within an hour, email{' '}
            memberservices@merrittworkspace.net and we&apos;ll set up auto-pay
            against the payment you already made (no second charge).
          </div>
        ) : (
          <>
            {member.agreement_signed && (
              <div
                className={`mt-4 rounded border p-3 text-xs ${
                  isAch
                    ? 'bg-green-50 border-green-300 text-green-900'
                    : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              >
                {isAch ? (
                  <>
                    <strong>ACH auto-debit selected.</strong> You chose to pay by
                    bank debit in your signed Fee Agreement — no 3.5% card fee.
                    On the next screen, connect your bank through Stripe&apos;s
                    secure Financial Connections flow. Your monthly membership
                    will auto-debit from that account on the 1st of each month.
                    First payment may take 3–5 business days to clear.
                  </>
                ) : (
                  <>
                    <strong>Credit card auto-pay selected.</strong> Based on your
                    signed Fee Agreement. A 3.5% processing fee applies. To
                    switch to ACH bank debit (no fee), contact
                    memberservices@merrittworkspace.net before completing checkout.
                  </>
                )}
              </div>
            )}
            {member.is_legacy_member && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded p-4 text-sm text-gray-800 space-y-2">
                <p className="font-semibold text-orange-900">
                  Auto-pay is optional for existing members
                </p>
                <p>
                  As an existing Merritt Workspace member, you don&apos;t have to
                  switch to auto-pay. If you set it up, your monthly fee of{' '}
                  <span className="font-semibold">{formatUsd(monthlyCostCents)}</span>{' '}
                  will simply be auto-charged on the 1st of each month going
                  forward — you will <strong>not</strong> be charged a first
                  month / last month deposit, and there is no proration.
                </p>
                <p>
                  Prefer to keep your current billing arrangement? You can skip
                  this step entirely. Your membership stays active and our team
                  will continue to invoice you the way you do today.
                </p>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={startCheckout}
                disabled={!canSetUp || loading}
                className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
              >
                {loading
                  ? 'Loading…'
                  : isAch
                    ? 'Set up ACH auto-debit'
                    : member.is_legacy_member
                      ? 'Set up auto-pay (optional)'
                      : 'Set up auto-pay'}
              </button>
              {member.is_legacy_member && member.onboarding_unlocked && onSkipPayment && (
                <button
                  type="button"
                  onClick={onSkipPayment}
                  className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 text-sm font-medium"
                >
                  Skip — keep my current billing
                </button>
              )}
            </div>
          </>
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
          <>
            {payments.some((p) => p.status === 'refunded') && (
              <div className="mb-3 bg-amber-50 border border-amber-300 text-amber-900 rounded p-3 text-xs">
                <strong>Refund in progress.</strong> One or more of your payments
                has been refunded. Refunds typically take{' '}
                <span className="font-semibold">3–5 business days</span> to appear
                back on your original payment method. Contact{' '}
                memberservices@merrittworkspace.net if you don&apos;t see the
                refund after 5 business days.
              </div>
            )}
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
                {payments.map((p) => {
                  const isRefunded = p.status === 'refunded';
                  return (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2">{p.paid_at?.slice(0, 10) || p.created_at.slice(0, 10)}</td>
                      <td>{p.description || '—'}</td>
                      <td>${(p.amount_cents / 100).toFixed(2)}</td>
                      <td>
                        <span
                          className={
                            isRefunded
                              ? 'inline-flex items-center rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 text-xs font-medium'
                              : 'capitalize'
                          }
                        >
                          {isRefunded ? 'Refunded' : p.status}
                        </span>
                      </td>
                      <td>
                        {p.invoice_pdf_url && (
                          <a className="text-blue-600 hover:underline" href={p.invoice_pdf_url}>
                            Invoice
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  );
}

// Member-editable spot for declaring which dedicated desk they're taking or
// which private office they'd like. The desk/office number is the same field
// admins manage in the admin panel — saving here updates `members` directly
// and emails member services so they can confirm the seat is available.
function WorkspaceAssignmentSection({
  member,
  onMemberChange,
}: {
  member: Member;
  onMemberChange: (m: Member) => void;
}) {
  const designation = member.designation;
  const isOffice =
    designation === 'private_office_single' ||
    designation === 'private_office_double' ||
    designation === 'private_office_large';
  const isDesk =
    designation === 'dedicated_desk' || designation === 'one_day_dedicated_desk';
  const editable = isOffice || isDesk;

  const initial = isOffice ? member.office_number || '' : member.desk_number || '';
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Keep the input in sync if the member record refreshes (e.g. admin override).
  useEffect(() => {
    setValue(initial);
  }, [initial]);

  if (!editable) {
    return null;
  }

  const labelTitle = isOffice ? 'Your Office' : 'Your Dedicated Desk';
  const helper = isOffice
    ? "Tell us which office you'd like. Member services will confirm availability and finalize your assignment."
    : `Add the desk you're taking using the format DD# (for example, DD4). ` +
      `Desks run from DD${DD_MIN} to DD${DD_MAX}, and a desk that's already ` +
      `claimed can't be selected. Member services will confirm and update building records.`;
  // Physical marking policy: a claimed desk must never look empty, or trial-day
  // visitors and other members will assume it's up for grabs.
  const markingPolicy =
    `Once you've claimed your desk, please leave something on it to mark it as ` +
    `yours — anything from a business card or sticky note to your full setup ` +
    `(monitor, keyboard, personal items). An empty desk looks available, so a ` +
    `marker is what tells other members and visitors it's taken.`;
  const placeholder = isOffice ? 'e.g. 104' : 'e.g. DD4';
  const fieldLabel = isOffice ? 'Office number' : 'Desk number';
  const currentLabel = isOffice ? 'Current office:' : 'Current desk:';
  const currentValue = isOffice ? member.office_number : member.desk_number;

  const trimmed = value.trim();
  const baseline = (currentValue || '').trim();
  const dirty = trimmed !== baseline;

  async function save() {
    // Validate the DD# format up front so desk members get instant feedback
    // before we hit the server. Empty is allowed (clears the desk).
    let deskValue: string | null = null;
    if (isDesk && trimmed) {
      const result = normalizeDeskNumber(trimmed);
      if (!result.ok) {
        setStatus({ kind: 'err', text: result.error });
        return;
      }
      deskValue = result.value;
    }

    setSaving(true);
    setStatus(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const body: Record<string, string | null> = isOffice
        ? { office_number: trimmed || null }
        : { desk_number: deskValue };
      const res = await fetch('/api/portal/assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onMemberChange(data.member);
      setStatus({
        kind: 'ok',
        text:
          isDesk && deskValue
            ? "Saved! Member services has been notified. Don't forget to leave something on your desk to mark it as yours."
            : 'Saved! Member services has been notified.',
      });
    } catch (e: any) {
      setStatus({ kind: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-white border rounded-lg p-6">
      <h3 className="font-semibold text-gray-900 mb-1">{labelTitle}</h3>
      <p className="text-sm text-gray-600 mb-4">{helper}</p>
      {isDesk && (
        <div className="mb-4 rounded border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
          <span className="font-semibold">Mark your desk:</span> {markingPolicy}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {fieldLabel}
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            maxLength={32}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="bg-gray-900 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {currentValue && (
        <p className="mt-3 text-xs text-gray-500">
          {currentLabel} <span className="font-mono">{currentValue}</span>
        </p>
      )}
      {status && (
        <p
          className={`mt-2 text-sm ${
            status.kind === 'ok' ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {status.text}
        </p>
      )}
      {isDesk && status?.kind === 'err' && (
        <p className="mt-1 text-xs text-gray-600">
          Think there&apos;s a mistake? Call member services at{' '}
          <a
            href={`tel:${MEMBER_SERVICES_PHONE_TEL}`}
            className="text-orange-700 hover:underline"
          >
            {MEMBER_SERVICES_PHONE_DISPLAY}
          </a>{' '}
          or email{' '}
          <a
            href={`mailto:${MEMBER_SERVICES_EMAIL}`}
            className="text-orange-700 hover:underline break-all"
          >
            {MEMBER_SERVICES_EMAIL}
          </a>
          .
        </p>
      )}
    </section>
  );
}

// --- Onboarding tab ---
function OnboardingTab({
  member,
  accessRequestStatus,
  setAccessRequestStatus,
  onMemberChange,
}: {
  member: Member;
  accessRequestStatus: string | null;
  setAccessRequestStatus: (s: string | null) => void;
  onMemberChange: (m: Member) => void;
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
      setAccessRequestStatus("Requested! We'll email your code shortly.");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <section className="bg-white border rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Hello {member.first_name}, welcome to the Merritt Workspace community!
        </h2>
        <p className="text-sm text-gray-700">
          We&apos;re thrilled to have you with us. Now that your membership is complete, we want to
          make sure you have everything you need to get started. Below you&apos;ll find all the
          essential information about your workspace.
        </p>
      </section>

      <WorkspaceAssignmentSection member={member} onMemberChange={onMemberChange} />

      {/* About Merritt Workspace */}
      <section className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">About Merritt Workspace</h3>
        <div className="text-sm text-gray-700 space-y-3">
          <p>
            Merritt Workspace is made up of two historic buildings in the heart of Sloan&apos;s
            Lake: the original 1905 Merritt Methodist Church and the adjacent 1956 Auxiliary
            Building. After the church closed its doors following more than a century of serving
            the neighborhood, founder Lance Nading carefully transformed both buildings into
            Denver&apos;s most distinctive coworking environment — preserving the soaring
            ceilings, original wood floors, stained glass, and remarkable acoustics that make this
            space one-of-a-kind.
          </p>
          <p>
            Today, the 1956 building is a modern coworking facility with 14 thoughtfully designed
            private offices and state-of-the-art amenities, welcoming everyone from solo
            freelancers to growing teams. The 1905 church sanctuary serves as our event and flex
            space, hosting a variety of wellness and community events throughout the week —
            including yoga, fitness classes, workshops, and member gatherings.
          </p>
        </div>
      </section>

      {/* Management Team contact info */}
      <section className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">Who to Contact</h3>
        <p className="text-sm text-gray-600 mb-4">
          Merritt Workspace has two dedicated contact channels — please use the right one so your
          request gets to the right person quickly.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Manager */}
          <div className="border border-burnt-orange-200 rounded-lg p-4 bg-orange-50">
            <h4 className="font-semibold text-gray-900">Manager</h4>
            <p className="text-xs text-gray-600 mt-1">
              Best for: new member onboarding, tours, membership-level changes, and
              high-level workspace matters.
            </p>
            <ul className="mt-3 text-sm text-gray-700 space-y-1">
              <li>
                <span className="font-medium">Phone:</span>{' '}
                <a href="tel:+17203579499" className="text-orange-700 hover:underline">
                  (720) 357-9499
                </a>
              </li>
              <li>
                <span className="font-medium">Email:</span>{' '}
                <a
                  href="mailto:manager@merrittworkspace.net"
                  className="text-orange-700 hover:underline break-all"
                >
                  manager@merrittworkspace.net
                </a>
              </li>
            </ul>
          </div>

          {/* Member Services */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h4 className="font-semibold text-gray-900">Member Services</h4>
            <p className="text-xs text-gray-600 mt-1">
              Best for: day-to-day member support, building access code setup, cubbies,
              mail, snack shop questions, conference room help, and anything else you
              need as an existing member.
            </p>
            <ul className="mt-3 text-sm text-gray-700 space-y-1">
              <li>
                <span className="font-medium">Phone:</span>{' '}
                <a href="tel:+13033598337" className="text-orange-700 hover:underline">
                  (303) 359-8337
                </a>
              </li>
              <li>
                <span className="font-medium">Email:</span>{' '}
                <a
                  href="mailto:memberservices@merrittworkspace.net"
                  className="text-orange-700 hover:underline break-all"
                >
                  memberservices@merrittworkspace.net
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-700">
          <p>
            <span className="font-medium">Website:</span>{' '}
            <a
              href="https://www.merrittworkspace.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-700 hover:underline"
            >
              www.merrittworkspace.net
            </a>
          </p>
          <p className="mt-1">
            <span className="font-medium">Address:</span> 2246 Irving St, Denver, CO 80211
          </p>
        </div>
      </section>

      {/* Getting Started */}
      <section className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Getting Started</h3>

        <div className="space-y-5 text-sm text-gray-700">
          <div>
            <h4 className="font-semibold text-gray-900">WiFi</h4>
            <p className="mt-1">Connect to WiFi using the following credentials:</p>
            <ul className="mt-1 list-disc pl-5 space-y-0.5">
              <li>
                Username: <code className="bg-gray-100 px-1 rounded">merrittcowork</code>
              </li>
              <li>
                Password: <code className="bg-gray-100 px-1 rounded">Merritt23X</code>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900">Kitchen &amp; Snack Shop</h4>
            <p className="mt-1">How to use the kitchen:</p>
            <ul className="mt-1 list-disc pl-5 space-y-0.5">
              <li>
                Go to our website and under &ldquo;Member Resources&rdquo; select &ldquo;SnackShop&rdquo;
              </li>
              <li>Put desired items in cart and checkout</li>
            </ul>
            <p className="mt-2">
              Snack Shop:{' '}
              <a
                href="https://www.merrittworkspace.net/snackshop"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-700 hover:underline"
              >
                www.merrittworkspace.net/snackshop
              </a>
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900">Lock / Unlock Building</h4>
            <p className="mt-1">
              Getting in and out of the building <strong>outside of normal business hours
              (8:00 AM – 6:00 PM)</strong>:
            </p>
            <ul className="mt-1 list-disc pl-5 space-y-0.5">
              <li>Use the main entrance if between 8:00 AM – 6:00 PM.</li>
              <li>
                Outside normal hours — you will receive a YouTube tutorial along with your
                security access code.
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900">Cubbies &amp; Mail</h4>
            <ul className="mt-1 list-disc pl-5 space-y-0.5">
              <li>
                <span className="font-medium">Want a cubby?</span> Email{' '}
                <a
                  href="mailto:memberservices@merrittworkspace.net"
                  className="text-orange-700 hover:underline"
                >
                  memberservices@merrittworkspace.net
                </a>
                .
              </li>
              <li>
                <span className="font-medium">Send / Receive Mail?</span> Email{' '}
                <a
                  href="mailto:memberservices@merrittworkspace.net"
                  className="text-orange-700 hover:underline"
                >
                  memberservices@merrittworkspace.net
                </a>
                .
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900">Booking the Flex Space</h4>
            <p className="mt-1">
              The Flex Space (our historic 1905 church sanctuary next door) is available for
              members to reserve for focused work, small gatherings, or personal use. A few ground
              rules:
            </p>
            <ul className="mt-1 list-disc pl-5 space-y-0.5">
              <li>Reservations may be made up to <strong>14 days in advance</strong>.</li>
              <li>Maximum single reservation is <strong>4 hours</strong>.</li>
              <li>
                Member reservations between <strong>8:00 AM and 4:00 PM</strong> on weekdays are
                free.
              </li>
              <li>
                For bookings <strong>after 4:00 PM or on weekends</strong>, workspace members
                automatically qualify for our <strong>partnership discount — 20% off</strong> the
                standard Wellness Space hourly rate.
              </li>
              <li>Bookings are subject to availability and existing terms and conditions.</li>
            </ul>
            <p className="mt-2">
              To book during <strong>free member hours (weekdays 8:00 AM – 4:00 PM)</strong>,
              email{' '}
              <a
                href="mailto:memberservices@merrittworkspace.net"
                className="text-orange-700 hover:underline"
              >
                memberservices@merrittworkspace.net
              </a>{' '}
              to request a <strong>100% discount code</strong>, then reserve your time on the
              Merritt Wellness booking page:{' '}
              <a
                href="https://www.merrittwellness.net/booking"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-700 hover:underline"
              >
                www.merrittwellness.net/booking
              </a>
              . For after-hours or weekend bookings, email member services to receive your{' '}
              <strong>20% partnership discount code</strong> before booking.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900">Community &amp; Wellness Events</h4>
            <p className="mt-1">
              Throughout the week, the church/flex space next door hosts a variety of community
              and wellness events — yoga, fitness classes, workshops, and member gatherings. As a
              Merritt Workspace member, you&apos;re welcome to join.
            </p>
            <p className="mt-2">
              Browse the schedule and sign up for classes at{' '}
              <a
                href="https://www.merrittwellness.net/events"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-700 hover:underline"
              >
                www.merrittwellness.net/events
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      {/* 24/7 Building Access */}
      <section className="bg-amber-50 border border-amber-300 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">
          🔐 24/7 Building Access {member.access_code ? '' : '(Action Required)'}
        </h3>
        <p className="text-sm text-gray-700">
          Your membership includes a <strong>personal access code at no extra charge</strong> that
          allows you to access the building outside of normal business hours (8:00 AM – 6:00 PM).
        </p>
        {member.access_code ? (
          <div className="mt-4 bg-white border border-amber-300 rounded p-4">
            <p className="text-sm text-gray-700">Your personal access code:</p>
            <div className="mt-2 text-2xl font-mono font-bold tracking-widest text-gray-900">
              {member.access_code}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Keep this code confidential. Use it to enter outside business hours.
            </p>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-gray-700">
              To request your personal access code, click the button below or send a separate
              email to{' '}
              <a
                href="mailto:memberservices@merrittworkspace.net"
                className="text-orange-700 hover:underline"
              >
                memberservices@merrittworkspace.net
              </a>
              . We&apos;ll set up your code and send you instructions right away.
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

      {/* Additional Resources */}
      <section className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">📚 Additional Resources</h3>
        <ul className="text-sm text-gray-700 space-y-2 list-disc pl-5">
          <li>
            <a
              href="/member-resources"
              className="text-orange-700 hover:underline font-medium"
            >
              FAQs Page
            </a>{' '}
            — Find answers to common questions
          </li>
          <li>
            <span className="font-medium">Snack Shop</span> — Available at{' '}
            <a
              href="https://www.merrittworkspace.net/snackshop"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-700 hover:underline"
            >
              www.merrittworkspace.net/snackshop
            </a>
          </li>
          <li>
            <span className="font-medium">Conference Room Booking</span> — Check availability on
            our website
          </li>
          <li>
            <span className="font-medium">Need a Cubby?</span> — Just ask the management team!
          </li>
          <li>
            <span className="font-medium">Wellness Space Access – Availability Calendar:</span>{' '}
            <a
              href="https://www.merrittwellness.net/booking"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-700 hover:underline"
            >
              www.merrittwellness.net/booking
            </a>
            <p className="mt-1 text-gray-700">
              Based on availability, the Wellness Space may be reserved up to 14 days in advance
              for approved uses and based on the existing terms and conditions. Maximum single use
              reservation is 4 hours. Currently, Wellness Space reservations made by Workspace
              Members for reservations between the hours of 8:00 AM and 4:00 PM may be reserved at
              no cost; reservations made for after 4:00 PM may be reserved at the current
              recurring client Wellness Space hourly rate. All future reservations, cost, and
              approved uses and terms are subject to change based on the needs of the overall
              membership, facilities, and management.
            </p>
          </li>
        </ul>
      </section>

      {/* Events */}
      <section className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">🎉 Events</h3>
        <p className="text-sm text-gray-700">
          Get involved with our events next door:
        </p>
        <ul className="mt-2 text-sm text-gray-700 list-disc pl-5 space-y-1">
          <li>Weekly schedule from management</li>
          <li>Discount on hosting and attending events</li>
        </ul>
      </section>

      {/* Member Referral Program */}
      <section className="bg-green-50 border border-green-300 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">💰 Member Referral Program</h3>
        <p className="text-sm text-gray-800">
          Love your workspace? Refer a friend and{' '}
          <strong>save $200 on your next month&apos;s membership fee</strong> when they sign up!
        </p>
      </section>

      {/* Leave a Review */}
      <section className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-2">
          ⭐ Have you been enjoying Merritt Workspace?
        </h3>
        <p className="text-sm text-gray-800">
          As a small, locally-owned business, <strong>nothing helps us more than a quick
          Google review from a happy member</strong>. Every star and kind word makes a real
          difference — it helps new members discover us, supports our team, and keeps our
          community growing. We&apos;d be incredibly grateful if you could take a moment to
          share your experience.
        </p>
        <div className="mt-4">
          <a
            href="https://g.page/r/CQ0n3_RM3TiMEBM/review"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-orange-600 text-white font-semibold px-5 py-2.5 rounded hover:bg-orange-700 transition-colors"
          >
            ⭐ Leave us a review
          </a>
        </div>
        <p className="mt-3 text-xs text-gray-600">
          Thank you so much — it means the world to us!
        </p>
      </section>

      {/* Closing */}
      <section className="bg-white border rounded-lg p-6">
        <p className="text-sm text-gray-700">
          If you have any questions or need assistance getting settled in, don&apos;t hesitate to
          reach out. We&apos;re here to help make your experience at Merritt Workspace exceptional.
        </p>
        <p className="mt-3 text-sm text-gray-700 font-medium">See you soon!</p>
      </section>
    </div>
  );
}
