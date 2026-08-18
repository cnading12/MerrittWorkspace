"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function SetPasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    // A Supabase invite/magic link sign-in establishes a session on this page
    // (either already present in storage, or via the URL hash tokens that the
    // supabase-js client parses automatically). We wait briefly for that.
    let cancelled = false;
    async function check() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setHasSession(true);
        setEmail(data.session.user.email ?? null);
      }
      setChecking(false);
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasSession(true);
        setEmail(session.user.email ?? null);
        setChecking(false);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setInfo('Password set! Redirecting to your portal…');
    setTimeout(() => router.push('/portal'), 800);
  }

  if (checking) {
    return (
      <div className="max-w-md mx-auto bg-bone p-8 border border-clay">
        <p className="text-sm text-ink-60">Loading…</p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="max-w-md mx-auto bg-bone p-8 border border-clay">
        <h1 className="font-display text-2xl font-semibold text-ink mb-2">Set your password</h1>
        <p className="text-sm text-ink-60 mb-4">
          To set a password you first need to sign in using the one-click
          invite link we emailed you, or request a new email sign-in link.
        </p>
        <a
          href="/portal/login"
          className="inline-block bg-ink text-white py-2 px-4 hover:bg-ink"
        >
          Go to sign in
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-bone p-8 border border-clay">
      <h1 className="font-display text-2xl font-semibold text-ink mb-2">Set your password</h1>
      <p className="text-sm text-ink-60 mb-6">
        {email ? <>Signed in as <strong>{email}</strong>. </> : null}
        Choose a password you'll use to sign in to the member portal.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-60">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-60">Confirm password</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="mt-1 w-full border px-3 py-2"
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {info && <div className="text-sm text-green-700">{info}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-ink text-white py-2 hover:bg-ink disabled:opacity-50"
        >
          {loading ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  );
}
