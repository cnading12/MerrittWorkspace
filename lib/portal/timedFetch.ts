// fetch() with a deadline, for the portal's money-adjacent submits.
//
// A serverless backend that stalls — or a proxy that never closes the
// socket — leaves a plain fetch()'s await pending forever, and the member
// staring at a spinner with no idea whether their signature or payment
// went through. That exact hang is how one member ended up paying the
// initial signup charge twice: nothing on screen ever said "this failed,
// here's how to find out what actually saved."
//
// The timeout error message is the important part: it must tell the person
// what to DO (reload and look at current status), never invite a blind
// retry of something that may have half-succeeded.

export const DEFAULT_FETCH_TIMEOUT_MS = 30_000;

export class FetchTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FetchTimeoutError';
  }
}

export async function timedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  opts: { timeoutMs?: number; timeoutMessage?: string } = {}
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) {
      throw new FetchTimeoutError(
        opts.timeoutMessage ??
          `The server didn't respond within ${Math.round(
            timeoutMs / 1000
          )} seconds. Please reload the page to see the current status before trying again.`
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
