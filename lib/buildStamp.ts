// The build stamp identifies which deployment a piece of running code came
// from. next.config.js computes one value per build (the commit SHA on
// Vercel) and bakes it into both the client bundle and the server code, so
// comparing the two answers one question exactly: is this browser tab
// running the same deployment the server is?
//
// Why that question matters: the admin panel is a client-side app. A tab
// keeps executing the bundle it loaded until the page is reloaded — across
// any number of deploys — and its focus-refetch keeps the data current,
// which makes a weeks-old bundle look perfectly alive while every behavior
// fix shipped since then is missing from it. "The fix deployed and the panel
// still does the old thing" is this, more often than it is anything else.

export const UNKNOWN_BUILD = 'unknown';

export function currentBuildStamp(): string {
  return process.env.NEXT_PUBLIC_BUILD_STAMP || UNKNOWN_BUILD;
}

// True only when BOTH stamps are real and disagree.
//
// An 'unknown' on either side must never count as stale: it means a build
// where the stamp did not bake (or a fetch that answered strangely), and
// treating that as a mismatch would put a permanent "reload" banner — or
// worse, a reload — on a tab that may be perfectly current.
export function isStaleBuild(
  clientStamp: string | null | undefined,
  serverStamp: string | null | undefined
): boolean {
  if (!clientStamp || !serverStamp) return false;
  if (clientStamp === UNKNOWN_BUILD || serverStamp === UNKNOWN_BUILD) return false;
  return clientStamp !== serverStamp;
}
