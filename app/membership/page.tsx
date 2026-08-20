"use client";

import { useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import Link from 'next/link';
import PageHero from '@/components/marketing/PageHero';
import { BLUR } from '@/components/marketing/blur';

const membershipPlans = [
  {
    id: 'dedicated_desk',
    name: 'Dedicated Desk',
    price: 200,
    description: 'Your own workspace in our vibrant coworking community',
    capacity: '1 person',
    privacy: 'Shared Space',
    image: '/images/dedicated-desks/room-empty.webp',
    blurDataURL: 'data:image/webp;base64,UklGRjYAAABXRUJQVlA4ICoAAACwAQCdASoKAA0ABUB8JZACdADYt8AAAOD9JmNTjrhhjajRJ8jDWLTrgAA=',
    color: 'burnt-orange',
    badge: 'Best Value',
    features: [
      '24/7 building access',
      'Your own dedicated desk with storage',
      'High-speed WiFi',
      'Access to 4 private phone booths',
      'Full kitchen with coffee, tea and beer',
      '4 hours meeting room credits/month',
      'Mail and package handling',
      'Event space access until 4:30 PM',
      'Pet-friendly workspace',
      'Community networking events'
    ],
    ideal_for: 'Freelancers, consultants, and remote workers',
    category: 'shared',
    link: '/membership/dedicated-desk'
  },
  {
    id: 'one_day_dedicated_desk',
    name: 'One Day Dedicated Desk',
    price: 30,
    description: 'A single day at a dedicated desk. Perfect for trying us out or a one-off workday.',
    capacity: '1 person',
    privacy: 'Shared Space',
    image: '/images/dedicated-desks/room-empty.webp',
    blurDataURL: 'data:image/webp;base64,UklGRjYAAABXRUJQVlA4ICoAAACwAQCdASoKAA0ABUB8JZACdADYt8AAAOD9JmNTjrhhjajRJ8jDWLTrgAA=',
    color: 'burnt-orange',
    badge: 'Day Pass',
    features: [
      'One-time $30 charge',
      'Full day of access',
      '1 hour of conference room time',
      'High-speed WiFi',
      'Full kitchen with coffee, tea and beer',
      'Printing access',
      'Phone booths on availability'
    ],
    ideal_for: 'Travelers, drop-ins, and anyone wanting to try the space',
    category: 'shared',
    link: '/membership/apply'
  },
  // Only shown once every desk on the shared floor is spoken for — see
  // PRIVATE_DESK_PLAN_ID below and lib/portal/deskAvailability.ts. Until then
  // we don't advertise it at all.
  {
    id: 'private_dedicated_desk',
    name: 'Private Dedicated Desk',
    price: 300,
    description: 'Your own dedicated desk inside a private, lockable office area, outside the shared community space.',
    capacity: '1 person',
    privacy: 'Private Area',
    image: '/images/offices/single-alt.webp',
    blurDataURL: 'data:image/webp;base64,UklGRi4AAABXRUJQVlA4ICIAAACQAQCdASoKAA0ABUB8JZQC7ABpDmAAj/vsp3SQ/qO4OdwA',
    color: 'burnt-orange',
    badge: 'Private & Lockable',
    features: [
      'Private, lockable office area, outside the shared community space',
      'Your own dedicated desk within that area',
      '24/7 building access',
      'High-speed WiFi',
      '4 hours meeting room credits/month',
      'Full kitchen with coffee, tea and beer',
      'Mail and package handling',
      'Access to 4 private phone booths',
      'Pet-friendly workspace',
      'Community networking events'
    ],
    ideal_for: 'Members who want a dedicated desk with real privacy and a door that locks',
    category: 'shared',
    link: '/membership/dedicated-desk'
  },
  {
    id: 'private_office_single',
    name: 'Single Desk Office',
    price: 500,
    description: 'Private lockable office for individual professionals',
    capacity: '1 person',
    privacy: 'Private Office',
    image: '/images/offices/single-alt.webp',
    blurDataURL: 'data:image/webp;base64,UklGRi4AAABXRUJQVlA4ICIAAACQAQCdASoKAA0ABUB8JZQC7ABpDmAAj/vsp3SQ/qO4OdwA',
    color: 'blue',
    features: [
      'Private lockable office',
      'Professional business address',
      '24/7 building access',
      'High-speed WiFi',
      '8 hours meeting room credits/month',
      'Mail handling service',
      'Personal storage solutions',
      'Dedicated phone line option',
      'Priority phone booth access',
      'Pet-friendly (dogs welcome)',
      'Community events'
    ],
    ideal_for: 'Solo professionals needing complete privacy',
    category: 'private',
    link: '/membership/private-office'
  },
  {
    id: 'private_office_double',
    name: '2-Desk Office',
    price: 700,
    description: 'Ideal for partnerships and small collaborative teams',
    capacity: '2 people',
    privacy: 'Private Office',
    image: '/images/offices/two-desk.webp',
    blurDataURL: 'data:image/webp;base64,UklGRiwAAABXRUJQVlA4ICAAAABQAQCdASoKAA0AD8B8JQBdgCgAAP6/F7byZ3GAPAgAAA==',
    color: 'green',
    features: [
      'Private lockable office with 2 desks',
      'Professional business address',
      '24/7 building access',
      'High-speed WiFi',
      '12 hours meeting room credits/month',
      'Mail and package handling',
      'Team collaboration area',
      'Multiple storage solutions',
      'Dedicated phone line option',
      'Priority event space access',
      'Pet-friendly team space',
      'Community events'
    ],
    ideal_for: 'Small teams and business partnerships',
    category: 'private',
    link: '/membership/private-office'
  },
  {
    id: 'private_office_large',
    name: 'Large Team Office',
    price: 1200,
    description: 'Spacious office for established teams and growing companies',
    capacity: '4-8 people',
    privacy: 'Private Office',
    image: '/images/offices/four-desk.webp',
    blurDataURL: 'data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAABQAQCdASoKAA0ABUB8JQBOgAAAAOc8gv7uy41SNTE8bIfgAAA=',
    color: 'purple',
    features: [
      'Large private office (4-8 desks)',
      'Professional business address',
      '24/7 building access',
      'High-speed WiFi',
      '20 hours meeting room credits/month',
      'Mail and package handling',
      'Multiple dedicated phone lines',
      'Team collaboration areas',
      'Priority event space booking',
      'Monthly snackshop credits',
      'Extensive storage solutions',
      'Pet-friendly team space',
      'Dedicated team support'
    ],
    ideal_for: 'Growing teams and established companies',
    category: 'private',
    link: '/membership/private-office'
  }
];

const whyChooseFeatures = [
  {
    title: 'Prime Location',
    description: 'Heart of Sloan\'s Lake, 3 minutes to I-25. Walk, bike, or drive to work easily.'
  },
  {
    title: 'Historic Character',
    description: 'Beautifully restored space with high ceilings, natural light and a lot of character.'
  },
  {
    title: 'Vibrant Community',
    description: 'Network with entrepreneurs, freelancers, and small businesses in a supportive environment.'
  },
  {
    title: 'Secure & Professional',
    description: '24/7 monitored building with professional atmosphere and business address services.'
  },
  {
    title: 'Flexible Terms',
    description: 'No long-term lease required. Month-to-month flexibility for your changing needs.'
  },
  {
    title: 'Full-Service Amenities',
    description: 'On-site snackshop, meeting rooms, high-speed WiFi, and everything you need to be productive.'
  }
];

const processSteps = [
  {
    number: 1,
    title: 'Apply Online',
    description: 'Complete our simple application form with your details and preferences'
  },
  {
    number: 2,
    title: 'Schedule Tour',
    description: 'We\'ll contact you within 1-2 days to schedule your complimentary tour'
  },
  {
    number: 3,
    title: 'Free Trial Day',
    description: 'Every potential new member gets a full complimentary day to work the space before committing'
  },
  {
    number: 4,
    title: 'Move In!',
    description: 'Complete membership setup and start enjoying your new workspace'
  }
];

// The dedicated desk inside a converted private office. Hidden from the
// public catalog until every desk on the shared floor is spoken for.
const PRIVATE_DESK_PLAN_ID = 'private_dedicated_desk';

// Comparison rows. `true` renders the included mark, `false` an em dash,
// anything else prints as-is.
const COMPARE_ROWS: { label: string; values: (string | boolean)[] }[] = [
  { label: 'Monthly price', values: ['$200', '$500', '$700', '$1,200'] },
  { label: 'Capacity', values: ['1 person', '1 person', '2 people', '4–8 people'] },
  { label: 'Privacy', values: ['Shared space', 'Private office', 'Private office', 'Private office'] },
  { label: '24/7 access', values: [true, true, true, true] },
  { label: 'Meeting room credit', values: ['4 hrs/mo', '8 hrs/mo', '12 hrs/mo', '20 hrs/mo'] },
  { label: 'Business address', values: [false, true, true, true] },
  { label: 'Phone booths', values: [true, true, true, true] },
  { label: 'Pet friendly', values: ['Common areas', true, true, true] },
  { label: 'Lockable storage', values: [true, true, true, true] },
];

const COMPARE_COLS = ['Dedicated desk', 'Single office', '2-desk office', 'Large office'];

function CompareCell({ value }: { value: string | boolean }) {
  if (value === true) return <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" aria-label="Included" />;
  if (value === false) return <span className="text-clay" aria-label="Not included">&mdash;</span>;
  return <span className="text-ink-60">{value}</span>;
}

export default function MembershipPage() {
  // Best-effort availability check. Unknown (fetch in flight or failed) shows
  // the normal catalog: standard dedicated desk on offer, private tier hidden.
  const [desksFull, setDesksFull] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/desk-availability')
      .then(r => r.json())
      .then(d => {
        if (!cancelled && d && !d.unavailable) setDesksFull(d.isFull === true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const sharedPlans = membershipPlans.filter(
    plan => plan.category === 'shared' && (plan.id !== PRIVATE_DESK_PLAN_ID || desksFull)
  );
  const privatePlans = membershipPlans.filter(plan => plan.category === 'private');

  const renderPlan = (plan: typeof membershipPlans[number]) => {
    // Every floor-plan desk is taken. The card stays up — with the price it
    // has always shown — so the private alternative reads as an explanation
    // rather than an unannounced price rise.
    const soldOut = plan.id === 'dedicated_desk' && desksFull;
    const perDay = plan.id === 'one_day_dedicated_desk';

    return (
      <div key={plan.id} className="flex flex-col border-t border-clay pt-8">
        <h3 className="mw-h3">{plan.name}</h3>

        <p className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink">
          ${plan.price}
          <span className="text-base font-normal text-ink-60">
            {perDay ? ' one-time / day' : ' /mo'}
          </span>
        </p>

        <p className="mt-4 text-[16px] leading-relaxed text-ink-60">{plan.description}</p>

        {soldOut && (
          <p className="mt-5 border-l-2 border-accent pl-4 text-[15px] leading-relaxed text-ink-60">
            <strong className="font-semibold text-ink">Every dedicated desk is currently taken.</strong>{' '}
            We&rsquo;re still welcoming dedicated desk members. See the Private
            Dedicated Desk below, your own desk in a private, lockable area.
          </p>
        )}

        <p className="mt-5 text-[13px] uppercase tracking-[0.14em] text-ink-60">
          {plan.capacity} &middot; {plan.privacy}
        </p>

        <ul className="mt-5 flex-grow space-y-2">
          {plan.features.slice(0, 5).map((feature, i) => (
            <li key={i} className="text-[15px] leading-relaxed text-ink-60">{feature}</li>
          ))}
          {plan.features.length > 5 && (
            <li className="text-[15px] text-ink-60/70">+ {plan.features.length - 5} more</li>
          )}
        </ul>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={plan.link} className="mw-btn-primary flex-1 px-6 py-3.5">
            Learn more
          </Link>
          {!soldOut && (
            <Link href="/membership/apply" className="mw-btn-ghost flex-1 px-6 py-3.5">
              Apply now
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="bg-bone">
      {/* objectPosition: a centre crop lands on the foreground chairs, so the
          frame is biased up to hold the desks and the faces. */}
      <PageHero
        src="/images/dedicated-desks/members-talking.webp"
        alt="Members talking between the dedicated desks at Merritt Workspace in Sloan's Lake, Denver"
        blurDataURL={BLUR['dedicated-desks/members-talking']}
        objectPosition="50% 18%"
        eyebrow="Membership"
        title={<>Desks and offices, month to month.</>}
        lead="No long lease, no tiered nonsense. Pick the space that fits the work, and change it when the work changes."
      />

      {/* Shared workspace */}
      <section className="mw-section">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">Shared workspace</p>
            <h2 className="mw-h2">A desk of your own on the shared floor.</h2>
          </div>
          <div className="mt-14 grid gap-x-10 gap-y-14 md:mt-20 md:grid-cols-2 lg:grid-cols-3">
            {sharedPlans.map(renderPlan)}
          </div>
        </div>
      </section>

      {/* Private offices */}
      <section className="mw-section-alt">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">Private offices</p>
            <h2 className="mw-h2">Fourteen lockable rooms, one to eight people.</h2>
          </div>
          <div className="mt-14 grid gap-x-10 gap-y-14 md:mt-20 md:grid-cols-2 lg:grid-cols-3">
            {privatePlans.map(renderPlan)}
          </div>
        </div>
      </section>

      {/* Compare */}
      <section className="mw-section-rule">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">Side by side</p>
            <h2 className="mw-h2">Compare every option.</h2>
          </div>

          <div className="mt-12 overflow-x-auto md:mt-16">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-y border-clay">
                  <th className="w-[26%] py-5 pr-4 text-[13px] font-medium uppercase tracking-[0.14em] text-ink-60">
                    Feature
                  </th>
                  {COMPARE_COLS.map(col => (
                    <th key={col} className="py-5 pr-4 font-display text-lg font-semibold text-ink">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map(row => (
                  <tr key={row.label} className="border-b border-clay">
                    <th scope="row" className="py-5 pr-4 text-[15px] font-medium text-ink">
                      {row.label}
                    </th>
                    {row.values.map((v, i) => (
                      <td key={i} className="py-5 pr-4 text-[15px]">
                        <CompareCell value={v} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Why choose */}
      <section className="mw-section-alt">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">Why members choose us</p>
            <h2 className="mw-h2">An independent space, not a franchise.</h2>
          </div>
          <div className="mt-14 grid gap-x-10 gap-y-12 border-t border-clay pt-10 sm:grid-cols-2 lg:grid-cols-3 md:mt-20">
            {whyChooseFeatures.map(feature => (
              <div key={feature.title}>
                <h3 className="mw-h3">{feature.title}</h3>
                <p className="mt-4 mw-body">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="mw-section-rule">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">How it works</p>
            <h2 className="mw-h2">Four steps, about a week.</h2>
          </div>
          <ol className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4 md:mt-20">
            {processSteps.map(step => (
              <li key={step.number} className="border-t border-clay pt-6">
                <span className="font-display text-4xl font-semibold text-clay">
                  {String(step.number).padStart(2, '0')}
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold text-ink">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-60">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-clay bg-ink py-20 text-bone md:py-32">
        <div className="mw-container">
          <div className="max-w-3xl">
            <p className="mb-5 text-[12px] font-medium uppercase tracking-[0.18em] text-bone/60 md:text-[13px]">
              Try it first
            </p>
            <h2 className="font-display text-[2rem] font-semibold leading-[1.02] tracking-tightest text-bone sm:text-4xl lg:text-[3.25rem]">
              Work a full day here before you commit to anything.
            </h2>
            <p className="mt-7 max-w-2xl text-[17px] leading-relaxed text-bone/70 md:text-lg">
              Every prospective member gets a free trial day: the desk, the
              coffee, the flex space, the whole thing. Then decide.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href="/membership/apply" className="mw-btn bg-accent text-white hover:bg-accent-deep">
                Apply today
              </Link>
              <Link href="/contact" className="mw-btn border border-bone/40 text-bone hover:bg-bone hover:text-ink">
                Book a free trial day
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
