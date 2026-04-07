"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Member, MemberDocument, PaymentHistoryRow } from '@/lib/portal/types';
import { DESIGNATION_LABELS } from '@/lib/portal/types';
import {
  TERMS_AND_CONDITIONS_TEXT,
  calculateFeeAgreementTotals,
  MERRITT_SIGNATORY,
} from '@/lib/portal/legal';
import { formatUsd } from '@/lib/portal/pricing';

type AgreementRow = {
  agreement_type: 'member_agreement' | 'terms_and_conditions' | 'fee_agreement';
  signed_at: string;
  signature_name: string;
};

type Tab = 'documents' | 'payments' | 'onboarding';

export default function PortalDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [payments, setPayments] = useState<PaymentHistoryRow[]>([]);
  const [agreements, setAgreements] = useState<AgreementRow[]>([]);
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
        setAgreements(data.agreements || []);
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
          agreements={agreements}
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
  agreements,
  onChange,
}: {
  member: Member;
  documents: MemberDocument[];
  agreements: AgreementRow[];
  onChange: (d: MemberDocument[]) => void;
}) {
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [signing, setSigning] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState(`${member.first_name} ${member.last_name}`);
  const signedSet = new Set(agreements.map((a) => a.agreement_type));
  const hasSigned = (t: AgreementRow['agreement_type']) => signedSet.has(t);

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

  async function signAgreement(
    type: 'member_agreement' | 'terms_and_conditions' | 'fee_agreement',
    metadata?: Record<string, unknown>
  ) {
    if (!signatureName.trim()) {
      alert('Type your full legal name to sign.');
      return;
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
      window.location.reload();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSigning(null);
    }
  }

  const hasDoc = (t: DocType) => documents.some((d) => d.doc_type === t);

  const memberName = `${member.first_name} ${member.last_name}`;
  const designationLabel = member.designation
    ? DESIGNATION_LABELS[member.designation]
    : '— not yet assigned —';

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
        <h2 className="font-semibold text-gray-900 mb-1">Agreements</h2>
        <p className="text-sm text-gray-500 mb-4">
          Review and sign each document below. All three are required before you can set up
          payment. Available once your required documents are submitted.
        </p>

        <fieldset
          disabled={!member.required_docs_complete}
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

          <FeeAgreementSection
            member={member}
            memberName={memberName}
            designationLabel={designationLabel}
            signed={hasSigned('fee_agreement')}
            signing={signing === 'fee_agreement'}
            onSign={(metadata) => signAgreement('fee_agreement', metadata)}
          />

          <SignableDoc
            title="Terms & Conditions"
            description="The standard Merritt Workspace house rules and policies."
            body={TERMS_AND_CONDITIONS_TEXT}
            signed={hasSigned('terms_and_conditions')}
            signing={signing === 'terms_and_conditions'}
            onSign={() => signAgreement('terms_and_conditions')}
          />

          <SignableDoc
            title="Member Agreement"
            description="Acknowledges your status as a Merritt Workspace member."
            body={`I, ${memberName}, agree to become a member of Merritt Workspace under the Fee Agreement and Terms & Conditions referenced above.`}
            signed={hasSigned('member_agreement')}
            signing={signing === 'member_agreement'}
            onSign={() => signAgreement('member_agreement')}
          />
        </fieldset>
      </section>
    </div>
  );
}

