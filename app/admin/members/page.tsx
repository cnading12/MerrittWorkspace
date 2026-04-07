"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Member } from '@/lib/portal/types';
import { DESIGNATION_LABELS } from '@/lib/portal/types';

type StatusFilter = 'all' | Member['status'];

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin');
        return;
      }
      setToken(session.access_token);
      const res = await fetch('/api/admin/members', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        router.replace('/admin');
        return;
      }
      const { members } = await res.json();
      setMembers(members);
      setLoading(false);
    })();
  }, [router]);

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
    setMembers((prev) => prev.map((m) => (m.id === id ? member : m)));
  }

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const name = `${m.first_name} ${m.last_name}`.toLowerCase();
        if (!name.includes(q) && !m.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [members, search, statusFilter]);

  const statuses: StatusFilter[] = ['all', 'pending', 'approved', 'active', 'paused', 'cancelled', 'declined'];

  if (loading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Members</h1>
          <p className="text-sm text-gray-600 mt-1">
            {filtered.length} {filtered.length === 1 ? 'member' : 'members'}
            {(search || statusFilter !== 'all') && ` (filtered from ${members.length})`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border rounded p-6 text-sm text-gray-500">
          No members match the current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <div key={m.id} className="bg-white border rounded-lg p-4">
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
                  </div>
                  <div className="text-sm text-gray-600">{m.email}</div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-2 flex-wrap">
                    <ProgressDot done={m.required_docs_complete} label="Documents" />
                    <ProgressDot done={m.agreement_signed} label="Agreements" />
                    <ProgressDot done={!!m.stripe_subscription_id} label="Auto-pay" />
                    <ProgressDot done={m.onboarding_unlocked} label="Onboarded" />
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
                  <Link
                    href={`/admin/members/${m.id}`}
                    className="text-sm border border-gray-900 bg-gray-900 text-white rounded px-2 py-1 hover:bg-gray-800 text-center font-medium"
                  >
                    View details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProgressDot({ done, label }: { done: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className={`w-2 h-2 rounded-full ${done ? 'bg-green-500' : 'bg-gray-300'}`}
      />
      <span className={done ? 'text-green-700 font-medium' : ''}>{label}</span>
    </span>
  );
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
