"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PortalLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'set_password'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/portal');
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    // Routes through our own Resend-backed endpoint rather than
    // supabase.auth.signInWithOtp, which would trigger Supabase's
    // built-in SMTP (heavily rate-limited and not configured here).
    const res = await fetch('/api/portal/resend-signin-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || 'Could not send reset link.');
      return;
    }
    setInfo(
      "If that email matches a member account, we just sent a fresh sign-in link. Check your inbox (and spam folder)."
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Member sign in</h1>
      <p className="text-sm text-gray-500 mb-6">
        Sign in with your email and password. Forgot your password? Use the reset option below.
      </p>

      <form onSubmit={handleSignIn} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border rounded px-3 py-2"
          />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {info && <div className="text-sm text-green-700">{info}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-900 text-white py-2 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <button
          type="button"
          onClick={handleMagicLink}
          disabled={loading || !email}
          className="w-full border py-2 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Forgot password? Email me a reset link
        </button>
      </form>
    </div>
  );
}
