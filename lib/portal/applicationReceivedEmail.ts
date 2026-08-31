// The confirmation an applicant gets the moment a full membership
// application lands (app/api/membership-application/route.ts).
//
// Three different people receive this email and they are not standing in the
// same place, so the middle of it changes:
//
//   • completed — they spent a trial day in the building and came back
//     through the "finish your application" link (they arrive carrying a
//     `resume_token`). Everything a first-time enquiry needs to be told about
//     the space, they already found out by sitting in it.
//   • upcoming — they asked for a trial day on this application. The
//     practical details for that visit — where to go, where to sit — are
//     their own email, sent seconds after this one
//     (lib/portal/trialDayEmail.ts), so this one only points at it rather
//     than repeating or contradicting it.
//   • none — they have never been here. This is the only version that offers
//     a tour or a trial day, because it is the only one where the offer is
//     not nonsense.
//
// That branch is the whole reason this file exists. The email it replaced
// promised every applicant a tour, an introduction to the team and a "free
// trial day" — sent, most often, to someone who had just had all three and
// was writing to say they wanted to join.
//
// Three things it deliberately no longer carries:
//
//   • A numbered "what's next" list. It described a process we don't run:
//     the real next step is a decision, and if that decision is yes the
//     approval email (lib/portal/emails.ts) carries the portal link and the
//     actual checklist. One sentence covers it here.
//   • An amenities list. Marketing copy aimed at someone still deciding,
//     sent to someone who has already decided and applied.
//   • An "Application ID". `APP-<timestamp>` is minted per request and never
//     written to the row, so a number quoted back to the desk matched
//     nothing anyone could look up.

import { BUSINESS } from '@/lib/seo/business';

// Emails need absolute asset URLs; a relative path is dead in a mail client.
// PNG rather than the navbar's WebP because Outlook desktop won't render
// WebP. Same band as lib/portal/emails.ts and lib/resend.ts.
const LOGO_URL = `${BUSINESS.url}/images/brand/logo.png`;

const LOGO_BAND = `
          <div style="background:#ffffff;text-align:center;padding:24px 20px 12px;border-radius:8px 8px 0 0;">
            <img src="${LOGO_URL}" alt="${BUSINESS.name}" width="200" style="display:inline-block;width:200px;max-width:75%;height:auto;border:0;" />
          </div>`;

const MANAGER_EMAIL = 'manager@merrittworkspace.net';
const MANAGER_PHONE = '(720) 357-9499';

// How long staff have to answer. Stated in exactly one place because it is
// also said on the submit screen (app/membership/apply/FullApplicationForm.tsx).
export const APPLICATION_REVIEW_WINDOW = '1–2 business days';

export type ApplicationTrialState =
  // Trial day already happened — they are converting off the follow-up link.
  | { kind: 'completed'; trialDate?: string | null }
  // Trial day requested on this application; its own email follows.
  | { kind: 'upcoming'; trialDate?: string | null }
  // Never visited.
  | { kind: 'none' };

export interface ApplicationReceivedEmailData {
  firstName: string;
  lastName: string;
  email: string;
  membershipType: string;
  submittedAt: Date;
  trial: ApplicationTrialState;
}

// Date-only strings are parsed at UTC noon so rendering in another timezone
// cannot shift the day either way — same reason as trialConversionEmail.ts.
function formatTrialDate(trialDate: string | null | undefined): string | null {
  if (!trialDate) return null;
  const parsed = new Date(`${trialDate}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatSubmitted(submittedAt: Date): string {
  return submittedAt.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Denver',
    timeZoneName: 'short',
  });
}

// The one paragraph that differs between the three recipients, as plain
// sentences. The HTML and text bodies both render from these, so the two can
// never drift into saying different things.
function openingLines(trial: ApplicationTrialState): string[] {
  if (trial.kind === 'completed') {
    const when = formatTrialDate(trial.trialDate);
    return [
      `Thanks for spending ${when ? when : 'your trial day'} with us — we're glad you want to make it permanent.`,
      "Your membership application is in, and everything you gave us on your trial day came across with it, so there's nothing to send twice.",
    ];
  }
  if (trial.kind === 'upcoming') {
    const when = formatTrialDate(trial.trialDate);
    return [
      'Your membership application is in.',
      `Your trial day${when ? ` on ${when}` : ''} is booked as well — where to go and where to sit are in a separate email, arriving right behind this one.`,
    ];
  }
  return [
    `Thanks for applying to join ${BUSINESS.name}. Your application is in.`,
    "If you'd like to see the place before anything is decided, just reply — we'll set up a tour, or a free trial day at the desk or office you applied for.",
  ];
}

function nextLine(): string {
  return `We'll review it within ${APPLICATION_REVIEW_WINDOW} and email you either way — if you're approved, that email carries a one-time link to set up your member portal.`;
}

export function applicationReceivedSubject(): string {
  return `Membership Application Received | ${BUSINESS.name}`;
}

export function generateApplicationReceivedEmailHTML(data: ApplicationReceivedEmailData): string {
  const opening = openingLines(data.trial)
    .map((line) => `            <p>${line}</p>`)
    .join('\n');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Membership Application Confirmation</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 30px; text-align: center; border-radius: 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 6px 0 0; opacity: 0.95; }
          .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
          .content p { margin: 0 0 12px; }
          .application-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .application-info p { margin: 0 0 6px; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-radius: 0 0 8px 8px; font-size: 13px; }
          .footer p { margin: 4px 0; }
          .button { display: inline-block; background: #ed7611; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
${LOGO_BAND}
          <div class="header">
            <h1>Welcome to ${BUSINESS.name}!</h1>
            <p>Your membership application has been received</p>
          </div>

          <div class="content">
            <p>Hi ${data.firstName},</p>

${opening}

            <div class="application-info">
              <h3 style="margin-top: 0;">What you applied for</h3>
              <p><strong>Applicant:</strong> ${data.firstName} ${data.lastName}</p>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Membership:</strong> ${data.membershipType}</p>
              <p><strong>Submitted:</strong> ${formatSubmitted(data.submittedAt)}</p>
            </div>

            <p>${nextLine()}</p>

            <p>Anything you need in the meantime, just reply to this email or call us on ${BUSINESS.telephoneDisplay}.</p>

            <a href="mailto:${BUSINESS.email}" class="button">Questions? Contact Us</a>
          </div>

          <div class="footer">
            <p><strong>${BUSINESS.name}</strong></p>
            <p>${BUSINESS.slogan}</p>
            <p>${BUSINESS.address.full}</p>
            <p>Email: ${BUSINESS.email} | Phone: ${BUSINESS.telephoneDisplay}</p>
            <p>Manager: ${MANAGER_EMAIL} | ${MANAGER_PHONE}</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function generateApplicationReceivedEmailText(data: ApplicationReceivedEmailData): string {
  const opening = openingLines(data.trial).join('\n\n');

  return `
Membership Application Received - ${BUSINESS.name}

Hi ${data.firstName},

${opening}

What you applied for:
- Applicant: ${data.firstName} ${data.lastName}
- Email: ${data.email}
- Membership: ${data.membershipType}
- Submitted: ${formatSubmitted(data.submittedAt)}

${nextLine()}

Anything you need in the meantime, just reply to this email or call us on
${BUSINESS.telephoneDisplay}.

${BUSINESS.name}
${BUSINESS.address.full}
${BUSINESS.email} | ${BUSINESS.telephoneDisplay}
Manager: ${MANAGER_EMAIL} | ${MANAGER_PHONE}
  `;
}
