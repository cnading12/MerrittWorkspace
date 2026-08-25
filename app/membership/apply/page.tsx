"use client";

// /membership/apply — the path chooser.
//
// The trial-day / membership choice used to be a radio pair buried two
// thirds of the way down a single 40-field form, which meant a trial
// applicant filled in their mortgage company and gym contact before
// reaching it. Now the choice is the first thing on the page and it picks
// which form you see at all.
//
// The route is unchanged so every existing CTA, bookmark and indexed link
// still lands somewhere sensible:
//   /membership/apply             → the chooser
//   /membership/apply?trial=1     → straight to the trial form
//   /membership/apply?plan=<id>   → straight to the full form, plan preselected
//   /membership/apply?resume=<t>  → the full form, prefilled from a trial
//
// Query params are read off window.location rather than useSearchParams so
// this page does not need a Suspense boundary to stay statically rendered —
// the same reason the combined form did it that way.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarCheck, CheckCircle, ClipboardList, Loader2 } from 'lucide-react';
import Footer from '@/components/Footer';
import FullApplicationForm from './FullApplicationForm';
import TrialApplicationForm from './TrialApplicationForm';
import type { TrialPrefill } from '@/lib/portal/trialApplication';

type Path = 'choose' | 'trial' | 'full';

export default function ApplyPage() {
  const [path, setPath] = useState<Path>('choose');
  const [resumeToken, setResumeToken] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<TrialPrefill | null>(null);
  // Only true while a resume link is being resolved. A cold visit to
  // /membership/apply renders the chooser immediately.
  const [resolvingResume, setResolvingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const token = params.get('resume');
    if (token) {
      setResolvingResume(true);
      setResumeToken(token);
      fetch(`/api/membership-application/resume?token=${encodeURIComponent(token)}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'This link is no longer valid.');
          setPrefill(data.prefill as TrialPrefill);
          setPath('full');
        })
        .catch((err: Error) => {
          // A dead or already-used link must not strand someone on a spinner.
          // Drop them on the chooser with an explanation; the full form is
          // one click away and works fine without the prefill.
          setResumeError(err.message);
          setResumeToken(null);
        })
        .finally(() => setResolvingResume(false));
      return;
    }

    const trial = params.get('trial');
    if (trial === '1' || trial === 'true') {
      setPath('trial');
      return;
    }

    // Arriving from a CTA that already named a plan — the café membership
    // page's Apply buttons land here as ?plan=cafe_membership. Someone who
    // has picked a plan has picked the membership path, so skip the chooser
    // rather than making them answer a question they just answered.
    //
    // The preselect itself stays in FullApplicationForm, which reads the same
    // param off window.location once it mounts; this only decides which form
    // is shown. Checked last so ?trial=1 wins if both are somehow present.
    if (params.get('plan')) setPath('full');
  }, []);

  // Returning to the chooser clears any resume state: the prefill belongs to
  // the full form, and carrying it into a fresh choice would be surprising.
  const backToChooser = useCallback(() => {
    setPath('choose');
    setPrefill(null);
    setResumeToken(null);
    setResumeError(null);
    window.scrollTo({ top: 0 });
  }, []);

  if (resolvingResume) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bone pt-20">
        <div className="flex items-center gap-3 text-ink-60">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading your application&hellip;</span>
        </div>
      </main>
    );
  }

  if (path === 'trial') return <TrialApplicationForm onChangePath={backToChooser} />;
  if (path === 'full') {
    return (
      <FullApplicationForm
        prefill={prefill}
        resumeToken={resumeToken}
        onChangePath={backToChooser}
      />
    );
  }

  return (
    <main className="min-h-screen bg-bone pt-20">
      <section className="bg-linen py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="font-display mb-6 text-4xl font-semibold text-ink md:text-5xl">
            Join Merritt Workspace
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-ink-60">
            Two ways in. Spend a day here first to see whether it fits, or apply for membership
            straight away if you already know.
          </p>
        </div>
      </section>

      {resumeError && (
        <div className="mx-auto mt-8 max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {resumeError} You can still apply for membership below &mdash; you&rsquo;ll just need
            to fill it in from scratch, or reply to any email from us and we&rsquo;ll send a fresh
            link.
          </div>
        </div>
      )}

      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Trial day */}
            <button
              type="button"
              onClick={() => setPath('trial')}
              className="group flex flex-col border-2 border-clay bg-bone p-8 text-left transition hover:border-orange-500"
            >
              <CalendarCheck className="mb-4 h-8 w-8 text-accent" />
              <h2 className="font-display mb-2 text-2xl font-semibold text-ink">
                Book a free trial day
              </h2>
              <p className="mb-6 text-ink-60">
                A full workday here, on us &mdash; the desk, the coffee, the flex space. Come see
                it before you decide anything.
              </p>
              <ul className="mb-8 space-y-2 text-sm text-ink-60">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  <span>Takes about a minute</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  <span>Contact details and a photo ID &mdash; that&rsquo;s all</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  <span>No payment and no commitment</span>
                </li>
              </ul>
              <span className="mt-auto inline-flex items-center gap-2 font-semibold text-accent">
                Book a trial day
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </button>

            {/* Full membership */}
            <button
              type="button"
              onClick={() => setPath('full')}
              className="group flex flex-col border-2 border-clay bg-bone p-8 text-left transition hover:border-orange-500"
            >
              <ClipboardList className="mb-4 h-8 w-8 text-accent" />
              <h2 className="font-display mb-2 text-2xl font-semibold text-ink">
                Apply for membership
              </h2>
              <p className="mb-6 text-ink-60">
                Ready to take a desk or an office. This is the full application, and it&rsquo;s
                what we review to get you moved in.
              </p>
              <ul className="mb-8 space-y-2 text-sm text-ink-60">
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  <span>Around ten minutes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  <span>Includes references and an emergency contact</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent" />
                  <span>We respond within 1&ndash;2 business days</span>
                </li>
              </ul>
              <span className="mt-auto inline-flex items-center gap-2 font-semibold text-accent">
                Start the application
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </span>
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-ink-60">
            Not sure? Start with the trial day. If you join afterwards we&rsquo;ll send you a
            membership application with everything you&rsquo;ve already given us filled in.
          </p>

          <p className="mt-4 text-center text-sm text-ink-60">
            Already a member?{' '}
            <Link href="/portal/login" className="text-orange-600 underline hover:text-orange-700">
              Sign in to your portal
            </Link>
            .
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
