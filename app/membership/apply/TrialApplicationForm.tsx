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

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle, Loader2, Upload, X } from 'lucide-react';
import Footer from '@/components/Footer';
import {
  MAX_ID_FILE_BYTES,
  MAX_ID_FILE_LABEL,
  TRIAL_PLANS_BY_SEATING,
  isAcceptedIdMimeType,
  isWeekdayIsoDate,
  nextWeekdayIsoDate,
  validateTrialSubmission,
  type TrialSeating,
} from '@/lib/portal/trialApplication';
import { OFFICE_SIZE_FOR_PLAN, type OfficeSize } from '@/lib/portal/officeSizes';
import { prepareIdUpload } from '@/lib/portal/idUpload';
import { BUSINESS_HOURS_FULL } from '@/lib/hours';

// The second question: which room, once someone has said where they want to
// work. "A private office" is three different rooms and "a dedicated desk" is
// two, and a trial day is a preview of one specific thing — staff have to put
// the person somewhere real on the day.
//
// Note what is NOT here: prices. A trial day is free, and quoting $1,200 a
// month at someone who asked to try a room for a day is the same mistake the
// combined form made. The room is described, and the link goes to the page
// where the pricing lives if they want it.
interface TrialPlanOption {
  id: string;
  name: string;
  detail: string;
  href: string;
  linkLabel: string;
}

const TRIAL_PLAN_OPTIONS: Record<string, TrialPlanOption> = {
  dedicated_desk: {
    id: 'dedicated_desk',
    name: 'On the coworking floor',
    detail:
      'Your own desk in the main coworking room, with a monitor, lockable storage and power at the pod.',
    href: '/membership/dedicated-desk',
    linkLabel: 'What a dedicated desk includes',
  },
  private_dedicated_desk: {
    id: 'private_dedicated_desk',
    name: 'In a private desk area',
    detail:
      'The same dedicated desk, but inside a lockable office we have converted into a desk area rather than out on the shared floor.',
    href: '/membership/dedicated-desk',
    linkLabel: 'Floor desk vs private desk',
  },
  private_office_single: {
    id: 'private_office_single',
    name: 'Single-desk office',
    detail: 'A lockable office for one, with a window and a door that closes.',
    href: '/membership/private-office',
    linkLabel: 'Compare the office sizes',
  },
  private_office_double: {
    id: 'private_office_double',
    name: '2-desk office',
    detail: 'Room for two desks — the size partnerships and two-person teams take.',
    href: '/membership/private-office',
    linkLabel: 'Compare the office sizes',
  },
  private_office_large: {
    id: 'private_office_large',
    name: 'Large team office',
    detail: 'A team room for four to eight, with space for a table of your own.',
    href: '/membership/private-office',
    linkLabel: 'Compare the office sizes',
  },
  cafe_membership: {
    id: 'cafe_membership',
    name: 'The café',
    detail: 'Open seating on the café side of the 1905 building next door.',
    href: '/membership/cafe',
    linkLabel: 'What a café membership includes',
  },
};

// Where the differences between the options in a group are written down.
const GROUP_LINK: Record<TrialSeating, { href: string; label: string } | null> = {
  desk: { href: '/membership/dedicated-desk', label: 'How the two desk options differ' },
  office: { href: '/membership/private-office', label: 'How the three office sizes differ' },
  cafe: null,
};

// Live counts, best effort. A failed or in-flight fetch leaves these null and
// the form simply says nothing about availability — a wrong number in front
// of someone choosing a room is worse than no number.
interface DeskAvailability {
  capacity: number;
  remaining: number | null;
  isFull: boolean;
  private_desk?: { capacity: number; remaining: number | null; isFull: boolean };
}

