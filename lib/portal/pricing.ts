// Central pricing map for Merritt Workspace memberships.
// Keep this in sync with app/membership/apply/page.tsx membershipPlans and
// lib/portal/types.ts MemberDesignation.
//
// When an admin approves an application, the applicant's selected
// `membership_type` is looked up here so both the `designation` and the
// `monthly_cost_cents` on the member record are populated automatically.
// That pricing then flows into the member fee agreement and Stripe checkout
// — no manual entry required.

import type { MemberDesignation } from './types';

export interface MembershipPlan {
  designation: MemberDesignation;
  label: string;
  // For recurring plans this is the monthly fee; for one-time plans
  // (e.g. one_day_dedicated_desk) it is the single upfront charge.
  monthly_cost_cents: number;
  // When true, members on this plan pay a single one-time charge instead
  // of a recurring monthly subscription.
  one_time?: boolean;
}

export const MEMBERSHIP_PLANS: Record<string, MembershipPlan> = {
  dedicated_desk: {
    designation: 'dedicated_desk',
    label: 'Dedicated Desk (Promo — $100/mo for life)',
    monthly_cost_cents: 10000,
  },
  one_day_dedicated_desk: {
    designation: 'one_day_dedicated_desk',
    label: 'One Day Dedicated Desk',
    monthly_cost_cents: 3000,
    one_time: true,
  },
  private_office_single: {
    designation: 'private_office_single',
    label: 'Private Office — Single',
    monthly_cost_cents: 50000,
  },
  private_office_double: {
    designation: 'private_office_double',
    label: 'Private Office — Double',
    monthly_cost_cents: 70000,
  },
  private_office_large: {
    designation: 'private_office_large',
    label: 'Private Office — Large',
    monthly_cost_cents: 120000,
  },
};

export function isOneTimeDesignation(
  designation: MemberDesignation | null | undefined
): boolean {
  if (!designation) return false;
  const plan = MEMBERSHIP_PLANS[designation];
  return Boolean(plan?.one_time);
}

export function planForMembershipType(
  membership_type: string | null | undefined
): MembershipPlan | null {
  if (!membership_type) return null;
  return MEMBERSHIP_PLANS[membership_type] || null;
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
