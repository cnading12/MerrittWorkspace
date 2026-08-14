import { describe, it, expect } from 'vitest';
import {
  buildSignupEmailFields,
  checkoutFactsFromMetadata,
  type SignupEmailMember,
} from '@/lib/portal/signupEmails';
import {
  signupCompletedMemberEmail,
  signupCompletedStaffEmail,
} from '@/lib/portal/emails';
import { formatDeskList } from '@/lib/portal/deskAvailability';

// These tests guard the two emails sent the moment a member officially signs
// up (finishes the onboarding portal): the facts quoted back to the member
// must match what they actually bought, and the management-team notification
// must always say who signed up, for what, and at what cost.

const member = (overrides: Partial<SignupEmailMember> = {}): SignupEmailMember => ({
  id: 'm1',
  first_name: 'Dana',
  last_name: 'Reyes',
  email: 'dana@example.com',
  phone: '303-555-0100',
  company_name: 'Reyes Design',
  designation: 'dedicated_desk',
  monthly_cost_cents: 20000,
  desk_number: null,
  office_number: null,
  access_code: null,
  is_legacy_member: false,
  ...overrides,
});

// A standard new dedicated-desk signup: prorated first month + last month's
// deposit + 3.5% card fee, anchored to the 1st of the following month.
const deskCheckoutMetadata = {
  order_type: 'membership_subscription',
  member_id: 'm1',
  create_subscription: '1',
  monthly_cost_cents: '20000',
  billing_cycle_anchor: String(Math.floor(Date.UTC(2026, 8, 1) / 1000)), // Sep 1 2026
  prorated_first_charge_cents: '11613',
  last_month_deposit_cents: '20000',
  cc_fee_cents: '1106',
  initial_total_cents: '32719',
  selected_payment_method: 'card',
  start_date: '2026-08-14',
};

describe('checkoutFactsFromMetadata', () => {
  it('parses the numeric signup facts off the Stripe session metadata', () => {
    const facts = checkoutFactsFromMetadata(deskCheckoutMetadata);
    expect(facts).toMatchObject({
      oneTime: false,
      legacySetup: false,
      initialTotalCents: 32719,
      proratedFirstMonthCents: 11613,
      lastMonthDepositCents: 20000,
      ccFeeCents: 1106,
      startDateIso: '2026-08-14',
      selectedPaymentMethod: 'card',
    });
  });

  it('tolerates a missing/empty metadata bag', () => {
    const facts = checkoutFactsFromMetadata(undefined);
    expect(facts.oneTime).toBe(false);
    expect(facts.initialTotalCents).toBeNull();
    expect(facts.selectedPaymentMethod).toBeNull();
  });

  it('flags one-time (day pass) and legacy setup sessions', () => {
    expect(checkoutFactsFromMetadata({ one_time: '1' }).oneTime).toBe(true);
    expect(checkoutFactsFromMetadata({ legacy_setup: '1' }).legacySetup).toBe(true);
  });
});

