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

export const DENVER_TZ = 'America/Denver';

export type ReportMonth = {
  year: number;
  month: number; // 1-12
  label: string; // e.g. "August 2026"
  // Half-open [startIso, endIso) window over payment_history.created_at.
  startIso: string;
  endIso: string;
};

/**
 * Which month the report covers.
 *
 * By default that is the current calendar month in Denver — the job runs on
 * the 7th, so the 1st-of-month dues charges it reports are already in. Pass
 * `month` as YYYY-MM to re-run a past month (a missed or lost send).
 *
 * Both bounds are UTC midnight on the 1st, which is the evening of the last
 * day of the prior month in Denver. That is a safe boundary because dues
 * invoices only fire on the 1st, and — because both ends use the same
 * convention — consecutive months tile exactly, with no gap and no overlap.
 */
export function resolveReportMonth(opts: {
  now?: Date;
  month?: string | null;
} = {}): ReportMonth {
  let year: number;
  let month: number;

  const requested = opts.month?.trim();
  if (requested) {
    const m = /^(\d{4})-(\d{2})$/.exec(requested);
    if (!m) {
      throw new Error(
        `Invalid month "${requested}" — expected YYYY-MM (e.g. 2026-08)`
      );
    }
    year = Number(m[1]);
    month = Number(m[2]);
    if (month < 1 || month > 12) {
      throw new Error(`Invalid month "${requested}" — month must be 01-12`);
    }
  } else {
    const denverToday = new Intl.DateTimeFormat('en-CA', {
      timeZone: DENVER_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(opts.now ?? new Date()); // YYYY-MM-DD
    [year, month] = denverToday.split('-').map(Number);
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  // Midday avoids the label itself landing in the prior month once shifted
  // into Denver.
  const label = new Date(Date.UTC(year, month - 1, 1, 12)).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric', timeZone: DENVER_TZ }
  );

  return {
    year,
    month,
    label,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
}

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
