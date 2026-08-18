// Branded HTML email templates for portal/admin notifications.
// Mirrors the style used in `lib/resend.ts` (orange gradient header,
// bordered content card, gray footer) so portal mail looks consistent
// with snackshop / booking confirmations.

// Emails require absolute asset URLs — relative paths won't resolve in mail
// clients. We use a PNG (not the navbar's WebP) for broad client support, e.g.
// Outlook desktop doesn't render WebP.
const LOGO_URL = 'https://merrittworkspace.net/images/hero/logo.png';

// White header band carrying the logo on white (as in the site navbar), placed
// above the orange gradient banner so the logo stays crisp.
const LOGO_BAND = `
      <div style="background:#ffffff;text-align:center;padding:24px 20px 12px;border-radius:8px 8px 0 0;">
        <img src="${LOGO_URL}" alt="Merritt Workspace" width="200" style="display:inline-block;width:200px;max-width:75%;height:auto;border:0;" />
      </div>`;

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
  .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 30px; text-align: center; border-radius: 0; }
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
      ${LOGO_BAND}
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
  // When provided, render a low-key "cancel my signup / stop these emails"
  // link. Points at a confirmation page (not a mutating endpoint) so the
  // member has to click through before anything is removed.
  cancelUrl?: string | null;
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
  const cancelHtml = opts.cancelUrl
    ? `<p style="font-size:13px;color:#888;border-top:1px solid #eee;margin-top:24px;padding-top:16px;">
          Changed your mind, or signed up by mistake? You can
          <a href="${opts.cancelUrl}" style="color:#888;">cancel your signup and stop these reminders</a>.
        </p>`
    : '';
  const cancelText = opts.cancelUrl
    ? `\nChanged your mind, or signed up by mistake? Cancel your signup and stop these reminders:\n${opts.cancelUrl}\n`
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
        ${cancelHtml}
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
      cancelText,
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

