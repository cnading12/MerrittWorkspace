"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { MemberApplication } from '@/lib/portal/types';

export default function AdminApplicationsPage() {
  const router = useRouter();
  const [apps, setApps] = useState<MemberApplication[]>([]);
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
      const res = await fetch('/api/admin/applications', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        router.replace('/admin');
        return;
      }
      const data = await res.json();
      setApps(data.applications);
      setLoading(false);
    })();
  }, [router]);

  async function decide(id: string, action: 'approve' | 'decline') {
    if (!token) return;
    const res = await fetch(`/api/admin/applications/${id}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Failed');
      return;
    }
    setApps((prev) => prev.filter((a) => a.id !== id));
  }

  if (loading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pending applications</h1>
      {apps.length === 0 && <p className="text-gray-500">No pending applications.</p>}
      <div className="space-y-3">
        {apps.map((a) => (
          <div key={a.id} className="bg-white border rounded p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold text-gray-900">
                  {a.first_name} {a.last_name}
                </div>
                <div className="text-sm text-gray-600">{a.email} · {a.phone}</div>
                <div className="text-sm text-gray-600">
                  {a.company_name && `${a.company_name} · `}
                  {a.membership_type} · start {a.start_date}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Submitted {new Date(a.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => decide(a.id, 'approve')}
                  className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={() => decide(a.id, 'decline')}
                  className="border border-red-600 text-red-600 px-3 py-1.5 rounded text-sm hover:bg-red-50"
                >
                  Decline
                </button>
              </div>
            </div>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-gray-500">Full submission</summary>
              <pre className="mt-2 bg-gray-50 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(a.payload, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
