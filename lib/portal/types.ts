// Shared types for the member onboarding portal + admin panel.

export type MemberStatus =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'active'
  | 'paused'
  | 'cancelled';

export type MemberDesignation =
  | 'dedicated_desk'
  | 'one_day_dedicated_desk'
  | 'private_office_single'
  | 'private_office_double'
  | 'private_office_large'
  // A non-paying occupant of a private office that someone else (the
  // office's primary member) pays for. Linked to the office through the
  // same office_number column. Joins via the existing-member flow and
  // stays status='pending' until an admin approves them.
  | 'office_member'
  | 'flex'
  | 'other';

// Designations whose conference-room hours come from a per-office shared
// pool rather than a personal allotment. See lib/bookings/conference-hours.ts.
export const OFFICE_DESIGNATIONS: MemberDesignation[] = [
  'private_office_single',
  'private_office_double',
  'private_office_large',
  'office_member',
];

// The designations that PAY for (and therefore anchor) a private office.
export const PRIMARY_OFFICE_DESIGNATIONS: MemberDesignation[] = [
  'private_office_single',
  'private_office_double',
  'private_office_large',
];

export interface Member {
  id: string;
  user_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  company_name: string | null;
  status: MemberStatus;
  application_id: string | null;
  designation: MemberDesignation | null;
  monthly_cost_cents: number | null;
  required_docs_complete: boolean;
  agreement_signed: boolean;
  onboarding_unlocked: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  next_charge_date: string | null;
  cancellation_notice_received_at: string | null;
  cancellation_effective_date: string | null;
  last_month_credit_invoice_item_id: string | null;
  // Per-recipient idempotency for the cancellation confirmation emails so the
  // member and staff are each notified at most once, even if the Cancel button
  // is pressed multiple times. See lib/portal/cancellationEmails.ts.
  cancellation_email_member_sent_at: string | null;
  cancellation_email_staff_sent_at: string | null;
  access_code: string | null;
  access_code_issued_at: string | null;
  office_number: string | null;
  desk_number: string | null;
  last_pinged_at: string | null;
  // Soft-archive: set when a former (cancelled, once-paying) member is removed
  // from the active roster. Archived members keep all their data (documents,
  // agreements, payments) but are hidden from member lists/counts by default
  // and can be restored by clearing this. See the member archive route.
  archived_at: string | null;
  archived_by: string | null;
  // True for members who came in through the "Already a member?" migration
  // flow on the portal sign-in page. Legacy members can skip required
  // documents and Stripe auto-pay setup; their billing may continue to be
  // handled manually by the accountant.
  is_legacy_member: boolean;
  created_at: string;
  updated_at: string;
  // Read-time annotations populated by admin APIs from the linked
  // member_applications row. Not stored on the members table itself.
  was_trial_applicant?: boolean;
  trial_date?: string | null;
  applied_at?: string | null;
  intended_start_date?: string | null;
  // Read-time annotation from the admin members list API: true if the member
  // has any successful/refunded charge. Drives Archive (paid) vs Delete
  // (never-paid) in the admin UI.
  has_paid?: boolean;
}

export interface MemberApplication {
  id: string;
  member_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  company_name: string | null;
  membership_type: string | null;
  start_date: string | null;
  // Set by the trial-day migration; may be undefined on rows from databases
  // where the migration hasn't been applied. Trial info is also mirrored
  // into `payload` as a fallback.
  wants_trial_day?: boolean | null;
  trial_date?: string | null;
  // True for applications submitted through the "Already a member?"
  // migration flow. These are auto-approved at submit time and never
  // appear in the admin pending-applications queue.
  is_existing_member?: boolean | null;
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'declined';
  decision_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

export type DocType =
  | 'photo_id'
  | 'proof_of_address'
  | 'business_registration'
  | 'member_agreement'
  | 'terms_and_conditions'
  | 'other';

export interface MemberDocument {
  id: string;
  member_id: string;
  doc_type: DocType;
  file_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  status: 'submitted' | 'approved' | 'rejected';
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface AccessCodeRequest {
  id: string;
  member_id: string;
  status: 'pending' | 'fulfilled' | 'denied';
  requested_at: string;
  fulfilled_at: string | null;
  access_code: string | null;
  notes: string | null;
}

// One manually-entered seat occupant for the admin seating chart. The other
// occupancy source is the members table itself (desk_number/office_number).
export interface SeatingManualAssignment {
  id: string;
  space_type: 'desk' | 'office';
  space_number: string;
  occupant_name: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentHistoryRow {
  id: string;
  member_id: string | null;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  currency: string;
  status: string;
  description: string | null;
  invoice_pdf_url: string | null;
  paid_at: string | null;
  created_at: string;
}

// Required documents that must be submitted before payment + onboarding unlock.
export const REQUIRED_DOC_TYPES: DocType[] = [
  'photo_id',
  'proof_of_address',
];

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  photo_id: 'Photo ID',
  proof_of_address: 'Proof of Address',
  business_registration: 'Business Registration (optional)',
  member_agreement: 'Signed Member Agreement',
  terms_and_conditions: 'Signed Terms & Conditions',
  other: 'Other',
};

export const DESIGNATION_LABELS: Record<MemberDesignation, string> = {
  dedicated_desk: 'Dedicated Desk',
  one_day_dedicated_desk: 'One Day Dedicated Desk',
  private_office_single: 'Private Office — Single',
  private_office_double: 'Private Office — Double',
  private_office_large: 'Private Office — Large',
  office_member: 'Office Member',
  flex: 'Flex',
  other: 'Other',
};
