// Branded HTML email templates for portal/admin notifications.
// Mirrors the style used in `lib/resend.ts` (orange gradient header,
// bordered content card, gray footer) so portal mail looks consistent
// with snackshop / booking confirmations.

const FOOTER = `
  <div class="footer">
    <p><strong>Merritt Workspace</strong></p>
    <p>2246 Irving Street, Denver, CO 80211</p>
    <p>memberservices@merrittworkspace.net</p>
  </div>
`;

const STYLES = `
  body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
  .header h1 { margin: 0; font-size: 24px; }
  .header p { margin: 6px 0 0; opacity: 0.95; }
  .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
  .content p { margin: 0 0 12px; }
  .info-card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
  .highlight { background: #fff8e1; padding: 20px; border-radius: 8px; border-left: 4px solid #ed7611; margin: 20px 0; }
  .button { display: inline-block; background: #ed7611; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
  .code { display: inline-block; font-family: 'Courier New', monospace; font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #de5f07; background: #fff8e1; padding: 14px 22px; border-radius: 8px; border: 1px solid #ed7611; }
  .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-radius: 0 0 8px 8px; font-size: 13px; }
  .footer p { margin: 4px 0; }
`;

function shell({
  title,
  tagline,
  body,
}: {
  title: string;
  tagline: string;
  body: string;
}) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>${STYLES}</style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>${title}</h1>
        <p>${tagline}</p>
      </div>
      <div class="content">
        ${body}
      </div>
      ${FOOTER}
    </div>
  </body>
</html>`;
}

export function membershipApprovedEmail(opts: {
  firstName: string;
  portalUrl: string;
  loginUrl: string;
}) {
  return {
    subject: 'Your Merritt Workspace Membership is Approved - Next Steps',
    html: shell({
      title: 'Welcome to Merritt Workspace',
      tagline: 'Your application has been approved',
      body: `
        <p>Hi ${opts.firstName},</p>
        <p>Great news — your membership application has been <strong>approved</strong>! We're excited to have you join the Merritt Workspace community.</p>
        <div class="info-card">
          <h3 style="margin-top:0;">Next steps</h3>
          <ol style="margin:0; padding-left:18px;">
            <li>Sign in to your member portal</li>
            <li>Upload your photo ID and proof of address</li>
            <li>Sign your Member Agreement and Terms &amp; Conditions</li>
            <li>Set up auto-pay</li>
          </ol>
        </div>
        <p style="text-align:center;">
          <a href="${opts.portalUrl}" class="button">Sign in &amp; set your password</a>
        </p>
        <p>The button above is your one-click sign-in link. Click it to sign in for the first time — you'll be taken to a page where you can <strong>choose your own password</strong> for future sign-ins. The link can only be used once, so don't share it.</p>
        <p>If the button doesn't work, copy and paste this link into your browser:<br/><span style="word-break:break-all;color:#555;">${opts.portalUrl}</span></p>
        <p style="font-size:13px;color:#666;"><strong>This link expires in 24 hours.</strong> If it expires before you use it, you can request a new one any time at <a href="${opts.loginUrl}">${opts.loginUrl}</a> using the "Forgot password? Email me a reset link" option.</p>
        <p>Welcome aboard,<br/>— The Merritt Workspace Team</p>
      `,
    }),
    text: [
      `Hi ${opts.firstName},`,
      '',
      'Great news — your membership application has been approved! We are excited to have you join the Merritt Workspace community.',
      '',
      'Next steps:',
      '  1. Sign in to your member portal',
      '  2. Upload your photo ID and proof of address',
      '  3. Sign your Member Agreement and Terms & Conditions',
      '  4. Set up auto-pay',
      '',
      'Sign in and set your password using this one-time link:',
      opts.portalUrl,
      '',
      'This link can only be used once, so please do not share it. After your first sign-in you will be prompted to choose your own password for future visits.',
      '',
      `This link expires in 24 hours. If it expires before you use it, request a new one any time at ${opts.loginUrl} using the "Forgot password? Email me a reset link" option.`,
      '',
      'Welcome aboard,',
      'The Merritt Workspace Team',
      '',
      '--',
      'Merritt Workspace',
      '2246 Irving Street, Denver, CO 80211',
      'memberservices@merrittworkspace.net',
    ].join('\n'),
  };
}

export function portalCompletionReminderEmail(opts: {
  firstName: string;
  portalUrl: string;
  loginUrl: string;
  missingSteps: string[];
  startDateLabel?: string | null;
}) {
  const stepsHtml = opts.missingSteps.length
    ? `<div class="info-card">
          <h3 style="margin-top:0;">What's left to do</h3>
          <ul style="margin:0; padding-left:18px;">
            ${opts.missingSteps.map((s) => `<li>${s}</li>`).join('')}
          </ul>
        </div>`
    : '';
  const startDateHtml = opts.startDateLabel
    ? `<div class="highlight">
          <p style="margin:0;"><strong>Your intended start date:</strong> ${opts.startDateLabel}. Finishing your portal now keeps everything on track.</p>
        </div>`
    : '';
  const stepsText = opts.missingSteps.length
    ? `What's left to do:\n${opts.missingSteps.map((s) => `  - ${s}`).join('\n')}\n\n`
    : '';
  const startDateText = opts.startDateLabel
    ? `Your intended start date: ${opts.startDateLabel}. Finishing your portal now keeps everything on track.\n\n`
    : '';

  return {
    subject: 'Reminder: Finish setting up your Merritt Workspace membership',
    html: shell({
      title: 'A few steps left',
      tagline: 'Finish your member portal setup',
      body: `
        <p>Hi ${opts.firstName},</p>
        <p>Just a friendly nudge — we noticed you haven't finished setting up your Merritt Workspace member portal yet. Once it's complete, you'll be all set to use the space.</p>
        ${stepsHtml}
        ${startDateHtml}
        <p style="text-align:center;">
          <a href="${opts.portalUrl}" class="button">Finish setting up my portal</a>
        </p>
        <p>The button above is a fresh one-click sign-in link. If your previous link expired, this one will get you back in. It can only be used once, so don't share it.</p>
        <p>If the button doesn't work, copy and paste this link into your browser:<br/><span style="word-break:break-all;color:#555;">${opts.portalUrl}</span></p>
        <p style="font-size:13px;color:#666;"><strong>This link expires in 24 hours.</strong> If it expires, request another any time at <a href="${opts.loginUrl}">${opts.loginUrl}</a>.</p>
        <p>Questions? Just reply to this email — we're happy to help.</p>
        <p>— The Merritt Workspace Team</p>
      `,
    }),
    text: [
      `Hi ${opts.firstName},`,
      '',
      "Just a friendly nudge — we noticed you haven't finished setting up your Merritt Workspace member portal yet. Once it's complete, you'll be all set to use the space.",
      '',
      stepsText + startDateText + 'Finish setting up your portal here:',
      opts.portalUrl,
      '',
      `This link can only be used once and expires in 24 hours. If it expires, request another at ${opts.loginUrl}.`,
      '',
      "Questions? Just reply to this email — we're happy to help.",
      '',
      '— The Merritt Workspace Team',
      '',
      '--',
      'Merritt Workspace',
      '2246 Irving Street, Denver, CO 80211',
      'memberservices@merrittworkspace.net',
    ].join('\n'),
  };
}

