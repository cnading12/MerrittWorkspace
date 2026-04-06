"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface PendingRequest {
  id: string;
  member_id: string;
  requested_at: string;
  member: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export default function AccessCodesPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [codes, setCodes] = useState<Record<string, string>>({});

  async function load(t: string) {
    const res = await fetch('/api/admin/access-codes', {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) {
      router.replace('/admin');
      return;
    }
    const { requests } = await res.json();
    setRequests(requests);
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
      setLoading(false);
    })();
  }, [router]);

  async function fulfill(id: string) {
    if (!token) return;
    const code = codes[id];
    if (!code) return alert('Enter a code');
    const res = await fetch(`/api/admin/access-codes/${id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_code: code }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || 'Failed');
      return;
    }
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Access code requests</h1>
      <p className="text-sm text-gray-600">
        Get a code from POPS, then enter it here. The member will be emailed automatically.
      </p>
      {requests.length === 0 && <p className="text-gray-500">No pending requests.</p>}
      <div className="space-y-3">
        {requests.map((r) => (
          <div key={r.id} className="bg-white border rounded p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">
                {r.member?.first_name} {r.member?.last_name}
              </div>
              <div className="text-sm text-gray-600">{r.member?.email}</div>
              <div className="text-xs text-gray-400">
                Requested {new Date(r.requested_at).toLocaleString()}
              </div>
            </div>
            <div className="flex gap-2">
              <input
                placeholder="Code from POPS"
                value={codes[r.id] || ''}
                onChange={(e) => setCodes({ ...codes, [r.id]: e.target.value })}
                className="border rounded px-3 py-1.5 text-sm font-mono"
              />
              <button
                onClick={() => fulfill(r.id)}
                className="bg-gray-900 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-800"
              >
                Send to member
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
