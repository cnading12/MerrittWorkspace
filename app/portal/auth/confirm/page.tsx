"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Confirms a one-time sign-in token issued by `auth.admin.generateLink`
// and then routes the user to `next` (defaults to /portal/set-password).
//
// We do the verification client-side because supabase-js stores the
// resulting session in localStorage automatically — no cookie plumbing
// needed. This bypasses Supabase's `/auth/v1/verify` redirect, which
// silently falls back to the Site URL when the redirect_to isn't on
// the dashboard allowlist.
export default function ConfirmAuthPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenHash = params.get('token_hash');
    const type = (params.get('type') || 'magiclink') as
      | 'magiclink'
      | 'recovery'
      | 'invite'
      | 'email';
    const next = params.get('next') || '/portal/set-password';
    if (!tokenHash) {
      setError('This link is missing its token. Please request a new email.');
      return;
    }
    (async () => {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace(next);
    })();
  }, [params, router]);

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Signing you in…</h1>
      {error ? (
        <div className="space-y-4">
          <div className="text-sm text-red-600">
            <p>{error}</p>
            <p className="mt-2 text-gray-700">
              Sign-in links expire after 24 hours. Enter your email below and we'll
              send you a fresh one.
            </p>
          </div>
          <ResendLinkForm />
          <p className="text-sm">
            <a href="/portal/login" className="underline text-gray-700">
              Return to sign in
            </a>
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          Verifying your one-time link, please wait.
        </p>
      )}
    </div>
  );
}

function ResendLinkForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/portal/resend-signin-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    setLoading(false);
    setDone(true);
  }

  if (done) {
    return (
      <p className="text-sm text-green-700">
        If <strong>{email}</strong> matches a member account, we just emailed a fresh
        sign-in link. Check your inbox (and spam folder).
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Your email</label>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border rounded px-3 py-2 text-sm"
        placeholder="you@example.com"
      />
      <button
        type="submit"
        disabled={loading || !email}
        className="w-full bg-gray-900 text-white py-2 rounded hover:bg-gray-800 disabled:opacity-50 text-sm"
      >
        {loading ? 'Sending…' : 'Email me a new link'}
      </button>
    </form>
  );
}
