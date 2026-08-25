"use client";

// The trial day application — the short path from /membership/apply.
//
// Seven fields and a photo ID. Everything the full application asks for
// exists to support the admin approve/decline decision, and a trial day has
// never been gated on one: /api/membership-application/trial sends the
// trial-day email in the same request that stores the row, exactly as the
// combined form always did. Asking a stranger for their mortgage company in
// exchange for one day at a desk only ever cost us applicants.
//
// The photo ID is the exception and is required. It is the one identity
// check before someone spends a day in the building — the same bar a
// non-member clears to book a conference room.

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, CheckCircle, Loader2, Upload, X } from 'lucide-react';
import Footer from '@/components/Footer';
import {
  MAX_ID_FILE_BYTES,
  isAcceptedIdMimeType,
  validateTrialSubmission,
  type TrialSeating,
} from '@/lib/portal/trialApplication';

interface TrialApplicationFormProps {
  onChangePath?: () => void;
}

export default function TrialApplicationForm({ onChangePath }: TrialApplicationFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [seating, setSeating] = useState<TrialSeating | ''>('');
  const [trialDate, setTrialDate] = useState('');
  const [agreesToTerms, setAgreesToTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The earliest day someone can book. Computed in the browser's own
  // timezone, which for a Denver workspace is the visitor's practical "today"
  // — the server re-checks against Denver time on submit.
  const todayIso = useMemo(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().split('T')[0];
  }, []);

  const handleFileChange = (file: File | null) => {
    setError(null);
    if (!file) {
      setIdFile(null);
      return;
    }
    if (file.size > MAX_ID_FILE_BYTES) {
      setError('That file is too large (max 10MB). Try a photo taken at a lower resolution.');
      return;
    }
    if (!isAcceptedIdMimeType(file.type)) {
      setError('Please attach an image or a PDF of your ID.');
      return;
    }
    setIdFile(file);
  };

  const clearFile = () => {
    setIdFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Same validator the API runs, so the wording of a rejection is
    // identical whichever side catches it.
    const problem = validateTrialSubmission(
      {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        company_name: companyName,
        seating,
        trial_date: trialDate,
        agrees_to_terms: agreesToTerms,
      },
      { today: todayIso }
    );
    if (problem) {
      setError(problem);
      return;
    }
    if (!idFile) {
      setError('Please attach a photo of your government-issued ID.');
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append('first_name', firstName);
      body.append('last_name', lastName);
      body.append('email', email);
      body.append('phone', phone);
      body.append('company_name', companyName);
      body.append('seating', seating);
      body.append('trial_date', trialDate);
      body.append('agrees_to_terms', String(agreesToTerms));
      body.append('marketing_consent', String(marketingConsent));
      body.append('id_document', idFile);

      const response = await fetch('/api/membership-application/trial', {
        method: 'POST',
        body,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit your trial day application');

      setSuccess(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-bone pt-20 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="font-display text-3xl font-semibold text-ink mb-4">
            Your Trial Day Is Booked
          </h1>
          <div className="bg-bone p-6 border border-clay mb-8 text-left">
            <p className="text-ink-60 leading-relaxed mb-4">{success}</p>
            <p className="text-ink-60 leading-relaxed">
              That email has the WiFi details, building hours, where to sit, and how everything
              works. There is nothing else to fill in before your visit &mdash; bring your laptop
              and come in.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/membership"
              className="bg-orange-600 text-white px-6 py-3 font-semibold hover:bg-orange-700 transition"
            >
              View Membership Options
            </Link>
            <Link
              href="/"
              className="border-2 border-orange-600 text-orange-600 px-6 py-3 font-semibold hover:bg-orange-600 hover:text-white transition"
            >
              Back to Homepage
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const fieldClass =
    'w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500 focus:border-orange-500';

  return (
    <main className="min-h-screen bg-bone pt-20">
      <section className="bg-linen py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-ink mb-6">
            Book Your Free Trial Day
          </h1>
          <p className="text-xl text-ink-60 mb-8">
            A full day at Merritt Workspace, on us. Tell us who you are and when you&rsquo;d like
            to come in &mdash; that&rsquo;s the whole form.
          </p>
          {onChangePath && (
            <button
              type="button"
              onClick={onChangePath}
              className="mx-auto mb-8 flex items-center gap-2 text-sm font-medium text-ink-60 transition hover:text-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              Choose a different path
            </button>
          )}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-ink-60">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-accent" />
              <span>No cost, no card</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-accent" />
              <span>No commitment</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-accent" />
              <span>Details emailed right away</span>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="bg-red-50 border border-red-200 p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <section className="py-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-bone border border-clay p-6 space-y-4">
              <h2 className="font-display text-xl font-semibold text-ink mb-2">Your details</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="trial-first-name" className="block text-sm font-medium text-ink-60 mb-2">
                    First Name *
                  </label>
                  <input
                    id="trial-first-name"
                    type="text"
                    required
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="trial-last-name" className="block text-sm font-medium text-ink-60 mb-2">
                    Last Name *
                  </label>
                  <input
                    id="trial-last-name"
                    type="text"
                    required
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="trial-email" className="block text-sm font-medium text-ink-60 mb-2">
                    Email Address *
                  </label>
                  <input
                    id="trial-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={fieldClass}
                  />
                  <p className="text-xs text-ink-60 mt-2">
                    Your trial day details arrive here within a minute or two.
                  </p>
                </div>
                <div>
                  <label htmlFor="trial-phone" className="block text-sm font-medium text-ink-60 mb-2">
                    Phone Number *
                  </label>
                  <input
                    id="trial-phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="trial-company" className="block text-sm font-medium text-ink-60 mb-2">
                  Company <span className="text-ink-60">(optional)</span>
                </label>
                <input
                  id="trial-company"
                  type="text"
                  autoComplete="organization"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="bg-bone border border-clay p-6">
              <h2 className="font-display text-xl font-semibold text-ink mb-2">Your visit</h2>
              <p className="text-sm text-ink-60 mb-4">
                Where would you like to work for the day? Whichever you pick, the whole place is
                open to you &mdash; the kitchen, the printers, the meeting rooms and a look around.
              </p>
              <div className="space-y-3">
                <label
                  className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition ${seating === 'desk' ? 'border-orange-500 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <input
                    type="radio"
                    name="trial_seating"
                    checked={seating === 'desk'}
                    onChange={() => setSeating('desk')}
                    className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <p className="font-medium text-ink">A dedicated desk</p>
                    <p className="text-sm text-ink-60">
                      Your own desk on the coworking floor, with a monitor, storage and power.
                      We&rsquo;ll email you which desks are free so you can walk in and sit down.
                    </p>
                  </div>
                </label>
                <label
                  className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition ${seating === 'office' ? 'border-orange-500 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <input
                    type="radio"
                    name="trial_seating"
                    checked={seating === 'office'}
                    onChange={() => setSeating('office')}
                    className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <p className="font-medium text-ink">A private office</p>
                    <p className="text-sm text-ink-60">
                      A lockable office to yourself. We&rsquo;ll confirm which office with you
                      beforehand, since it has to be unlocked and set up for your arrival.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 border-2 cursor-pointer transition ${seating === 'cafe' ? 'border-orange-500 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <input
                    type="radio"
                    name="trial_seating"
                    checked={seating === 'cafe'}
                    onChange={() => setSeating('cafe')}
                    className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500"
                  />
                  <div>
                    <p className="font-medium text-ink">The caf&eacute;</p>
                    <p className="text-sm text-ink-60">
                      Open seating in the caf&eacute; at the front of the restored 1905 building
                      next door &mdash; tables, natural light, stained glass. No assigned desk. The
                      workspace itself stays open to you all day for everything else.
                    </p>
                  </div>
                </label>
              </div>

              <div className="mt-6">
                <label htmlFor="trial-date" className="block text-sm font-medium text-ink-60 mb-2">
                  Which day would you like to come in? *
                </label>
                <input
                  id="trial-date"
                  type="date"
                  required
                  value={trialDate}
                  min={todayIso}
                  onChange={(e) => setTrialDate(e.target.value)}
                  className="w-full max-w-xs p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-ink-60 mt-2">
                  The building is open 8:00 AM &ndash; 6:00 PM, Monday through Friday.
                </p>
              </div>
            </div>

            <div className="bg-bone border border-clay p-6">
              <h2 className="font-display text-xl font-semibold text-ink mb-2">Photo ID *</h2>
              <p className="text-sm text-ink-60 mb-4">
                A photo of your driver&rsquo;s license or passport. We ask everyone who works in
                the building for one &mdash; it&rsquo;s the only document we need from you, and if
                you join later it carries over so you never upload it twice.
              </p>

              {idFile ? (
                <div className="flex items-center justify-between gap-3 border border-clay bg-linen p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
                    <span className="truncate text-sm text-ink">{idFile.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="flex flex-shrink-0 items-center gap-1 text-sm text-ink-60 transition hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed border-clay bg-linen p-8 text-center transition hover:border-orange-400">
                  <Upload className="h-6 w-6 text-ink-60" />
                  <span className="text-sm font-medium text-ink">Choose a file or take a photo</span>
                  <span className="text-xs text-ink-60">JPG, PNG or PDF, up to 10MB</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </div>

            <div className="bg-bone border border-clay p-6 space-y-4">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={agreesToTerms}
                  onChange={(e) => setAgreesToTerms(e.target.checked)}
                  className="mt-1 mr-3 h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
                />
                <div className="text-sm text-ink-60">
                  I agree to the{' '}
                  <Link href="/terms" className="text-orange-600 underline hover:text-orange-700">
                    terms and conditions
                  </Link>{' '}
                  and confirm the information above is accurate. *
                </div>
              </label>
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-1 mr-3 h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
                />
                <div className="text-sm text-ink-60">
                  I would like to receive updates about community events and workspace news
                </div>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || !agreesToTerms || !idFile}
                className="w-full bg-orange-600 py-4 px-6 text-lg font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
                    Booking your trial day...
                  </>
                ) : (
                  'Book My Trial Day'
                )}
              </button>
              <p className="mt-4 text-center text-sm text-ink-60">
                No payment, and nothing to cancel. If you decide to join afterwards we&rsquo;ll
                send you a membership application with all of this already filled in.
              </p>
            </div>
          </form>
        </div>
      </section>

      <Footer />
    </main>
  );
}
