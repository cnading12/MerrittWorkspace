"use client";

// One sentence saying how many dedicated desks are actually free right now.
//
// The café page used to assert that the coworking floor was "effectively sold
// out" as a standing fact in the copy. That sentence was only ever true on the
// day it was written: it stayed on the page through every move-out, and it
// framed the café tier as what you settle for when the real thing is gone.
// Reading the number instead means the page can say something true without
// saying anything about which membership is better.
//
// The fetch is best-effort and the whole line is optional. `null` — request in
// flight, request failed, or the endpoint reporting `unavailable` — renders
// nothing at all, because a page that has quietly dropped one sentence reads
// better than one printing a count it cannot stand behind.

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DeskAvailability {
  remaining: number | null;
  isFull: boolean;
  unavailable?: boolean;
}

export default function DeskCountLine({ className = '' }: { className?: string }) {
  const [desks, setDesks] = useState<DeskAvailability | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/desk-availability')
      .then(r => r.json())
      .then((d: DeskAvailability) => {
        if (!cancelled && d && !d.unavailable) setDesks(d);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const remaining = desks?.remaining;
  if (typeof remaining !== 'number') return null;

  return (
    <p className={`text-[15px] leading-relaxed text-ink-60 ${className}`}>
      <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" aria-hidden="true" />
      {remaining === 0
        ? 'Every dedicated desk is taken right now, so a café membership is the way in until one opens up. '
        : remaining === 1
          ? 'There is 1 dedicated desk open right now, if a desk of your own is what you actually want. '
          : `There are ${remaining} dedicated desks open right now, if a desk of your own is what you actually want. `}
      <Link href="/membership/dedicated-desk" className="mw-inline-link">
        See the dedicated desk
      </Link>
      .
    </p>
  );
}
