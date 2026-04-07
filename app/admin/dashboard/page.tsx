"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { DESIGNATION_LABELS } from '@/lib/portal/types';

interface Counts {
  pendingApplications: number;
  totalMembers: number;
  activeMembers: number;
  pendingDocReviews: number;
  pendingAccessCodes: number;
  awaitingAgreements: number;
}

interface RecentMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status: string;
  designation: string | null;
  monthly_cost_cents: number | null;
  required_docs_complete: boolean;
  agreement_signed: boolean;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  onboarding_unlocked: boolean;
  created_at: string;
}

interface Summary {
  counts: Counts;
  recentMembers: RecentMember[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/admin');
        return;
      }
      const res = await fetch('/api/admin/summary', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          router.replace('/admin');
          return;
        }
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to load summary');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setSummary(data);
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <div className="text-gray-500">Loading dashboard…</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!summary) return null;

  const { counts, recentMembers } = summary;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Admin dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          Overview of member applications, onboarding progress, and pending actions.
        </p>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ActionCard
          title="Pending applications"
          count={counts.pendingApplications}
          description="New applications awaiting your approve / decline decision."
          href="/admin/applications"
          actionLabel="Review applications"
          urgent={counts.pendingApplications > 0}
        />
        <ActionCard
          title="Documents to review"
          count={counts.pendingDocReviews}
          description="Member-uploaded photo IDs and proof of address awaiting review."
          href="/admin/documents"
          actionLabel="Review documents"
          urgent={counts.pendingDocReviews > 0}
        />
        <ActionCard
          title="Access code requests"
          count={counts.pendingAccessCodes}
          description="Members requesting their 24/7 building access code from POPS."
          href="/admin/access-codes"
          actionLabel="Issue codes"
          urgent={counts.pendingAccessCodes > 0}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total members" value={counts.totalMembers} />
        <Stat label="Active members" value={counts.activeMembers} />
        <Stat label="Awaiting agreements" value={counts.awaitingAgreements} />
        <Stat label="Pending applications" value={counts.pendingApplications} />
      </div>

      {/* Recent members */}
      <section className="bg-white border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent members</h2>
          <Link href="/admin/members" className="text-sm text-blue-600 hover:underline">
            View all members →
          </Link>
        </div>
        {recentMembers.length === 0 ? (
          <p className="text-sm text-gray-500">No members yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-gray-500 border-b">
                <tr>
                  <th className="py-2 pr-3">Member</th>
                  <th className="pr-3">Designation</th>
                  <th className="pr-3">Monthly</th>
                  <th className="pr-3">Status</th>
                  <th className="pr-3">Onboarding</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recentMembers.map((m) => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-3 pr-3">
                      <div className="font-medium text-gray-900">
                        {m.first_name} {m.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{m.email}</div>
                    </td>
                    <td className="pr-3 text-gray-700">
                      {m.designation ? DESIGNATION_LABELS[m.designation as keyof typeof DESIGNATION_LABELS] : '—'}
                    </td>
                    <td className="pr-3 text-gray-700">
                      {m.monthly_cost_cents != null ? `$${(m.monthly_cost_cents / 100).toFixed(2)}` : '—'}
                    </td>
                    <td className="pr-3">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="pr-3">
                      <OnboardingProgress member={m} />
                    </td>
                    <td className="pr-3">
                      <Link
                        href={`/admin/members/${m.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ActionCard({
  title,
  count,
  description,
  href,
  actionLabel,
  urgent,
}: {
  title: string;
  count: number;
  description: string;
  href: string;
  actionLabel: string;
  urgent: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block bg-white border rounded-lg p-5 hover:shadow-md transition ${
        urgent ? 'border-amber-400 ring-1 ring-amber-200' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span
          className={`text-2xl font-bold ${
            urgent ? 'text-amber-600' : 'text-gray-400'
          }`}
        >
          {count}
        </span>
      </div>
      <p className="text-xs text-gray-600 mt-2">{description}</p>
      <div className="mt-3 text-sm text-blue-600 font-medium">{actionLabel} →</div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700',
    approved: 'bg-blue-100 text-blue-700',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
    declined: 'bg-red-100 text-red-700',
  };
  const cls = colors[status] || 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}

function OnboardingProgress({ member }: { member: RecentMember }) {
  const steps = [
    { label: 'Docs', done: member.required_docs_complete },
    { label: 'Sign', done: member.agreement_signed },
    { label: 'Pay', done: !!member.stripe_subscription_id },
    { label: 'Done', done: member.onboarding_unlocked },
  ];
  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => (
        <span
          key={i}
          title={s.label}
          className={`w-2 h-2 rounded-full ${
            s.done ? 'bg-green-500' : 'bg-gray-300'
          }`}
        />
      ))}
    </div>
  );
}
