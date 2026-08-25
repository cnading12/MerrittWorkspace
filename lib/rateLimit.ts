// Small in-memory rate limiter for unauthenticated endpoints.
//
// Generalised from the one that already guarded /api/contact, so the other
// public endpoints that spend real money or send real email on an anonymous
// caller's say-so get the same protection:
//
//   • /api/portal/resend-signin-link mails a working sign-in link to any
//     address that belongs to a member. Unthrottled, that is a mail-bomb
//     aimed at a member's inbox and a way to burn Resend quota.
//   • /api/membership-application emails staff on every submission.
//
// Scope and limits
// ----------------
// This is per-instance memory, so on Vercel the counters are per lambda
// instance and reset on cold start. That makes it a deterrent against casual
// abuse and accidental double-submits, NOT a hard guarantee — a distributed
// attacker with many source IPs still gets through. If abuse becomes real,
// move this to a shared store (Upstash Redis / Supabase table) keyed the same
// way; the call sites won't need to change.
//
// The map is pruned on every check so it can't grow without bound.

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();

// Stop the map from growing unboundedly if a lot of distinct keys show up.
const MAX_TRACKED_KEYS = 10_000;

export interface RateLimitRule {
  /** Sliding window length in milliseconds. */
  windowMs: number;
  /** Maximum requests permitted per key within the window. */
  max: number;
}

export interface RateLimitResult {
  limited: boolean;
  /** Seconds until the caller may retry; 0 when not limited. */
  retryAfterSeconds: number;
}

/**
 * Record a hit for `key` and report whether it exceeds `rule`.
 *
 * Callers should treat a `limited` result as terminal for that request.
 */
export function checkRateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_TRACKED_KEYS) {
    // Cheap eviction: drop everything already outside the window.
    for (const k of Array.from(buckets.keys())) {
      const b = buckets.get(k);
      if (!b || !b.hits.some((t: number) => now - t < rule.windowMs)) buckets.delete(k);
    }
    // Still oversized (many active keys) → clear rather than leak memory.
    if (buckets.size > MAX_TRACKED_KEYS) buckets.clear();
  }

  const bucket = buckets.get(key) || { hits: [] };
  const recent = bucket.hits.filter((t: number) => now - t < rule.windowMs);

  if (recent.length >= rule.max) {
    buckets.set(key, { hits: recent });
    const oldest = Math.min(...recent);
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rule.windowMs - (now - oldest)) / 1000)
    );
    return { limited: true, retryAfterSeconds };
  }

  recent.push(now);
  buckets.set(key, { hits: recent });
  return { limited: false, retryAfterSeconds: 0 };
}

/**
 * Best-effort client IP.
 *
 * On Vercel the left-most `x-forwarded-for` entry is the real client and the
 * header is set by the platform edge, so it cannot be spoofed end-to-end the
 * way it could behind a naive proxy. `x-real-ip` is a fallback for other
 * hosts; 'unknown' groups anything we can't identify into one shared bucket,
 * which fails closed rather than handing an unidentifiable caller a free pass.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Test seam: drop all recorded state. */
export function __resetRateLimits(): void {
  buckets.clear();
}
