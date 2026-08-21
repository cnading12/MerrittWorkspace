"use client";

// Portal dashboard for OFFICE MEMBERS — people occupying a private office
// that someone else (the office's primary member) pays for.
//
// Their world is much simpler than a paying member's: no documents, no fee
// agreement, no payments — just a pending → approved gate and then the
// member perks (conference room on the office's shared hours, snack shop,
// flex space, access codes). So instead of threading special cases through
// the full onboarding dashboard, they get this focused view.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Member } from '@/lib/portal/types';

interface PooledHours {
  included: number;
  used: number;
  remaining: number;
  pooled?: boolean;
  office_number?: string;
}

export default function OfficeMemberDashboard({
  member,
  onSignOut,
}: {
  member: Member;
  onSignOut: () => void;
}) {
  const [hours, setHours] = useState<PooledHours | null>(null);
  const [accessRequestStatus, setAccessRequestStatus] = useState<string | null>(null);
  const [requestingCode, setRequestingCode] = useState(false);

  const isPending = member.status === 'pending';
  const isDeclined = member.status === 'declined';
  const isActive = !isPending && !isDeclined;

  // The office's shared conference-hours pool — only meaningful (and only
  // fetchable) once the member is approved.
  useEffect(() => {
    if (!isActive) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;
        const res = await fetch('/api/bookings/member', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const h = await res.json();
        setHours(h);
      } catch {
        // Non-critical widget — the booking page shows the same numbers.
      }
    })();
  }, [isActive]);

  async function requestAccessCode() {
    setRequestingCode(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch('/api/portal/request-access-code', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
      }
      setAccessRequestStatus("Requested! We'll email your code shortly.");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setRequestingCode(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Welcome, {member.first_name}
          </h1>
          <p className="text-sm text-ink-60">
            Office Member
            {member.office_number && ` · Office ${member.office_number}`} · No monthly
            charge — your office&apos;s primary member covers the space.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/portal/activity"
            className="text-sm font-medium text-accent-deep hover:text-accent-deep"
          >
            My Activity →
          </a>
          <button
            onClick={onSignOut}
            className="text-sm text-ink-60 hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </div>

      {isPending && (
        <div className="bg-amber-50 border-2 border-amber-300 p-5">
          <div className="font-semibold text-amber-900 text-base">
            ⏳ Your request is with our staff
          </div>
          <p className="text-sm text-amber-900 mt-1.5">
            You asked to join{' '}
            <strong>Office {member.office_number || '—'}</strong>. A staff member
            will approve it shortly (usually same day) and you&apos;ll get an
            email the moment you&apos;re in. Until then, conference-room booking
            and member checkout stay locked.
          </p>
          <p className="text-sm text-amber-800 mt-2">
            In a hurry? Contact member services at{' '}
            <a href="mailto:memberservices@merrittworkspace.net" className="underline">
              memberservices@merrittworkspace.net
            </a>{' '}
            or{' '}
            <a href="tel:+13033598337" className="underline">
              (303) 359-8337
            </a>
            .
          </p>
        </div>
      )}

      {isDeclined && (
        <div className="bg-red-50 border-2 border-red-300 p-5">
          <div className="font-semibold text-red-900 text-base">
            Your office-member request was declined
          </div>
          <p className="text-sm text-red-900 mt-1.5">
            If you believe this is a mistake, contact member services at{' '}
            <a href="mailto:memberservices@merrittworkspace.net" className="underline">
              memberservices@merrittworkspace.net
            </a>{' '}
            or{' '}
            <a href="tel:+13033598337" className="underline">
              (303) 359-8337
            </a>{' '}
            and we&apos;ll sort it out.
          </p>
        </div>
      )}

      {isActive && (
        <>
          <div className="bg-green-50 border border-green-300 p-4 text-sm text-green-900">
            ✓ You&apos;re an approved member of{' '}
            <strong>Office {member.office_number || '—'}</strong>. Everything below
            is included with your office — no charge to you.
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <a
              href="/member-resources/meeting-rooms"
              className="block bg-bone border p-5 hover:border-gray-400 transition-colors"
            >
              <div className="font-semibold text-ink">
                📅 Book the conference room
              </div>
              <p className="text-sm text-ink-60 mt-1">
                {hours?.pooled ? (
                  <>
                    Your office has <strong>{hours.remaining}</strong> of{' '}
                    {hours.included} included hour{hours.included === 1 ? '' : 's'}{' '}
                    left this month — shared by everyone in Office{' '}
                    {hours.office_number || member.office_number}. Overage is $25/hr
                    on your own card.
                  </>
                ) : (
                  <>
                    Book with your office&apos;s shared monthly included hours.
                    Overage is $25/hr on your own card.
                  </>
                )}
              </p>
            </a>

            <a
              href="/member-resources/snackshop"
              className="block bg-bone border p-5 hover:border-gray-400 transition-colors"
            >
              <div className="font-semibold text-ink">🍫 Snack shop</div>
              <p className="text-sm text-ink-60 mt-1">
                One-click member checkout — orders are delivered to Office{' '}
                {member.office_number || 'your office'}.
              </p>
            </a>

            <a
              href="/member-resources/flex-space"
              className="block bg-bone border p-5 hover:border-gray-400 transition-colors"
            >
              <div className="font-semibold text-ink">🧘 Flex space</div>
              <p className="text-sm text-ink-60 mt-1">
                Reserve time in the historic church flex space (4 free hours per
                week).
              </p>
            </a>

            <div className="bg-bone border p-5">
              <div className="font-semibold text-ink">🔑 After-hours access code</div>
              <p className="text-sm text-green-800 mt-1 font-medium">
                No code needed Mon – Fri, 8:00 AM – 6:00 PM — the door is unlocked.
              </p>
              <p className="text-sm text-ink-60 mt-1">
                {member.access_code ? (
                  <>
                    Your after-hours code:{' '}
                    <code className="bg-linen px-1.5 py-0.5 font-semibold">
                      {member.access_code}
                    </code>
                  </>
                ) : (
                  'Only coming in during late evenings or on weekends? Request a personal access code and staff will email it to you.'
                )}
              </p>
              {!member.access_code && (
                <button
                  onClick={requestAccessCode}
                  disabled={requestingCode || !!accessRequestStatus}
                  className="mt-3 text-sm border border-gray-900 bg-ink text-white px-3 py-1.5 hover:bg-ink disabled:opacity-50"
                >
                  {requestingCode
                    ? 'Requesting…'
                    : accessRequestStatus || 'Request after-hours code'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <section className="bg-bone border p-6">
        <h3 className="font-display font-semibold text-ink mb-2">Who to contact</h3>
        <div className="text-sm text-ink-60 space-y-1">
          <p>
            <span className="font-medium">Member Services</span> — day-to-day help,
            access codes, snack shop, conference room:{' '}
            <a
              href="mailto:memberservices@merrittworkspace.net"
              className="text-orange-700 hover:underline"
            >
              memberservices@merrittworkspace.net
            </a>{' '}
            ·{' '}
            <a href="tel:+13033598337" className="text-orange-700 hover:underline">
              (303) 359-8337
            </a>
          </p>
          <p>
            <span className="font-medium">Manager</span> — membership changes and
            workspace matters:{' '}
            <a
              href="mailto:manager@merrittworkspace.net"
              className="text-orange-700 hover:underline"
            >
              manager@merrittworkspace.net
            </a>{' '}
            ·{' '}
            <a href="tel:+17203579499" className="text-orange-700 hover:underline">
              (720) 357-9499
            </a>
          </p>
          <p className="text-xs text-ink-60 pt-1">
            WiFi: <code className="bg-linen px-1">merrittcowork</code> /{' '}
            <code className="bg-linen px-1">Merritt23X</code>
          </p>
        </div>
      </section>
    </div>
  );
}