interface OfficeAvailability {
  capacity: number;
  remaining: number | null;
  isFull: boolean;
  // Null until the floor plan records which office is which size — see
  // lib/portal/officeSizes.ts. Null is "we don't know", never "none free".
  by_size: Record<OfficeSize, { capacity: number; remaining: number; isFull: boolean }> | null;
}

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
  const [trialPlan, setTrialPlan] = useState('');
  const [trialDate, setTrialDate] = useState('');
  const [agreesToTerms, setAgreesToTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);

  const [deskAvailability, setDeskAvailability] = useState<DeskAvailability | null>(null);
  const [officeAvailability, setOfficeAvailability] = useState<OfficeAvailability | null>(null);

  const [preparingFile, setPreparingFile] = useState(false);
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

  // Trial days are weekdays only, so the picker opens on the next one rather
  // than on a Saturday the validator would refuse.
  const earliestTrialDate = useMemo(() => nextWeekdayIsoDate(todayIso), [todayIso]);

  // What is actually free right now. Both endpoints are public, counts only —
  // they never say who sits where (app/api/desk-availability,
  // app/api/office-availability).
  useEffect(() => {
    let cancelled = false;
    const load = <T,>(url: string, set: (value: T) => void) => {
      fetch(url)
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && d && !d.unavailable) set(d as T);
        })
        .catch(() => {
          /* leave unknown — the form prints no counts at all */
        });
    };
    load<DeskAvailability>('/api/desk-availability', setDeskAvailability);
    load<OfficeAvailability>('/api/office-availability', setOfficeAvailability);
    return () => {
      cancelled = true;
    };
  }, []);

  // Which options a seating choice offers today.
  //
  // The private dedicated desk is the one option that comes and goes: it is a
  // desk in a converted office, sold only once all the floor desks are spoken
  // for, and deliberately not advertised before then — the same rule the
  // membership application follows (see app/api/desk-availability/route.ts).
  // While the floor has room the desk group is a single option, which the
  // panel below states rather than making someone choose from a list of one.
  const planOptions = useMemo(() => {
    if (!seating) return [] as TrialPlanOption[];
    return TRIAL_PLANS_BY_SEATING[seating]
      .filter((id) => id !== 'private_dedicated_desk' || deskAvailability?.isFull === true)
      .map((id) => TRIAL_PLAN_OPTIONS[id])
      .filter(Boolean);
  }, [seating, deskAvailability]);

  // A group of one needs no question: pick it for the person so the
  // submission still records exactly what they are coming in to try.
  useEffect(() => {
    if (planOptions.length === 1) setTrialPlan(planOptions[0].id);
  }, [planOptions]);

  // One line of live availability for an option, or null when we don't know.
  // Never a zero we cannot stand behind: an unknown count prints nothing.
  const availabilityFor = (planId: string): string | null => {
    if (planId === 'dedicated_desk') {
      const left = deskAvailability?.remaining;
      if (typeof left !== 'number') return null;
      return left > 0
        ? `${left} of ${deskAvailability?.capacity} desks free`
        : 'Every floor desk is spoken for';
    }
    if (planId === 'private_dedicated_desk') {
      const priv = deskAvailability?.private_desk;
      if (typeof priv?.remaining !== 'number') return null;
      return priv.remaining > 0
        ? `${priv.remaining} of ${priv.capacity} free`
        : 'None free — ask us about the waitlist';
    }
    const size = OFFICE_SIZE_FOR_PLAN[planId];
    const bySize = officeAvailability?.by_size;
    if (!size || !bySize) return null;
    const count = bySize[size];
    if (!count || count.capacity === 0) return null;
    return count.remaining > 0
      ? `${count.remaining} of ${count.capacity} free`
      : 'None free right now';
  };

  // The fallback line for offices while no floor plan sizes are recorded: the
  // building total, which is true whatever the size split turns out to be.
  const officeTotalLine =
    seating === 'office' &&
    !officeAvailability?.by_size &&
    typeof officeAvailability?.remaining === 'number'
      ? officeAvailability.remaining > 0
        ? `${officeAvailability.remaining} of ${officeAvailability.capacity} private offices are free right now.`
        : 'Every private office is occupied right now — a trial day is still worth booking, and we will show you what is coming free.'
      : null;

  const chooseSeating = (next: TrialSeating) => {
    setSeating(next);
    // The old answer belongs to the old question.
    setTrialPlan('');
    setError(null);
  };

  // Type first, then shrink, then size — in that order on purpose. A phone
  // photo arrives at 5–12MB and is re-encoded here (lib/portal/idUpload.ts)
  // rather than bounced: the file only has to be legible to a person reading
  // a name off a licence, and the request body it travels in has a hard
  // ceiling well under what a modern camera produces. Only what the browser
  // cannot shrink — a large PDF, an image it will not decode — can still
  // fail the size check, and then the message says what to do about it.
  const handleFileChange = async (file: File | null) => {
    setError(null);
    if (!file) {
      setIdFile(null);
      return;
    }
    if (!isAcceptedIdMimeType(file.type)) {
      setError('Please attach an image or a PDF of your ID.');
      return;
    }

    setPreparingFile(true);
    try {
      const prepared = await prepareIdUpload(file);
      if (prepared.size > MAX_ID_FILE_BYTES) {
        setError(
          prepared.type === 'application/pdf'
            ? `That PDF is larger than ${MAX_ID_FILE_LABEL}. Please attach a photo of your ID instead, or a smaller scan.`
            : `We could not get that file under ${MAX_ID_FILE_LABEL}. Try a photo taken at a lower resolution.`
        );
        return;
      }
      setIdFile(prepared);
    } catch {
      setError('We could not read that file. Please try another photo of your ID.');
    } finally {
      setPreparingFile(false);
    }
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
        trial_plan: trialPlan,
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
      body.append('trial_plan', trialPlan);
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
                    onChange={() => chooseSeating('desk')}
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
                    onChange={() => chooseSeating('office')}
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
                    onChange={() => chooseSeating('cafe')}
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

              {/* The second question, revealed by the first. An office is three
                  different rooms and a desk is two, so "a private office" on
                  its own does not tell staff which room to open. Availability
                  is shown per option because "is a 2-desk office actually
                  free?" is the thing a prospect is really asking. */}
              {seating && planOptions.length > 0 && (
                <div className="mt-5 border-l-2 border-orange-300 bg-white/70 pl-4 py-4 sm:pl-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="font-display text-lg font-semibold text-ink">
                      {seating === 'office'
                        ? 'Which office would you like to try?'
                        : seating === 'desk'
                          ? 'Which kind of desk?'
                          : 'What you will be trying'}
                    </h3>
                    {/* The comparison link belongs to the group. A group of
                        one has nothing to compare, so its card carries its own
                        link instead. */}
                    {planOptions.length > 1 && GROUP_LINK[seating] && (
                      <Link
                        href={GROUP_LINK[seating]!.href}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 underline-offset-2 hover:underline"
                      >
                        {GROUP_LINK[seating]!.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>

                  {officeTotalLine && <p className="mt-2 text-sm text-ink-60">{officeTotalLine}</p>}

                  {planOptions.length === 1 ? (
                    // A group of one: state it rather than offering a choice
                    // of one. Nothing to pick, but the description and the
                    // link still belong here.
                    <div className="mt-3 border border-clay bg-linen p-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="font-medium text-ink">{planOptions[0].name}</p>
                        {availabilityFor(planOptions[0].id) && (
                          <span className="text-xs font-medium text-ink-60">
                            {availabilityFor(planOptions[0].id)}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-ink-60">{planOptions[0].detail}</p>
                      <Link
                        href={planOptions[0].href}
                        target="_blank"
                        className="mt-2 inline-block text-sm font-medium text-orange-600 underline-offset-2 hover:underline"
                      >
                        {planOptions[0].linkLabel} &rarr;
                      </Link>
                    </div>
                  ) : (
                    <div
                      className={`mt-3 grid gap-3 ${planOptions.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
                    >
                      {planOptions.map((option) => {
                        const free = availabilityFor(option.id);
                        const selected = trialPlan === option.id;
                        return (
                          <label
                            key={option.id}
                            className={`flex h-full cursor-pointer flex-col border-2 p-3 transition ${selected ? 'border-orange-500 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                          >
                            <div className="flex items-start gap-2">
                              <input
                                type="radio"
                                name="trial_plan"
                                checked={selected}
                                onChange={() => {
                                  setTrialPlan(option.id);
                                  setError(null);
                                }}
                                className="mt-1 h-4 w-4 flex-shrink-0 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="font-medium text-ink">{option.name}</span>
                            </div>
                            <p className="mt-1.5 text-sm text-ink-60">{option.detail}</p>
                            {free && (
                              <span className="mt-2 inline-flex w-fit items-center bg-linen px-2 py-0.5 text-xs font-medium text-ink-60">
                                {free}
                              </span>
                            )}
                            {option.href !== GROUP_LINK[seating]?.href && (
                              <Link
                                href={option.href}
                                target="_blank"
                                onClick={(e) => e.stopPropagation()}
                                className="mt-2 text-sm font-medium text-orange-600 underline-offset-2 hover:underline"
                              >
                                {option.linkLabel} &rarr;
                              </Link>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <p className="mt-3 text-xs text-ink-60">
                    Nothing here commits you to anything &mdash; it tells us which space to have
                    ready on the day. Counts are what is free today and can move before your visit.
                  </p>
                </div>
              )}

              <div className="mt-6">
                <label htmlFor="trial-date" className="block text-sm font-medium text-ink-60 mb-2">
                  Which day would you like to come in? *
                </label>
                <input
                  id="trial-date"
                  type="date"
                  required
                  value={trialDate}
                  min={earliestTrialDate}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTrialDate(value);
                    // Say so as they pick, not after they have filled in the
                    // rest of the form and pressed submit. A date input has
                    // no way to grey out weekends.
                    setError(
                      value && !isWeekdayIsoDate(value)
                        ? 'Trial days run Monday through Friday. Please choose a weekday.'
                        : null
                    );
                  }}
                  className="w-full max-w-xs p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-ink-60 mt-2">
                  Trial days run Monday through Friday. The building is open {BUSINESS_HOURS_FULL}.
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
                  <span className="text-sm font-medium text-ink">
                    {preparingFile ? 'Preparing your photo…' : 'Choose a file or take a photo'}
                  </span>
                  <span className="text-xs text-ink-60">
                    JPG, PNG or PDF. Large photos are resized for you; a PDF must be under{' '}
                    {MAX_ID_FILE_LABEL}.
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    disabled={preparingFile}
                    onChange={(e) => {
                      void handleFileChange(e.target.files?.[0] ?? null);
                    }}
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
                disabled={submitting || preparingFile || !agreesToTerms || !idFile || !trialPlan}
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