export function subscriptionPaymentReceiptEmail(opts: {
  firstName: string;
  amount: string;
  paidOn: string;
  description: string;
  invoiceNumber: string | null;
  invoicePdfUrl: string | null;
  isFirstPayment: boolean;
}) {
  const subjectPrefix = opts.isFirstPayment
    ? 'Welcome & Payment Confirmed'
    : 'Payment Received';
  const introLine = opts.isFirstPayment
    ? 'Thanks for joining Merritt Workspace — your first membership payment has been processed successfully.'
    : 'Your monthly Merritt Workspace membership payment has been processed successfully.';
  const invoiceRow = opts.invoiceNumber
    ? `<p><strong>Invoice:</strong> ${opts.invoiceNumber}</p>`
    : '';
  const invoiceLink = opts.invoicePdfUrl
    ? `<p style="text-align:center;">
          <a href="${opts.invoicePdfUrl}" class="button">Download Invoice (PDF)</a>
        </p>`
    : '';
  const invoiceTextLine = opts.invoicePdfUrl
    ? `\nDownload your invoice: ${opts.invoicePdfUrl}\n`
    : '';

  return {
    subject: `${subjectPrefix} - $${opts.amount} | Merritt Workspace Membership`,
    html: shell({
      title: 'Payment Confirmed',
      tagline: opts.isFirstPayment
        ? 'Welcome to Merritt Workspace'
        : 'Thanks for your continued membership',
      body: `
        <p>Hi ${opts.firstName},</p>
        <p>${introLine}</p>
        <div class="info-card">
          <h3 style="margin-top:0;">Payment Details</h3>
          <p><strong>Amount:</strong> $${opts.amount}</p>
          <p><strong>Paid on:</strong> ${opts.paidOn}</p>
          <p><strong>Description:</strong> ${opts.description}</p>
          ${invoiceRow}
        </div>
        ${invoiceLink}
        <p>Your next membership charge will run automatically on the 1st of next month. You can review your full payment history any time from your member portal.</p>
        <p>Questions about your bill? Reply to this email or reach us at memberservices@merrittworkspace.net.</p>
        <p>— The Merritt Workspace Team</p>
      `,
    }),
    text: [
      `Hi ${opts.firstName},`,
      '',
      introLine,
      '',
      'Payment Details:',
      `  Amount: $${opts.amount}`,
      `  Paid on: ${opts.paidOn}`,
      `  Description: ${opts.description}`,
      opts.invoiceNumber ? `  Invoice: ${opts.invoiceNumber}` : '',
      invoiceTextLine,
      'Your next membership charge will run automatically on the 1st of next month. You can review your full payment history any time from your member portal.',
      '',
      'Questions about your bill? Reply to this email or reach us at memberservices@merrittworkspace.net.',
      '',
      '— The Merritt Workspace Team',
      '',
      '--',
      'Merritt Workspace',
      '2246 Irving Street, Denver, CO 80211',
      'memberservices@merrittworkspace.net',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

export function accessCodeIssuedEmail(opts: {
  firstName: string;
  accessCode: string;
}) {
  return {
    subject: 'Your Merritt Workspace Access Code',
    html: shell({
      title: '24/7 Access Code',
      tagline: 'Your personal building entry code',
      body: `
        <p>Hi ${opts.firstName},</p>
        <p>Here is your personal 24/7 building access code:</p>
        <p style="text-align:center;">
          <span class="code">${opts.accessCode}</span>
        </p>
        <div class="highlight">
          <p style="margin:0;"><strong>Building hours:</strong> The main entrance is unlocked from 8 AM – 6 PM Monday through Friday. Use this code outside those hours to enter the building.</p>
        </div>
        <p>Please keep this code confidential — it's tied to your member account. If you ever suspect it's been shared, let us know and we'll issue a new one.</p>
        <p>— The Merritt Workspace Team</p>
      `,
    }),
    text: [
      `Hi ${opts.firstName},`,
      '',
      'Here is your personal 24/7 building access code:',
      '',
      `    ${opts.accessCode}`,
      '',
      'Building hours: The main entrance is unlocked from 8 AM - 6 PM Monday through Friday. Use this code outside those hours to enter the building.',
      '',
      'Please keep this code confidential — it is tied to your member account. If you ever suspect it has been shared, let us know and we will issue a new one.',
      '',
      '— The Merritt Workspace Team',
      '',
      '--',
      'Merritt Workspace',
      '2246 Irving Street, Denver, CO 80211',
      'memberservices@merrittworkspace.net',
    ].join('\n'),
  };
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function flexBookingConfirmedEmail(opts: {
  firstName: string;
  eventTitle: string;
  startLocal: string;
  endLocal: string;
  durationMinutes: number;
  weeklyMinutesUsed: number;
  weeklyMinutesAllowed: number;
  cancelUrl: string;
}) {
  const fmtHours = (m: number) => {
    const hrs = m / 60;
    return Number.isInteger(hrs) ? `${hrs}` : hrs.toFixed(1);
  };
  const used = fmtHours(opts.weeklyMinutesUsed);
  const allowed = fmtHours(opts.weeklyMinutesAllowed);
  const dur = fmtHours(opts.durationMinutes);
  const safeTitle = escapeHtml(opts.eventTitle);

  return {
    subject: `Flex Space booked - ${opts.eventTitle} - ${opts.startLocal}`,
    html: shell({
      title: 'Flex Space Booking Confirmed',
      tagline: 'Your reservation is on the calendar',
      body: `
        <p>Hi ${opts.firstName},</p>
        <p>Your flex space (church building) reservation is confirmed.</p>
        <div class="info-card">
          <h3 style="margin-top:0;">Reservation</h3>
          <p><strong>Event:</strong> ${safeTitle}</p>
          <p><strong>Starts:</strong> ${opts.startLocal}</p>
          <p><strong>Ends:</strong> ${opts.endLocal}</p>
          <p><strong>Duration:</strong> ${dur} hour${dur === '1' ? '' : 's'}</p>
        </div>
        <div class="highlight">
          <p style="margin:0 0 8px;"><strong>Heads up:</strong> all setup and breakdown for your event must happen within your booked window. Please plan your arrival and cleanup accordingly so the next member can start on time.</p>
          <p style="margin:0;"><strong>This week:</strong> ${used} of ${allowed} hours used.</p>
        </div>
        <p>Need to cancel? <a href="${opts.cancelUrl}">Manage your flex bookings</a> in the member portal.</p>
        <p>— The Merritt Workspace Team</p>
      `,
    }),
    text: [
      `Hi ${opts.firstName},`,
      '',
      'Your flex space (church building) reservation is confirmed.',
      '',
      `Event:    ${opts.eventTitle}`,
      `Starts:   ${opts.startLocal}`,
      `Ends:     ${opts.endLocal}`,
      `Duration: ${dur} hour${dur === '1' ? '' : 's'}`,
      '',
      'Heads up: all setup and breakdown for your event must happen within your booked window. Please plan your arrival and cleanup accordingly so the next member can start on time.',
      '',
      `This week: ${used} of ${allowed} hours used.`,
      '',
      `Manage or cancel: ${opts.cancelUrl}`,
      '',
      '— The Merritt Workspace Team',
    ].join('\n'),
  };
}

export function accessCodeRequestedAdminEmail(opts: {
  firstName: string;
  lastName: string;
  email: string;
  adminUrl: string;
}) {
  return {
    subject: `Access code requested - ${opts.firstName} ${opts.lastName}`,
    html: shell({
      title: 'Access Code Requested',
      tagline: 'A member needs a building code',
      body: `
        <p><strong>${opts.firstName} ${opts.lastName}</strong> (${opts.email}) has requested a 24/7 building access code.</p>
        <div class="info-card">
          <p style="margin:0;">Get a code from POPS, then assign it in the admin panel.</p>
        </div>
        <p style="text-align:center;">
          <a href="${opts.adminUrl}" class="button">Open Admin Panel</a>
        </p>
      `,
    }),
    text: [
      `${opts.firstName} ${opts.lastName} (${opts.email}) has requested a 24/7 building access code.`,
      '',
      'Get a code from POPS, then assign it in the admin panel:',
      opts.adminUrl,
    ].join('\n'),
  };
}

export function workspaceAssignmentNotificationEmail(opts: {
  firstName: string;
  lastName: string;
  email: string;
  designationLabel: string;
  deskNumber: string | null;
  officeNumber: string | null;
  adminUrl: string;
}) {
  const seatLine = opts.officeNumber
    ? `Office: <strong>${opts.officeNumber}</strong>`
    : opts.deskNumber
      ? `Dedicated desk: <strong>${opts.deskNumber}</strong>`
      : 'Cleared their assignment';
  const seatText = opts.officeNumber
    ? `Office: ${opts.officeNumber}`
    : opts.deskNumber
      ? `Dedicated desk: ${opts.deskNumber}`
      : 'Cleared their assignment';
  return {
    subject: `Workspace assignment updated - ${opts.firstName} ${opts.lastName}`,
    html: shell({
      title: 'Workspace Assignment Updated',
      tagline: 'A member set their desk or office',
      body: `
        <p><strong>${opts.firstName} ${opts.lastName}</strong> (${opts.email}) updated their workspace assignment from the member portal.</p>
        <div class="info-card">
          <p style="margin:0 0 6px;">Membership: <strong>${opts.designationLabel}</strong></p>
          <p style="margin:0;">${seatLine}</p>
        </div>
        <p>Please confirm this seat is available and update any building records as needed.</p>
        <p style="text-align:center;">
          <a href="${opts.adminUrl}" class="button">Open Admin Panel</a>
        </p>
      `,
    }),
    text: [
      `${opts.firstName} ${opts.lastName} (${opts.email}) updated their workspace assignment from the member portal.`,
      '',
      `Membership: ${opts.designationLabel}`,
      seatText,
      '',
      'Confirm the seat and update records as needed:',
      opts.adminUrl,
    ].join('\n'),
  };
}

// Sender used for portal/member-services emails (access codes, general
// notifications). Uses a descriptive display name — generic "From" names
// score worse with Gmail/Outlook spam filters.
export const PORTAL_FROM =
  'Merritt Workspace Member Services <memberservices@merrittworkspace.net>';

// Sender used specifically for onboarding (approval + first-time sign-in
// link). Uses a distinct, descriptive name mirroring the application
// confirmation email, which reliably lands in the inbox.
export const PORTAL_ONBOARDING_FROM =
  'Merritt Workspace Membership <manager@merrittworkspace.net>';

// Monitored mailbox applicants/members can reply to. Including an explicit
// Reply-To header improves deliverability and gives recipients a clear
// path to respond.
export const PORTAL_REPLY_TO = 'manager@merrittworkspace.net';
