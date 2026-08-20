"use client";

import { useEffect, useState } from 'react';
import Footer from "@/components/Footer";
import Link from 'next/link';
import Image from 'next/image';
import PageHero from '@/components/marketing/PageHero';
import { BLUR } from '@/components/marketing/blur';

export default function PrivateOfficePage() {
  const [selectedPlan, setSelectedPlan] = useState<'single' | 'double' | 'large'>('single');

  // Live room count from the admin seating chart. Null while the fetch is in
  // flight, and left null if it fails — the page then prints no count at all
  // rather than a number it can't stand behind.
  const [officesLeft, setOfficesLeft] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/office-availability')
      .then(r => r.json())
      .then(d => {
        if (!cancelled && d && !d.unavailable && typeof d.remaining === 'number') {
          setOfficesLeft(d.remaining);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const privateOfficePlans = [
    {
      id: 'single' as const,
      name: 'Single Desk Office',
      price: 500,
      capacity: '1 person',
      size: '35-45 sq ft',
      desks: 1,
      description: 'Perfect for solo professionals who need complete privacy',
      features: [
        'Private lockable office',
        'Professional business address',
        '8 hours conference room credits/month',
        'Mail handling service',
        'Pet-friendly (dogs welcome)',
        'Personal storage solutions',
        'Dedicated phone line option',
        'Free trial day before you commit'
      ]
    },
    {
      id: 'double' as const,
      name: '2-Desk Office',
      price: 700,
      capacity: '2 people',
      size: '55-65 sq ft',
      desks: 2,
      description: 'Ideal for partnerships and small collaborative teams',
      features: [
        'Private lockable office with 2 desks',
        'Professional business address',
        '12 hours conference room credits/month',
        'Mail and package handling',
        'Pet-friendly team space',
        'Multiple storage solutions',
        'Team collaboration area',
        'Priority event space access',
        'Free trial day before you commit'
      ]
    },
    {
      id: 'large' as const,
      name: 'Large Team Office (4-8 Desks)',
      price: 1200,
      capacity: '4-8 people',
      size: '125-150 sq ft',
      desks: '4-8',
      description: 'Spacious office for established teams and growing companies',
      features: [
        'Large private office (4-8 desks)',
        'Professional business address',
        '20 hours conference room credits/month',
        'Mail and package handling',
        'Multiple dedicated phone lines',
        'Team collaboration areas',
        'Priority event space booking',
        'Monthly snackshop credits',
        'Extensive storage solutions',
        'Free trial day before you commit'
      ]
    }
  ];

  const allFeatures = [
    {
      title: 'Complete Privacy',
      description: 'Your own lockable office space with full privacy and security'
    },
    {
      title: '24/7 Access',
      description: 'Round-the-clock building and office access with your own key'
    },
    {
      title: 'High-Speed WiFi',
      description: 'Enterprise-grade internet with dedicated connection options'
    },
    {
      title: 'Professional Address',
      description: 'Use our prestigious Sloan\'s Lake address for your business'
    },
    {
      title: 'Mail & Package Handling',
      description: 'Full mail receiving and package management services'
    },
    {
      title: 'Conference Room Credits',
      description: 'Monthly conference room hours included (varies by plan)'
    },
    {
      title: 'Phone Line Options',
      description: 'Dedicated business phone lines available for your office'
    },
    {
      title: 'Full Kitchen Access',
      description: 'Complete access to kitchen facilities and snackshop services'
    },
    {
      title: 'Pet-Friendly',
      description: 'Bring your dog to work - they can stay in your private office'
    },
    {
      title: 'Premium Storage',
      description: 'Multiple storage options including filing cabinets and shelving'
    },
    {
      title: 'Free Trial Day',
      description: 'Spend a full workday in our space before you sign up. Every potential new member qualifies'
    }
  ];

  const idealFor = [
    {
      title: 'Professional Services',
      description: 'Lawyers, accountants, consultants who need confidential client meetings'
    },
    {
      title: 'Small Business Owners',
      description: 'Established businesses needing professional address and private workspace'
    },
    {
      title: 'Privacy-Focused Workers',
      description: 'Anyone who needs guaranteed quiet space for focused work and sensitive conversations'
    }
  ];

  const selectedPlanDetails = privateOfficePlans.find(plan => plan.id === selectedPlan)!;

  return (
    <main className="bg-bone">
      <PageHero
        src="/images/offices/large-occupied.webp"
        alt="Members working in a private office at Merritt Workspace, Sloan's Lake, Denver"
        blurDataURL={BLUR['offices/large-occupied']}
        eyebrow="Private offices &middot; $500 to $1,200"
        title={<>A room with a door that locks.</>}
        lead="Fourteen private offices in Sloan's Lake, sized for one person up to a team of eight. Business address, 24/7 access, month to month."
      />

      {/* The rooms */}
      <section className="mw-section">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">The rooms</p>
            <h2 className="mw-h2">Daylight, butcher block, and the orange floors.</h2>
          </div>
          <div className="mt-14 grid gap-8 md:mt-20 md:grid-cols-2 md:gap-10">
            <figure>
              <div className="relative aspect-[3/2]">
                <Image
                  src="/images/offices/single-daylight.webp"
                  alt="Single private office with an ultrawide monitor and window light at Merritt Workspace, Denver"
                  fill
                  placeholder="blur"
                  blurDataURL={BLUR['offices/single-daylight']}
                  sizes="(max-width: 768px) 100vw, 46vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-4 text-[13px] uppercase tracking-[0.14em] text-ink-60">
                Single office
              </figcaption>
            </figure>
            {/* Both frames in this pair show the room empty. An occupied
                large office next to an empty single read as two different
                products rather than two sizes of the same one. */}
            <figure>
              <div className="relative aspect-[3/2]">
                <Image
                  src="/images/offices/four-desk.webp"
                  alt="The large private office at Merritt Workspace, Denver, with butcher block desks and a whiteboard"
                  fill
                  placeholder="blur"
                  blurDataURL={BLUR['offices/four-desk']}
                  sizes="(max-width: 768px) 100vw, 46vw"
                  className="object-cover object-center"
                />
              </div>
              <figcaption className="mt-4 text-[13px] uppercase tracking-[0.14em] text-ink-60">
                Large office
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Plan selector */}
      <section className="mw-section-alt">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">Pick a size</p>
            <h2 className="mw-h2">Three sizes, one rate card.</h2>
            {officesLeft !== null && (
              <p className="mt-6 text-[15px] text-ink-60">
                <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" aria-hidden="true" />
                {officesLeft === 0
                  ? 'Every office is taken right now — ask us about the waiting list.'
                  : officesLeft === 1
                    ? '1 office is available right now.'
                    : `${officesLeft} offices are available right now.`}
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="mt-12 flex flex-wrap gap-2 border-b border-clay md:mt-16">
            {privateOfficePlans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                aria-pressed={selectedPlan === plan.id}
                className={`-mb-px min-h-[44px] border-b-2 px-4 py-3 text-[15px] font-medium transition ${
                  selectedPlan === plan.id
                    ? 'border-accent text-ink'
                    : 'border-transparent text-ink-60 hover:text-ink'
                }`}
              >
                {plan.name}
              </button>
            ))}
          </div>

          {/* Selected plan */}
          <div className="mt-12 grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <h3 className="mw-h3">{selectedPlanDetails.name}</h3>
              <p className="mt-4 mw-body">{selectedPlanDetails.description}</p>
              <p className="mt-8 font-display text-6xl font-semibold tracking-tightest text-ink lg:text-7xl">
                ${selectedPlanDetails.price}
                <span className="text-2xl font-normal text-ink-60"> /mo</span>
              </p>
              <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-clay pt-7">
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Room size</dt>
                  <dd className="mt-1 font-display text-2xl font-semibold text-ink">{selectedPlanDetails.size}</dd>
                </div>
                <div>
                  <dt className="text-[13px] uppercase tracking-[0.14em] text-ink-60">Capacity</dt>
                  <dd className="mt-1 font-display text-2xl font-semibold text-ink">{selectedPlanDetails.capacity}</dd>
                </div>
              </dl>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/membership/apply" className="mw-btn-primary">
                  Apply for this office
                </Link>
                <Link href="/contact" className="mw-btn-ghost">
                  Book a tour
                </Link>
              </div>
            </div>

            <div className="md:col-span-6 md:col-start-7">
              <h4 className="mw-eyebrow mb-6">What&rsquo;s included</h4>
              <ul>
                {selectedPlanDetails.features.map((feature) => (
                  <li key={feature} className="border-t border-clay py-3.5 text-[16px] leading-relaxed text-ink-60">
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* All offices include */}
      <section className="mw-section-rule">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">Every office</p>
            <h2 className="mw-h2">What comes with all of them.</h2>
          </div>
          <div className="mt-14 grid gap-x-10 gap-y-12 border-t border-clay pt-10 sm:grid-cols-2 lg:grid-cols-3 md:mt-20">
            {allFeatures.map((feature) => (
              <div key={feature.title}>
                <h3 className="mw-h3">{feature.title}</h3>
                <p className="mt-4 mw-body">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ideal for */}
      <section className="mw-section-alt">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">Who takes an office</p>
            <h2 className="mw-h2">Work that needs a closed door.</h2>
          </div>
          <div className="mt-14 grid gap-x-10 gap-y-12 border-t border-clay pt-10 sm:grid-cols-2 lg:grid-cols-3 md:mt-20">
            {idealFor.map((item) => (
              <div key={item.title}>
                <h3 className="mw-h3">{item.title}</h3>
                <p className="mt-4 mw-body">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-clay bg-ink py-20 text-bone md:py-32">
        <div className="mw-container">
          <div className="max-w-3xl">
            <p className="mb-5 text-[12px] font-medium uppercase tracking-[0.18em] text-bone/60 md:text-[13px]">
              See it first
            </p>
            <h2 className="font-display text-[2rem] font-semibold leading-[1.02] tracking-tightest text-bone sm:text-4xl lg:text-[3.25rem]">
              Walk the offices before you take one.
            </h2>
            <p className="mt-7 max-w-2xl text-[17px] leading-relaxed text-bone/70 md:text-lg">
              Every prospective member gets a free trial day. Or{' '}
              <Link href="/membership" className="border-b border-accent pb-0.5 text-bone hover:border-bone">
                compare every membership option
              </Link>{' '}
              first, the{' '}
              <Link href="/membership/dedicated-desk" className="border-b border-accent pb-0.5 text-bone hover:border-bone">
                dedicated desk
              </Link>{' '}
              starts at $200.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href="/membership/apply" className="mw-btn bg-accent text-white hover:bg-accent-deep">
                Apply today
              </Link>
              <Link href="/contact" className="mw-btn border border-bone/40 text-bone hover:bg-bone hover:text-ink">
                Book a tour
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