describe('buildSignupEmailFields', () => {
  it('describes a dedicated-desk signup with its full cost breakdown', () => {
    const fields = buildSignupEmailFields({
      member: member(),
      facts: checkoutFactsFromMetadata(deskCheckoutMetadata),
      availableDesks: ['DD1', 'DD2', 'DD3', 'DD9'],
    });

    expect(fields.designationLabel).toBe('Dedicated Desk');
    expect(fields.spaceSummary).toBe('1 dedicated desk in the shared coworking space');
    expect(fields.costLine).toBe('$200.00 per month');
    expect(fields.initialChargeLabel).toBe(
      "$327.19 — prorated first month $116.13 + last month's fee held as deposit $200.00 + 3.5% card processing fee $11.06"
    );
    expect(fields.nextChargeLabel).toBe('September 1, 2026');
    expect(fields.startDateLabel).toBe('August 14, 2026');
    expect(fields.paymentMethodLabel).toBe('Credit/debit card');
    expect(fields.conferenceHoursLine).toBe('4 hours of conference-room time per month');
    expect(fields.seatType).toBe('desk');
    expect(fields.seatNumber).toBeNull();
    // Desk not claimed yet, so the free-desk list is actionable.
    expect(fields.availableDesksLabel).toBe('DD1–DD3, DD9');
  });

  it('omits the card fee from the breakdown for an ACH member', () => {
    const fields = buildSignupEmailFields({
      member: member(),
      facts: checkoutFactsFromMetadata({
        ...deskCheckoutMetadata,
        cc_fee_cents: '0',
        initial_total_cents: '31613',
        selected_payment_method: 'ach',
      }),
      availableDesks: [],
    });
    expect(fields.initialChargeLabel).not.toContain('processing fee');
    expect(fields.paymentMethodLabel).toBe('Bank account (ACH — no processing fee)');
  });

  it('hides the free-desk list once the member has claimed a desk', () => {
    const fields = buildSignupEmailFields({
      member: member({ desk_number: 'DD7' }),
      facts: checkoutFactsFromMetadata(deskCheckoutMetadata),
      availableDesks: ['DD1', 'DD2'],
    });
    expect(fields.seatNumber).toBe('DD7');
    expect(fields.availableDesksLabel).toBeNull();
  });

  it('reports desks and cost for a two-desk private office', () => {
    const fields = buildSignupEmailFields({
      member: member({
        designation: 'private_office_double',
        monthly_cost_cents: 70000,
        office_number: '104',
      }),
      facts: checkoutFactsFromMetadata({
        ...deskCheckoutMetadata,
        monthly_cost_cents: '70000',
      }),
      availableDesks: [],
    });
    expect(fields.spaceSummary).toBe('Private office — 2 desks');
    expect(fields.costLine).toBe('$700.00 per month');
    expect(fields.seatType).toBe('office');
    expect(fields.seatNumber).toBe('104');
    expect(fields.conferenceHoursLine).toBe('12 hours of conference-room time per month');
    // Office members pick an office, never a DD number.
    expect(fields.availableDesksLabel).toBeNull();
  });

  it('treats a day pass as a one-time charge with no recurring date', () => {
    const fields = buildSignupEmailFields({
      member: member({
        designation: 'one_day_dedicated_desk',
        monthly_cost_cents: 3000,
      }),
      facts: checkoutFactsFromMetadata({
        one_time: '1',
        base_cents: '3000',
        initial_total_cents: '3105',
        selected_payment_method: 'card',
      }),
      availableDesks: ['DD5'],
    });
    expect(fields.costLine).toBe('$30.00 one-time (single day pass)');
    expect(fields.initialChargeLabel).toBe('$31.05 (day pass)');
    expect(fields.nextChargeLabel).toBeNull();
    expect(fields.conferenceHoursLine).toBe(
      '1 hour of conference-room time on each day you hold a pass'
    );
  });

  it('reports no upfront charge for a legacy member setting up auto-pay', () => {
    const fields = buildSignupEmailFields({
      member: member({ is_legacy_member: true }),
      facts: checkoutFactsFromMetadata({
        legacy_setup: '1',
        monthly_cost_cents: '20000',
        billing_cycle_anchor: String(Math.floor(Date.UTC(2026, 8, 1) / 1000)),
      }),
      availableDesks: [],
    });
    expect(fields.initialChargeLabel).toBeNull();
    expect(fields.costLine).toBe('$200.00 per month');
    expect(fields.nextChargeLabel).toBe('September 1, 2026');
  });

  it('groups thousands so a large-office charge does not read as $1106.45', () => {
    const fields = buildSignupEmailFields({
      member: member({
        designation: 'private_office_large',
        monthly_cost_cents: 120000,
        office_number: '112',
      }),
      facts: checkoutFactsFromMetadata({
        monthly_cost_cents: '120000',
        prorated_first_charge_cents: '69677',
        last_month_deposit_cents: '120000',
        cc_fee_cents: '0',
        initial_total_cents: '189677',
      }),
      availableDesks: [],
    });
    expect(fields.costLine).toBe('$1,200.00 per month');
    expect(fields.initialChargeLabel).toContain('$1,896.77');
    expect(fields.initialChargeLabel).toContain('$1,200.00');
  });

  it('bills an office member to the office primary, not to them', () => {
    const fields = buildSignupEmailFields({
      member: member({
        designation: 'office_member',
        monthly_cost_cents: 0,
        office_number: '107',
      }),
      facts: checkoutFactsFromMetadata({}),
      availableDesks: [],
    });
    expect(fields.costLine).toBe("$0.00 — billed to the office's primary member");
  });
});

describe('formatDeskList', () => {
  it('collapses consecutive desks into ranges', () => {
    expect(formatDeskList(['DD1', 'DD2', 'DD3', 'DD4', 'DD9', 'DD12'])).toBe(
      'DD1–DD4, DD9, DD12'
    );
  });

  it('keeps a pair as two labels rather than a range', () => {
    expect(formatDeskList(['DD5', 'DD6'])).toBe('DD5, DD6');
  });

  it('sorts numerically, not lexically', () => {
    expect(formatDeskList(['DD10', 'DD2'])).toBe('DD2, DD10');
  });

  it('returns an empty string when nothing is available', () => {
    expect(formatDeskList([])).toBe('');
  });
});

