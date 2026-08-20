"use client";

import { useEffect, useState } from 'react';
import Footer from "@/components/Footer";
import Link from 'next/link';
import Image from 'next/image';
import PageHero from '@/components/marketing/PageHero';
import { BLUR } from '@/components/marketing/blur';

const WHATS_INCLUDED = [
  'Your own dedicated desk with storage',
  '24/7 access code entry to a monitored building',
  'Enterprise WiFi throughout the building',
  'Four hours of meeting room credit each month',
  'Full kitchen, and all the coffee, tea and beer you can drink',
  'Free flex space access next door until 4:30 daily',
  'Mail and package handling',
  'Four soundproof phone booths, first come first served',
  'Pet friendly, so bring the dog',
  'Month to month, no long-term contract',
];

export default function DedicatedDeskPage() {
  const includedFeatures = [
    {
      title: '24/7 Access',
      description: 'Your own access code for round-the-clock building entry'
    },
    {
      title: 'High-Speed WiFi',
      description: 'Enterprise-grade internet throughout the building'
    },
    {
      title: 'Secure Storage',
      description: 'Lockable desk drawers and personal storage options'
    },
    {
      title: 'Full Kitchen',
      description: 'Coffee, tea, beer, microwave, refrigerator, and prep space'
    },
    {
      title: '4 Phone Booths',
      description: 'Private soundproof booths for calls and video meetings (first-come, first-served)'
    },
    {
      title: 'Meeting Credits',
      description: '4 free hours of conference room time per month'
    },
    {
      title: 'Mail Handling',
      description: 'Professional mail receiving and package management'
    },
    {
      title: 'Pet-Friendly',
      description: 'Bring your well-behaved dog to work with you'
    },
    {
      title: 'FREE Flex Space Next Door',
      description: 'Use our beautiful flex space in the adjacent building for meetings and events, free until 4:30 PM daily'
    },
    {
      title: 'FREE Trial Day',
      description: 'Try the space for a full day, on the house, before you commit to a membership'
    }
  ];

  const eventSpaceFeatures = [
    {
      title: 'Flex Space Coffee Lounge',
      description: 'Café seating and a beautiful space to recharge in our flex space next door'
    },
    {
      title: 'Free Workshops & Meetings',
      description: 'Host team meetings, client presentations, and networking events at no cost'
    },
    {
      title: 'Projector & Sound System',
      description: 'Professional AV equipment ready for your presentations'
    },
    {
      title: 'Recreation & Breaks',
      description: 'Ping pong, flexible seating, and space to recharge'
    }
  ];

  const idealFor = [
    {
      title: 'Freelancers & Consultants',
      description: 'Professional environment separate from home with built-in networking opportunities'
    },
    {
      title: 'Remote Workers',
      description: 'Escape home distractions while maintaining flexibility and community connection'
    },
    {
      title: 'New Entrepreneurs',
      description: 'Building their business with access to professional network and meeting spaces'
    }
  ];

  // Once every desk on the shared floor is spoken for we keep welcoming
  // dedicated desk members, but at the private rate in a converted office.
  // Nothing about that is shown until then. See lib/portal/deskAvailability.ts.
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

  return (
    <main className="bg-bone">
      <PageHero
        src="/images/new-hero/desks-occupied-wide.webp"
        alt="Members working at dedicated desks at Merritt Workspace, Sloan's Lake, Denver"
        blurDataURL={BLUR['desks-occupied-wide']}
        eyebrow="Dedicated desk &middot; $200 a month"
        title={<>The same desk every day, in a room with twenty-five of them.</>}
        lead="Your own desk in the Sloan's Lake coworking room, with free access to the 1905 event space next door. Month to month, no long contract."
      />

      {/* Sold-out notice — only once every floor desk is taken. */}
      {desksFull && (
        <section className="border-b border-clay bg-linen py-10 md:py-14">
          <div className="mw-container">
            <div className="max-w-3xl border-l-2 border-accent pl-6">
              <p className="font-display text-xl font-semibold text-ink md:text-2xl">
                Our shared dedicated desks are fully occupied.
              </p>
              <p className="mt-3 mw-body">
                We&rsquo;re still accepting dedicated desk members. New members
                are placed in a <strong className="font-semibold text-ink">Private
                Dedicated Desk</strong>, your own desk inside a private,
                lockable office area outside the shared community space, at{' '}
                <strong className="font-semibold text-ink">$300/month</strong>{' '}
                instead of $200. Everything else below is included exactly the same.
              </p>
              <Link href="/membership/apply" className="mw-link mt-6">
                Apply for a Private Dedicated Desk
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Price + what's included */}
      <section className="mw-section">
        <div className="mw-container">
          <div className="grid gap-12 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-5">
              <p className="mw-eyebrow mb-5">The membership</p>
              <p className="font-display text-6xl font-semibold tracking-tightest text-ink lg:text-7xl">
                $200<span className="text-2xl font-normal text-ink-60"> /mo</span>
              </p>
              <p className="mt-5 mw-body">
                Month to month. No long-term contract, no signing fee, and a free
                trial day before you decide anything.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/membership/apply" className="mw-btn-primary">
                  Apply for a desk
                </Link>
                <Link href="/contact" className="mw-btn-ghost">
                  Book a free trial day
                </Link>
              </div>
              <p className="mt-6 text-[15px] text-ink-60">
                Or call and text{' '}
                <a href="tel:7203579499" className="mw-inline-link">(720) 357-9499</a>.
              </p>
            </div>

            <div className="md:col-span-6 md:col-start-7">
              <h2 className="mw-h3">What&rsquo;s included</h2>
              <ul className="mt-6 space-y-0">
                {WHATS_INCLUDED.map((item) => (
                  <li key={item} className="border-t border-clay py-3.5 text-[16px] leading-relaxed text-ink-60">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Everything you need */}
      <section className="mw-section-alt">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">The details</p>
            <h2 className="mw-h2">Everything you need to get the day done.</h2>
          </div>
          <div className="mt-14 grid gap-x-10 gap-y-12 border-t border-clay pt-10 sm:grid-cols-2 lg:grid-cols-3 md:mt-20">
            {includedFeatures.map((feature) => (
              <div key={feature.title}>
                <h3 className="mw-h3">{feature.title}</h3>
                <p className="mt-4 mw-body">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The flex space */}
      <section className="relative">
        <div className="relative h-[70svh] min-h-[500px] w-full overflow-hidden md:h-[80svh] md:max-h-[820px]">
          <Image
            src="/images/new-hero/flexspace-group-rosewindow.webp"
            alt="Members gathered under the rose window in the restored 1905 flex space at Merritt Workspace"
            fill
            quality={88}
            placeholder="blur"
            blurDataURL={BLUR['flexspace-group-rosewindow']}
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 scrim-bottom" aria-hidden="true" />
          <div className="absolute inset-0 flex items-end">
            <div className="mw-container pb-14 md:pb-24">
              <div className="max-w-3xl">
                <p className="mw-eyebrow-light mb-5">Included with every desk</p>
                <h2 className="font-display text-[2.25rem] font-semibold leading-[1] tracking-tightest text-bone sm:text-5xl lg:text-[4rem]">
                  The 1905 event space next door, free until 4:30.
                </h2>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-clay bg-bone py-16 md:py-24">
          <div className="mw-container">
            <div className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {eventSpaceFeatures.map((feature) => (
                <div key={feature.title} className="border-t border-clay pt-6">
                  <h3 className="font-display text-xl font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-60">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Ideal for */}
      <section className="mw-section-alt">
        <div className="mw-container">
          <div className="max-w-2xl">
            <p className="mw-eyebrow mb-5">Who takes a desk</p>
            <h2 className="mw-h2">Built for the work you already do.</h2>
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

      {/* Other options + CTA */}
      <section className="border-t border-clay bg-ink py-20 text-bone md:py-32">
        <div className="mw-container">
          <div className="max-w-3xl">
            <p className="mb-5 text-[12px] font-medium uppercase tracking-[0.18em] text-bone/60 md:text-[13px]">
              A coworking home in Sloan&rsquo;s Lake
            </p>
            <h2 className="font-display text-[2rem] font-semibold leading-[1.02] tracking-tightest text-bone sm:text-4xl lg:text-[3.25rem]">
              Come work a day here before you decide.
            </h2>
            <p className="mt-7 max-w-2xl text-[17px] leading-relaxed text-bone/70 md:text-lg">
              Need more privacy? The{' '}
              <Link href="/membership/private-office" className="border-b border-accent pb-0.5 text-bone hover:border-bone">
                private offices
              </Link>{' '}
              start at $500 a month, or{' '}
              <Link href="/membership" className="border-b border-accent pb-0.5 text-bone hover:border-bone">
                compare every option
              </Link>. Questions go to{' '}
              <Link href="/contact" className="border-b border-accent pb-0.5 text-bone hover:border-bone">
                contact
              </Link>{' '}or the{' '}
              <Link href="/member-resources/faqs" className="border-b border-accent pb-0.5 text-bone hover:border-bone">
                FAQ
              </Link>.
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Link href="/membership/apply" className="mw-btn bg-accent text-white hover:bg-accent-deep">
                Apply for a dedicated desk
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
