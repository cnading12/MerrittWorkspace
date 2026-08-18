"use client";

// "Already a member?" migration form, linked from /portal/login.
//
// This is the streamlined path for members who originally signed up on
// paper applications and have been invoiced manually by the accountant.
// On submit:
//   1. We POST to /api/membership-application/existing-member which
//      creates the auth user (with the password they set here), an
//      auto-approved member_applications row, and a members row tagged
//      `is_legacy_member = true`.
//   2. We then sign them in with the same password and redirect to
//      /portal so they land on the dashboard immediately — no magic link,
//      no admin review.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { DESK_RANGE_LABEL } from '@/lib/portal/desks';

type PlanId =
  | 'dedicated_desk'
  | 'private_office_single'
  | 'private_office_double'
  | 'private_office_large'
  | 'office_member';

interface PlanDef {
  id: PlanId;
  label: string;
  monthly: number;
  needs: 'desk' | 'office';
  blurb: string;
}

const PLANS: PlanDef[] = [
  {
    id: 'dedicated_desk',
    label: 'Dedicated Desk',
    monthly: 100,
    needs: 'desk',
    blurb: 'A reserved desk in the open workspace.',
  },
  {
    id: 'private_office_single',
    label: 'Private Office — Single',
    monthly: 500,
    needs: 'office',
    blurb: 'Lockable single-person office.',
  },
  {
    id: 'private_office_double',
    label: 'Private Office — Double',
    monthly: 700,
    needs: 'office',
    blurb: 'Office with room for two desks.',
  },
  {
    id: 'private_office_large',
    label: 'Private Office — Large',
    monthly: 1200,
    needs: 'office',
    blurb: 'Larger office for established teams.',
  },
  {
    id: 'office_member',
    label: 'Office Member — joining an existing office',
    monthly: 0,
    needs: 'office',
    blurb:
      'You work in a private office that a colleague or your company already pays for. Free account — staff approves your request.',
  },
];

