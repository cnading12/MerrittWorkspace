"use client";

import { useEffect, useRef, useState } from 'react';
import { currentBuildStamp, isStaleBuild } from '@/lib/buildStamp';

// Detects an admin tab running a bundle from an older deployment than the
// server, and gets it onto the current one.
//
// This is the failure mode that makes every other admin fix look like it
// never shipped: the panel is a client-side app, a tab keeps executing the
// bundle it loaded until the page reloads, and the focus-refetch keeps its
// DATA current — so a stale tab looks perfectly alive while its BEHAVIOR
// (what Approve does, how a dismissed card renders) is weeks old. An admin
// working in such a tab reports, accurately, that the bugs are all still
// there.
//
// On focus (throttled), /api/version is asked which deployment is serving
// and the answer is compared to the stamp baked into this bundle. On the
// first mismatch per new deployment the page reloads itself once —
// automatically, because nothing on these screens holds unsaved state worth
// more than running the right code. If the reload somehow does not produce
// a matching bundle (a CDN still serving old HTML), the one-shot guard stops
// it reloading again and the banner stays up instead, saying exactly what
// is wrong. The stamp itself is always rendered, so a screenshot of any
// admin page states which deployment produced it.
const CLIENT_BUILD = currentBuildStamp();

export default function AdminBuildGuard() {
  const [serverBuild, setServerBuild] = useState<string | null>(null);
  const lastCheckRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const now = Date.now();
      if (now - lastCheckRef.current < 15000) return;
      lastCheckRef.current = now;
      try {
        // Cache-busted the same way every admin read is; a cached answer
        // here would defeat the entire point.
        const res = await fetch(`/api/version?t=${now}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const build = typeof data.build === 'string' ? data.build : null;
        if (!build) return;
        if (!cancelled) setServerBuild(build);
        if (isStaleBuild(CLIENT_BUILD, build)) {
          try {
            const key = `admin-auto-reloaded-for-${build}`;
            if (!sessionStorage.getItem(key)) {
              sessionStorage.setItem(key, '1');
              window.location.reload();
            }
          } catch {
            // sessionStorage unavailable: skip the auto-reload rather than
            // risk a loop; the banner below still says what to do.
          }
        }
      } catch {
        // Offline or mid-deploy; the next focus will ask again.
      }
    };
    check();
    const onFocus = () => check();
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const stale = isStaleBuild(CLIENT_BUILD, serverBuild);

  return (
    <>
      {stale && (
        <div className="bg-red-600 text-white">
          <div className="max-w-6xl mx-auto px-6 py-3 text-sm flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="font-bold">This tab is running an old version of the admin panel.</span>{' '}
              The server is on build <span className="font-mono">{serverBuild}</span>; this tab
              loaded build <span className="font-mono">{CLIENT_BUILD}</span>. Anything that looks
              broken here may already be fixed — reload before acting on what you see.
            </div>
            <button
              onClick={() => window.location.reload()}
              className="flex-shrink-0 rounded bg-white px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50"
            >
              Reload now
            </button>
          </div>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-6 pt-2 -mb-6 text-right text-[11px] text-gray-400">
        Admin build <span className="font-mono">{CLIENT_BUILD}</span>
        {serverBuild && !stale && ' · up to date'}
      </div>
    </>
  );
}
