"use client";

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle, AlertCircle, Loader2, User, Briefcase, Calendar, Phone, Shield, CreditCard, Home, Dumbbell, Plus, Minus } from 'lucide-react';
import Footer from "@/components/Footer";
import Link from 'next/link';

type HousingReferenceType = '' | 'mortgage' | 'landlord';
type MembershipReferenceType = '' | 'gym' | 'workspace';
type PlanId = 'dedicated_desk' | 'private_dedicated_desk' | 'one_day_dedicated_desk' | 'private_office_single' | 'private_office_double' | 'private_office_large';

// Live dedicated-desk availability from /api/desk-availability. The shared
// coworking floor holds a fixed number of desks; once every one is spoken for
// we stop selling floor-plan desks and offer a private dedicated desk — a desk
// in a lockable office we've converted into a dedicated-desk area — instead.
interface DeskAvailability {
  capacity: number;
  taken: number | null;
  remaining: number | null;
  isFull: boolean;
}

interface SelectedPlan {
  plan_id: PlanId;
  quantity: number;
}

interface HousingReference {
  type: HousingReferenceType;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  property_address: string;
  start_date: string;
  end_date: string;
}

interface MembershipReference {
  type: MembershipReferenceType;
  facility_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  start_date: string;
  end_date: string;
}

interface MembershipApplication {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name: string;
  job_title: string;
  industry: string;
  linkedin_url?: string;
  website_url?: string;
  // Representative single plan kept for backward compat with downstream
  // systems that expect one designation; computed from selected_plans.
  membership_type: PlanId;
  selected_plans: SelectedPlan[];
  start_date: string;
  // null = applicant has not yet picked between trial-first and membership-now
  wants_trial_day: boolean | null;
  trial_date: string;
  referral_source: string;
  work_style: string[];
  meeting_frequency: 'rarely' | 'monthly' | 'weekly' | 'daily';
  team_size: number;
  special_requirements?: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  housing_reference: HousingReference;
  membership_reference: MembershipReference;
  agrees_to_terms: boolean;
  marketing_consent: boolean;
}

interface PlanDef {
  id: PlanId;
  name: string;
  price: number;
  description: string;
  category: string;
  recurrence: 'monthly' | 'one_time';
  features: string[];
  // Only offered once every desk on the shared coworking floor is spoken for.
  // Hidden entirely until then — we don't advertise the private tier while we
  // still have floor desks to sell.
  onlyWhenDesksFull?: boolean;
}

// Prices here must match lib/portal/pricing.ts and the PLAN_CATALOG in
// app/api/membership-application/route.ts, which prices the submission
// server-side.
const membershipPlans: PlanDef[] = [
  {
    id: 'dedicated_desk',
    name: 'Dedicated Desk',
    price: 200,
    description: 'Your own dedicated desk in our collaborative coworking environment.',
    category: 'Shared Workspace',
    recurrence: 'monthly',
    features: ['24/7 access', 'High-speed WiFi', 'Printing access', 'Kitchen access', '4 conference room hours/month']
  },
  {
    id: 'private_dedicated_desk',
    name: 'Private Dedicated Desk',
    price: 300,
    description: 'Your own dedicated desk inside a private, lockable office area — not on the shared coworking floor.',
    category: 'Private Area',
    recurrence: 'monthly',
    onlyWhenDesksFull: true,
    features: [
      'Private, lockable office area — outside the shared community space',
      'Your own dedicated desk within that area',
      '24/7 access',
      'High-speed WiFi',
      'Printing access',
      'Kitchen access',
      '4 conference room hours/month',
    ]
  },
  {
    id: 'one_day_dedicated_desk',
    name: 'One Day Dedicated Desk',
    price: 30,
    description: 'Single-day dedicated desk pass. A one-time $30 charge — no recurring subscription.',
    category: 'Day Pass',
    recurrence: 'one_time',
    features: ['One-time $30 charge', 'Full day of access', '1 hour of conference room time', 'High-speed WiFi', 'Kitchen access', 'Printing access']
  },
  {
    id: 'private_office_single',
    name: 'Private Office - Single',
    price: 500,
    description: 'Private lockable office for individual professionals',
    category: 'Private Office',
    recurrence: 'monthly',
    features: ['24/7 access', 'Lockable office', 'Window view', 'High-speed WiFi', '8 conference room hours/month']
  },
  {
    id: 'private_office_double',
    name: 'Private Office - Double',
    price: 700,
    description: 'Private office space perfect for small teams',
    category: 'Private Office',
    recurrence: 'monthly',
    features: ['24/7 access', 'Lockable office', 'Space for 2 desks', 'Window view', '12 conference room hours/month']
  },
  {
    id: 'private_office_large',
    name: 'Private Office - Large',
    price: 1200,
    description: 'Spacious office for established teams',
    category: 'Private Office',
    recurrence: 'monthly',
    features: ['24/7 access', 'Large lockable office', 'Space for 4+ desks', 'Conference table', '20 conference room hours/month']
  }
];