export default function ExistingMemberMigrationPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [planId, setPlanId] = useState<PlanId>('dedicated_desk');
  const [deskNumber, setDeskNumber] = useState('');
  const [officeNumber, setOfficeNumber] = useState('');
  const [agreesToTerms, setAgreesToTerms] = useState(false);

  const selectedPlan = useMemo(
    () => PLANS.find((p) => p.id === planId) || PLANS[0],
    [planId]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreesToTerms) {
      setError('Please agree to the Terms & Conditions to continue.');
      return;
    }
    if (selectedPlan.needs === 'desk' && !deskNumber.trim()) {
      setError('Please enter your dedicated desk number.');
      return;
    }
    if (selectedPlan.needs === 'office' && !officeNumber.trim()) {
      setError('Please enter your office number.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/membership-application/existing-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim(),
          company_name: companyName.trim() || undefined,
          membership_type: planId,
          desk_number: selectedPlan.needs === 'desk' ? deskNumber.trim() : undefined,
          office_number: selectedPlan.needs === 'office' ? officeNumber.trim() : undefined,
          agrees_to_terms: agreesToTerms,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Migration failed');
      }

      // Sign in immediately with the password the member just set so we
      // can land them on /portal without a separate magic-link round-trip.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInErr) {
        // Fallback: ask them to sign in manually if the auto-login fails.
        router.replace('/portal/login?migrated=1');
        return;
      }
      router.replace('/portal');
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-bone p-8 border border-clay">
      <div className="mb-6">
        <Link href="/portal/login" className="text-sm text-ink-60 hover:text-ink">
          ← Back to sign in
        </Link>
      </div>

      <h1 className="font-display text-2xl font-semibold text-ink mb-2">
        Existing member account setup
      </h1>
      <p className="text-sm text-ink-60 mb-6">
        Use this form if you joined Merritt Workspace before our online
        portal existed, <strong>or</strong> if you&apos;re joining an office
        that a colleague or your company already pays for. We&apos;ll just
        need a few details.
      </p>

      <div className="bg-orange-50 border border-orange-200 p-4 text-sm text-ink-60 mb-6">
        <p className="font-semibold text-orange-900 mb-1">What this is not</p>
        <p>
          This is <em>only</em> for people who already have a membership or a
          seat in an existing private office. If you&apos;re new to Merritt
          Workspace, please use the{' '}
          <Link href="/membership/apply" className="text-orange-700 underline">
            standard application form
          </Link>{' '}
          instead.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-300 text-red-900 p-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <h2 className="font-display text-lg font-semibold text-ink mb-3">Account</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-ink-60">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-60">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full border px-3 py-2"
              />
              <p className="text-xs text-ink-60 mt-1">At least 8 characters.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-60">
                Confirm password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full border px-3 py-2"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink mb-3">Contact info</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-60">
                First name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-60">
                Last name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-60">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full border px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-60">
                Company (optional)
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="mt-1 w-full border px-3 py-2"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-ink mb-3">
            Your membership
          </h2>
          <div className="space-y-2">
            {PLANS.map((p) => (
              <label
                key={p.id}
                className={`flex items-start gap-3 p-3 border cursor-pointer ${
                  planId === p.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  className="mt-1"
                  checked={planId === p.id}
                  onChange={() => setPlanId(p.id)}
                />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-medium text-ink">{p.label}</div>
                    <div className="text-sm text-ink-60">
                      {p.monthly === 0 ? 'Free' : `$${p.monthly}/mo`}
                    </div>
                  </div>
                  <div className="text-xs text-ink-60">{p.blurb}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4">
            {selectedPlan.needs === 'desk' ? (
              <>
                <label className="block text-sm font-medium text-ink-60">
                  Your dedicated desk number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={deskNumber}
                  onChange={(e) => setDeskNumber(e.target.value)}
                  placeholder="e.g. DD4"
                  className="mt-1 w-full border px-3 py-2 sm:w-48"
                />
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-ink-60">
                  {planId === 'office_member'
                    ? 'The office you work in'
                    : 'Your office number'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={officeNumber}
                  onChange={(e) => setOfficeNumber(e.target.value)}
                  placeholder="e.g. 110"
                  className="mt-1 w-full border px-3 py-2 sm:w-48"
                />
              </>
            )}
            <p className="text-xs text-ink-60 mt-1">
              {selectedPlan.needs === 'desk'
                ? `Dedicated desks are numbered ${DESK_RANGE_LABEL}.`
                : 'Offices are numbered 100–114 (there is no 113).'}{' '}
              If you&apos;re unsure, leave a best guess — staff can adjust it
              on the admin side.
            </p>
            {selectedPlan.needs === 'desk' && (
              <p className="text-xs text-ink-60 mt-1">
                Reminder: please keep something on your desk that marks it as
                yours — anything from a business card or sticky note to your
                full setup. An empty desk looks available to visitors and
                other members.
              </p>
            )}
          </div>
        </section>

        <section className="bg-linen border border-clay p-4 text-sm text-ink-60 space-y-2">
          <p className="font-semibold text-ink">After you submit</p>
          {planId === 'office_member' ? (
            <ol className="list-decimal pl-5 space-y-1">
              <li>You&apos;ll be signed straight into your member portal.</li>
              <li>
                Our staff gets a heads-up and approves your request — usually
                same day. You&apos;ll get an email the moment you&apos;re in.
              </li>
              <li>
                Once approved you can book the conference room (using your
                office&apos;s shared included hours), shop the snack shop, and
                request a building access code (only needed for late-evening
                and weekend entry — the building is unlocked Mon – Fri, 8:00 AM
                – 6:00 PM). <strong>There is no charge</strong> — your
                office&apos;s primary member covers the space.
              </li>
            </ol>
          ) : (
            <ol className="list-decimal pl-5 space-y-1">
              <li>You&apos;ll be signed straight into your member portal.</li>
              <li>
                Sign your Member Agreement, Terms &amp; Conditions, and Fee
                Agreement (uploading photo ID / proof of address is{' '}
                <strong>not required</strong> for existing members).
              </li>
              <li>
                <strong>Optional:</strong> set up Stripe auto-pay so future
                payments are charged automatically on the 1st of each month. If
                you skip this, your billing continues however it currently works
                — no first/last month, no proration.
              </li>
            </ol>
          )}
        </section>

        <label className="flex items-start gap-2 text-sm text-ink-60">
          <input
            type="checkbox"
            checked={agreesToTerms}
            onChange={(e) => setAgreesToTerms(e.target.checked)}
            className="mt-1"
          />
          <span>
            {planId === 'office_member'
              ? 'I confirm I work out of the private office listed above and I agree to the '
              : 'I confirm I am an existing Merritt Workspace member and I agree to the '}
            <a href="/terms" target="_blank" className="text-orange-700 underline">
              Terms &amp; Conditions
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" className="text-orange-700 underline">
              Privacy Policy
            </a>
            . <span className="text-red-500">*</span>
          </span>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-ink text-white py-3 font-semibold hover:bg-ink disabled:opacity-50"
        >
          {submitting ? 'Setting up your account…' : 'Create my portal account'}
        </button>
      </form>
    </div>
  );
}
