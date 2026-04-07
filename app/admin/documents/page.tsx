"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { DOC_TYPE_LABELS } from '@/lib/portal/types';
import {
  TERMS_AND_CONDITIONS_TEXT,
  renderFeeAgreementText,
  type FeeAgreementContext,
} from '@/lib/portal/legal';

interface DocRow {
  id: string;
  member_id: string;
  doc_type: keyof typeof DOC_TYPE_LABELS;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: 'submitted' | 'approved' | 'rejected';
  notes: string | null;
  created_at: string;
  signed_url: string | null;
  member: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

type AgreementType = 'member_agreement' | 'terms_and_conditions' | 'fee_agreement';

interface AgreementRow {
  id: string;
  member_id: string;
  agreement_type: AgreementType;
  signature_name: string;
  signed_at: string;
  ip_address: string | null;
  user_agent: string | null;
  document_version: string | null;
  metadata: Record<string, any> | null;
  member: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

type StatusFilter = 'submitted' | 'approved' | 'rejected' | 'all';
type View = 'uploads' | 'agreements';

const AGREEMENT_LABELS: Record<AgreementType, string> = {
  member_agreement: 'Member Agreement',
  terms_and_conditions: 'Terms & Conditions',
  fee_agreement: 'Fee Agreement',
};

export default function AdminDocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [agreements, setAgreements] = useState<AgreementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<View>('uploads');
  const [filter, setFilter] = useState<StatusFilter>('submitted');

