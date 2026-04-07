// Static legal copy + fee agreement template used in the member portal.
// The Terms & Conditions are the same for every member; the fee agreement
// is rendered with per-member values (contact info, billing, designation,
// monthly cost, totals) at sign time.
//
// NOTE: The T&C text below should be reviewed by counsel before going
// live. Bump DOCUMENT_VERSION whenever the wording changes so the
// signature audit trail is meaningful.

export const DOCUMENT_VERSION = 'v2-2026-04';

export const MERRITT_SIGNATORY = {
  name: 'Lance Nading',
  title: 'Manager',
};

export const TERMS_AND_CONDITIONS_TEXT = `
MERRITT WORKSPACE — TERMS & CONDITIONS

1. Membership. By becoming a Merritt Workspace member you agree to use the
   space respectfully and in accordance with all posted house rules. Membership
   is personal and may not be transferred without written consent.

2. Access. Members receive 24/7 building access via a personal access code.
   Codes are confidential; sharing a code is grounds for immediate termination.

3. Conduct. Members will keep shared areas clean, observe quiet zones, and
   treat staff and other members with courtesy. Merritt Workspace reserves the
   right to suspend or terminate membership for disruptive behavior.

4. Property & Liability. Members are responsible for their personal property.
   Merritt Workspace is not liable for loss, theft, or damage to member items.
   Members agree to hold Merritt Workspace harmless from any claims arising
   from their use of the space.

5. Insurance. Members are encouraged to maintain renter's or business
   insurance covering their equipment and activity inside the building.

6. Cancellation. Memberships may be cancelled with 30 days written notice via
   the member portal. Pre-paid amounts are non-refundable.

7. Changes. Merritt Workspace may update these terms with reasonable notice.
   Continued use of the space constitutes acceptance of the updated terms.

8. Governing Law. These terms are governed by the laws of the state in which
   the Merritt Workspace location operates.

By signing electronically below, you acknowledge that you have read,
understood, and agreed to these Terms & Conditions.
`.trim();

export interface FeeAgreementContact {
  name: string;
  street: string;
  cityStateZip: string;
  phone: string;
  email: string;
  federalId?: string | null;
}

export interface FeeAgreementInvoicing {
  companyName: string;
  street: string;
  cityStateZip: string;
  contactName: string;
  phone: string;
  email: string;
}

export interface FeeAgreementContext {
  member: FeeAgreementContact;
  invoicing: FeeAgreementInvoicing;
  designationLabel: string;
  monthlyCostCents: number;
  termStart: string; // human label, e.g. "June 1, 2026"
  termEnd: string;   // human label, e.g. "June 30, 2026"
  paymentMethod: 'card' | 'ach'; // controls 3.5% CC fee
  signedDate: string;
  memberTitle?: string | null;
}

export interface FeeAgreementTotals {
  firstMonthCents: number;
  lastMonthCents: number;
  subtotalCents: number;
  ccFeeCents: number;
  grandTotalCents: number;
}

export function calculateFeeAgreementTotals(
  monthlyCostCents: number,
  paymentMethod: 'card' | 'ach'
): FeeAgreementTotals {
  const firstMonthCents = monthlyCostCents;
  const lastMonthCents = monthlyCostCents;
  const subtotalCents = firstMonthCents + lastMonthCents;
  const ccFeeCents =
    paymentMethod === 'card' ? Math.round(subtotalCents * 0.035) : 0;
  const grandTotalCents = subtotalCents + ccFeeCents;
  return { firstMonthCents, lastMonthCents, subtotalCents, ccFeeCents, grandTotalCents };
}

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function pad(label: string, value: string, width = 22): string {
  return `${(label + ':').padEnd(width)} ${value}`;
}

export function renderFeeAgreementText(ctx: FeeAgreementContext): string {
  const totals = calculateFeeAgreementTotals(ctx.monthlyCostCents, ctx.paymentMethod);
  const { member: m, invoicing: inv } = ctx;

  return `
MERRITT WORKSPACE FEE AGREEMENT

MEMBER INFORMATION
${pad('Contact Name', m.name)}        ${pad('Company Federal ID#', m.federalId || '')}
${pad('Street Address', m.street)}    ${pad('Telephone', m.phone)}
${pad('City/State/ZIP', m.cityStateZip)}    ${pad('Email', m.email)}

INVOICING DETAILS
${pad('Company Name', inv.companyName)}    ${pad('Contact Name', inv.contactName)}
${pad('Street Address', inv.street)}    ${pad('Telephone', inv.phone)}
${pad('City/State/ZIP', inv.cityStateZip)}    ${pad('Email', inv.email)}

DESCRIPTION OF SIGNATURE PAGE
This page shall act as a binding agreement between Merritt WorKSpace and the
Member, as named above. By signing this CoWork Space Agreement (CSA), the
member fully acknowledges and hereby agrees to be bound by the financial
terms and conditions as stated in this Agreement and the accompanying
CoWork Space Terms and Conditions. *Please note* When the stated term
(timeframe) of the Agreement has ended, the financial terms shall renwew
automatically, less any discounts (if applicable).

MEMBERSHIP DESCRIPTION                                               TOTAL
-----------------------------------------------------------------------------
${ctx.designationLabel}
First Months Membership Fee:        ${ctx.termStart} – ${ctx.termEnd}    ${usd(totals.firstMonthCents)}
Last Months Membership Fee:                                            ${usd(totals.lastMonthCents)}
${
  ctx.paymentMethod === 'card'
    ? `3.5% Credit Card Fee:                                                  ${usd(totals.ccFeeCents)}\n(Disregard if paying by ACH or EFT)`
    : 'Paying by ACH or EFT — no credit card fee applied.'
}
-----------------------------------------------------------------------------
GRAND TOTAL                                                            ${usd(totals.grandTotalCents)}

MEMBER                                MERRITT WORKSPACE
Name Printed:  ${m.name}              Name Printed:  ${MERRITT_SIGNATORY.name}
Title Printed: ${ctx.memberTitle || ''}              Title Printed: ${MERRITT_SIGNATORY.title}
Signature:     [electronically signed]   Signature:     [on file]
Date:          ${ctx.signedDate}              Date:          ${ctx.signedDate}
`.trim();
}