function SignableDoc({
  title,
  description,
  body,
  signed,
  signing,
  disabled,
  disabledReason,
  onSign,
}: {
  title: string;
  description: string;
  body: string;
  signed: boolean;
  signing: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  onSign: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded">
      <div className="flex items-center justify-between p-3">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {title} {signed && <span className="text-green-700">✓ Signed</span>}
          </div>
          <div className="text-xs text-gray-500">{description}</div>
          {disabledReason && (
            <div className="text-xs text-amber-700 mt-1">{disabledReason}</div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50"
          >
            {open ? 'Hide' : 'Review'}
          </button>
          {!signed && (
            <button
              type="button"
              onClick={onSign}
              disabled={signing || disabled}
              className="text-sm bg-gray-900 text-white rounded px-3 py-1.5 hover:bg-gray-800 disabled:opacity-50"
            >
              {signing ? 'Signing\u2026' : 'Sign'}
            </button>
          )}
        </div>
      </div>
      {open && (
        <pre className="border-t bg-gray-50 p-4 text-xs text-gray-800 whitespace-pre-wrap font-sans max-h-80 overflow-auto">
          {body}
        </pre>
      )}
    </div>
  );
}

function FeeAgreementSection({
  member,
  memberName,
  designationLabel,
  signed,
  signing,
  onSign,
}: {
  member: Member;
  memberName: string;
  designationLabel: string;
  signed: boolean;
  signing: boolean;
  onSign: (metadata: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [memberTitle, setMemberTitle] = useState('');
  const [street, setStreet] = useState('');
  const [cityStateZip, setCityStateZip] = useState('');
  const [phone, setPhone] = useState(member.phone || '');
  const [email] = useState(member.email);
  const [federalId, setFederalId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'ach'>('card');

  // Invoicing details — default "same as member"
  const [sameAsMember, setSameAsMember] = useState(true);
  const [invCompany, setInvCompany] = useState(member.company_name || '');
  const [invStreet, setInvStreet] = useState('');
  const [invCityStateZip, setInvCityStateZip] = useState('');
  const [invContact, setInvContact] = useState(memberName);
  const [invPhone, setInvPhone] = useState(member.phone || '');
  const [invEmail, setInvEmail] = useState(member.email);

  const monthlyCostCents = member.monthly_cost_cents || 0;
  const totals = calculateFeeAgreementTotals(monthlyCostCents, paymentMethod);

  const today = new Date();
  const termStart = today.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const termEnd = lastDay.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const disabled = member.monthly_cost_cents == null;

  function handleSign() {
    if (!street.trim() || !cityStateZip.trim() || !phone.trim()) {
      alert('Please fill in your street address, city/state/zip, and telephone.');
      return;
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
      term_start: termStart,
      term_end: termEnd,
      designation_label: designationLabel,
      monthly_cost_cents: monthlyCostCents,
      first_month_cents: totals.firstMonthCents,
      last_month_cents: totals.lastMonthCents,
      cc_fee_cents: totals.ccFeeCents,
      grand_total_cents: totals.grandTotalCents,
      invoicing,
    };
    onSign(metadata);
  }

  return (
    <div className="border rounded">
      <div className="flex items-center justify-between p-3">
        <div>
          <div className="text-sm font-medium text-gray-900">
            Fee Agreement {signed && <span className="text-green-700">✓ Signed</span>}
          </div>
          <div className="text-xs text-gray-500">
            Auto-generated for your selected plan. Includes first + last month and (if paying by
            card) a 3.5% processing fee.
          </div>
          {disabled && (
            <div className="text-xs text-amber-700 mt-1">
              Your administrator hasn&rsquo;t assigned a monthly cost yet.
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50"
        >
          {open ? 'Hide' : signed ? 'Review' : 'Open'}
        </button>
      </div>

      {open && (
        <div className="border-t bg-gray-50 p-4 space-y-5">
          {/* Document preview header */}
          <div className="bg-gray-900 text-white text-center font-semibold py-2 rounded">
            MERRITT WORKSPACE FEE AGREEMENT
          </div>

          {/* Member Information */}
          <fieldset disabled={signed} className="space-y-3 disabled:opacity-70">
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
          </fieldset>

          {/* Description */}
          <div className="text-xs text-gray-700 bg-white border rounded p-3">
            <div className="font-semibold mb-1">DESCRIPTION OF SIGNATURE PAGE</div>
            This page shall act as a binding agreement between Merritt WorKSpace and the
            Member, as named above. By signing this CoWork Space Agreement (CSA), the member
            fully acknowledges and hereby agrees to be bound by the financial terms and
            conditions as stated in this Agreement and the accompanying CoWork Space Terms
            and Conditions. <em>*Please note*</em> When the stated term (timeframe) of the
            Agreement has ended, the financial terms shall renew automatically, less any
            discounts (if applicable).
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
            <Row
              label={`First Month's Membership Fee (${termStart} – ${termEnd})`}
              value={formatUsd(totals.firstMonthCents)}
            />
            <Row label="Last Month's Membership Fee" value={formatUsd(totals.lastMonthCents)} />
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

          {!signed && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSign}
                disabled={signing || disabled}
                className="text-sm bg-gray-900 text-white rounded px-4 py-2 hover:bg-gray-800 disabled:opacity-50"
              >
                {signing ? 'Signing\u2026' : 'Sign Fee Agreement'}
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
function PaymentsTab({ member, payments }: { member: Member; payments: PaymentHistoryRow[] }) {
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const cancelPending = member.subscription_status === 'cancel_at_period_end';

  async function cancelMembership() {
    const ok = window.confirm(
      'Cancel your membership? Your access will continue through the end of the current billing period, then your subscription will end. This cannot be undone from the portal — contact us to reactivate.'
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
            <div className="flex flex-wrap gap-2">
              <button
                onClick={openBillingPortal}
                disabled={portalLoading}
                className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
              >
                {portalLoading ? 'Opening…' : 'Manage payment method'}
              </button>
              {!cancelPending && (
                <button
                  onClick={cancelMembership}
                  disabled={cancelLoading}
                  className="text-sm border border-red-300 text-red-700 rounded px-3 py-1.5 hover:bg-red-50 disabled:opacity-50"
                >
                  {cancelLoading ? 'Cancelling…' : 'Cancel membership'}
                </button>
              )}
            </div>
            {cancelPending && (
              <p className="text-xs text-amber-700">
                Your membership is set to end at the end of the current billing period.
              </p>
            )}
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
