// The "you came in, would you like to join?" email sent after a trial day.
//
// This is the other half of splitting the trial application off from the
// full one. The trial form deliberately collects almost nothing, so at some
// point a converting applicant has to answer the longer questions — and the
// whole point of the split is that they should never re-answer the short
// ones. This email carries the resume link that makes that true.
//
// Sent by app/api/cron/trial-followup (automatically, the day after the
// visit) and from the admin applications page (manually, on demand).

import type { TrialSeating } from './trialApplication';

// Public site origin for the link. Falls back to the production domain
// rather than a relative path, because a relative link in an email is dead.
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://merrittworkspace.net').replace(/\/$/, '');
}

export function trialResumeUrl(resumeToken: string): string {
  return `${siteOrigin()}/membership/apply?resume=${encodeURIComponent(resumeToken)}`;
}

function formatTrialDate(trialDate: string | null): string {
  if (!trialDate) return 'your recent visit';
  // Parsed as UTC noon so a date-only string cannot shift a day either way
  // when rendered in a different timezone.
  const parsed = new Date(`${trialDate}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return 'your recent visit';
  return parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function trialConversionEmail(opts: {
  firstName: string;
  trialDate: string | null;
  resumeToken: string;
  seating: TrialSeating;
}): { subject: string; html: string; text: string } {
  const url = trialResumeUrl(opts.resumeToken);
  const dateLabel = formatTrialDate(opts.trialDate);
  const spaceLabel =
    opts.seating === 'office'
      ? 'private office'
      : opts.seating === 'cafe'
        ? 'café'
        : 'dedicated desk';
  const greeting = opts.firstName ? `Hi ${opts.firstName},` : 'Hi,';

  const subject = 'Your trial day at Merritt Workspace — ready to join?';

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f6f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1a17;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f4f0;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e3ded6;">
            <tr>
              <td style="padding:32px 32px 8px 32px;">
                <h1 style="margin:0 0 16px 0;font-size:24px;font-weight:600;">How was it?</h1>
                <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;">${greeting}</p>
                <p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;">
                  Thanks for spending ${dateLabel} with us. We hope the ${spaceLabel} did what you
                  needed it to.
                </p>
                <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;">
                  If you&rsquo;d like to join, your membership application is already part-filled
                  &mdash; your name, contact details and photo ID carried over from your trial day,
                  so there&rsquo;s nothing to type twice.
                </p>
                <p style="margin:0 0 24px 0;">
                  <a href="${url}" style="display:inline-block;background:#c2410c;color:#ffffff;text-decoration:none;padding:14px 28px;font-weight:600;font-size:16px;">Finish my application</a>
                </p>
                <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#57534e;">
                  If the button doesn&rsquo;t work, copy and paste this link into your browser:<br/>
                  <span style="word-break:break-all;">${url}</span>
                </p>
                <p style="margin:0 0 8px 0;font-size:16px;line-height:1.6;">
                  Not for you right now? No problem at all &mdash; there&rsquo;s nothing to cancel
                  and you can ignore this email. If you have questions first, just reply.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 32px 32px;border-top:1px solid #e3ded6;font-size:14px;line-height:1.6;color:#57534e;">
                Merritt Workspace<br/>
                (303) 359-8337 &middot; memberservices@merrittworkspace.net
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `How was it?

${greeting}

Thanks for spending ${dateLabel} with us. We hope the ${spaceLabel} did what you
needed it to.

If you'd like to join, your membership application is already part-filled —
your name, contact details and photo ID carried over from your trial day, so
there's nothing to type twice.

Finish my application:
${url}

Not for you right now? No problem at all — there's nothing to cancel and you
can ignore this email. If you have questions first, just reply.

Merritt Workspace
(303) 359-8337 · memberservices@merrittworkspace.net
`;

  return { subject, html, text };
}
