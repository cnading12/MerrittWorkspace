"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { DOC_TYPE_LABELS } from '@/lib/portal/types';

interface MemberRef {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface UploadedDoc {
  kind: 'upload';
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
  view_url: string | null;
  member: MemberRef | null;
}

interface SignedAgreement {
  kind: 'agreement';
  id: string;
  member_id: string;
  agreement_type: 'member_agreement' | 'terms_and_conditions' | 'fee_agreement';
  signature_name: string;
  signed_at: string;
  document_version: string | null;
  view_url: string;
  member: MemberRef | null;
}

type Row = UploadedDoc | SignedAgreement;

type Filter = 'all' | 'uploads' | 'agreements' | 'submitted' | 'approved' | 'rejected';

const AGREEMENT_LABELS: Record<SignedAgreement['agreement_type'], string> = {
  member_agreement: 'Member Agreement',
  terms_and_conditions: 'Terms & Conditions',
  fee_agreement: 'Fee Agreement',
};

export default function AdminDocumentsPage() {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadedDoc[]>([]);
  const [agreements, setAgreements] = useState<SignedAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(
    async (authToken: string) => {
      setLoading(true);
      // Always pull everything; filter client-side so switching tabs is instant.
      const res = await fetch('/api/admin/documents?status=all', {
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
      setUploads(
        (data.documents || []).map((d: any) => ({ ...d, kind: 'upload' as const }))
      );
      setAgreements(
        (data.agreements || []).map((a: any) => ({ ...a, kind: 'agreement' as const }))
      );
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
      await load(session.access_token);
    })();
  }, [router, load]);

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
    const { document: updated } = await res.json();
    setUploads((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, ...updated } : d))
    );
  }

  async function openAgreement(agreementId: string) {
    if (!token) return;
    // Fetch with auth header, then display in a new tab via a blob URL so the
    // session token never needs to ride in a query parameter.
    try {
      const res = await fetch(`/api/admin/agreements/${agreementId}/view`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to load agreement');
        return;
      }
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // Release the blob URL after a short delay so the new tab has time to
      // load its content.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      alert(e.message || 'Failed to open agreement');
    }
  }

  const rows: Row[] = [
    ...uploads.filter((u) => {
      if (filter === 'all' || filter === 'uploads') return true;
      if (filter === 'agreements') return false;
      return u.status === filter;
    }),
    ...agreements.filter(() => filter === 'all' || filter === 'agreements'),
  ].sort((a, b) => {
    const aDate = a.kind === 'upload' ? a.created_at : a.signed_at;
    const bDate = b.kind === 'upload' ? b.created_at : b.signed_at;
    return bDate.localeCompare(aDate);
  });

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/admin/dashboard" className="hover:text-gray-900">
          Dashboard
        </Link>
        <span>/</span>
        <span className="text-gray-700">Documents</span>
      </nav>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Member documents</h1>
          <p className="text-sm text-gray-600 mt-1">
            Uploaded files and signed agreements for every member. Click View to preview.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'uploads', 'agreements', 'submitted', 'approved', 'rejected'] as Filter[]).map(
            (s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-sm px-3 py-1.5 rounded border capitalize ${
                  filter === s
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {s === 'all' ? 'All' : s}
              </button>
            )
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-white border rounded p-6 text-sm text-gray-500">
          No documents to show for this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) =>
            row.kind === 'upload' ? (
              <UploadCard key={`u-${row.id}`} doc={row} onReview={review} />
            ) : (
              <AgreementCard
                key={`a-${row.id}`}
                agreement={row}
                onView={() => openAgreement(row.id)}
              />
            )
          )}
        </div>
      )}
    </div>
  );
}

function UploadCard({
  doc,
  onReview,
}: {
  doc: UploadedDoc;
  onReview: (id: string, status: 'approved' | 'rejected') => void;
}) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800 uppercase tracking-wide">
              Uploaded file
            </span>
            <span className="font-medium text-gray-900">
              {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
            </span>
            <DocStatusBadge status={doc.status} />
          </div>
          {doc.member && (
            <Link
              href={`/admin/members/${doc.member.id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              {doc.member.first_name} {doc.member.last_name} ({doc.member.email})
            </Link>
          )}
          <div className="text-xs text-gray-500 mt-1">
            {doc.file_name || doc.file_path}
            {doc.size_bytes != null && ` · ${(doc.size_bytes / 1024).toFixed(0)} KB`}
            {' · Submitted '}
            {new Date(doc.created_at).toLocaleString()}
          </div>
          {doc.notes && (
            <div className="text-xs text-gray-700 mt-1">Notes: {doc.notes}</div>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
          {doc.view_url && (
            <a
              href={doc.view_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm border rounded px-3 py-1.5 hover:bg-gray-50 text-center"
            >
              View
            </a>
          )}
          {doc.status !== 'approved' && (
            <button
              onClick={() => onReview(doc.id, 'approved')}
              className="text-sm bg-green-600 text-white rounded px-3 py-1.5 hover:bg-green-700"
            >
              Approve
            </button>
          )}
          {doc.status !== 'rejected' && (
            <button
              onClick={() => onReview(doc.id, 'rejected')}
              className="text-sm border border-red-600 text-red-600 rounded px-3 py-1.5 hover:bg-red-50"
            >
              Reject
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AgreementCard({
  agreement,
  onView,
}: {
  agreement: SignedAgreement;
  onView: () => void;
}) {
  return (
    <div className="bg-white border-2 border-green-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-800 uppercase tracking-wide">
              Signed agreement
            </span>
            <span className="font-medium text-gray-900">
              {AGREEMENT_LABELS[agreement.agreement_type]}
            </span>
          </div>
          {agreement.member && (
            <Link
              href={`/admin/members/${agreement.member.id}`}
              className="text-sm text-blue-600 hover:underline"
            >
              {agreement.member.first_name} {agreement.member.last_name} (
              {agreement.member.email})
            </Link>
          )}
          <div className="text-xs text-gray-500 mt-1">
            Signed by <span className="font-medium">{agreement.signature_name}</span> on{' '}
            {new Date(agreement.signed_at).toLocaleString()}
            {agreement.document_version && ` · ${agreement.document_version}`}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
          <button
            onClick={onView}
            className="text-sm bg-gray-900 text-white rounded px-3 py-1.5 hover:bg-gray-800"
          >
            View signed document
          </button>
        </div>
      </div>
    </div>
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
