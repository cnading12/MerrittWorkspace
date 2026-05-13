// Priority sort + display helpers for the admin members list.
//
// The team prioritizes members by who needs attention most: applicants who
// have been approved but haven't finished setting up their portal — sorted
// by intended start date soonest first, with longest-waiting applicants
// breaking ties. Fully onboarded / cancelled members fall to the bottom.

interface PrioritizableMember {
  status: string;
  onboarding_unlocked?: boolean | null;
  applied_at?: string | null;
  intended_start_date?: string | null;
  created_at?: string | null;
}

function statusBucket(m: PrioritizableMember): number {
  // Lower = higher priority.
  if (m.status === 'cancelled' || m.status === 'declined') return 4;
  if (m.onboarding_unlocked) return 3;
  if (m.status === 'active') return 2;
  if (m.status === 'pending' || m.status === 'approved') return 0;
  return 1;
}

function timeOrZero(value: string | null | undefined): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return isNaN(t) ? 0 : t;
}

export function compareMembersByPriority(
  a: PrioritizableMember,
  b: PrioritizableMember
): number {
  const aBucket = statusBucket(a);
  const bBucket = statusBucket(b);
  if (aBucket !== bBucket) return aBucket - bBucket;

  // Within the same bucket, intended start date soonest first. Members
  // without a start date sort after those that have one.
  const aStart = a.intended_start_date ? timeOrZero(a.intended_start_date) : Infinity;
  const bStart = b.intended_start_date ? timeOrZero(b.intended_start_date) : Infinity;
  if (aStart !== bStart) return aStart - bStart;

  // Tie-break: longest-waiting applicant first.
  const aApplied = timeOrZero(a.applied_at || a.created_at);
  const bApplied = timeOrZero(b.applied_at || b.created_at);
  return aApplied - bApplied;
}

// Returns a short "applied X ago" label, or null if the timestamp is missing.
export function formatAppliedAgo(value: string | null | undefined): string | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (isNaN(t)) return null;
  const diffMs = Date.now() - t;
  if (diffMs < 0) return 'just now';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

// Returns a short "X ago" label for the last-ping timestamp. Returns null if
// the member has never been pinged so callers can render their own "never"
// label.
export function formatLastPingAgo(value: string | null | undefined): string | null {
  return formatAppliedAgo(value);
}

// Returns a short "in X days" / "X days ago" label for a future or past date.
// Compares calendar days in local time so a SQL date like "2026-05-01" isn't
// pulled back to the previous day by UTC parsing.
export function formatStartDateRelative(value: string | null | undefined): string | null {
  if (!value) return null;
  const startMidnight = parseDateLocalMidnight(value);
  if (startMidnight === null) return null;
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const days = Math.round((startMidnight - todayMidnight) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days > 0) return `in ${days} days`;
  return `${-days} days ago`;
}

function parseDateLocalMidnight(value: string): number | null {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
  }
  const parsed = new Date(value);
  const t = parsed.getTime();
  if (isNaN(t)) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
}
