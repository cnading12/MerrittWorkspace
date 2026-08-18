"use client";

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CancelOnboardingInner() {
  const searchParams = useSearchParams();
  const member = searchParams?.get('member') ?? '';
  const token = searchParams?.get('token') ?? '';

  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const linkValid = !!member && !!token;

  async function confirmCancel() {
    setState('loading');
    setError(null);
    try {
      const res = await fetch('/api/portal/cancel-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member, token }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'We could not cancel your signup. Please try again or reply to the email.');
        setState('error');
        return;
      }
      setState('done');
    } catch {
      setError('We could not reach the server. Please check your connection and try again.');
      setState('error');
    }
  }

  if (!linkValid) {
    return (
      <div className="max-w-md mx-auto bg-bone p-8 border border-clay">
        <h1 className="font-display text-2xl font-semibold text-ink mb-2">Link not recognized</h1>
        <p className="text-sm text-ink-60">
          This cancellation link is incomplete or invalid. If you'd like to cancel your
          signup, please reply to one of our emails and we'll take care of it.
        </p>
      </div>
    );
  }

  if (state === 'done') {
    return (
      <div className="max-w-md mx-auto bg-bone p-8 border border-clay">
        <h1 className="font-display text-2xl font-semibold text-ink mb-2">Signup cancelled</h1>
        <p className="text-sm text-ink-60 mb-4">
          Your Merritt Workspace signup has been cancelled and you won't receive any more
          onboarding emails. We're sorry to see you go.
        </p>
        <p className="text-sm text-ink-60">
          Changed your mind? You're always welcome to{' '}
          <a href="/membership/apply" className="text-orange-600 hover:underline">
            apply again
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-bone p-8 border border-clay">
      <h1 className="font-display text-2xl font-semibold text-ink mb-2">Cancel your signup?</h1>
      <p className="text-sm text-ink-60 mb-4">
        This will cancel your Merritt Workspace signup and stop the reminder emails about
        finishing your portal. You can always apply again later if you change your mind.
      </p>
      {error && <div className="text-sm text-red-600 mb-4">{error}</div>}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={confirmCancel}
          disabled={state === 'loading'}
          className="bg-red-600 text-white py-2 px-4 hover:bg-red-700 disabled:opacity-50"
        >
          {state === 'loading' ? 'Cancelling…' : 'Yes, cancel my signup'}
        </button>
        <a
          href="/portal/login"
          className="border border-clay text-ink-60 py-2 px-4 hover:bg-linen"
        >
          No, keep my signup
        </a>
      </div>
    </div>
  );
}

export default function CancelOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto bg-bone p-8 border border-clay">
          <p className="text-sm text-ink-60">Loading…</p>
        </div>
      }
    >
      <CancelOnboardingInner />
    </Suspense>
  );
}
