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
        <div className="text-sm text-red-600">
          <p>{error}</p>
          <p className="mt-2">
            <a href="/portal/login" className="underline">
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