export const ACCESS_CODE_VIDEO_URL =
  'https://www.youtube.com/watch?v=yNvPrGs8uDY';

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
        <p>Here is your personal after-hours building access code:</p>
        <p style="text-align:center;">
          <span class="code">${opts.accessCode}</span>
        </p>
        <div class="highlight">
          <p style="margin:0 0 8px;"><strong>You do not need this code during business hours.</strong> The main entrance is unlocked <strong>${BUILDING_OPEN_HOURS}</strong> — during those hours just walk in.</p>
          <p style="margin:0;">Use the code only <strong>outside those hours</strong>: late evenings, weekends, and holidays.</p>
        </div>
        <p><strong>How to use the keypad:</strong> Watch this short tutorial on locking and unlocking the front door with your access code:</p>
        <p style="text-align:center;">
          <a href="${ACCESS_CODE_VIDEO_URL}" class="button">▶ Watch the Keypad Tutorial</a>
        </p>
        <p style="font-size:13px;color:#555;text-align:center;">Or open this link: <a href="${ACCESS_CODE_VIDEO_URL}">${ACCESS_CODE_VIDEO_URL}</a></p>
        <p>Please keep this code and video confidential — they are tied to your member account. If you ever suspect either has been shared, let us know and we'll issue a new code.</p>
        <p>Questions? Reply to this email or contact <a href="mailto:memberservices@merrittworkspace.net">memberservices@merrittworkspace.net</a>.</p>
        <p>— The Merritt Workspace Team</p>
      `,
    }),
    text: [
      `Hi ${opts.firstName},`,
      '',
      'Here is your personal after-hours building access code:',
      '',
      `    ${opts.accessCode}`,
      '',
      `You do NOT need this code during business hours. The main entrance is unlocked ${BUILDING_OPEN_HOURS} — during those hours just walk in.`,
      '',
      'Use the code only outside those hours: late evenings, weekends, and holidays.',
      '',
      'How to use the keypad: watch this short tutorial on locking and unlocking the front door with your access code:',
      `    ${ACCESS_CODE_VIDEO_URL}`,
      '',
      'Please keep this code and video confidential — they are tied to your member account. If you ever suspect either has been shared, let us know and we will issue a new code.',
      '',
      'Questions? Reply to this email or contact memberservices@merrittworkspace.net.',
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

// Staff-facing notification that a coworking member reserved the shared flex /
// wellness space. Goes out alongside the member's confirmation so whoever
// manages the wellness calendar sees the booking immediately and can spot any
// conflict with a wellness reservation.
export function flexBookingStaffEmail(opts: {
  memberName: string;
  memberEmail: string;
  eventTitle: string;
  startLocal: string;
  endLocal: string;
  durationMinutes: number;
  bookingId: string;
}) {
  const fmtHours = (m: number) => {
    const hrs = m / 60;
    return Number.isInteger(hrs) ? `${hrs}` : hrs.toFixed(1);
  };
  const dur = fmtHours(opts.durationMinutes);
  const safeTitle = escapeHtml(opts.eventTitle);
  const safeName = escapeHtml(opts.memberName);

  return {
    subject: `Flex space booked - ${opts.memberName} - ${opts.startLocal}`,
    html: shell({
      title: 'Flex Space Booked',
      tagline: 'A coworking member reserved the shared space',
      body: `
        <p>A coworking member has reserved the flex / wellness space. This event has been added to the <strong>wellness calendar</strong>.</p>
        <div class="info-card">
          <h3 style="margin-top:0;">Booking</h3>
          <p><strong>Member:</strong> ${safeName} &lt;${escapeHtml(opts.memberEmail)}&gt;</p>
          <p><strong>Event:</strong> ${safeTitle}</p>
          <p><strong>Starts:</strong> ${opts.startLocal}</p>
          <p><strong>Ends:</strong> ${opts.endLocal}</p>
          <p><strong>Duration:</strong> ${dur} hour${dur === '1' ? '' : 's'}</p>
          <p style="margin:0;"><strong>Booking ID:</strong> ${escapeHtml(opts.bookingId)}</p>
        </div>
        <div class="highlight">
          <p style="margin:0;">This reservation was checked against the wellness calendar before it was created, so it should not conflict with any existing wellness booking. It is labeled <strong>[Coworking Member]</strong> on the calendar to distinguish it from wellness reservations.</p>
        </div>
      `,
    }),
    text: [
      'A coworking member has reserved the flex / wellness space. This event has been added to the wellness calendar.',
      '',
      `Member:     ${opts.memberName} <${opts.memberEmail}>`,
      `Event:      ${opts.eventTitle}`,
      `Starts:     ${opts.startLocal}`,
      `Ends:       ${opts.endLocal}`,
      `Duration:   ${dur} hour${dur === '1' ? '' : 's'}`,
      `Booking ID: ${opts.bookingId}`,
      '',
      'This reservation was checked against the wellness calendar before it was created, so it should not conflict with any existing wellness booking. It is labeled [Coworking Member] on the calendar to distinguish it from wellness reservations.',
      '',
      '--',
      'Merritt Workspace',
      '2246 Irving Street, Denver, CO 80211',
      'memberservices@merrittworkspace.net',
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
          <p style="margin:0;">Generate on Alarm.com, then assign it in the admin panel.</p>
        </div>
        <p style="text-align:center;">
          <a href="${opts.adminUrl}" class="button">Open Admin Panel</a>
        </p>
      `,
    }),
    text: [
      `${opts.firstName} ${opts.lastName} (${opts.email}) has requested a 24/7 building access code.`,
      '',
      'Generate on Alarm.com, then assign it in the admin panel:',
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

// Shared cancellation-policy block, kept in one place so the member email and
// the in-portal notice never drift apart. Mirrors Section 4 of the Terms &
// Conditions (lib/portal/legal.ts).
function cancellationPolicyHtml(effectiveDateLabel: string | null) {
  const endLine = effectiveDateLabel
    ? `Your membership and building access will continue through <strong>${effectiveDateLabel}</strong>, the last day of your final billing month.`
    : 'Your membership and building access will continue through the end of your current billing period.';
  return `
        <div class="info-card">
          <h3 style="margin-top:0;">Cancellation details</h3>
          <p style="margin:0 0 6px;"><strong>Notice received:</strong> ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p style="margin:0;"><strong>Membership ends:</strong> ${effectiveDateLabel ?? 'End of current billing period'}</p>
        </div>
        <p>${endLine}</p>
        <div class="highlight">
          <h3 style="margin:0 0 10px;">Our cancellation policy (30-day notice)</h3>
          <ul style="margin:0; padding-left:18px;">
            <li><strong>Written 30-day notice.</strong> Submitting this cancellation serves as your required written 30-day notice of cancellation.</li>
            <li><strong>First &amp; last month covered at sign-up.</strong> Your initial payment covered your first month <em>and</em> a Last Month's Membership Fee (held as your deposit). That Last Month's Fee is now applied to your final month, so <strong>you will not be billed</strong> for it — your upcoming invoice nets to $0.00.</li>
            <li><strong>Notice given late / leaving early.</strong> If a full 30 days' notice is not provided (for example by leaving the workspace sooner), the Last Month's Membership Fee is forfeited as liquidated damages, with no refund, credit, or offset.</li>
            <li><strong>Inspection &amp; damages.</strong> From the day after this notice through your last day, Merritt Workspace may inspect the workspace and assess additional charges for any damage, excessive wear, missing items, or required restoration. Any charges beyond the Last Month's Fee will be invoiced to you.</li>
            <li><strong>Return of property.</strong> Please return all keys, access devices, and Merritt-provided equipment by your last day. Keys not returned within 48 hours of your last day are subject to a $250 fee per item.</li>
          </ul>
        </div>`;
}

function cancellationPolicyText(effectiveDateLabel: string | null) {
  return [
    'CANCELLATION DETAILS',
    `  Notice received: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    `  Membership ends: ${effectiveDateLabel ?? 'End of current billing period'}`,
    '',
    'OUR CANCELLATION POLICY (30-DAY NOTICE)',
    "  - Written 30-day notice: submitting this cancellation serves as your required written 30-day notice.",
    "  - First & last month covered at sign-up: your initial payment covered your first month AND a Last Month's Membership Fee (held as your deposit). That Last Month's Fee is now applied to your final month, so you will NOT be billed for it -- your upcoming invoice nets to $0.00.",
    "  - Notice given late / leaving early: if a full 30 days' notice is not provided, the Last Month's Membership Fee is forfeited as liquidated damages, with no refund, credit, or offset.",
    '  - Inspection & damages: from the day after this notice through your last day, Merritt Workspace may inspect the workspace and assess additional charges for any damage, excessive wear, missing items, or required restoration. Any charges beyond the Last Month\'s Fee will be invoiced to you.',
    '  - Return of property: please return all keys, access devices, and Merritt-provided equipment by your last day. Keys not returned within 48 hours of your last day are subject to a $250 fee per item.',
  ].join('\n');
}

// Confirmation sent to the member when their membership is cancelled (either
// self-service from the portal or by an admin on their behalf). Restates the
// effective end date and the full cancellation policy.
export function membershipCancelledMemberEmail(opts: {
  firstName: string;
  effectiveDateLabel: string | null;
}) {
  return {
    subject: 'Your Merritt Workspace Membership Cancellation Confirmation',
    html: shell({
      title: 'Membership Cancellation Confirmed',
      tagline: 'We have received your cancellation notice',
      body: `
        <p>Hi ${opts.firstName},</p>
        <p>This confirms that your Merritt Workspace membership has been cancelled. We're sorry to see you go and we'd love to welcome you back any time.</p>
        ${cancellationPolicyHtml(opts.effectiveDateLabel)}
        <p>If you believe this was a mistake, or you'd like to reactivate your membership, just reply to this email or contact us at <a href="mailto:memberservices@merrittworkspace.net">memberservices@merrittworkspace.net</a> — we're happy to help.</p>
        <p>Thank you for being part of the Merritt Workspace community.</p>
        <p>— The Merritt Workspace Team</p>
      `,
    }),
    text: [
      `Hi ${opts.firstName},`,
      '',
      "This confirms that your Merritt Workspace membership has been cancelled. We're sorry to see you go and we'd love to welcome you back any time.",
      '',
      cancellationPolicyText(opts.effectiveDateLabel),
      '',
      "If you believe this was a mistake, or you'd like to reactivate your membership, just reply to this email or contact us at memberservices@merrittworkspace.net -- we're happy to help.",
      '',
      'Thank you for being part of the Merritt Workspace community.',
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

// Staff-facing notification that a membership was cancelled. Includes who
// initiated it and the effective end date so the team can plan inspection,
// key return, and reassigning the desk/office.
export function membershipCancelledStaffEmail(opts: {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string | null;
  designationLabel: string | null;
  deskNumber: string | null;
  officeNumber: string | null;
  cancelledBy: 'member' | 'admin';
  effectiveDateLabel: string | null;
  adminUrl: string;
}) {
  const seatLine = opts.officeNumber
    ? `Office: <strong>${opts.officeNumber}</strong>`
    : opts.deskNumber
      ? `Dedicated desk: <strong>${opts.deskNumber}</strong>`
      : 'No desk/office on file';
  const seatText = opts.officeNumber
    ? `Office: ${opts.officeNumber}`
    : opts.deskNumber
      ? `Dedicated desk: ${opts.deskNumber}`
      : 'No desk/office on file';
  const initiatedBy =
    opts.cancelledBy === 'admin' ? 'an admin (on the member\'s behalf)' : 'the member';
  return {
    subject: `Membership cancelled - ${opts.firstName} ${opts.lastName}`,
    html: shell({
      title: 'Membership Cancelled',
      tagline: 'A member has cancelled their membership',
      body: `
        <p><strong>${opts.firstName} ${opts.lastName}</strong> (${opts.email}) has cancelled their Merritt Workspace membership. Cancellation was initiated by ${initiatedBy}.</p>
        <div class="info-card">
          <p style="margin:0 0 6px;"><strong>Member:</strong> ${opts.firstName} ${opts.lastName}${opts.companyName ? ` — ${opts.companyName}` : ''}</p>
          <p style="margin:0 0 6px;"><strong>Email:</strong> ${opts.email}</p>
          ${opts.designationLabel ? `<p style="margin:0 0 6px;"><strong>Membership:</strong> ${opts.designationLabel}</p>` : ''}
          <p style="margin:0 0 6px;">${seatLine}</p>
          <p style="margin:0 0 6px;"><strong>Notice received:</strong> ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p style="margin:0;"><strong>Membership ends:</strong> ${opts.effectiveDateLabel ?? 'End of current billing period'}</p>
        </div>
        <div class="highlight">
          <p style="margin:0;">The member's Stripe subscription has been scheduled to stop and the Last Month's Membership Fee credit has been applied (member is not billed for their final month). Plan a workspace inspection and key/access-device return before their last day, and free up the seat once they're out.</p>
        </div>
        <p style="text-align:center;">
          <a href="${opts.adminUrl}" class="button">Open Member in Admin Panel</a>
        </p>
      `,
    }),
    text: [
      `${opts.firstName} ${opts.lastName} (${opts.email}) has cancelled their Merritt Workspace membership. Cancellation was initiated by ${initiatedBy}.`,
      '',
      `Member:          ${opts.firstName} ${opts.lastName}${opts.companyName ? ` — ${opts.companyName}` : ''}`,
      `Email:           ${opts.email}`,
      opts.designationLabel ? `Membership:      ${opts.designationLabel}` : '',
      seatText,
      `Notice received: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
      `Membership ends: ${opts.effectiveDateLabel ?? 'End of current billing period'}`,
      '',
      "The member's Stripe subscription has been scheduled to stop and the Last Month's Membership Fee credit has been applied (member is not billed for their final month). Plan a workspace inspection and key/access-device return before their last day, and free up the seat once they're out.",
      '',
      `Open member in admin panel: ${opts.adminUrl}`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

// Staff-facing notification that a never-paid member (e.g. a trial-day signup)
// cancelled before ever paying. The member is KEPT in the admin panel marked
// "cancelled" so the team can see who dropped off; an admin can permanently
// delete them there when ready. There's no Stripe wind-down or final-month
// credit (no payment was ever collected).
export function neverPaidCancelledStaffEmail(opts: {
  firstName: string;
  lastName: string;
  email: string;
  companyName: string | null;
  designationLabel: string | null;
  deskNumber: string | null;
  officeNumber: string | null;
  cancelledBy: 'member' | 'admin';
  wasTrialApplicant: boolean;
  trialDate: string | null;
}) {
  const seatLine = opts.officeNumber
    ? `Office: <strong>${opts.officeNumber}</strong>`
    : opts.deskNumber
      ? `Dedicated desk: <strong>${opts.deskNumber}</strong>`
      : 'No desk/office on file';
  const seatText = opts.officeNumber
    ? `Office: ${opts.officeNumber}`
    : opts.deskNumber
      ? `Dedicated desk: ${opts.deskNumber}`
      : 'No desk/office on file';
  const initiatedBy =
    opts.cancelledBy === 'admin'
      ? 'an admin (on the member\'s behalf)'
      : 'the member (from their reminder email)';
  const trialLine = opts.wasTrialApplicant
    ? `Trial-day signup${opts.trialDate ? ` (${opts.trialDate})` : ''}`
    : 'Did not complete signup';
  return {
    subject: `Signup cancelled - ${opts.firstName} ${opts.lastName}`,
    html: shell({
      title: 'Signup Cancelled',
      tagline: 'A never-paid member cancelled before signing up',
      body: `
        <p><strong>${opts.firstName} ${opts.lastName}</strong> (${opts.email}) cancelled before ever paying. Cancellation was initiated by ${initiatedBy}.</p>
        <div class="info-card">
          <p style="margin:0 0 6px;"><strong>Member:</strong> ${opts.firstName} ${opts.lastName}${opts.companyName ? ` — ${opts.companyName}` : ''}</p>
          <p style="margin:0 0 6px;"><strong>Email:</strong> ${opts.email}</p>
          ${opts.designationLabel ? `<p style="margin:0 0 6px;"><strong>Interested in:</strong> ${opts.designationLabel}</p>` : ''}
          <p style="margin:0 0 6px;"><strong>Status:</strong> ${trialLine}</p>
          <p style="margin:0;">${seatLine}</p>
        </div>
        <div class="highlight">
          <p style="margin:0;">No payment was ever collected, so there's no Stripe wind-down. They now appear in the admin panel marked <strong>cancelled</strong> and will no longer receive onboarding reminder emails. When you're ready, an admin can permanently delete them from the admin panel to fully remove them. If they had a tentative desk/office, it has been freed.</p>
        </div>
      `,
    }),
    text: [
      `${opts.firstName} ${opts.lastName} (${opts.email}) cancelled before ever paying. Cancellation was initiated by ${initiatedBy}.`,
      '',
      `Member:     ${opts.firstName} ${opts.lastName}${opts.companyName ? ` — ${opts.companyName}` : ''}`,
      `Email:      ${opts.email}`,
      opts.designationLabel ? `Interested:  ${opts.designationLabel}` : '',
      `Status:     ${trialLine}`,
      seatText,
      '',
      'No payment was ever collected, so there is no Stripe wind-down. They now appear in the admin panel marked cancelled and will no longer receive onboarding reminder emails. When you are ready, an admin can permanently delete them from the admin panel to fully remove them.',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

// ------------------------------------------------------------------
// Signup completed — the member finished the onboarding portal
// (documents + agreements + payment) and is now officially a member.
// Two emails go out at this moment: a welcome/orientation email to the
// member, and a notification to the management team.
// ------------------------------------------------------------------

// The building's WiFi, kept here so the welcome email and the portal's
// Onboarding tab quote the same credentials.
export const WIFI_NETWORK = 'merrittcowork';
export const WIFI_PASSWORD = 'Merritt23X';

// Staffed/unlocked hours. Outside this window the front door is locked and a
// personal access code is required — the single most-asked new-member question.
export const BUILDING_OPEN_HOURS = '8:00 AM – 6:00 PM, Monday through Friday';

export function signupCompletedMemberEmail(opts: {
  firstName: string;
  designationLabel: string;
  // Plain-English "what you signed up for", e.g. "1 dedicated desk in the
  // shared coworking space" or "Private office — 2 desks".
  spaceSummary: string;
  // "$200.00 per month" / "$30.00 one-time (single day pass)".
  costLine: string;
  // Amount actually charged at signup, already formatted with its
  // explanation. Null when nothing was collected upfront (legacy members).
  initialChargeLabel: string | null;
  // When the first/next recurring charge runs, e.g. "September 1, 2026".
  nextChargeLabel: string | null;
  startDateLabel: string | null;
  // 'desk' for dedicated-desk members, 'office' for private offices, null
  // for designations with no fixed seat.
  seatType: 'desk' | 'office' | null;
  seatNumber: string | null;
  // Free DD numbers, rendered only when a desk member hasn't picked one yet.
  availableDesksLabel: string | null;
  // e.g. "4 hours of conference-room time per month".
  conferenceHoursLine: string | null;
  portalUrl: string;
}) {
  const seatPicked = !!opts.seatNumber;
  const seatRow = opts.seatType
    ? `<p style="margin:0 0 6px;"><strong>${opts.seatType === 'office' ? 'Your office' : 'Your desk'}:</strong> ${
        seatPicked
          ? escapeHtml(opts.seatNumber!)
          : '<span style="color:#ad4a00;">Not selected yet — see below</span>'
      }</p>`
    : '';

  // Action block: the one thing a brand-new member still has to do.
  const deskActionHtml =
    opts.seatType === 'desk' && !seatPicked
      ? `<div class="highlight">
          <h3 style="margin:0 0 10px;">✅ First thing to do: claim your desk</h3>
          <p style="margin:0 0 10px;">Desks are numbered <strong>DD1 through DD26</strong>. Sign in to your member portal, open the <strong>Onboarding</strong> tab, and enter the desk number you're taking.</p>
          ${
            opts.availableDesksLabel
              ? `<p style="margin:0 0 10px;"><strong>Currently available:</strong> ${opts.availableDesksLabel}</p>`
              : `<p style="margin:0 0 10px;">Every desk is currently spoken for — email <a href="mailto:memberservices@merrittworkspace.net">memberservices@merrittworkspace.net</a> and we'll sort out your seat.</p>`
          }
          <p style="margin:0;">Once you've claimed it, <strong>please leave something on the desk</strong> — a business card, a sticky note, or your full setup. An empty desk looks available to other members and trial visitors, so a marker is what tells everyone it's yours.</p>
        </div>`
      : opts.seatType === 'office' && !seatPicked
        ? `<div class="highlight">
          <h3 style="margin:0 0 10px;">✅ First thing to do: confirm your office</h3>
          <p style="margin:0;">Sign in to your member portal, open the <strong>Onboarding</strong> tab, and tell us which office number you'd like. Member services will confirm availability and finalize the assignment.</p>
        </div>`
        : '';

  const deskActionText =
    opts.seatType === 'desk' && !seatPicked
      ? [
          'FIRST THING TO DO: CLAIM YOUR DESK',
          "  Desks are numbered DD1 through DD26. Sign in to your member portal, open the Onboarding tab, and enter the desk number you're taking.",
          opts.availableDesksLabel
            ? `  Currently available: ${opts.availableDesksLabel}`
            : "  Every desk is currently spoken for — email memberservices@merrittworkspace.net and we'll sort out your seat.",
          "  Once you've claimed it, please leave something on the desk (a business card, a sticky note, or your full setup). An empty desk looks available to other members and trial visitors.",
          '',
        ].join('\n')
      : opts.seatType === 'office' && !seatPicked
        ? [
            'FIRST THING TO DO: CONFIRM YOUR OFFICE',
            '  Sign in to your member portal, open the Onboarding tab, and tell us which office number you would like. Member services will confirm availability and finalize the assignment.',
            '',
          ].join('\n')
        : '';

  return {
    subject: `Welcome to Merritt Workspace, ${opts.firstName} — you're all set`,
    html: shell({
      title: 'Welcome to Merritt Workspace',
      tagline: 'Your membership is complete',
      body: `
        <p>Hi ${escapeHtml(opts.firstName)},</p>
        <p>You're officially a Merritt Workspace member — your paperwork is signed, your payment is set up, and the space is yours. Here's everything you need to get settled in.</p>

        <div class="info-card">
          <h3 style="margin-top:0;">Your membership</h3>
          <p style="margin:0 0 6px;"><strong>Membership:</strong> ${escapeHtml(opts.designationLabel)}</p>
          <p style="margin:0 0 6px;"><strong>What's included:</strong> ${escapeHtml(opts.spaceSummary)}</p>
          ${seatRow}
          <p style="margin:0 0 6px;"><strong>Cost:</strong> ${escapeHtml(opts.costLine)}</p>
          ${opts.initialChargeLabel ? `<p style="margin:0 0 6px;"><strong>Paid today:</strong> ${escapeHtml(opts.initialChargeLabel)}</p>` : ''}
          ${opts.nextChargeLabel ? `<p style="margin:0 0 6px;"><strong>Next charge:</strong> ${escapeHtml(opts.nextChargeLabel)} (and the 1st of every month after — automatic, nothing for you to do)</p>` : ''}
          ${opts.startDateLabel ? `<p style="margin:0;"><strong>Membership start date:</strong> ${escapeHtml(opts.startDateLabel)}</p>` : ''}
        </div>

        ${deskActionHtml}

        <div class="info-card">
          <h3 style="margin-top:0;">🔐 Building access — when you actually need a code</h3>
          <p style="margin:0 0 8px;">The front door is <strong>unlocked ${BUILDING_OPEN_HOURS}</strong>. During those hours just walk in — no code needed.</p>
          <p style="margin:0 0 8px;">Your personal access code is only required <strong>outside those hours: evenings, weekends, and holidays</strong>. It's included with your membership at no extra charge.</p>
          <p style="margin:0;">Request yours from the <strong>Onboarding</strong> tab of your portal (or email member services). We'll send the code along with a short video showing how to lock and unlock the front door with the keypad. Please keep both confidential — the code is tied to your account.</p>
        </div>

        <div class="info-card">
          <h3 style="margin-top:0;">📶 WiFi</h3>
          <p style="margin:0 0 6px;"><strong>Network:</strong> ${WIFI_NETWORK}</p>
          <p style="margin:0;"><strong>Password:</strong> ${WIFI_PASSWORD}</p>
        </div>

        <h3 style="margin:24px 0 8px;">Good to know</h3>
        <ul style="margin:0 0 16px; padding-left:18px;">
          ${opts.conferenceHoursLine ? `<li style="margin-bottom:8px;"><strong>Conference room:</strong> ${escapeHtml(opts.conferenceHoursLine)} is included. Book it from the member portal; extra hours are available at the member rate.</li>` : ''}
          <li style="margin-bottom:8px;"><strong>Kitchen &amp; snack shop:</strong> Coffee and tea are on us. Snacks and drinks are self-serve — order what you take at <a href="https://www.merrittworkspace.net/snackshop">merrittworkspace.net/snackshop</a>.</li>
          <li style="margin-bottom:8px;"><strong>Cubbies &amp; mail:</strong> Want a cubby, or need to send/receive mail here? Email <a href="mailto:memberservices@merrittworkspace.net">memberservices@merrittworkspace.net</a> and we'll set it up.</li>
          <li style="margin-bottom:8px;"><strong>Flex space (the 1905 church next door):</strong> Reservable up to 14 days out, 4 hours max per booking. Weekdays 8:00 AM – 4:00 PM are free for members — email member services for your 100% discount code. After 4:00 PM and weekends, members get 20% off the standard rate.</li>
          <li style="margin-bottom:8px;"><strong>Events:</strong> Yoga, fitness classes, workshops, and member gatherings run next door all week. Browse and sign up at <a href="https://www.merrittwellness.net/events">merrittwellness.net/events</a>.</li>
          <li style="margin-bottom:8px;"><strong>Refer a friend:</strong> When someone you refer signs up, you get <strong>$200 off</strong> your next month's membership.</li>
          <li style="margin-bottom:0;"><strong>Your portal:</strong> Payment history, invoices, conference-room bookings, and your access code all live at <a href="${opts.portalUrl}">${opts.portalUrl}</a>.</li>
        </ul>

        <div class="info-card">
          <h3 style="margin-top:0;">Who to contact</h3>
          <p style="margin:0 0 10px;"><strong>Member Services</strong> — day-to-day support: access codes, cubbies, mail, snack shop, conference room, and anything you need as a member.<br/>
          (303) 359-8337 · <a href="mailto:memberservices@merrittworkspace.net">memberservices@merrittworkspace.net</a></p>
          <p style="margin:0;"><strong>Manager</strong> — onboarding, tours, membership-level changes, and bigger-picture workspace matters.<br/>
          (720) 357-9499 · <a href="mailto:manager@merrittworkspace.net">manager@merrittworkspace.net</a></p>
        </div>

        <p style="text-align:center;">
          <a href="${opts.portalUrl}" class="button">Open my member portal</a>
        </p>

        <p>We're genuinely glad you're here. If anything is unclear or you need a hand getting settled, just reply to this email.</p>
        <p>See you soon,<br/>— The Merritt Workspace Team</p>
      `,
    }),
    text: [
      `Hi ${opts.firstName},`,
      '',
      "You're officially a Merritt Workspace member — your paperwork is signed, your payment is set up, and the space is yours. Here's everything you need to get settled in.",
      '',
      'YOUR MEMBERSHIP',
      `  Membership: ${opts.designationLabel}`,
      `  What's included: ${opts.spaceSummary}`,
      opts.seatType
        ? `  ${opts.seatType === 'office' ? 'Your office' : 'Your desk'}: ${opts.seatNumber || 'Not selected yet — see below'}`
        : '',
      `  Cost: ${opts.costLine}`,
      opts.initialChargeLabel ? `  Paid today: ${opts.initialChargeLabel}` : '',
      opts.nextChargeLabel
        ? `  Next charge: ${opts.nextChargeLabel} (and the 1st of every month after — automatic)`
        : '',
      opts.startDateLabel ? `  Membership start date: ${opts.startDateLabel}` : '',
      '',
      deskActionText,
      'BUILDING ACCESS — WHEN YOU ACTUALLY NEED A CODE',
      `  The front door is unlocked ${BUILDING_OPEN_HOURS}. During those hours just walk in — no code needed.`,
      '  Your personal access code is only required outside those hours: evenings, weekends, and holidays. It is included with your membership at no extra charge.',
      "  Request yours from the Onboarding tab of your portal (or email member services). We'll send the code along with a short video showing how to lock and unlock the front door with the keypad. Please keep both confidential.",
      '',
      'WIFI',
      `  Network:  ${WIFI_NETWORK}`,
      `  Password: ${WIFI_PASSWORD}`,
      '',
      'GOOD TO KNOW',
      opts.conferenceHoursLine
        ? `  - Conference room: ${opts.conferenceHoursLine} is included. Book it from the member portal; extra hours are available at the member rate.`
        : '',
      '  - Kitchen & snack shop: coffee and tea are on us. Snacks and drinks are self-serve — order what you take at merrittworkspace.net/snackshop.',
      "  - Cubbies & mail: want a cubby, or need to send/receive mail here? Email memberservices@merrittworkspace.net and we'll set it up.",
      '  - Flex space (the 1905 church next door): reservable up to 14 days out, 4 hours max per booking. Weekdays 8:00 AM - 4:00 PM are free for members (email member services for your 100% discount code). After 4:00 PM and weekends, members get 20% off.',
      '  - Events: yoga, fitness classes, workshops, and member gatherings run next door all week. Browse and sign up at merrittwellness.net/events.',
      "  - Refer a friend: when someone you refer signs up, you get $200 off your next month's membership.",
      `  - Your portal: payment history, invoices, conference-room bookings, and your access code all live at ${opts.portalUrl}`,
      '',
      'WHO TO CONTACT',
      '  Member Services — day-to-day support: access codes, cubbies, mail, snack shop, conference room.',
      '    (303) 359-8337 · memberservices@merrittworkspace.net',
      '  Manager — onboarding, tours, membership-level changes, bigger-picture matters.',
      '    (720) 357-9499 · manager@merrittworkspace.net',
      '',
      "We're genuinely glad you're here. If anything is unclear or you need a hand getting settled, just reply to this email.",
      '',
      'See you soon,',
      '— The Merritt Workspace Team',
      '',
      '--',
      'Merritt Workspace',
      '2246 Irving Street, Denver, CO 80211',
      'memberservices@merrittworkspace.net',
    ]
      .filter((line) => line !== '')
      .join('\n'),
  };
}

// Management-team notification that someone finished the onboarding portal.
// This is the "a new member officially signed up" alert — it fires at the
// same moment the member's portal unlocks, not when they applied.
export function signupCompletedStaffEmail(opts: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  designationLabel: string;
  spaceSummary: string;
  costLine: string;
  initialChargeLabel: string | null;
  nextChargeLabel: string | null;
  startDateLabel: string | null;
  paymentMethodLabel: string | null;
  seatType: 'desk' | 'office' | null;
  seatNumber: string | null;
  availableDesksLabel: string | null;
  hasAccessCode: boolean;
  isLegacyMember: boolean;
  adminUrl: string;
}) {
  const fullName = `${opts.firstName} ${opts.lastName}`;
  const seatLabel = opts.seatType === 'office' ? 'Office' : 'Desk';
  const seatValue = opts.seatNumber || 'Not selected yet';

  // What the team still has to do for this member, in the order it usually
  // happens. Kept short so it reads as a checklist, not a wall of text.
  const todos: string[] = [];
  if (!opts.hasAccessCode) {
    todos.push(
      'Generate on Alarm.com and issue their 24/7 access code once they request it (they were told codes are only needed outside 8 AM – 6 PM weekdays).'
    );
  }
  if (opts.seatType && !opts.seatNumber) {
    todos.push(
      `They have not picked a ${opts.seatType === 'office' ? 'office' : 'desk'} yet — you'll get a separate "workspace assignment updated" email when they do, then confirm the seat is really free.`
    );
  } else if (opts.seatNumber) {
    todos.push(
      `Confirm ${seatLabel.toLowerCase()} ${opts.seatNumber} is actually free and update the building records / seating chart.`
    );
  }
  todos.push('Say hello on their first day and offer a walkthrough of the space.');

  const todosHtml = todos.map((t) => `<li style="margin-bottom:6px;">${t}</li>`).join('');
  const todosText = todos.map((t) => `  - ${t}`).join('\n');

  return {
    subject: `New member signed up — ${fullName} (${opts.designationLabel})`,
    html: shell({
      title: 'New Member Signed Up',
      tagline: 'Onboarding portal completed',
      body: `
        <p><strong>${escapeHtml(fullName)}</strong> has completed the onboarding portal — documents uploaded, agreements signed, and payment set up. They are now an active member and their portal is unlocked.</p>

        <div class="info-card">
          <h3 style="margin-top:0;">Member</h3>
          <p style="margin:0 0 6px;"><strong>Name:</strong> ${escapeHtml(fullName)}${opts.companyName ? ` — ${escapeHtml(opts.companyName)}` : ''}</p>
          <p style="margin:0 0 6px;"><strong>Email:</strong> <a href="mailto:${escapeHtml(opts.email)}">${escapeHtml(opts.email)}</a></p>
          ${opts.phone ? `<p style="margin:0 0 6px;"><strong>Phone:</strong> ${escapeHtml(opts.phone)}</p>` : ''}
          <p style="margin:0;"><strong>Signed up:</strong> ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Denver' })} (MT)</p>
        </div>

        <div class="info-card">
          <h3 style="margin-top:0;">What they signed up for</h3>
          <p style="margin:0 0 6px;"><strong>Membership:</strong> ${escapeHtml(opts.designationLabel)}${opts.isLegacyMember ? ' <span style="color:#666;">(existing-member migration)</span>' : ''}</p>
          <p style="margin:0 0 6px;"><strong>Space:</strong> ${escapeHtml(opts.spaceSummary)}</p>
          <p style="margin:0 0 6px;"><strong>${seatLabel}:</strong> ${escapeHtml(seatValue)}</p>
          <p style="margin:0 0 6px;"><strong>Monthly cost:</strong> ${escapeHtml(opts.costLine)}</p>
          ${opts.initialChargeLabel ? `<p style="margin:0 0 6px;"><strong>Charged at signup:</strong> ${escapeHtml(opts.initialChargeLabel)}</p>` : ''}
          ${opts.paymentMethodLabel ? `<p style="margin:0 0 6px;"><strong>Payment method:</strong> ${escapeHtml(opts.paymentMethodLabel)}</p>` : ''}
          ${opts.nextChargeLabel ? `<p style="margin:0 0 6px;"><strong>Next charge:</strong> ${escapeHtml(opts.nextChargeLabel)}</p>` : ''}
          ${opts.startDateLabel ? `<p style="margin:0;"><strong>Start date:</strong> ${escapeHtml(opts.startDateLabel)}</p>` : ''}
        </div>

        <div class="highlight">
          <h3 style="margin:0 0 10px;">To do</h3>
          <ul style="margin:0; padding-left:18px;">
            ${todosHtml}
          </ul>
          ${
            opts.seatType === 'desk' && !opts.seatNumber && opts.availableDesksLabel
              ? `<p style="margin:10px 0 0;font-size:13px;color:#555;">Desks free right now: ${opts.availableDesksLabel}</p>`
              : ''
          }
        </div>

        <p style="margin-top:16px;">The member has been sent their own welcome email with WiFi, access-code rules, desk selection, and building info.</p>

        <p style="text-align:center;">
          <a href="${opts.adminUrl}" class="button">Open Member in Admin Panel</a>
        </p>
      `,
    }),
    text: [
      `${fullName} has completed the onboarding portal — documents uploaded, agreements signed, and payment set up. They are now an active member and their portal is unlocked.`,
      '',
      'MEMBER',
      `  Name:  ${fullName}${opts.companyName ? ` — ${opts.companyName}` : ''}`,
      `  Email: ${opts.email}`,
      opts.phone ? `  Phone: ${opts.phone}` : '',
      `  Signed up: ${new Date().toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Denver' })} (MT)`,
      '',
      'WHAT THEY SIGNED UP FOR',
      `  Membership:  ${opts.designationLabel}${opts.isLegacyMember ? ' (existing-member migration)' : ''}`,
      `  Space:       ${opts.spaceSummary}`,
      `  ${seatLabel}:${' '.repeat(Math.max(1, 13 - seatLabel.length))}${seatValue}`,
      `  Monthly cost: ${opts.costLine}`,
      opts.initialChargeLabel ? `  Charged at signup: ${opts.initialChargeLabel}` : '',
      opts.paymentMethodLabel ? `  Payment method: ${opts.paymentMethodLabel}` : '',
      opts.nextChargeLabel ? `  Next charge: ${opts.nextChargeLabel}` : '',
      opts.startDateLabel ? `  Start date: ${opts.startDateLabel}` : '',
      '',
      'TO DO',
      todosText,
      opts.seatType === 'desk' && !opts.seatNumber && opts.availableDesksLabel
        ? `  Desks free right now: ${opts.availableDesksLabel}`
        : '',
      '',
      'The member has been sent their own welcome email with WiFi, access-code rules, desk selection, and building info.',
      '',
      `Open member in admin panel: ${opts.adminUrl}`,
    ]
      .filter((line) => line !== '')
      .join('\n'),
  };
}

// Staff inboxes that receive member-lifecycle notifications (cancellations,
// never-paid removals). Both the member-services and onboarding/manager
// mailboxes are notified so whoever handles offboarding (inspection, key
// return, freeing the seat) sees it.
export const STAFF_NOTIFICATION_EMAILS = [
  'memberservices@merrittworkspace.net',
  'manager@merrittworkspace.net',
];

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

// Mailbox used for `List-Unsubscribe`. Receivers prefer a monitored
// member-services address over a no-reply pattern.
export const PORTAL_LIST_UNSUBSCRIBE_MAILBOX =
  'memberservices@merrittworkspace.net';

// Headers we attach to every automated/transactional send. These are
// the levers that demonstrably move messages from junk into the primary
// inbox at Gmail, Outlook, Yahoo, and Apple Mail:
//
//   • `List-Unsubscribe` (RFC 2369) + `List-Unsubscribe-Post` (RFC 8058)
//     — required by Gmail and Yahoo's Feb 2024 sender rules. Even on
//     low-volume transactional mail this is now scored as a positive
//     "legitimate sender" signal. We expose a mailto: option (and
//     One-Click) so receivers can render the native "Unsubscribe"
//     button next to the From address; messages that have it are far
//     less likely to be classified as spam.
//   • `Auto-Submitted: auto-generated` (RFC 3834) — flags the message
//     as automated. Stops mailbox auto-responders from replying to it
//     and tells receivers this is a system message, not a personal
//     conversation, which improves filter scoring.
//   • `Precedence: bulk` is INTENTIONALLY OMITTED — for one-to-one
//     transactional mail (approval, password reset) it suppresses
//     priority inbox placement at Gmail. We want these in the primary
//     inbox.
//   • `X-Entity-Ref-ID` — a unique-per-message id. Prevents Gmail from
//     collapsing distinct transactional sends into a single thread
//     (which can trigger "looks like a marketing blast" heuristics)
//     and gives us a traceable id in Resend logs.
//
// NOTE: These headers help, but the dominant factor in inbox
// placement is DNS authentication (SPF, DKIM, DMARC) on
// `merrittworkspace.net` plus the sending domain's reputation with
// Resend. If approval mail is still hitting spam after this change,
// verify in the Resend dashboard that the domain shows:
//   ✓ SPF verified (TXT include for Resend)
//   ✓ DKIM verified (CNAME records)
//   ✓ DMARC published (TXT `_dmarc` record, at minimum `p=none`
//     with an `rua` reporting address)
// — and ask the affected recipient to mark a past message "Not Spam"
// once; that single user signal trains their account permanently.
export function getTransactionalEmailHeaders(opts?: {
  entityRefId?: string;
}): Record<string, string> {
  const id = opts?.entityRefId ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  return {
    'List-Unsubscribe': `<mailto:${PORTAL_LIST_UNSUBSCRIBE_MAILBOX}?subject=unsubscribe>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    'Auto-Submitted': 'auto-generated',
    'X-Entity-Ref-ID': id,
  };
}

// ------------------------------------------------------------------
// Monthly dues summary (staff only — never sent to members).
// Sent on the 7th of each month, after the 1st-of-month subscription
// charges have run and ACH payments have had time to clear.
// ------------------------------------------------------------------

export type DuesSummaryEmailEntry = {
  memberName: string;
  email: string;
  amount: string; // pre-formatted, e.g. "1,250.00"
  description: string;
  date: string; // pre-formatted display date, may be ''
};

export type DuesSummaryMissingEntry = {
  memberName: string;
  email: string;
  expectedAmount: string | null; // pre-formatted, null if unknown
};

function duesTableHtml(
  entries: DuesSummaryEmailEntry[],
  dateHeader: string
): string {
  const rows = entries
    .map(
      (e) => `
            <tr>
              <td style="padding:8px 10px;border-bottom:1px solid #e5e5e5;">${e.memberName}<br/><span style="color:#666;font-size:12px;">${e.email}</span></td>
              <td style="padding:8px 10px;border-bottom:1px solid #e5e5e5;text-align:right;white-space:nowrap;">$${e.amount}</td>
              <td style="padding:8px 10px;border-bottom:1px solid #e5e5e5;white-space:nowrap;">${e.date}</td>
            </tr>`
    )
    .join('');
  return `
          <table style="width:100%;border-collapse:collapse;margin:10px 0;">
            <thead>
              <tr>
                <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #ccc;">Member</th>
                <th style="padding:8px 10px;text-align:right;border-bottom:2px solid #ccc;">Amount</th>
                <th style="padding:8px 10px;text-align:left;border-bottom:2px solid #ccc;">${dateHeader}</th>
              </tr>
            </thead>
            <tbody>${rows}
            </tbody>
          </table>`;
}

function duesTableText(entries: DuesSummaryEmailEntry[]): string {
  return entries
    .map(
      (e) =>
        `  - ${e.memberName}${e.email ? ` (${e.email})` : ''} — $${e.amount}${e.date ? ` — ${e.date}` : ''}`
    )
    .join('\n');
}

export function monthlyDuesSummaryEmail(opts: {
  monthLabel: string; // e.g. "July 2026"
  totalCollected: string; // pre-formatted, e.g. "5,400.00"
  paid: DuesSummaryEmailEntry[];
  failed: DuesSummaryEmailEntry[];
  pending: DuesSummaryEmailEntry[];
  refunded: DuesSummaryEmailEntry[];
  noCharge: DuesSummaryMissingEntry[];
}) {
  const { monthLabel, totalCollected, paid, failed, pending, refunded, noCharge } = opts;
  const problemCount = failed.length + noCharge.length;

  const subject =
    problemCount > 0
      ? `⚠️ Monthly Dues Summary — ${monthLabel}: ${failed.length} failed, ${noCharge.length} missing, ${paid.length} paid`
      : `Monthly Dues Summary — ${monthLabel}: ${paid.length} paid, $${totalCollected} collected`;

  // --- Failed payments: the section staff must never miss. Rendered in
  // red at the very top when present; replaced by a green all-clear when
  // there is nothing to chase.
  const failedHtml = failed.length
    ? `
        <div style="background:#fdecea;border-left:4px solid #dc3545;padding:20px;border-radius:8px;margin:20px 0;">
          <h3 style="margin-top:0;color:#b02a37;">🚨 Failed payments — action required (${failed.length})</h3>
          <p style="margin:0 0 6px;">These members' dues were <strong>NOT collected</strong>. Please follow up with each member and retry the charge from Stripe.</p>
          ${duesTableHtml(failed, 'Attempted')}
        </div>`
    : `
        <div style="background:#e8f5e8;border-left:4px solid #28a745;padding:16px 20px;border-radius:8px;margin:20px 0;">
          <p style="margin:0;"><strong>✅ No failed payments this month.</strong></p>
        </div>`;

  const noChargeHtml = noCharge.length
    ? `
        <div class="highlight">
          <h3 style="margin-top:0;color:#ad4a00;">⚠️ No charge recorded (${noCharge.length})</h3>
          <p style="margin:0 0 6px;">These members have an active subscription on file but <strong>no dues charge appeared this month</strong> — the charge may never have been attempted. Please verify each one in Stripe.</p>
          <ul style="margin:6px 0 0;padding-left:20px;">
            ${noCharge
              .map(
                (m) =>
                  `<li>${m.memberName}${m.email ? ` (${m.email})` : ''}${m.expectedAmount ? ` — expected $${m.expectedAmount}/mo` : ''}</li>`
              )
              .join('')}
          </ul>
        </div>`
    : '';

  const pendingHtml = pending.length
    ? `
        <div class="info-card">
          <h3 style="margin-top:0;">⏳ Still processing (${pending.length})</h3>
          <p style="margin:0 0 6px;">These payments (typically ACH) had not settled when this summary was generated. They should clear within a few business days — if they are still outstanding next week, check Stripe.</p>
          ${duesTableHtml(pending, 'Initiated')}
        </div>`
    : '';

  const refundedHtml = refunded.length
    ? `
        <div class="info-card">
          <h3 style="margin-top:0;">↩️ Refunded this month (${refunded.length})</h3>
          ${duesTableHtml(refunded, 'Date')}
        </div>`
    : '';

  const paidHtml = paid.length
    ? `
        <h3 style="margin:24px 0 4px;">Payments received (${paid.length}) — $${totalCollected} total</h3>
        ${duesTableHtml(paid, 'Paid on')}`
    : `
        <div style="background:#fdecea;border-left:4px solid #dc3545;padding:16px 20px;border-radius:8px;margin:20px 0;">
          <p style="margin:0;"><strong>No successful dues payments were recorded this month.</strong> If charges were expected, check Stripe and the webhook configuration.</p>
        </div>`;

  const html = shell({
    title: 'Monthly Dues Summary',
    tagline: monthLabel,
    body: `
        <p>Here is the membership dues summary for <strong>${monthLabel}</strong>. Monthly charges run on the 1st; this report is generated on the 7th so ACH payments have had time to clear.</p>
        <div class="info-card">
          <h3 style="margin-top:0;">At a glance</h3>
          <p><strong>Collected:</strong> $${totalCollected} (${paid.length} payment${paid.length === 1 ? '' : 's'})</p>
          <p><strong>Failed:</strong> ${failed.length}</p>
          ${noCharge.length ? `<p><strong>No charge recorded:</strong> ${noCharge.length}</p>` : ''}
          ${pending.length ? `<p><strong>Still processing:</strong> ${pending.length}</p>` : ''}
          ${refunded.length ? `<p><strong>Refunded:</strong> ${refunded.length}</p>` : ''}
        </div>
        ${failedHtml}
        ${noChargeHtml}
        ${pendingHtml}
        ${refundedHtml}
        ${paidHtml}
        <p style="font-size:13px;color:#666;margin-top:24px;">This is an automated internal summary for Merritt Workspace staff. Members do not receive this email. Full payment details are available in Stripe and the admin panel.</p>
      `,
  });

  const textSections: string[] = [
    [
      `MONTHLY DUES SUMMARY — ${monthLabel}`,
      'Charges run on the 1st; this report is generated on the 7th so ACH payments have had time to clear.',
    ].join('\n'),
    [
      'AT A GLANCE',
      `  Collected: $${totalCollected} (${paid.length} payment${paid.length === 1 ? '' : 's'})`,
      `  Failed: ${failed.length}`,
      noCharge.length ? `  No charge recorded: ${noCharge.length}` : '',
      pending.length ? `  Still processing: ${pending.length}` : '',
      refunded.length ? `  Refunded: ${refunded.length}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    failed.length
      ? [
          `!!! FAILED PAYMENTS — ACTION REQUIRED (${failed.length}) !!!`,
          "These members' dues were NOT collected. Follow up with each member and retry the charge from Stripe.",
          duesTableText(failed),
        ].join('\n')
      : 'No failed payments this month.',
    noCharge.length
      ? [
          `NO CHARGE RECORDED (${noCharge.length})`,
          'Active subscription on file but no dues charge appeared this month — verify in Stripe.',
          noCharge
            .map(
              (m) =>
                `  - ${m.memberName}${m.email ? ` (${m.email})` : ''}${m.expectedAmount ? ` — expected $${m.expectedAmount}/mo` : ''}`
            )
            .join('\n'),
        ].join('\n')
      : '',
    pending.length
      ? [
          `STILL PROCESSING (${pending.length})`,
          'Not yet settled (typically ACH); should clear within a few business days.',
          duesTableText(pending),
        ].join('\n')
      : '',
    refunded.length
      ? [`REFUNDED THIS MONTH (${refunded.length})`, duesTableText(refunded)].join('\n')
      : '',
    paid.length
      ? [
          `PAYMENTS RECEIVED (${paid.length}) — $${totalCollected} TOTAL`,
          duesTableText(paid),
        ].join('\n')
      : 'NO SUCCESSFUL DUES PAYMENTS WERE RECORDED THIS MONTH. If charges were expected, check Stripe and the webhook configuration.',
    'Automated internal summary for Merritt Workspace staff — members do not receive this email.',
  ];
  const text = textSections.filter(Boolean).join('\n\n');

  return { subject, html, text };
}

// ------------------------------------------------------------------
// Supabase keep-alive failure (staff only — never sent to members).
// Fired by /api/cron/supabase-keep-alive when the daily liveness read
// fails. The likely cause is the exact thing the keep-alive exists to
// prevent: a paused Free-plan project, which only a human can restore
// from the Supabase dashboard. The restore steps are in the email so
// whoever opens it can act without hunting for them.
// ------------------------------------------------------------------

export function supabaseKeepAliveFailureEmail(opts: {
  errorMessage: string;
  tableName: string;
  ranAtLabel: string;
}) {
  const safeError = escapeHtml(opts.errorMessage);
  return {
    subject: '🚨 Merritt Workspace database keep-alive FAILED',
    html: shell({
      title: 'Database Keep-Alive Failed',
      tagline: 'The daily Supabase liveness check could not read the database',
      body: `
        <p>The daily keep-alive read against <strong>${escapeHtml(
          opts.tableName
        )}</strong> failed at ${escapeHtml(opts.ranAtLabel)}.</p>
        <div class="highlight">
          <p style="margin:0;"><strong>Error:</strong> ${safeError}</p>
        </div>
        <p>The most likely cause is a <strong>paused Supabase project</strong>.
        Free-plan projects are paused after about 7 days with no database
        activity, and only a human can bring one back.</p>
        <div class="info-card">
          <p style="margin:0 0 6px;"><strong>What to do:</strong></p>
          <p style="margin:0 0 6px;">1. Open the Supabase dashboard and check this project's status.</p>
          <p style="margin:0 0 6px;">2. If it is paused, click <strong>Restore project</strong> and wait for it to come back.</p>
          <p style="margin:0 0 6px;">3. If it is not paused, check the Supabase status page and the Vercel logs for <code>/api/cron/supabase-keep-alive</code>.</p>
          <p style="margin:0;">4. Until it is restored, the member portal, bookings, and the snack shop are all down.</p>
        </div>
        <p>This alert is sent at most once per UTC day, so it will repeat
        tomorrow if the problem is still there.</p>
      `,
    }),
    text: [
      `The daily Supabase keep-alive read against ${opts.tableName} failed at ${opts.ranAtLabel}.`,
      '',
      `Error: ${opts.errorMessage}`,
      '',
      'The most likely cause is a paused Supabase project. Free-plan projects are',
      'paused after about 7 days with no database activity, and only a human can',
      'bring one back.',
      '',
      'WHAT TO DO',
      "1. Open the Supabase dashboard and check this project's status.",
      '2. If it is paused, click "Restore project" and wait for it to come back.',
      '3. If it is not paused, check the Supabase status page and the Vercel logs',
      '   for /api/cron/supabase-keep-alive.',
      '4. Until it is restored, the member portal, bookings, and the snack shop are',
      '   all down.',
      '',
      'This alert is sent at most once per UTC day, so it will repeat tomorrow if',
      'the problem is still there.',
    ].join('\n'),
  };
}
