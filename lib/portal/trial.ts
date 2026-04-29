// Helpers for surfacing the "came in via trial day" marker on members and
// applications. Trial info is stored on member_applications (in dedicated
// columns once the migration is applied, or mirrored into `payload` as a
// fallback). The badge is shown on members until they become a fully
// onboarded paying member, after which the distinction is dropped.

interface TrialSource {
  wants_trial_day?: boolean | null;
  trial_date?: string | null;
  payload?: Record<string, unknown> | null;
}

export function readTrialFlag(source: TrialSource | null | undefined): boolean {
  if (!source) return false;
  if (typeof source.wants_trial_day === 'boolean') return source.wants_trial_day;
  const fromPayload = (source.payload as { wants_trial_day?: unknown } | null)?.wants_trial_day;
  return !!fromPayload;
}

export function readTrialDate(source: TrialSource | null | undefined): string | null {
  if (!source) return null;
  if (source.trial_date) return source.trial_date;
  const fromPayload = (source.payload as { trial_date?: unknown } | null)?.trial_date;
  return typeof fromPayload === 'string' ? fromPayload : null;
}

// Show the trial-applicant badge on a member only until they're fully
// onboarded. Once `onboarding_unlocked` is true (subscription active /
// payment complete), the trial origin is no longer flagged.
export function shouldShowTrialBadge(m: {
  was_trial_applicant?: boolean;
  onboarding_unlocked?: boolean;
}): boolean {
  return !!m.was_trial_applicant && !m.onboarding_unlocked;
}
