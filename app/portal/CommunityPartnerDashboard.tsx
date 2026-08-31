"use client";

// Portal dashboard for COMMUNITY PARTNERS — non-profit organisations granted
// comped use of the conference room and flex space.
//
// They are not members and not office occupants: no fee agreement, no
// payments, no desk or office. What they do have is a pending → approved gate
// and a photo ID we still need on file for anyone who can enter the building.
// So rather than threading special cases through the full onboarding
// dashboard (which would ask them for proof of address and a card), they get
// this focused view.
//
// Their hours are negotiated individually and set by an admin on the members
// page. Partners have NO included hours by default, so a partner whose
// overrides were never filled in sees zero here — that is accurate, not a
// bug, and the copy points them at member services rather than pretending.

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Member, MemberDocument } from '@/lib/portal/types';
import { prepareIdUpload, describeUploadFailure } from '@/lib/portal/idUpload';
import { MAX_ID_FILE_BYTES, MAX_ID_FILE_LABEL } from '@/lib/portal/trialApplication';

interface HoursSummary {
  included: number;
  used: number;
  remaining: number;
}

export default function CommunityPartnerDashboard({
  member,
  documents,
  onSignOut,
  onMemberChange,
}: {
  member: Member;
  documents: MemberDocument[];
  onSignOut: () => void;
  onMemberChange?: (member: Member) => void;
}) {
  const [hours, setHours] = useState<HoursSummary | null>(null);
  const [accessRequestStatus, setAccessRequestStatus] = useState<string | null>(null);
  const [requestingCode, setRequestingCode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docs, setDocs] = useState<MemberDocument[]>(documents);

  const isPending = member.status === 'pending';
  const isDeclined = member.status === 'declined';
  const isActive = !isPending && !isDeclined;
  const hasPhotoId = docs.some((d) => d.doc_type === 'photo_id');

  useEffect(() => setDocs(documents), [documents]);

  // Conference allowance, only meaningful (and only fetchable) once approved.
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
        setHours(await res.json());
      } catch {
        // Non-critical widget — the booking page shows the same numbers.
      }
    })();
  }, [isActive]);

  async function uploadPhotoId(original: File) {
    setUploadError(null);
    // A fourth copy of the limit used to live here as a literal `10MB`,
    // above the 4.5MB the platform will actually carry — so the check
    // passed and the request died anyway. The number comes from one place
    // now, and the photo is shrunk before it is measured.
    let file = original;
    try {
      file = await prepareIdUpload(original);
    } catch {
      file = original;
    }
    if (file.size > MAX_ID_FILE_BYTES) {
      setUploadError(
        `That file is ${(file.size / (1024 * 1024)).toFixed(1)}MB, and the limit is ` +
          `${MAX_ID_FILE_LABEL}. Please choose a smaller photo or scan.`
      );
      return;
    }
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const form = new FormData();
      form.append('file', file);
      form.append('doc_type', 'photo_id');
      const res = await fetch('/api/portal/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      // Parsed defensively: a request the platform rejected answers with an
      // error page, not JSON, and `res.json()` throwing there would replace
      // the real status with a parse error.
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Upload failed (HTTP ${res.status})`);
      setDocs(data.documents || []);
      if (data.member) onMemberChange?.(data.member);
    } catch (e: any) {
      setUploadError(describeUploadFailure(e, file));
    } finally {
      setUploading(false);
    }
  }

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Welcome, {member.first_name}
          </h1>
          <p className="text-sm text-ink-60">
            {member.company_name || 'Community partner'} · Community Partner
          </p>
        </div>
        <button onClick={onSignOut} className="text-sm text-ink-60 hover:text-ink">
          Sign out
        </button>
      </div>

      {isPending && (
        <div className="bg-amber-50 border-2 border-amber-300 p-5">
          <div className="font-semibold text-amber-900 text-base">
            ⏳ Your request is with our staff
          </div>
          <p className="text-sm text-amber-900 mt-1.5">
            A staff member will review it shortly. You&apos;ll get an email the
            moment you&apos;re approved. Until then, booking stays locked.
          </p>
          <p className="text-sm text-amber-800 mt-2">
            Questions? Member services:{' '}
            <a href="mailto:memberservices@merrittworkspace.net" className="underline">
              memberservices@merrittworkspace.net
            </a>{' '}
            ·{' '}
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
            Your community partner request was declined
          </div>
          <p className="text-sm text-red-900 mt-1.5">
            If you believe this is a mistake, contact member services at{' '}
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

      {isActive && (
        <>
          {/* Photo ID gate. Everything else still works without it — we chase
              the document rather than locking a partner out of a room we
              already agreed they could use. */}
          {!hasPhotoId ? (
            <div className="bg-amber-50 border-2 border-amber-300 p-5">
              <div className="font-semibold text-amber-900 text-base">
                📄 We still need a photo ID
              </div>
              <p className="text-sm text-amber-900 mt-1.5">
                We keep ID on file for everyone who can enter the building. A
                driver&apos;s licence or passport is fine — a clear photo or PDF.
                Large photos are shrunk automatically before they are sent.
              </p>
              <input
                type="file"
                accept="image/*,.pdf"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadPhotoId(file);
                  e.target.value = '';
                }}
                className="mt-3 block w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:border-0 file:bg-amber-200 file:text-amber-900 file:font-medium hover:file:bg-amber-300 disabled:opacity-50"
              />
              {uploading && (
                <p className="text-sm text-amber-900 mt-2">Uploading…</p>
              )}
              {uploadError && (
                <p className="text-sm text-red-700 mt-2">{uploadError}</p>
              )}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-300 p-4 text-sm text-green-900">
              ✓ Photo ID received — thank you. Nothing else is outstanding.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <a
              href="/member-resources/meeting-rooms"
              className="block bg-bone border p-5 hover:border-gray-400 transition-colors"
            >
              <div className="font-semibold text-ink">📅 Book the conference room</div>
              <p className="text-sm text-ink-60 mt-1">
                {hours && hours.included > 0 ? (
                  <>
                    You have <strong>{hours.remaining}</strong> of {hours.included}{' '}
                    agreed hour{hours.included === 1 ? '' : 's'} left this month.
                    Anything beyond that is $25/hr on your own card.
                  </>
                ) : (
                  <>
                    Booking is open to you at $25/hr. If we agreed on included
                    hours and you aren&apos;t seeing them, contact member services.
                  </>
                )}
              </p>
            </a>

            <a
              href="/portal/flex-space"
              className="block bg-bone border p-5 hover:border-gray-400 transition-colors"
            >
              <div className="font-semibold text-ink">🧘 Flex space</div>
              <p className="text-sm text-ink-60 mt-1">
                Reserve the historic church flex space using your agreed weekly
                hours. Your remaining balance is shown on the booking page.
              </p>
            </a>

            <div className="bg-bone border p-5">
              <div className="font-semibold text-ink">🔑 After-hours access code</div>
              <p className="text-sm text-green-800 mt-1 font-medium">
                No code needed Mon – Fri, 7:30 AM – 5:30 PM — the door is unlocked.
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
                  'Coming in before 7:30 AM, after 5:30 PM, or on a weekend? Request a personal access code and staff will email it to you.'
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

            <div className="bg-bone border p-5">
              <div className="font-semibold text-ink">🏢 Getting in</div>
              <p className="text-sm text-ink-60 mt-1">
                2246 Irving Street. There is no front desk — during business
                hours walk in through the main entrance. Free parking in the lot
                out front and on the street.
              </p>
            </div>
          </div>
        </>
      )}

      <section className="bg-bone border p-6">
        <h3 className="font-display font-semibold text-ink mb-2">Who to contact</h3>
        <div className="text-sm text-ink-60 space-y-1">
          <p>
            <span className="font-medium">Member Services</span> — day-to-day help,
            access codes, bookings:{' '}
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
            <span className="font-medium">Manager</span> — your partnership itself,
            including the hours we&apos;ve agreed:{' '}
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
        </div>
      </section>
    </div>
  );
}
