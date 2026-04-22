import type { MouseEvent } from 'react';

export const GA_ADS_ID = 'AW-18009340460';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function sendConversion(label: string, eventCallback?: () => void): boolean {
  if (typeof window === 'undefined' || !window.gtag) return false;
  window.gtag('event', 'conversion', {
    send_to: `${GA_ADS_ID}/${label}`,
    ...(eventCallback ? { event_callback: eventCallback } : {}),
  });
  return true;
}

// For tel:/mailto: anchors: prevent default, fire the conversion, navigate
// manually once the beacon is sent (or after a 1s fallback). This keeps the
// page alive long enough for the /collect request to complete on mobile,
// where following a tel:/mailto: link can hand off to another app and cancel
// in-flight requests.
function trackAnchorNavigation(label: string, e: MouseEvent<HTMLAnchorElement>) {
  // Let the browser handle modifier-clicks / non-primary buttons normally;
  // still record the conversion best-effort.
  if (
    e.defaultPrevented ||
    e.metaKey ||
    e.ctrlKey ||
    e.shiftKey ||
    e.altKey ||
    e.button !== 0
  ) {
    sendConversion(label);
    return;
  }

  const href = e.currentTarget.href;
  if (!href) return;

  e.preventDefault();

  let navigated = false;
  const navigate = () => {
    if (navigated) return;
    navigated = true;
    window.location.href = href;
  };

  const fired = sendConversion(label, navigate);
  if (!fired) {
    navigate();
    return;
  }

  window.setTimeout(navigate, 1000);
}

export function trackFormSubmission() {
  sendConversion('9sCbCKaBr5McEKz0wotD');
}

export function trackPhoneClick(e: MouseEvent<HTMLAnchorElement>) {
  trackAnchorNavigation('8b7ECJyYr5McEKz0wotD', e);
}

export function trackEmailClick(e: MouseEvent<HTMLAnchorElement>) {
  trackAnchorNavigation('ntTgCK2dr5McEKz0wotD', e);
}
