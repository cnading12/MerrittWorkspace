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
              An independent coworking space in Sloan&rsquo;s Lake, Denver, on
              the burnt orange concrete floors of a building next to a restored
              1905 church.
            </p>
            <Link
              href="/contact"
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

          <div className="md:col-span-3">
            <h4 className="text-[13px] font-medium uppercase tracking-[0.18em] text-bone/50">
              Pages
            </h4>
            <div className="mt-5 space-y-2.5 text-[15px]">
              <Link href="/membership" className="block text-bone/75 transition hover:text-bone">
                Membership
              </Link>
              <Link href="/member-resources/meeting-rooms" className="block text-bone/75 transition hover:text-bone">
                Meeting rooms
              </Link>
              <Link href="/member-resources/snackshop" className="block text-bone/75 transition hover:text-bone">
                Snackshop
              </Link>
              <Link href="/about" className="block text-bone/75 transition hover:text-bone">
                About
              </Link>
              <Link href="/contact" className="block text-bone/75 transition hover:text-bone">
                Contact
              </Link>
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
