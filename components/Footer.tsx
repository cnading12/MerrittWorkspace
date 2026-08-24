"use client";

import Link from 'next/link';
import { trackPhoneClick, trackEmailClick } from '@/lib/gtag';

export default function Footer() {
  return (
    <footer className="bg-ink text-bone">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-24">
        <div className="grid gap-12 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5">
            <Link
              href="/"
              className="font-display text-3xl font-semibold tracking-tight transition hover:text-accent md:text-4xl"
            >
              Merritt Workspace
            </Link>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-bone/60">
              An independent coworking space in Sloan&rsquo;s Lake, Denver,
              next to a restored 1905 event space on the same lawn.
            </p>
            <Link
              href="/membership/apply?trial=1"
              className="mt-8 inline-flex items-center justify-center bg-accent px-6 py-3.5 text-[15px] font-medium text-white transition hover:bg-accent-deep"
            >
              Book a free trial day
            </Link>
          </div>

          <div className="md:col-span-4 md:pl-8">
            <h4 className="text-[13px] font-medium uppercase tracking-[0.18em] text-bone/50">
              Find us
            </h4>
            <div className="mt-5 space-y-1.5 text-[15px] text-bone/75">
              <p>2246 Irving Street</p>
              <p>Denver, CO 80211</p>
              <p className="text-bone/50">Three minutes to I-25</p>
            </div>
            <div className="mt-6 space-y-2 text-[15px]">
              <p>
                <a
                  href="tel:+17203579499"
                  onClick={trackPhoneClick}
                  className="border-b border-bone/25 pb-0.5 transition hover:border-bone"
                >
                  (720) 357-9499
                </a>
              </p>
              <p>
                <a
                  href="mailto:memberservices@merrittworkspace.net"
                  onClick={trackEmailClick}
                  className="border-b border-bone/25 pb-0.5 transition hover:border-bone"
                >
                  memberservices@merrittworkspace.net
                </a>
              </p>
            </div>
          </div>

          {/* Two link columns, not one. The footer is the only place every
              page links to every other, so it is what spreads authority across
              the site and how a crawler reaches the pages the nav buries. The
              old single column reached five of them and left the two
              highest-intent pages — day passes and private offices — with no
              site-wide link at all. */}
          <div className="grid grid-cols-2 gap-8 md:col-span-3">
            <div>
              <h4 className="text-[13px] font-medium uppercase tracking-[0.18em] text-bone/50">
                Workspaces
              </h4>
              <div className="mt-5 space-y-2.5 text-[15px]">
                {[
                  ['/membership', 'All memberships'],
                  ['/membership/dedicated-desk', 'Dedicated desks'],
                  ['/membership/private-office', 'Private offices'],
                  ['/day-pass', 'Day passes'],
                  ['/member-resources/meeting-rooms', 'Conference room'],
                  ['/member-resources/flex-space', 'Flex space'],
                ].map(([href, label]) => (
                  <Link key={href} href={href} className="block text-bone/75 transition hover:text-bone">
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-[13px] font-medium uppercase tracking-[0.18em] text-bone/50">
                Merritt
              </h4>
              <div className="mt-5 space-y-2.5 text-[15px]">
                {[
                  ['/about', 'About'],
                  ['/contact', 'Contact'],
                  ['/member-resources/faqs', 'FAQs'],
                  ['/member-resources/snackshop', 'Snackshop'],
                  ['/membership/apply', 'Apply'],
                  ['/portal', 'Member portal'],
                ].map(([href, label]) => (
                  <Link key={href} href={href} className="block text-bone/75 transition hover:text-bone">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col justify-between gap-4 border-t border-bone/15 pt-8 md:flex-row md:items-center">
          <p className="text-[13px] text-bone/45">
            &copy; 2025 Merritt Workspace. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-[13px] text-bone/45 transition hover:text-bone">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-[13px] text-bone/45 transition hover:text-bone">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
