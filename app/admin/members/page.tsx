"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Member, MemberDesignation } from '@/lib/portal/types';
import { DESIGNATION_LABELS } from '@/lib/portal/types';

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

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

  if (loading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Members</h1>
      <div className="space-y-3">
        {members.map((m) => (
          <div key={m.id} className="bg-white border rounded p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">
                  {m.first_name} {m.last_name}{' '}
                  <span className="text-xs text-gray-500 capitalize">({m.status})</span>
                </div>
                <div className="text-sm text-gray-600">{m.email}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Docs: {m.required_docs_complete ? '✓' : '—'} · Agreement:{' '}
                  {m.agreement_signed ? '✓' : '—'} · Sub:{' '}
                  {m.stripe_subscription_id ? m.subscription_status || '✓' : '—'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 min-w-[280px]">
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
                <a
                  href={`/admin/members/${m.id}`}
                  className="text-sm border rounded px-2 py-1 hover:bg-gray-50 text-center"
                >
                  Details
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
