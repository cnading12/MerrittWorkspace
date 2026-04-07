// Static legal copy used in the member portal. The terms & conditions are
// the same for every member; the fee agreement is rendered with per-member
// values (name, designation, monthly cost, start date) at sign time.
//
// NOTE: The text below is the canonical Merritt Workspace policy text and
// should be reviewed by counsel before going live. Update DOCUMENT_VERSION
// whenever the wording changes so the signature audit trail is meaningful.

export const DOCUMENT_VERSION = 'v1-2026-04';

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

export interface FeeAgreementContext {
  memberName: string;
  companyName: string | null;
  designationLabel: string;
  monthlyCostUsd: string; // formatted, e.g. "$500.00"
  startDate: string; // ISO yyyy-mm-dd or human label
  signedDate: string; // human label
}

export function renderFeeAgreementText(ctx: FeeAgreementContext): string {
  return `
MERRITT WORKSPACE — MEMBER FEE AGREEMENT

This Fee Agreement (the "Agreement") is entered into between Merritt
Workspace ("Merritt") and ${ctx.memberName}${ctx.companyName ? ` of ${ctx.companyName}` : ''}
("Member") as of ${ctx.signedDate}.

1. Membership Plan
   Member has selected the following plan:
     • Designation:    ${ctx.designationLabel}
     • Monthly fee:    ${ctx.monthlyCostUsd}
     • Start date:     ${ctx.startDate}

2. Billing
   The monthly fee is billed on the 1st of each calendar month via the
   payment method Member sets up in the portal. The first charge is
   prorated from the start date to the end of the current month.

3. Term
   This Agreement begins on the start date above and continues
   month-to-month until cancelled by either party with 30 days notice
   submitted through the member portal.

4. Late Payment
   Payments not received within 5 days of the due date may incur a $25
   late fee and may result in suspension of building access.

5. Refunds
   Monthly fees are non-refundable once charged. Pro-rated refunds are
   not provided for unused days within a billing period.

6. Incorporation
   This Agreement incorporates by reference the Merritt Workspace Terms
   & Conditions which Member has separately acknowledged.

By signing electronically below, Member agrees to pay the monthly fee
above and to be bound by the terms of this Agreement.

Member: ${ctx.memberName}
`.trim();
}
