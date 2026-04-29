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
  | 'flex'
  | 'other';

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
  access_code: string | null;
  access_code_issued_at: string | null;
  created_at: string;
  updated_at: string;
  // Read-time annotations populated by admin APIs from the linked
  // member_applications row. Not stored on the members table itself.
  was_trial_applicant?: boolean;
  trial_date?: string | null;
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

export interface PaymentHistoryRow {
  id: string;
  member_id: string | null;
  stripe_invoice_id: string | null;
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
  flex: 'Flex',
  other: 'Other',
};
