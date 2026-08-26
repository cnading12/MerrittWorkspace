"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Signing in and being an admin are two separate things, and this page has to
// keep them apart out loud.
//
// Supabase Auth accepts the password. A row in `admin_users` decides whether
// that account may see the panel — and nothing in the app maintains that table,
// rows go in by hand (see ONBOARDING_PORTAL_HANDOFF.md). So the ordinary way to
// be locked out of here is a perfectly correct password on an account with no
// `admin_users` row.
//
// This page used to drop that 403 on the floor and re-render a blank form,
// which looks exactly like a rejected password and sends whoever is locked out
// hunting for the wrong problem. Now every failure names itself, an unexpected
// throw can no longer strand the page on "Loading…", and a session that is
// signed in but not an admin can always sign out and try another account —
// previously there was no way off this screen at all.

type Status =
  | { state: 'checking' }
  | { state: 'signed_out' }
  | { state: 'authorized' }
  | { state: 'rejected'; message: string; hint?: string; signedIn: boolean };

export default function AdminHome() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ state: 'checking' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const verify = useCallback(async (): Promise<Status> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        return {
          state: 'rejected',
          signedIn: false,
          message: `Could not read your saved session: ${error.message}`,
          hint: 'Signing out and back in usually clears this.',
        };
      }
      const session = data.session;
      if (!session) return { state: 'signed_out' };

      const res = await fetch('/api/admin/whoami', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (res.ok) return { state: 'authorized' };

      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        state: 'rejected',
        signedIn: true,
        message: body.error || `The admin check failed (HTTP ${res.status}).`,
        hint: hintFor(res.status),
      };
    } catch (e: unknown) {
      // Without this the page sits on "Loading…" forever and looks broken.
      return {
        state: 'rejected',
        signedIn: false,
        message: `Could not reach the server to check admin access: ${
          e instanceof Error ? e.message : 'network error'
        }.`,
        hint: 'Check your connection, then reload this page.',
      };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await verify();
      if (cancelled) return;
      setStatus(next);
      if (next.state === 'authorized') router.replace('/admin/dashboard');
    })();
    return () => {
      cancelled = true;
    };
  }, [router, verify]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setSignInError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setSubmitting(false);
      setSignInError(error.message);
      return;
    }
    // Re-run the admin check in place rather than reloading the page: a reload
    // threw away the reason the previous attempt was refused.
    const next = await verify();
    setSubmitting(false);
    setStatus(next);
    if (next.state === 'authorized') router.replace('/admin/dashboard');
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSignInError(null);
    setPassword('');
    setStatus({ state: 'signed_out' });
  }

  if (status.state === 'checking' || status.state === 'authorized') {
    return <div className="text-gray-500">Loading…</div>;
  }

  return (
    <div className="max-w-md mx-auto bg-white border rounded p-8">
      <h1 className="text-xl font-semibold mb-4">Admin sign in</h1>

      {status.state === 'rejected' && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-medium text-amber-900">{status.message}</p>
          {status.hint && <p className="mt-1 text-amber-800">{status.hint}</p>}
          {status.signedIn && (
            <button
              type="button"
              onClick={signOut}
              className="mt-3 rounded border border-amber-400 px-2 py-1 text-xs text-amber-900 hover:bg-amber-100"
            >
              Sign out and try another account
            </button>
          )}
        </div>
      )}

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
        {signInError && <div className="text-sm text-red-600">{signInError}</div>}
        <button
          disabled={submitting}
          className="w-full bg-gray-900 text-white py-2 rounded hover:bg-gray-800 disabled:opacity-60"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

function hintFor(status: number): string | undefined {
  switch (status) {
    case 401:
      return 'The saved sign-in is no longer valid. Sign in again below.';
    case 403:
      return 'The password was accepted — this account simply has no row in the admin_users table. Add one in the Supabase SQL editor, or sign in with an account that has one.';
    case 503:
      return 'This is an infrastructure problem rather than a permissions one: the database could not be reached. If the Supabase project is paused, restore it from the Supabase dashboard.';
    case 500:
      return 'The server could not run the check at all — most often SUPABASE_SERVICE_ROLE_KEY is missing or wrong in the deployment environment.';
    default:
      return undefined;
  }
}
