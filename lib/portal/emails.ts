// Branded HTML email templates for portal/admin notifications.
// Mirrors the style used in `lib/resend.ts` (orange gradient header,
// bordered content card, gray footer) so portal mail looks consistent
// with snackshop / booking confirmations.

const FOOTER = `
  <div class="footer">
    <p><strong>Merritt Workspace</strong></p>
    <p>2246 Irving Street, Denver, CO 80211</p>
    <p>manager@merrittworkspace.net</p>
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
}) {
  return {
    subject: 'Welcome to Merritt Workspace — Next Steps',
    html: shell({
      title: 'Welcome to Merritt Workspace',
      tagline: 'Your application has been approved 🎉',
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
          <a href="${opts.portalUrl}" class="button">Open Member Portal</a>
        </p>
        <p>You'll also receive a separate email from Supabase with a one-click invite link. Click it to sign in for the first time — you'll be taken to a page where you can <strong>choose your own password</strong> for future sign-ins.</p>
        <p>Welcome aboard,<br/>— The Merritt Workspace Team</p>
      `,
    }),
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
  };
}

export function accessCodeRequestedAdminEmail(opts: {
  firstName: string;
  lastName: string;
  email: string;
  adminUrl: string;
}) {
  return {
    subject: `Access code requested — ${opts.firstName} ${opts.lastName}`,
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
  };
}

export const PORTAL_FROM = 'Merritt Workspace <manager@merrittworkspace.net>';