describe('signupCompletedMemberEmail', () => {
  const base = {
    firstName: 'Dana',
    designationLabel: 'Dedicated Desk',
    spaceSummary: '1 dedicated desk in the shared coworking space',
    costLine: '$200.00 per month',
    initialChargeLabel: "$327.19 — prorated first month $116.13 + last month's fee held as deposit $200.00",
    nextChargeLabel: 'September 1, 2026',
    startDateLabel: 'August 14, 2026',
    seatType: 'desk' as const,
    seatNumber: null,
    availableDesksLabel: 'DD1–DD3, DD9',
    conferenceHoursLine: '4 hours of conference-room time per month',
    portalUrl: 'https://merrittworkspace.net/portal',
  };

  it('states cost, what they signed up for, WiFi, and the access-code rule', () => {
    const tpl = signupCompletedMemberEmail(base);
    for (const text of [tpl.html, tpl.text]) {
      expect(text).toContain('$200.00 per month');
      expect(text).toContain('1 dedicated desk in the shared coworking space');
      expect(text).toContain('merrittcowork');
      expect(text).toContain('Merritt23X');
      expect(text).toContain('8:00 AM – 6:00 PM, Monday through Friday');
      expect(text).toContain('evenings, weekends, and holidays');
    }
    expect(tpl.subject).toContain('Dana');
  });

  it('prompts an unassigned desk member to claim one and lists what is free', () => {
    const tpl = signupCompletedMemberEmail(base);
    expect(tpl.html).toContain('claim your desk');
    expect(tpl.html).toContain('DD1–DD3, DD9');
    expect(tpl.text).toContain('DD1–DD3, DD9');
    // The marking rule matters — an unmarked desk reads as available.
    expect(tpl.html).toContain('leave something on the desk');
  });

  it('drops the claim-your-desk block once a desk is assigned', () => {
    const tpl = signupCompletedMemberEmail({
      ...base,
      seatNumber: 'DD7',
      availableDesksLabel: null,
    });
    expect(tpl.html).not.toContain('claim your desk');
    expect(tpl.html).toContain('DD7');
  });

  it('tells a fully-booked desk member to contact member services', () => {
    const tpl = signupCompletedMemberEmail({ ...base, availableDesksLabel: null });
    expect(tpl.html).toContain('Every desk is currently spoken for');
  });

  it('asks an office member to confirm their office instead of a desk', () => {
    const tpl = signupCompletedMemberEmail({
      ...base,
      designationLabel: 'Private Office — Double',
      spaceSummary: 'Private office — 2 desks',
      seatType: 'office',
      seatNumber: null,
      availableDesksLabel: null,
    });
    expect(tpl.html).toContain('confirm your office');
    expect(tpl.html).not.toContain('DD1');
  });

  it('omits the recurring-charge line for a one-time day pass', () => {
    const tpl = signupCompletedMemberEmail({
      ...base,
      costLine: '$30.00 one-time (single day pass)',
      nextChargeLabel: null,
    });
    expect(tpl.html).not.toContain('Next charge');
    expect(tpl.text).not.toContain('Next charge');
  });

  it('escapes member-supplied text so a stray character cannot break the HTML', () => {
    const tpl = signupCompletedMemberEmail({ ...base, firstName: 'Dana <script>' });
    expect(tpl.html).toContain('Dana &lt;script&gt;');
    expect(tpl.html).not.toContain('<script>');
  });
});

describe('signupCompletedStaffEmail', () => {
  const base = {
    firstName: 'Dana',
    lastName: 'Reyes',
    email: 'dana@example.com',
    phone: '303-555-0100',
    companyName: 'Reyes Design',
    designationLabel: 'Dedicated Desk',
    spaceSummary: '1 dedicated desk in the shared coworking space',
    costLine: '$200.00 per month',
    initialChargeLabel: '$327.19 — prorated first month $116.13',
    nextChargeLabel: 'September 1, 2026',
    startDateLabel: 'August 14, 2026',
    paymentMethodLabel: 'Credit/debit card',
    seatType: 'desk' as const,
    seatNumber: null,
    availableDesksLabel: 'DD1–DD3, DD9',
    hasAccessCode: false,
    isLegacyMember: false,
    adminUrl: 'https://merrittworkspace.net/admin/members/m1',
  };

  it('names the member and their plan in the subject line', () => {
    const tpl = signupCompletedStaffEmail(base);
    expect(tpl.subject).toBe('New member signed up — Dana Reyes (Dedicated Desk)');
  });

  it('carries the full signup record and a link to the admin panel', () => {
    const tpl = signupCompletedStaffEmail(base);
    for (const text of [tpl.html, tpl.text]) {
      expect(text).toContain('Dana Reyes');
      expect(text).toContain('Reyes Design');
      expect(text).toContain('dana@example.com');
      expect(text).toContain('303-555-0100');
      expect(text).toContain('$200.00 per month');
      expect(text).toContain('Credit/debit card');
      expect(text).toContain('September 1, 2026');
    }
    expect(tpl.html).toContain('https://merrittworkspace.net/admin/members/m1');
  });

  it('puts issuing an access code on the to-do list until one exists', () => {
    expect(signupCompletedStaffEmail(base).html).toContain('Issue their 24/7 access code');
    expect(
      signupCompletedStaffEmail({ ...base, hasAccessCode: true }).html
    ).not.toContain('Issue their 24/7 access code');
  });

  it('asks staff to verify the seat once the member has claimed one', () => {
    const tpl = signupCompletedStaffEmail({
      ...base,
      seatNumber: 'DD7',
      availableDesksLabel: null,
    });
    expect(tpl.html).toContain('Confirm desk DD7 is actually free');
  });

  it('flags an existing-member migration', () => {
    const tpl = signupCompletedStaffEmail({ ...base, isLegacyMember: true });
    expect(tpl.html).toContain('existing-member migration');
    expect(tpl.text).toContain('existing-member migration');
  });
});