const planById = (id: PlanId): PlanDef | undefined => membershipPlans.find(p => p.id === id);

const workStyleOptions = [
  'Quiet focused work',
  'Collaborative projects',
  'Client meetings',
  'Phone calls',
  'Video conferences',
  'Creative brainstorming',
  'Networking'
];

const industryOptions = [
  'Technology',
  'Consulting',
  'Marketing/Advertising',
  'Finance',
  'Healthcare',
  'Legal',
  'Real Estate',
  'Education',
  'Non-profit',
  'Creative Services',
  'Other'
];

const referralSources = [
  'Google Search',
  'Social Media',
  'Member Referral',
  'Website',
  'Walking by',
  'Networking Event',
  'Online Review',
  'Other'
];

export default function MembershipApplicationPage() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deskAvailability, setDeskAvailability] = useState<DeskAvailability | null>(null);

  // How full the dedicated-desk floor is. Best-effort: a failed or in-flight
  // check leaves this null, which shows the standard plans.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/desk-availability')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d && !d.unavailable) setDeskAvailability(d as DeskAvailability);
      })
      .catch(() => {
        /* leave availability unknown — the standard plans stay on offer */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [application, setApplication] = useState<MembershipApplication>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    job_title: '',
    industry: '',
    linkedin_url: '',
    website_url: '',
    membership_type: 'dedicated_desk',
    selected_plans: [],
    start_date: '',
    wants_trial_day: null,
    trial_date: '',
    referral_source: '',
    work_style: [],
    meeting_frequency: 'monthly',
    team_size: 1,
    special_requirements: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    housing_reference: {
      type: '',
      company_name: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      property_address: '',
      start_date: '',
      end_date: ''
    },
    membership_reference: {
      type: '',
      facility_name: '',
      contact_name: '',
      contact_phone: '',
      contact_email: '',
      start_date: '',
      end_date: ''
    },
    agrees_to_terms: false,
    marketing_consent: false
  });

  // Arriving from a "Book a free trial day" CTA. Those buttons land here with
  // ?trial=1 rather than on the contact form, so pre-answer the trial question
  // for them. Read off window.location instead of useSearchParams so this page
  // does not need a Suspense boundary to stay statically rendered.
  const [arrivedForTrial, setArrivedForTrial] = useState(false);
  useEffect(() => {
    const trial = new URLSearchParams(window.location.search).get('trial');
    if (trial === '1' || trial === 'true') {
      setArrivedForTrial(true);
      setApplication(prev => (prev.wants_trial_day === null ? { ...prev, wants_trial_day: true } : prev));
    }
  }, []);

  const getQuantity = (planId: PlanId): number =>
    application.selected_plans.find(p => p.plan_id === planId)?.quantity ?? 0;

  const setQuantity = (planId: PlanId, quantity: number) => {
    const clean = Math.max(0, Math.min(20, Math.floor(quantity || 0)));
    setApplication(prev => {
      const others = prev.selected_plans.filter(p => p.plan_id !== planId);
      const next = clean > 0 ? [...others, { plan_id: planId, quantity: clean }] : others;
      // Pick the most expensive selected plan as the representative
      // membership_type for legacy single-plan code paths.
      const representative = next.length > 0
        ? [...next].sort((a, b) => (planById(b.plan_id)?.price ?? 0) - (planById(a.plan_id)?.price ?? 0))[0].plan_id
        : prev.membership_type;
      return { ...prev, selected_plans: next, membership_type: representative };
    });
  };

  const adjustQuantity = (planId: PlanId, delta: number) =>
    setQuantity(planId, getQuantity(planId) + delta);

  // Once every desk on the shared floor is spoken for, the $200 floor-plan
  // desk can no longer be applied for and the $300 private dedicated desk
  // takes its place. Stays null while loading or if the check fails, which
  // keeps the normal offering on screen and the private tier hidden.
  const desksFull = deskAvailability?.isFull === true;
  const visiblePlans = useMemo(
    () => membershipPlans.filter((p) => !p.onlyWhenDesksFull || desksFull),
    [desksFull]
  );

  // If availability lands after someone already added a floor desk to their
  // application, take it back off — they can't be sold one.
  useEffect(() => {
    if (desksFull && getQuantity('dedicated_desk') > 0) setQuantity('dedicated_desk', 0);
    // setQuantity/getQuantity are re-created every render; depending on them
    // would loop. The only input that matters here is `desksFull`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desksFull]);

  const totals = useMemo(() => {
    let monthlyCents = 0;
    let oneTimeCents = 0;
    const lines: { plan: PlanDef; quantity: number; subtotal: number }[] = [];
    for (const sel of application.selected_plans) {
      const plan = planById(sel.plan_id);
      if (!plan || sel.quantity <= 0) continue;
      const subtotal = plan.price * sel.quantity;
      lines.push({ plan, quantity: sel.quantity, subtotal });
      if (plan.recurrence === 'monthly') monthlyCents += subtotal * 100;
      else oneTimeCents += subtotal * 100;
    }
    return {
      lines,
      monthly: monthlyCents / 100,
      oneTime: oneTimeCents / 100,
      hasMonthly: monthlyCents > 0,
      hasOneTime: oneTimeCents > 0,
      anySelected: application.selected_plans.some(p => p.quantity > 0),
    };
  }, [application.selected_plans]);

  const handleWorkStyleChange = (style: string, checked: boolean) => {
    setApplication(prev => ({
      ...prev,
      work_style: checked
        ? [...prev.work_style, style]
        : prev.work_style.filter(s => s !== style)
    }));
  };

  const updateHousingReference = <K extends keyof HousingReference>(field: K, value: HousingReference[K]) => {
    setApplication(prev => ({
      ...prev,
      housing_reference: { ...prev.housing_reference, [field]: value }
    }));
  };

  const updateMembershipReference = <K extends keyof MembershipReference>(field: K, value: MembershipReference[K]) => {
    setApplication(prev => ({
      ...prev,
      membership_reference: { ...prev.membership_reference, [field]: value }
    }));
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!application.agrees_to_terms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    if (!totals.anySelected) {
      setError('Please choose at least one office or dedicated desk.');
      return;
    }

    if (application.wants_trial_day === null) {
      setError('Please tell us whether this is a trial day application or you are ready to begin membership.');
      return;
    }

    if (application.wants_trial_day && !application.trial_date) {
      setError('Please choose a date for your trial day.');
      return;
    }

    const h = application.housing_reference;
    if (!h.type || !h.company_name || !h.contact_name || !h.contact_phone || !h.contact_email) {
      setError('Please complete your housing reference (mortgage company or landlord).');
      return;
    }

    const m = application.membership_reference;
    if (!m.type || !m.facility_name || !m.contact_name || !m.contact_phone || !m.contact_email) {
      setError('Please complete your membership reference (gym or other workspace).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      console.log('📝 Submitting membership application to API...');

      const response = await fetch('/api/membership-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...application,
          total_monthly_cost_cents: Math.round(totals.monthly * 100),
          total_one_time_cost_cents: Math.round(totals.oneTime * 100),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      console.log('✅ Application submitted successfully:', data);

      // Show success message
      setSuccess(`Thank you ${application.first_name}! Your membership application has been submitted successfully. You'll receive a confirmation email at ${application.email} shortly, and our team will contact you within 1-2 business days to schedule your complimentary workspace tour.`);

    } catch (error) {
      console.error('❌ Error submitting application:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-bone pt-20 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="font-display text-3xl font-semibold text-ink mb-4">Application Submitted!</h1>
          <div className="bg-bone p-6 border border-clay mb-8">
            <p className="text-ink-60 leading-relaxed">{success}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/membership" className="bg-orange-600 text-white px-6 py-3 font-semibold hover:bg-orange-700 transition">
              View Membership Options
            </Link>
            <Link href="/" className="border-2 border-orange-600 text-orange-600 px-6 py-3 font-semibold hover:bg-orange-600 hover:text-white transition">
              Back to Homepage
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bone pt-20">
      {/* Hero Section */}
      <section className="bg-linen py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-semibold text-ink mb-6">
            Apply for Membership
          </h1>
          <p className="text-xl text-ink-60 mb-8">
            Join our community of professionals in the heart of Sloan's Lake.
            Complete your application below to get started.
          </p>
          {arrivedForTrial && (
            <div className="mx-auto mb-8 max-w-2xl border border-accent/40 bg-bone p-4 text-left">
              <p className="text-[15px] leading-relaxed text-ink">
                <span className="font-semibold">Booking a free trial day?</span> You're in the
                right place &mdash; the trial day is arranged through this application. We've
                already marked you down as a trial day applicant; just pick the date you'd like
                to come in further down the form.
              </p>
            </div>
          )}
          <div className="flex items-center justify-center gap-4 text-sm text-ink-60">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-accent" />
              <span>Free trial day included</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-accent" />
              <span>No long-term contracts</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-accent" />
              <span>1-2 day response time</span>
            </div>
          </div>
        </div>
      </section>

      {/* Alert Messages */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <div className="bg-red-50 border border-red-200 p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Application Form */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmitApplication} className="space-y-8">

            {/* Membership Selection */}
            <div className="bg-bone border border-clay p-6">
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="w-6 h-6 text-orange-600" />
                <h3 className="font-display text-xl font-semibold text-ink">Choose Your Membership</h3>
              </div>

              <p className="text-sm text-ink-60 mb-4">
                Need more than one office or dedicated desk? Set the quantity for each plan you want — your charges below will roll up into one combined total.
              </p>

              {desksFull && (
                <div className="mb-4 border-2 border-amber-300 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    All {deskAvailability?.capacity ?? 25} dedicated desks on our shared floor are taken.
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    We&apos;re still accepting dedicated desk members — we&apos;re converting private
                    offices into dedicated desk areas. A <strong>Private Dedicated Desk</strong> is
                    your own desk inside a private, lockable office area outside the shared community
                    space, at $300/month instead of $200.
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {visiblePlans.map((plan) => {
                  const quantity = getQuantity(plan.id);
                  const isSelected = quantity > 0;
                  // The floor-plan desk stays visible when we're full so the
                  // $200 → $300 difference is explained rather than silently
                  // swapped, but it can't be added to an application.
                  const soldOut = plan.id === 'dedicated_desk' && desksFull;
                  return (
                    <div
                      key={plan.id}
                      className={`border-2  p-4 transition relative ${
                        soldOut
                          ? 'border-gray-200 bg-gray-50 opacity-70'
                          : isSelected
                            ? 'border-orange-500 bg-orange-50'
                            : plan.onlyWhenDesksFull
                              ? 'border-orange-300 hover:border-orange-400'
                              : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-ink">{plan.name}</h4>
                          <p className="text-sm text-ink-60 mb-2">{plan.description}</p>
                          <span className="text-xs bg-linen px-2 py-1 rounded text-ink-60">{plan.category}</span>
                          {plan.onlyWhenDesksFull && (
                            <span className="ml-2 text-xs bg-orange-100 px-2 py-1 rounded text-orange-800 font-medium">
                              Private &amp; lockable
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          {plan.recurrence === 'one_time' ? (
                            <>
                              <p className="text-2xl font-bold text-orange-600">${plan.price}</p>
                              <p className="text-xs text-ink-60">one-time / day</p>
                            </>
                          ) : (
                            <>
                              <p className="text-2xl font-bold text-orange-600">${plan.price}</p>
                              <p className="text-xs text-ink-60">/month each</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 mb-4">
                        {plan.features.map((feature, idx) => (
                          <div key={idx} className="flex items-center text-xs text-ink-60">
                            <CheckCircle className="w-3 h-3 text-accent mr-2 flex-shrink-0" />
                            {feature}
                          </div>
                        ))}
                      </div>

                      {soldOut ? (
                        <div className="pt-3 border-t border-clay text-sm text-ink-60">
                          <span className="font-semibold text-ink">Fully occupied.</span>{' '}
                          Every desk on the shared floor is spoken for, so this plan
                          can&apos;t be selected right now. Choose the Private Dedicated Desk
                          instead to join as a dedicated desk member today.
                        </div>
                      ) : (
                      <div className="flex items-center justify-between pt-3 border-t border-clay">
                        <span className="text-sm font-medium text-ink-60">
                          {plan.recurrence === 'one_time' ? 'Days' : 'Quantity'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            aria-label={`Decrease ${plan.name}`}
                            onClick={() => adjustQuantity(plan.id, -1)}
                            disabled={quantity === 0}
                            className="w-8 h-8 rounded-full border border-clay flex items-center justify-center hover:bg-linen disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={20}
                            value={quantity}
                            onChange={(e) => setQuantity(plan.id, parseInt(e.target.value, 10) || 0)}
                            className="w-14 text-center p-2 border border-clay rounded"
                            aria-label={`${plan.name} quantity`}
                          />
                          <button
                            type="button"
                            aria-label={`Increase ${plan.name}`}
                            onClick={() => adjustQuantity(plan.id, 1)}
                            className="w-8 h-8 rounded-full border border-clay flex items-center justify-center hover:bg-linen"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      )}

                      {isSelected && !soldOut && (
                        <div className="mt-3 text-sm text-orange-700 font-medium text-right">
                          Subtotal: ${(plan.price * quantity).toLocaleString()}
                          {plan.recurrence === 'monthly' ? '/month' : ' one-time'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {totals.anySelected && (
                <div className="mt-6 p-5 border-2 border-orange-300 bg-orange-50">
                  <h4 className="font-semibold text-orange-900 mb-3">Your Combined Charge</h4>
                  <div className="space-y-1 mb-4">
                    {totals.lines.map(({ plan, quantity, subtotal }) => (
                      <div key={plan.id} className="flex justify-between text-sm text-ink">
                        <span>
                          {quantity} × {plan.name}
                        </span>
                        <span className="font-medium">
                          ${subtotal.toLocaleString()}
                          {plan.recurrence === 'monthly' ? '/mo' : ' one-time'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-orange-200 pt-3 space-y-1">
                    {totals.hasMonthly && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-ink-60">Total monthly</span>
                        <span className="text-2xl font-bold text-orange-700">
                          ${totals.monthly.toLocaleString()}
                          <span className="text-sm font-normal text-ink-60">/month</span>
                        </span>
                      </div>
                    )}
                    {totals.hasOneTime && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-ink-60">One-time charges</span>
                        <span className="text-2xl font-bold text-orange-700">
                          ${totals.oneTime.toLocaleString()}
                          <span className="text-sm font-normal text-ink-60"> one-time</span>
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-ink-60 mt-3">
                    All offices and dedicated desks you've selected will be billed together as a single charge.
                  </p>
                </div>
              )}

              {/* Trial Day vs Direct Membership */}
              <div className="mt-6 p-5 border-2 border-orange-200 bg-orange-50">
                <p className="font-semibold text-ink mb-1">
                  Are you applying for a trial day or to begin membership? <span className="text-red-500">*</span>
                </p>
                <p className="text-sm text-ink-60 mb-4">
                  Please choose one. If you'd like to experience the workspace first, we'll send you everything you need to come in for a trial day right away.
                </p>
                <div className="space-y-3">
                  <label className={`flex items-start gap-3 p-3  border-2 cursor-pointer transition ${application.wants_trial_day === true ? 'border-orange-500 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="trial_choice"
                      checked={application.wants_trial_day === true}
                      onChange={() => setApplication(prev => ({ ...prev, wants_trial_day: true }))}
                      className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <p className="font-medium text-ink">This is a trial day application</p>
                      <p className="text-sm text-ink-60">
                        I'd like to spend a full workday at Merritt Workspace before deciding on membership. Send me the trial day details now so I can plan my visit.
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-3 p-3  border-2 cursor-pointer transition ${application.wants_trial_day === false ? 'border-orange-500 bg-white' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="trial_choice"
                      checked={application.wants_trial_day === false}
                      onChange={() => setApplication(prev => ({ ...prev, wants_trial_day: false, trial_date: '' }))}
                      className="mt-1 h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <p className="font-medium text-ink">I'm ready to begin my membership — a trial day isn't necessary</p>
                      <p className="text-sm text-ink-60">
                        I've already decided and would like to move straight to membership onboarding.
                      </p>
                    </div>
                  </label>
                </div>

                {application.wants_trial_day === true && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-ink-60 mb-2">
                      Trial Day Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={application.trial_date}
                      onChange={(e) => setApplication(prev => ({ ...prev, trial_date: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full max-w-xs p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    />
                    <p className="text-xs text-ink-60 mt-2">
                      Choose the day you'd like to come in. Your preferred membership start date below can be different.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-ink-60 mb-2">Preferred Start Date *</label>
                <input
                  type="date"
                  required
                  value={application.start_date}
                  onChange={(e) => setApplication(prev => ({ ...prev, start_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-ink-60 mt-2">
                  When you'd like your membership to begin (independent of any trial day above).
                </p>
              </div>

              <div className="mt-4 p-4 border border-amber-300 bg-amber-50 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900 space-y-2">
                  <p className="font-semibold mb-1">Billing & Cancellation Notice</p>
                  {totals.hasOneTime && (
                    <p>
                      Each One Day Dedicated Desk is a <span className="font-semibold">one-time $30 charge</span> per day of access. No recurring subscription on those passes.
                    </p>
                  )}
                  {totals.hasMonthly && (
                    <>
                      <p>
                        Your first billing period will include both your <span className="font-semibold">first month</span> (prorated from your start date)
                        and your <span className="font-semibold">last month</span> of membership, paid up front. This applies to all recurring memberships and is calculated against your <span className="font-semibold">combined monthly total</span> across every office and dedicated desk on this application.
                      </p>
                      <p>
                        <span className="font-semibold">Cancellation policy:</span> To cancel, you must give Merritt Workspace at least <span className="font-semibold">30 days' written notice</span>.
                        With proper notice, you will <span className="font-semibold">not be billed</span> for your final month — the last month's fee you paid at sign-up
                        is applied to that final month. <span className="font-semibold">If you do not provide a full 30 days' notice, the last month's fee is forfeited</span> and
                        retained by Merritt Workspace as liquidated damages. Beginning the day after notice is received and through your last day of membership,
                        Merritt Workspace is entitled to inspect the workspace and assess any additional charges for damage, excessive wear, or restoration.
                      </p>
                    </>
                  )}
                  {!totals.anySelected && (
                    <p>Select at least one office or dedicated desk above to see billing details.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="bg-bone border border-clay p-6">
              <div className="flex items-center gap-3 mb-6">
                <User className="w-6 h-6 text-orange-600" />
                <h3 className="font-display text-xl font-semibold text-ink">Personal Information</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-60 mb-2">First Name *</label>
                  <input
                    type="text"
                    required
                    value={application.first_name}
                    onChange={(e) => setApplication(prev => ({ ...prev, first_name: e.target.value }))}
                    className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-60 mb-2">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={application.last_name}
                    onChange={(e) => setApplication(prev => ({ ...prev, last_name: e.target.value }))}
                    className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-60 mb-2">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={application.email}
                    onChange={(e) => setApplication(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-60 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={application.phone}
                    onChange={(e) => setApplication(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="bg-bone border border-clay p-6">
              <div className="flex items-center gap-3 mb-6">
                <Briefcase className="w-6 h-6 text-orange-600" />
                <h3 className="font-display text-xl font-semibold text-ink">Professional Information</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-60 mb-2">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={application.company_name}
                    onChange={(e) => setApplication(prev => ({ ...prev, company_name: e.target.value }))}
                    className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-60 mb-2">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={application.job_title}
                    onChange={(e) => setApplication(prev => ({ ...prev, job_title: e.target.value }))}
                    className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-60 mb-2">Industry *</label>
                  <select
                    required
                    value={application.industry}
                    onChange={(e) => setApplication(prev => ({ ...prev, industry: e.target.value }))}
                    className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select Industry</option>
                    {industryOptions.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-60 mb-2">Team Size</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={application.team_size}
                    onChange={(e) => setApplication(prev => ({ ...prev, team_size: parseInt(e.target.value) || 1 }))}
                    className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-60 mb-2">LinkedIn URL</label>
                  <input
                    type="url"
                    value={application.linkedin_url}
                    onChange={(e) => setApplication(prev => ({ ...prev, linkedin_url: e.target.value }))}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-60 mb-2">Website URL</label>
                  <input
                    type="url"
                    value={application.website_url}
                    onChange={(e) => setApplication(prev => ({ ...prev, website_url: e.target.value }))}
                    placeholder="https://yourcompany.com"
                    className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-60 mb-3">Work Style (select all that apply)</label>
                  <div className="grid md:grid-cols-2 gap-2">
                    {workStyleOptions.map(style => (
                      <label key={style} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={application.work_style.includes(style)}
                          onChange={(e) => handleWorkStyleChange(style, e.target.checked)}
                          className="mr-2 h-4 w-4 text-orange-600 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm text-ink-60">{style}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">Meeting Frequency</label>
                    <select
                      value={application.meeting_frequency}
                      onChange={(e) => setApplication(prev => ({ ...prev, meeting_frequency: e.target.value as any }))}
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="rarely">Rarely</option>
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="daily">Daily</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">How did you hear about us? *</label>
                    <select
                      required
                      value={application.referral_source}
                      onChange={(e) => setApplication(prev => ({ ...prev, referral_source: e.target.value }))}
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">Select source</option>
                      {referralSources.map(source => (
                        <option key={source} value={source}>{source}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* References Intro */}
            <div className="bg-orange-50 border border-orange-200 p-6">
              <h3 className="font-display text-lg font-semibold text-ink mb-2">References</h3>
              <p className="text-sm text-ink-60">
                We ask every applicant for two references so we can verify your background. The form below lists <strong>four options across two categories</strong> — you only need to complete <strong>one option per category</strong> (two references total). Everything else can stay blank.
              </p>
              <ul className="text-sm text-ink-60 mt-3 space-y-1 list-disc pl-5">
                <li><strong>Housing:</strong> your current or most recent mortgage company <em>or</em> landlord.</li>
                <li><strong>Membership:</strong> a gym <em>or</em> another workspace where you are or have been a member.</li>
              </ul>
            </div>

            {/* Housing Reference */}
            <div className="bg-bone border border-clay p-6">
              <div className="flex items-center gap-3 mb-2">
                <Home className="w-6 h-6 text-orange-600" />
                <h3 className="font-display text-xl font-semibold text-ink">Housing Reference</h3>
                <span className="text-sm text-red-500">*</span>
              </div>
              <p className="text-sm text-ink-60 mb-6">
                Choose <strong>one</strong>: your current or most recent <strong>mortgage company</strong> or <strong>landlord</strong>. You do not need to provide both.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-ink-60 mb-2">Reference Type *</label>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="housing_type"
                      value="mortgage"
                      checked={application.housing_reference.type === 'mortgage'}
                      onChange={() => updateHousingReference('type', 'mortgage')}
                      className="mr-2 h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-ink-60">Mortgage Company</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="housing_type"
                      value="landlord"
                      checked={application.housing_reference.type === 'landlord'}
                      onChange={() => updateHousingReference('type', 'landlord')}
                      className="mr-2 h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-ink-60">Landlord</span>
                  </label>
                </div>
              </div>

              {application.housing_reference.type && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">
                      {application.housing_reference.type === 'mortgage' ? 'Mortgage Company *' : 'Landlord / Property Manager *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={application.housing_reference.company_name}
                      onChange={(e) => updateHousingReference('company_name', e.target.value)}
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">
                      {application.housing_reference.type === 'mortgage' ? 'Loan Officer / Contact Name *' : 'Landlord Contact Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={application.housing_reference.contact_name}
                      onChange={(e) => updateHousingReference('contact_name', e.target.value)}
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      value={application.housing_reference.contact_phone}
                      onChange={(e) => updateHousingReference('contact_phone', e.target.value)}
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">Contact Email *</label>
                    <input
                      type="email"
                      required
                      value={application.housing_reference.contact_email}
                      onChange={(e) => updateHousingReference('contact_email', e.target.value)}
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-ink-60 mb-2">Property Address</label>
                    <input
                      type="text"
                      value={application.housing_reference.property_address}
                      onChange={(e) => updateHousingReference('property_address', e.target.value)}
                      placeholder="Street, City, State"
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={application.housing_reference.start_date}
                      onChange={(e) => updateHousingReference('start_date', e.target.value)}
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">End Date <span className="text-ink-60 font-normal">(leave blank if current)</span></label>
                    <input
                      type="date"
                      value={application.housing_reference.end_date}
                      onChange={(e) => updateHousingReference('end_date', e.target.value)}
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Membership Reference */}
            <div className="bg-bone border border-clay p-6">
              <div className="flex items-center gap-3 mb-2">
                <Dumbbell className="w-6 h-6 text-orange-600" />
                <h3 className="font-display text-xl font-semibold text-ink">Membership Reference</h3>
                <span className="text-sm text-red-500">*</span>
              </div>
              <p className="text-sm text-ink-60 mb-6">
                Choose <strong>one</strong>: a <strong>gym</strong> or <strong>other workspace</strong> where you are or have been a member. You do not need to provide both.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-ink-60 mb-2">Reference Type *</label>
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="membership_type_ref"
                      value="gym"
                      checked={application.membership_reference.type === 'gym'}
                      onChange={() => updateMembershipReference('type', 'gym')}
                      className="mr-2 h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-ink-60">Gym</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="membership_type_ref"
                      value="workspace"
                      checked={application.membership_reference.type === 'workspace'}
                      onChange={() => updateMembershipReference('type', 'workspace')}
                      className="mr-2 h-4 w-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-ink-60">Other Workspace</span>
                  </label>
                </div>
              </div>

              {application.membership_reference.type && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">
                      {application.membership_reference.type === 'gym' ? 'Gym Name *' : 'Workspace Name *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={application.membership_reference.facility_name}
                      onChange={(e) => updateMembershipReference('facility_name', e.target.value)}
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={application.membership_reference.contact_name}
                      onChange={(e) => updateMembershipReference('contact_name', e.target.value)}
                      placeholder="Manager, membership rep, etc."
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      value={application.membership_reference.contact_phone}
                      onChange={(e) => updateMembershipReference('contact_phone', e.target.value)}
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">Contact Email *</label>
                    <input
                      type="email"
                      required
                      value={application.membership_reference.contact_email}
                      onChange={(e) => updateMembershipReference('contact_email', e.target.value)}
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">Member Since</label>
                    <input
                      type="date"
                      value={application.membership_reference.start_date}
                      onChange={(e) => updateMembershipReference('start_date', e.target.value)}
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-60 mb-2">End Date <span className="text-ink-60 font-normal">(leave blank if current)</span></label>
                    <input
                      type="date"
                      value={application.membership_reference.end_date}
                      onChange={(e) => updateMembershipReference('end_date', e.target.value)}
                      className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="bg-bone border border-clay p-6">
              <div className="flex items-center gap-3 mb-6">
                <Phone className="w-6 h-6 text-orange-600" />
                <h3 className="font-display text-xl font-semibold text-ink">Emergency Contact</h3>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-60 mb-2">Name *</label>
                  <input
                    type="text"
                    required
                    value={application.emergency_contact_name}
                    onChange={(e) => setApplication(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                    className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-60 mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={application.emergency_contact_phone}
                    onChange={(e) => setApplication(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                    className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-60 mb-2">Relationship *</label>
                  <input
                    type="text"
                    required
                    value={application.emergency_contact_relationship}
                    onChange={(e) => setApplication(prev => ({ ...prev, emergency_contact_relationship: e.target.value }))}
                    placeholder="e.g., Spouse, Parent, Friend"
                    className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* Special Requirements */}
            <div className="bg-bone border border-clay p-6">
              <div className="flex items-center gap-3 mb-6">
                <Calendar className="w-6 h-6 text-orange-600" />
                <h3 className="font-display text-xl font-semibold text-ink">Additional Information</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-60 mb-2">Special Requirements or Requests</label>
                <textarea
                  value={application.special_requirements}
                  onChange={(e) => setApplication(prev => ({ ...prev, special_requirements: e.target.value }))}
                  rows={3}
                  placeholder="Any specific needs, accessibility requirements, or special requests..."
                  className="w-full p-3 border border-clay focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Agreements */}
            <div className="bg-bone border border-clay p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-6 h-6 text-orange-600" />
                <h3 className="font-display text-xl font-semibold text-ink">Agreements</h3>
              </div>
              <div className="space-y-4">
                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={application.agrees_to_terms}
                    onChange={(e) => setApplication(prev => ({ ...prev, agrees_to_terms: e.target.checked }))}
                    className="mt-1 mr-3 h-4 w-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div className="text-sm">
                    <span className="text-ink-60">I agree to the </span>
                    <a href="/terms" target="_blank" className="text-orange-600 underline">Terms &amp; Conditions</a>
                    <span className="text-ink-60"> and </span>
                    <a href="/privacy" target="_blank" className="text-orange-600 underline">Privacy Policy</a>
                    <span className="text-ink-60">. I understand that if my application is approved I will be required to sign the official Terms &amp; Conditions, Fee Agreement, and Member Agreement in the member portal before my membership begins.</span>
                    <span className="text-red-500"> *</span>
                  </div>
                </label>

                <label className="flex items-start">
                  <input
                    type="checkbox"
                    checked={application.marketing_consent}
                    onChange={(e) => setApplication(prev => ({ ...prev, marketing_consent: e.target.checked }))}
                    className="mt-1 mr-3 h-4 w-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <div className="text-sm text-ink-60">
                    I would like to receive updates about community events and workspace news
                  </div>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={submitting || !application.agrees_to_terms || !totals.anySelected}
                className="w-full bg-orange-600 text-white py-4 px-6 font-semibold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Submitting Application...
                  </>
                ) : (
                  'Submit Application'
                )}
              </button>

              <p className="text-sm text-ink-60 text-center mt-4">
                By submitting this application, you acknowledge that all information provided is accurate and complete.
              </p>
            </div>
          </form>
        </div>
      </section>

      <Footer />
    </main>
  );
}