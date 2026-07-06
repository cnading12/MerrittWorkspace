// Pure categorization logic for the monthly dues summary email sent to
// staff on the 7th of each month (after ACH charges have had time to
// clear). Kept free of Supabase/Stripe/Resend so it can be unit tested.
//
// Dues charges are the `payment_history` rows synced from Stripe
// `invoice.*` webhooks — they always carry a `stripe_invoice_id`. Rows
// without one (initial Checkout charges, one-day desks) are signup
// payments, not monthly dues, and are filtered out by the caller's query.

export type DuesPaymentRow = {
  member_id: string | null;
  amount_cents: number;
  status: string; // 'succeeded' | 'failed' | 'pending' | 'refunded'
  description: string | null;
  paid_at: string | null;
  created_at: string;
};

export type DuesMemberRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  monthly_cost_cents: number | null;
};

export type DuesChargeEntry = {
  memberName: string;
  email: string;
  amountCents: number;
  description: string;
  // ISO timestamp of when the payment settled (paid_at) or, for
  // failed/pending rows, when the attempt was recorded.
  occurredAt: string;
};

export type MissingChargeEntry = {
  memberName: string;
  email: string;
  expectedAmountCents: number | null;
};

export type DuesSummary = {
  paid: DuesChargeEntry[];
  failed: DuesChargeEntry[];
  pending: DuesChargeEntry[];
  refunded: DuesChargeEntry[];
  // Members with an active subscription on file but no dues charge at all
  // this month — the charge never even reached Stripe (or the webhook was
  // lost). Just as much of a revenue problem as an outright failure.
  noCharge: MissingChargeEntry[];
  totalCollectedCents: number;
};

export function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function memberName(m: DuesMemberRow | undefined): string {
  if (!m) return 'Unknown member';
  const name = [m.first_name, m.last_name].filter(Boolean).join(' ').trim();
  return name || m.email || 'Unknown member';
}

export function buildDuesSummary(opts: {
  rows: DuesPaymentRow[];
  // Lookup for every member_id appearing in `rows` (may include members
  // who cancelled after being charged).
  membersById: Map<string, DuesMemberRow>;
  // Active members with a Stripe subscription who existed before the 1st
  // of the report month — i.e. everyone we expected to charge.
  expectedMembers: DuesMemberRow[];
}): DuesSummary {
  const { rows, membersById, expectedMembers } = opts;

  const paid: DuesChargeEntry[] = [];
  const failed: DuesChargeEntry[] = [];
  const pending: DuesChargeEntry[] = [];
  const refunded: DuesChargeEntry[] = [];

  for (const row of rows) {
    const member = row.member_id ? membersById.get(row.member_id) : undefined;
    const entry: DuesChargeEntry = {
      memberName: memberName(member),
      email: member?.email || '',
      amountCents: row.amount_cents || 0,
      description: row.description || 'Monthly membership',
      occurredAt: row.paid_at || row.created_at,
    };
    switch (row.status) {
      case 'succeeded':
        paid.push(entry);
        break;
      case 'failed':
        failed.push(entry);
        break;
      case 'refunded':
        refunded.push(entry);
        break;
      default:
        // 'pending' plus any status we don't recognize — surface it for a
        // human to look at rather than silently dropping it.
        pending.push(entry);
        break;
    }
  }

  const chargedMemberIds = new Set(
    rows.map((r) => r.member_id).filter((id): id is string => !!id)
  );
  const noCharge: MissingChargeEntry[] = expectedMembers
    .filter((m) => !chargedMemberIds.has(m.id))
    .map((m) => ({
      memberName: memberName(m),
      email: m.email || '',
      expectedAmountCents: m.monthly_cost_cents ?? null,
    }));

  const byName = (a: { memberName: string }, b: { memberName: string }) =>
    a.memberName.localeCompare(b.memberName);
  paid.sort(byName);
  failed.sort(byName);
  pending.sort(byName);
  refunded.sort(byName);
  noCharge.sort(byName);

  const totalCollectedCents = paid.reduce((sum, e) => sum + e.amountCents, 0);

  return { paid, failed, pending, refunded, noCharge, totalCollectedCents };
}
