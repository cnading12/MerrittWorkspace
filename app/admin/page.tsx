"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AdminHome() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setChecking(false);
        return;
      }
      // Verify admin via API.
      const res = await fetch('/api/admin/whoami', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setAuthed(true);
        router.replace('/admin/dashboard');
      }
      setChecking(false);
    })();
  }, [router]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      return;
    }
    window.location.reload();
  }

  if (checking) return <div className="text-gray-500">Loading…</div>;
  if (authed) return null;

  return (
    <div className="max-w-md mx-auto bg-white border rounded p-8">
      <h1 className="text-xl font-semibold mb-4">Admin sign in</h1>
      <form onSubmit={signIn} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
        />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button className="w-full bg-gray-900 text-white py-2 rounded hover:bg-gray-800">
          Sign in
        </button>
      </form>
    </div>
  );
}
