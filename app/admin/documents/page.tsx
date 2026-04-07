"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { DOC_TYPE_LABELS } from '@/lib/portal/types';

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

type StatusFilter = 'submitted' | 'approved' | 'rejected' | 'all';

export default function AdminDocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('submitted');

  const load = useCallback(async (authToken: string, statusFilter: StatusFilter) => {
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
  }, [router]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin');
        return;
      }
      setToken(session.access_token);
      await load(session.access_token, filter);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    if (token) load(token, filter);
  }, [filter, token, load]);

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Documents review</h1>
        <div className="flex gap-2">
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
      </div>

      {loading ? (
        <div className="text-gray-500">Loading…</div>
      ) : docs.length === 0 ? (
        <div className="bg-white border rounded p-6 text-sm text-gray-500">
          No documents to review.
        </div>
      ) : (
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
                      onClick={() => review(d.id, 'approved')}
                      className="text-sm bg-green-600 text-white rounded px-3 py-1.5 hover:bg-green-700"
                    >
                      Approve
                    </button>
                  )}
                  {d.status !== 'rejected' && (
                    <button
                      onClick={() => review(d.id, 'rejected')}
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
      )}
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