  const loadUploads = useCallback(
    async (authToken: string, statusFilter: StatusFilter) => {
      setLoading(true);
      const res = await fetch(`/api/admin/documents?status=${statusFilter}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.replace('/admin');
          return;
        }
        setLoading(false);
        return;
      }
      const data = await res.json();
      setDocs(data.documents || []);
      setLoading(false);
    },
    [router]
  );

  const loadAgreements = useCallback(
    async (authToken: string) => {
      setLoading(true);
      const res = await fetch('/api/admin/agreements', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.replace('/admin');
          return;
        }
        setLoading(false);
        return;
      }
      const data = await res.json();
      setAgreements(data.agreements || []);
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
      await loadUploads(session.access_token, filter);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (!token) return;
    if (view === 'uploads') loadUploads(token, filter);
    else loadAgreements(token);
  }, [view, filter, token, loadUploads, loadAgreements]);

  async function review(docId: string, status: 'approved' | 'rejected') {
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
    // If we're filtering by submitted, the doc moves out of view.
    if (filter === 'submitted') {
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } else {
      const { document: updated } = await res.json();
      setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, ...updated } : d)));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Documents</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView('uploads')}
            className={`text-sm px-3 py-1.5 rounded border ${
              view === 'uploads'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Uploaded files
          </button>
          <button
            onClick={() => setView('agreements')}
            className={`text-sm px-3 py-1.5 rounded border ${
              view === 'agreements'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Signed agreements
          </button>
        </div>
      </div>

      {view === 'uploads' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 uppercase tracking-wider mr-1">
            Status:
          </span>
          {(['submitted', 'approved', 'rejected', 'all'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`text-sm px-3 py-1.5 rounded border capitalize ${
                filter === s
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : view === 'uploads' ? (
        <UploadsList docs={docs} onReview={review} />
      ) : (
        <AgreementsList agreements={agreements} />
      )}
    </div>
  );
}

function UploadsList({
  docs,
  onReview,
}: {
  docs: DocRow[];
  onReview: (id: string, status: 'approved' | 'rejected') => void;
}) {
  if (docs.length === 0) {
    return (
      <div className="bg-white border rounded p-6 text-sm text-gray-500">
        No documents to review.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {docs.map((d) => (
        <div key={d.id} className="bg-white border rounded p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900">
                  {DOC_TYPE_LABELS[d.doc_type] || d.doc_type}
                </span>
                <DocStatusBadge status={d.status} />
              </div>
              {d.member && (
                <Link
                  href={`/admin/members/${d.member.id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {d.member.first_name} {d.member.last_name} ({d.member.email})
                </Link>
              )}
              <div className="text-xs text-gray-500 mt-1">
                {d.file_name || d.file_path} ·{' '}
                {d.size_bytes != null
                  ? `${(d.size_bytes / 1024).toFixed(0)} KB · `
                  : ''}
                Submitted {new Date(d.created_at).toLocaleString()}
              </div>
              {d.notes && (
                <div className="text-xs text-gray-700 mt-1">Notes: {d.notes}</div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
              {d.signed_url && (
                <a
                  href={d.signed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50 text-center"
                >
                  View
                </a>
              )}
              {d.status !== 'approved' && (
                <button
                  onClick={() => onReview(d.id, 'approved')}
                  className="text-sm bg-green-600 text-white rounded px-3 py-1.5 hover:bg-green-700"
                >
                  Approve
                </button>
              )}
              {d.status !== 'rejected' && (
                <button
                  onClick={() => onReview(d.id, 'rejected')}
                  className="text-sm border border-red-600 text-red-600 rounded px-3 py-1.5 hover:bg-red-50"
                >
                  Reject
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AgreementsList({ agreements }: { agreements: AgreementRow[] }) {
  if (agreements.length === 0) {
    return (
      <div className="bg-white border rounded p-6 text-sm text-gray-500">
        No signed agreements yet.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {agreements.map((a) => (
        <AgreementRowItem key={a.id} agreement={a} />
      ))}
    </div>
  );
}

function AgreementRowItem({ agreement: a }: { agreement: AgreementRow }) {
  const [open, setOpen] = useState(false);
  const label = AGREEMENT_LABELS[a.agreement_type] || a.agreement_type;
  return (
    <div className="bg-white border rounded">
      <div className="p-4 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900">{label}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-800">
              Signed
            </span>
          </div>
          {a.member && (
            <Link
              href={`/admin/members/${a.member.id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              {a.member.first_name} {a.member.last_name} ({a.member.email})
            </Link>
          )}
          <div className="text-xs text-gray-500 mt-1">
            Signed by <span className="font-medium">{a.signature_name}</span> on{' '}
            {new Date(a.signed_at).toLocaleString()}
            {a.document_version && ` · ${a.document_version}`}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            IP: {a.ip_address || '—'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50 flex-shrink-0"
        >
          {open ? 'Hide' : 'View'}
        </button>
      </div>
      {open && (
        <div className="border-t bg-gray-50 p-4">
          <AgreementBody agreement={a} />
        </div>
      )}
    </div>
  );
}

function AgreementBody({ agreement: a }: { agreement: AgreementRow }) {
  if (a.agreement_type === 'terms_and_conditions') {
    return <PreText text={TERMS_AND_CONDITIONS_TEXT} />;
  }
  if (a.agreement_type === 'member_agreement') {
    const name = a.signature_name || (a.member ? `${a.member.first_name} ${a.member.last_name}` : 'Member');
    return (
      <PreText
        text={`I, ${name}, agree to become a member of Merritt Workspace under the Fee Agreement and Terms & Conditions referenced above.`}
      />
    );
  }
  if (a.agreement_type === 'fee_agreement') {
    const meta = a.metadata || {};
    const ctx: FeeAgreementContext = {
      member: {
        name: a.signature_name,
        street: meta.street || '',
        cityStateZip: meta.city_state_zip || '',
        phone: meta.phone || '',
        email: meta.email || '',
        federalId: meta.federal_id || null,
      },
      invoicing: {
        companyName: meta.invoicing?.company_name || '',
        street: meta.invoicing?.street || '',
        cityStateZip: meta.invoicing?.city_state_zip || '',
        contactName: meta.invoicing?.contact_name || '',
        phone: meta.invoicing?.phone || '',
        email: meta.invoicing?.email || '',
      },
      designationLabel: meta.designation_label || '—',
      monthlyCostCents: typeof meta.monthly_cost_cents === 'number' ? meta.monthly_cost_cents : 0,
      termStart: meta.term_start || '',
      termEnd: meta.term_end || '',
      paymentMethod: meta.payment_method === 'ach' ? 'ach' : 'card',
      signedDate: new Date(a.signed_at).toLocaleDateString(),
      memberTitle: meta.member_title || null,
    };
    let body: string;
    try {
      body = renderFeeAgreementText(ctx);
    } catch {
      body = JSON.stringify(meta, null, 2);
    }
    return <PreText text={body} />;
  }
  return <PreText text={JSON.stringify(a.metadata || {}, null, 2)} />;
}

function PreText({ text }: { text: string }) {
  return (
    <pre className="bg-white border rounded p-3 text-xs text-gray-800 whitespace-pre-wrap font-sans max-h-96 overflow-auto">
      {text}
    </pre>
  );
}

function DocStatusBadge({ status }: { status: 'submitted' | 'approved' | 'rejected' }) {
  const map = {
    submitted: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${map[status]}`}
    >
      {status}
    </span>
  );
}
