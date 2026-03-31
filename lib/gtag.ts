export const GA_ADS_ID = 'AW-18009340460';

// Extend Window to include gtag
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function sendConversion(label: string) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'conversion', {
      send_to: `${GA_ADS_ID}/${label}`,
    });
  }
}

/** Fire when the contact/inquiry form is successfully submitted */
export function trackFormSubmission() {
  sendConversion('form_submission');
}

/** Fire when a user clicks the phone number link */
export function trackPhoneClick() {
  sendConversion('phone_click');
}

/** Fire when a user clicks the email link */
export function trackEmailClick() {
  sendConversion('email_click');
}
