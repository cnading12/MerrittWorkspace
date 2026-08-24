import { Resend } from 'resend';
import { type Order, type OrderItem } from './snackshop';
import { type Booking } from './supabase';
import { getTransactionalEmailHeaders } from './portal/emails';

// Lazy-load Resend client to avoid build-time errors
let resendClient: Resend | null = null;

function getResend(): Resend {
    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

// Helper to get the resend instance
const resend = {
    emails: {
        send: (params: Parameters<Resend['emails']['send']>[0]) => getResend().emails.send(params)
    }
};

// Helper to avoid Resend rate limit (2 req/sec on free plan)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Merritt Workspace is in Denver. Format all customer-facing timestamps in
// America/Denver so the displayed time matches when the email actually arrives,
// regardless of the server's timezone (Vercel runs in UTC).
const DENVER_TZ = 'America/Denver';

const formatDenverDateTime = (
    date: Date | string = new Date(),
    opts: Intl.DateTimeFormatOptions = {}
): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: DENVER_TZ,
        timeZoneName: 'short',
        ...opts,
    });
};

// booking_date is stored as a YYYY-MM-DD date with no time component. Anchor it
// to noon UTC so it renders as the same calendar day in every timezone.
const formatBookingDate = (
    dateStr: string,
    opts: Intl.DateTimeFormatOptions = {}
): string => {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(dateStr)
        ? new Date(`${dateStr}T12:00:00Z`)
        : new Date(dateStr);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: DENVER_TZ,
        ...opts,
    });
};

// Centralized email configuration
const MANAGER_EMAIL = 'manager@merrittworkspace.net';
const MEMBER_SERVICES_EMAIL = 'memberservices@merrittworkspace.net';

// Production site URL. Emails require absolute asset URLs — relative paths
// (e.g. "/images/...") won't resolve inside a mail client. We reference the
// logo as a PNG rather than the navbar's WebP because several email clients
// (notably Outlook desktop) don't render WebP.
const SITE_URL = 'https://merrittworkspace.net';
const LOGO_URL = `${SITE_URL}/images/brand/logo.png`;

// White header band carrying the Merritt Workspace logo. Sits above the orange
// gradient banner so the logo appears on white (as it does in the site navbar),
// keeping it crisp instead of muddy against the orange. Inline styles are used
// for broad email-client compatibility.
const EMAIL_LOGO_BAND = `
            <div style="background:#ffffff;text-align:center;padding:24px 20px 12px;border-radius:8px 8px 0 0;">
              <img src="${LOGO_URL}" alt="Merritt Workspace" width="200" style="display:inline-block;width:200px;max-width:75%;height:auto;border:0;" />
            </div>`;

// Email templates and functions
export const emailTemplates = {
    // Snackshop Order Confirmation
    orderConfirmation: (data: {
        customerName: string;
        order: Order;
        items: Array<{
            product_name: string;
            quantity: number;
            unit_price: number;
            total_price: number;
        }>;
    }) => ({
        subject: `Order Confirmation - ${data.order.order_number} | Merritt Workspace Snackshop`,
        html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 30px; text-align: center; border-radius: 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
            .order-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
            .items-table th { background: #f8f9fa; font-weight: 600; }
            .total-row { font-weight: bold; border-top: 2px solid #ed7611; }
            .delivery-info { background: #fff8e1; padding: 20px; border-radius: 8px; border-left: 4px solid #ed7611; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #ed7611; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
            .status-badge { background: #28a745; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            ${EMAIL_LOGO_BAND}
            <div class="header">
              <h1>Order Confirmation</h1>
              <p>Thank you for your Snackshop order!</p>
            </div>
            
            <div class="content">
              <p>Hi ${data.customerName},</p>
              
              <p>Your order has been confirmed and is being prepared. Here are your order details:</p>
              
              <div class="order-info">
                <h3 style="margin-top: 0;">Order Information</h3>
                <p><strong>Order Number:</strong> ${data.order.order_number}</p>
                <p><strong>Office/Desk:</strong> ${data.order.office_number}</p>
                <p><strong>Order Date:</strong> ${formatDenverDateTime(data.order.created_at)}</p>
                <p><strong>Status:</strong> <span class="status-badge">${data.order.status.replace('_', ' ').toUpperCase()}</span></p>
                ${data.order.delivery_notes ? `<p><strong>Delivery Notes:</strong> ${data.order.delivery_notes}</p>` : ''}
              </div>

              <h3>Your Items</h3>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.items.map(item => `
                    <tr>
                      <td>${item.product_name}</td>
                      <td>${item.quantity}</td>
                      <td>$${item.unit_price.toFixed(2)}</td>
                      <td>$${item.total_price.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                  <tr class="total-row">
                    <td colspan="3"><strong>Total Amount</strong></td>
                    <td><strong>$${data.order.total_amount.toFixed(2)}</strong></td>
                  </tr>
                </tbody>
              </table>

              <div class="delivery-info">
                <h3 style="margin-top: 0;">📍 Delivery Information</h3>
                <p><strong>Your items will be delivered directly to ${data.order.office_number} within 15 minutes.</strong></p>
                <p>If you're not at your desk, we'll leave items at your designated location with a note.</p>
              </div>

              <p>If you have any questions or need to make changes to your order, please contact us immediately.</p>
            </div>
            
            <div class="footer">
              <p><strong>Merritt Workspace Snackshop</strong></p>
              <p>2246 Irving Street, Denver, CO 80211</p>
              <p>Email: memberservices@merrittworkspace.net | Phone: (303) 359-8337</p>
            </div>
          </div>
        </body>
      </html>
    `,
        text: `
Order Confirmation - ${data.order.order_number}

Hi ${data.customerName},

Your Snackshop order has been confirmed! Here are the details:

Order Number: ${data.order.order_number}
Office/Desk: ${data.order.office_number}
Order Date: ${formatDenverDateTime(data.order.created_at)}
Status: ${data.order.status.replace('_', ' ').toUpperCase()}

Items Ordered:
${data.items.map(item => `- ${item.product_name} (Qty: ${item.quantity}) - $${item.total_price.toFixed(2)}`).join('\n')}

Total Amount: $${data.order.total_amount.toFixed(2)}

Your items will be delivered to ${data.order.office_number} within 15 minutes.

${data.order.delivery_notes ? `Delivery Notes: ${data.order.delivery_notes}` : ''}

Questions? Contact us at memberservices@merrittworkspace.net or (303) 359-8337

Thank you for your order!

Merritt Workspace Team
2246 Irving Street, Denver, CO 80211
    `
    }),

    // Meeting Room Booking Confirmation
    bookingConfirmation: (data: {
        customerName: string;
        booking: Booking;
        roomName: string;
    }) => ({
        subject: `Meeting Room Confirmed - ${formatBookingDate(data.booking.booking_date)} | Merritt Workspace`,
        html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Meeting Room Booking Confirmation</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 30px; text-align: center; border-radius: 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
            .booking-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .calendar-button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-radius: 0 0 8px 8px; }
            .status-badge { background: #28a745; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            ${EMAIL_LOGO_BAND}
            <div class="header">
              <h1>Booking Confirmed</h1>
              <p>Your meeting room is reserved!</p>
            </div>
            
            <div class="content">
              <p>Hi ${data.customerName},</p>
              
              <p>Your meeting room booking has been confirmed. Here are your booking details:</p>
              
              <div class="booking-info">
                <h3 style="margin-top: 0;">Booking Information</h3>
                <p><strong>Room:</strong> ${data.roomName}</p>
                <p><strong>Date:</strong> ${formatBookingDate(data.booking.booking_date, { weekday: 'long' })}</p>
                <p><strong>Time:</strong> ${data.booking.start_time} - ${data.booking.end_time}</p>
                <p><strong>Duration:</strong> ${data.booking.duration_hours} hour${data.booking.duration_hours > 1 ? 's' : ''}</p>
                <p><strong>Attendees:</strong> ${data.booking.attendees}</p>
                <p><strong>Total Cost:</strong> ${data.booking.total_amount.toFixed(2)}</p>
                <p><strong>Booking ID:</strong> ${data.booking.id}</p>
                ${data.booking.purpose ? `<p><strong>Purpose:</strong> ${data.booking.purpose}</p>` : ''}
              </div>

              <p><strong>Location:</strong> Merritt Workspace, 2246 Irving Street, Denver, CO 80211</p>
              
              <p>The room includes:</p>
              <ul>
                <li>75" Smart TV with wireless presentation</li>
                <li>High-speed WiFi</li>
                <li>Conference calling capabilities</li>
                <li>Comfortable seating for up to 8 people</li>
                <li>Access to our snackshop for refreshments</li>
              </ul>

              <p>If you need to make any changes or cancel your booking, please contact us as soon as possible.</p>
              
              <a href="#" class="calendar-button">📅 Add to Calendar</a>
            </div>
            
            <div class="footer">
              <p><strong>Merritt Workspace</strong></p>
              <p>2246 Irving Street, Denver, CO 80211</p>
              <p>Email: memberservices@merrittworkspace.net | Phone: (303) 359-8337</p>
            </div>
          </div>
        </body>
      </html>
    `,
        text: `
Meeting Room Booking Confirmation

Hi ${data.customerName},

Your meeting room booking has been confirmed!

Booking Details:
- Room: ${data.roomName}
- Date: ${formatBookingDate(data.booking.booking_date, { weekday: 'long' })}
- Time: ${data.booking.start_time} - ${data.booking.end_time}
- Duration: ${data.booking.duration_hours} hour${data.booking.duration_hours > 1 ? 's' : ''}
- Attendees: ${data.booking.attendees}
- Total Cost: ${data.booking.total_amount.toFixed(2)}
- Booking ID: ${data.booking.id}
${data.booking.purpose ? `- Purpose: ${data.booking.purpose}` : ''}

Location: Merritt Workspace, 2246 Irving Street, Denver, CO 80211

Room includes:
- 75" Smart TV with wireless presentation
- High-speed WiFi
- Conference calling capabilities
- Comfortable seating for up to 8 people
- Access to our snackshop for refreshments

If you need to make changes or cancel, please contact us immediately.

Contact: memberservices@merrittworkspace.net | (303) 359-8337

Thank you for choosing Merritt Workspace!
    `
    }),

    // Membership Application Confirmation
    membershipApplication: (data: {
        applicantName: string;
        email: string;
        membershipType: string;
        applicationId: string;
    }) => ({
        subject: `Membership Application Received | Merritt Workspace`,
        html: `
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
            .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
            .application-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .next-steps { background: #fff8e1; padding: 20px; border-radius: 8px; border-left: 4px solid #ed7611; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #ed7611; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            ${EMAIL_LOGO_BAND}
            <div class="header">
              <h1>Welcome to Merritt Workspace!</h1>
              <p>Your membership application has been received</p>
            </div>
            
            <div class="content">
              <p>Hi ${data.applicantName},</p>
              
              <p>Thank you for your interest in joining the Merritt Workspace community! We've received your membership application and are excited to review it.</p>
              
              <div class="application-info">
                <h3 style="margin-top: 0;">Application Details</h3>
                <p><strong>Applicant:</strong> ${data.applicantName}</p>
                <p><strong>Email:</strong> ${data.email}</p>
                <p><strong>Membership Type:</strong> ${data.membershipType}</p>
                <p><strong>Application ID:</strong> ${data.applicationId}</p>
                <p><strong>Submitted:</strong> ${formatDenverDateTime()}</p>
              </div>

              <div class="next-steps">
                <h3 style="margin-top: 0;">🎯 What's Next?</h3>
                <ol>
                  <li><strong>Review Process:</strong> Our team will review your application within 1-2 business days</li>
                  <li><strong>Schedule Tour:</strong> We'll contact you to schedule a complimentary workspace tour</li>
                  <li><strong>Meet the Team:</strong> Get to know our community and see our burnt orange floors firsthand!</li>
                  <li><strong>Free Trial Day:</strong> Experience working in our space with a full day trial</li>
                </ol>
              </div>

              <p>While you wait, feel free to explore our amenities:</p>
              <ul>
                <li>Premium meeting rooms with A/V equipment</li>
                <li>High-speed WiFi throughout the building</li>
                <li>On-site snackshop with fresh coffee and meals</li>
                <li>Secure building with 24/7 access</li>
                <li>Networking events and community gatherings</li>
                <li>Prime Sloan's Lake location - just 3 minutes to I-25</li>
              </ul>

              <p>We'll be in touch soon to move forward with your membership. Thank you for choosing Merritt Workspace!</p>
              
              <a href="mailto:manager@merrittworkspace.net" class="button">Questions? Contact Us</a>
            </div>

            <div class="footer">
              <p><strong>Merritt Workspace</strong></p>
              <p>Where Work Meets Community</p>
              <p>2246 Irving Street, Denver, CO 80211</p>
              <p>Email: manager@merrittworkspace.net | Phone: (720) 357-9499</p>
            </div>
          </div>
        </body>
      </html>
    `,
        text: `
Membership Application Received - Merritt Workspace

Hi ${data.applicantName},

Thank you for applying to join Merritt Workspace! We've received your application and are excited to review it.

Application Details:
- Applicant: ${data.applicantName}
- Email: ${data.email}
- Membership Type: ${data.membershipType}
- Application ID: ${data.applicationId}
- Submitted: ${formatDenverDateTime()}

What's Next:
1. Review Process: Our team will review your application within 1-2 business days
2. Schedule Tour: We'll contact you to schedule a complimentary workspace tour
3. Meet the Team: Get to know our community and see our burnt orange floors!
4. Free Trial Day: Experience working in our space with a full day trial

Our Amenities:
- Premium meeting rooms with A/V equipment
- High-speed WiFi throughout the building
- On-site snackshop with fresh coffee and meals
- Secure building with 24/7 access
- Networking events and community gatherings
- Prime Sloan's Lake location - just 3 minutes to I-25

We'll be in touch soon to move forward with your membership.

Questions? Contact us at manager@merrittworkspace.net or (720) 357-9499

Welcome to the community!

Merritt Workspace Team
2246 Irving Street, Denver, CO 80211
    `
    })
};

// Email sending functions
export async function sendOrderConfirmationEmail(data: {
    to: string;
    customerName: string;
    order: Order;
    items: Array<{
        product_name: string;
        quantity: number;
        unit_price: number;
        total_price: number;
    }>;
}) {
    try {
        const template = emailTemplates.orderConfirmation(data);

        // Send to customer
        const customerEmail = await resend.emails.send({
            from: 'Merritt Workspace Snackshop <memberservices@merrittworkspace.net>',
            replyTo: MEMBER_SERVICES_EMAIL,
            to: data.to,
            subject: template.subject,
            html: template.html,
            text: template.text,
            headers: getTransactionalEmailHeaders(),
            tags: [{ name: 'category', value: 'snackshop_order_confirmation' }],
        });

        await delay(1000);

        // Send copy to member services
        const memberServicesEmail = await resend.emails.send({
            from: 'Merritt Workspace Snackshop <memberservices@merrittworkspace.net>',
            to: MEMBER_SERVICES_EMAIL,
            subject: `[COPY] ${template.subject}`,
            html: `
        <div style="background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 5px;">
          <strong>📧 Customer Email Copy</strong><br>
          <strong>Sent to:</strong> ${data.to}<br>
          <strong>Customer:</strong> ${data.customerName}
        </div>
        ${template.html}
      `,
            text: `[CUSTOMER EMAIL COPY]\nSent to: ${data.to}\nCustomer: ${data.customerName}\n\n${template.text}`,
        });

        console.log('Order confirmation email sent to customer and member services:', { customerEmail, memberServicesEmail });
        return { customerEmail, memberServicesEmail };
    } catch (error) {
        console.error('Failed to send order confirmation email:', error);
        throw error;
    }
}

export async function sendBookingConfirmationEmail(data: {
    to: string;
    customerName: string;
    booking: Booking;
    roomName: string;
}) {
    try {
        const template = emailTemplates.bookingConfirmation(data);

        // Send to customer
        const customerEmail = await resend.emails.send({
            from: 'Merritt Workspace Meetings <memberservices@merrittworkspace.net>',
            replyTo: MEMBER_SERVICES_EMAIL,
            to: data.to,
            subject: template.subject,
            html: template.html,
            text: template.text,
            headers: getTransactionalEmailHeaders(),
            tags: [{ name: 'category', value: 'booking_confirmation' }],
        });

        await delay(1000);

        // Send copy to member services
        const memberServicesEmail = await resend.emails.send({
            from: 'Merritt Workspace Meetings <memberservices@merrittworkspace.net>',
            to: MEMBER_SERVICES_EMAIL,
            subject: `[COPY] ${template.subject}`,
            html: `
        <div style="background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 5px;">
          <strong>📅 Meeting Room Booking Copy</strong><br>
          <strong>Sent to:</strong> ${data.to}<br>
          <strong>Customer:</strong> ${data.customerName}<br>
          <strong>Room:</strong> ${data.roomName}<br>
          <strong>Date:</strong> ${formatBookingDate(data.booking.booking_date)} at ${data.booking.start_time}
        </div>
        ${template.html}
      `,
            text: `[MEETING BOOKING COPY]\nSent to: ${data.to}\nCustomer: ${data.customerName}\nRoom: ${data.roomName}\nDate: ${formatBookingDate(data.booking.booking_date)} at ${data.booking.start_time}\n\n${template.text}`,
        });

        console.log('Booking confirmation email sent to customer and member services:', { customerEmail, memberServicesEmail });
        return { customerEmail, memberServicesEmail };
    } catch (error) {
        console.error('Failed to send booking confirmation email:', error);
        throw error;
    }
}

export async function sendMembershipApplicationEmail(data: {
    to: string;
    applicantName: string;
    email: string;
    membershipType: string;
    applicationId: string;
}) {
    try {
        const template = emailTemplates.membershipApplication(data);

        // Send to applicant
        const applicantEmail = await resend.emails.send({
            from: 'Merritt Workspace Membership <manager@merrittworkspace.net>',
            replyTo: MANAGER_EMAIL,
            to: data.to,
            subject: template.subject,
            html: template.html,
            text: template.text,
            headers: getTransactionalEmailHeaders(),
            tags: [{ name: 'category', value: 'application_received' }],
        });

        await delay(1000);

        // Send notification to manager
        const managerEmail = await resend.emails.send({
            from: 'Merritt Workspace Membership <manager@merrittworkspace.net>',
            to: MANAGER_EMAIL,
            subject: `🆕 New Membership Application - ${data.applicantName} (${data.membershipType})`,
            html: `
        <div style="background: #f0f0f0; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
          <h3 style="margin-top: 0;">New Membership Application Received</h3>
        </div>

        <div style="background: #fff8e1; padding: 15px; border-radius: 5px; border-left: 4px solid #ed7611;">
          <h4>Application Details:</h4>
          <p><strong>Name:</strong> ${data.applicantName}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Membership Type:</strong> ${data.membershipType}</p>
          <p><strong>Application ID:</strong> ${data.applicationId}</p>
          <p><strong>Submitted:</strong> ${formatDenverDateTime()}</p>
        </div>

        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
          <h4>Next Steps:</h4>
          <ol>
            <li>Review the application in your dashboard</li>
            <li>Contact ${data.applicantName} to schedule a tour</li>
            <li>Arrange their free trial day</li>
            <li>Process membership approval</li>
          </ol>
          <p><strong>Action Required:</strong> Please follow up within 1-2 business days as promised.</p>
        </div>

        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 14px;"><em>A copy of the welcome email was also sent to the applicant.</em></p>
      `,
            text: `NEW MEMBERSHIP APPLICATION\n\nApplicant: ${data.applicantName}\nEmail: ${data.email}\nMembership Type: ${data.membershipType}\nApplication ID: ${data.applicationId}\nSubmitted: ${formatDenverDateTime()}\n\nNext Steps:\n1. Review the application\n2. Contact ${data.applicantName} to schedule a tour\n3. Arrange their free trial day\n4. Process membership approval\n\nACTION REQUIRED: Please follow up within 1-2 business days.\n\nA copy of the welcome email was also sent to the applicant.`,
        });

        await delay(1000);

        // Send notification to member services
        const memberServicesEmail = await resend.emails.send({
            from: 'Merritt Workspace Membership <manager@merrittworkspace.net>',
            to: MEMBER_SERVICES_EMAIL,
            subject: `🆕 New Membership Application - ${data.applicantName} (${data.membershipType})`,
            html: `
        <div style="background: #f0f0f0; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
          <h3 style="margin-top: 0;">New Membership Application Received</h3>
        </div>

        <div style="background: #fff8e1; padding: 15px; border-radius: 5px; border-left: 4px solid #ed7611;">
          <h4>Application Details:</h4>
          <p><strong>Name:</strong> ${data.applicantName}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Membership Type:</strong> ${data.membershipType}</p>
          <p><strong>Application ID:</strong> ${data.applicationId}</p>
          <p><strong>Submitted:</strong> ${formatDenverDateTime()}</p>
        </div>

        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
          <h4>Next Steps:</h4>
          <ol>
            <li>Review the application in your dashboard</li>
            <li>Contact ${data.applicantName} to schedule a tour</li>
            <li>Arrange their free trial day</li>
            <li>Process membership approval</li>
          </ol>
          <p><strong>Action Required:</strong> Please follow up within 1-2 business days as promised.</p>
        </div>

        <hr style="margin: 20px 0;">
        <p style="color: #666; font-size: 14px;"><em>A copy of the welcome email was also sent to the applicant.</em></p>
      `,
            text: `NEW MEMBERSHIP APPLICATION\n\nApplicant: ${data.applicantName}\nEmail: ${data.email}\nMembership Type: ${data.membershipType}\nApplication ID: ${data.applicationId}\nSubmitted: ${formatDenverDateTime()}\n\nNext Steps:\n1. Review the application\n2. Contact ${data.applicantName} to schedule a tour\n3. Arrange their free trial day\n4. Process membership approval\n\nACTION REQUIRED: Please follow up within 1-2 business days.\n\nA copy of the welcome email was also sent to the applicant.`,
        });

        console.log('Membership application email sent to applicant, manager, and member services:', { applicantEmail, managerEmail, memberServicesEmail });
        return { applicantEmail, managerEmail, memberServicesEmail };
    } catch (error) {
        console.error('Failed to send membership application email:', error);
        throw error;
    }
}

export async function sendOrderStatusUpdate(data: {
    to: string;
    customerName: string;
    orderNumber: string;
    newStatus: string;
    message?: string;
}) {
    try {
        const statusMessages = {
            preparing: 'Your order is being prepared and will be delivered shortly!',
            delivered: 'Your order has been delivered to your specified location.',
            cancelled: 'Your order has been cancelled. Any payments will be refunded.'
        };

        // Send to customer
        const customerEmail = await resend.emails.send({
            from: 'Merritt Workspace Snackshop <memberservices@merrittworkspace.net>',
            replyTo: MEMBER_SERVICES_EMAIL,
            to: data.to,
            subject: `Order Update - ${data.orderNumber} | Merritt Workspace`,
            headers: getTransactionalEmailHeaders(),
            tags: [{ name: 'category', value: 'snackshop_order_status' }],
            html: `
        <p>Hi ${data.customerName},</p>
        <p>Your order <strong>${data.orderNumber}</strong> status has been updated:</p>
        <p><strong>New Status:</strong> ${data.newStatus.replace('_', ' ').toUpperCase()}</p>
        <p>${data.message || statusMessages[data.newStatus as keyof typeof statusMessages] || 'Your order status has been updated.'}</p>
        <p>Thank you for using Merritt Workspace Snackshop!</p>
      `,
            text: `Hi ${data.customerName},\n\nYour order ${data.orderNumber} status has been updated to: ${data.newStatus.replace('_', ' ').toUpperCase()}\n\n${data.message || statusMessages[data.newStatus as keyof typeof statusMessages] || 'Your order status has been updated.'}\n\nThank you for using Merritt Workspace Snackshop!`
        });

        await delay(1000);

        // Send copy to member services
        const memberServicesEmail = await resend.emails.send({
            from: 'Merritt Workspace Snackshop <memberservices@merrittworkspace.net>',
            to: MEMBER_SERVICES_EMAIL,
            subject: `[COPY] Order Update - ${data.orderNumber}`,
            html: `
        <div style="background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 5px;">
          <strong>📦 Order Status Update Copy</strong><br>
          <strong>Sent to:</strong> ${data.to}<br>
          <strong>Customer:</strong> ${data.customerName}<br>
          <strong>Order:</strong> ${data.orderNumber}<br>
          <strong>New Status:</strong> ${data.newStatus.replace('_', ' ').toUpperCase()}
        </div>
        <p>Hi ${data.customerName},</p>
        <p>Your order <strong>${data.orderNumber}</strong> status has been updated:</p>
        <p><strong>New Status:</strong> ${data.newStatus.replace('_', ' ').toUpperCase()}</p>
        <p>${data.message || statusMessages[data.newStatus as keyof typeof statusMessages] || 'Your order status has been updated.'}</p>
        <p>Thank you for using Merritt Workspace Snackshop!</p>
      `,
            text: `[ORDER STATUS UPDATE COPY]\nSent to: ${data.to}\nCustomer: ${data.customerName}\nOrder: ${data.orderNumber}\nNew Status: ${data.newStatus.replace('_', ' ').toUpperCase()}\n\nHi ${data.customerName},\n\nYour order ${data.orderNumber} status has been updated to: ${data.newStatus.replace('_', ' ').toUpperCase()}\n\n${data.message || statusMessages[data.newStatus as keyof typeof statusMessages] || 'Your order status has been updated.'}\n\nThank you for using Merritt Workspace Snackshop!`
        });

        console.log('Order status update email sent to customer and member services:', { customerEmail, memberServicesEmail });
        return { customerEmail, memberServicesEmail };
    } catch (error) {
        console.error('Failed to send order status update email:', error);
        throw error;
    }
}

// Admin notification emails (only to manager)
export async function sendNewOrderNotification(order: Order, items: OrderItem[]) {
    try {
        // Send to member services
        const memberServicesResult = await resend.emails.send({
            from: 'Merritt Workspace Snackshop <memberservices@merrittworkspace.net>',
            to: MEMBER_SERVICES_EMAIL,
            subject: `🛒 New Snackshop Order - ${order.order_number}`,
            html: `
        <div style="background: #fff8e1; padding: 15px; margin-bottom: 20px; border-radius: 5px; border-left: 4px solid #ed7611;">
          <h2 style="margin-top: 0;">🛒 New Snackshop Order Received</h2>
        </div>

        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3>Order Details:</h3>
          <p><strong>Order Number:</strong> ${order.order_number}</p>
          <p><strong>Customer:</strong> ${order.customer_name}</p>
          <p><strong>Email:</strong> ${order.customer_email}</p>
          <p><strong>Office/Desk:</strong> ${order.office_number}</p>
          <p><strong>Total:</strong> ${order.total_amount.toFixed(2)}</p>
          <p><strong>Payment Method:</strong> ${order.payment_method}</p>
          ${order.delivery_notes ? `<p><strong>Delivery Notes:</strong> ${order.delivery_notes}</p>` : ''}
        </div>

        <h3>Items to Prepare:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Item</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Qty</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;">${item.product_name}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${item.total_price.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745;">
          <p style="margin: 0;"><strong>⏰ Action Required:</strong> Please prepare this order for delivery to <strong>${order.office_number}</strong> within 15 minutes.</p>
        </div>
      `,
            text: `NEW SNACKSHOP ORDER: ${order.order_number}\n\nCustomer: ${order.customer_name}\nEmail: ${order.customer_email}\nOffice/Desk: ${order.office_number}\nTotal: ${order.total_amount.toFixed(2)}\nPayment: ${order.payment_method}\n${order.delivery_notes ? `Notes: ${order.delivery_notes}\n` : ''}\nItems to Prepare:\n${items.map(item => `- ${item.product_name} (Qty: ${item.quantity}) - ${item.total_price.toFixed(2)}`).join('\n')}\n\nACTION REQUIRED: Please prepare this order for delivery to ${order.office_number} within 15 minutes.`
        });

        console.log('New order notification sent to member services:', { memberServicesResult });
        return { memberServicesResult };
    } catch (error) {
        console.error('Failed to send new order notification:', error);
        throw error;
    }
}

// Updated Meeting Room Booking Confirmation (supports both member and paid bookings)
export const memberBookingConfirmation = (data: {
    customerName: string;
    booking: Booking;
    roomName: string;
    isMemberBooking: boolean;
    memberHoursUsed?: number;
    remainingHours?: number;
}) => ({
    subject: `${data.isMemberBooking ? 'Member' : 'Paid'} Meeting Room Confirmed - ${formatBookingDate(data.booking.booking_date)} | Merritt Workspace`,
    html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meeting Room Booking Confirmation</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 30px; text-align: center; border-radius: 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
          .booking-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .member-badge { background: ${data.isMemberBooking ? '#28a745' : '#6c757d'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; margin-bottom: 10px; }
          .member-hours { background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; margin: 15px 0; }
          .calendar-button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-radius: 0 0 8px 8px; }
          .alert { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          ${EMAIL_LOGO_BAND}
          <div class="header">
            <h1>Booking Confirmed</h1>
            <p>Your meeting room is reserved!</p>
          </div>
          
          <div class="content">
            <span class="member-badge">${data.isMemberBooking ? '✨ MEMBER BOOKING' : '💳 PAID BOOKING'}</span>
            
            <p>Hi ${data.customerName},</p>
            
            <p>Your meeting room booking has been confirmed. Here are your booking details:</p>
            
            <div class="booking-info">
              <h3 style="margin-top: 0;">Booking Information</h3>
              <p><strong>Room:</strong> ${data.roomName}</p>
              <p><strong>Date:</strong> ${formatBookingDate(data.booking.booking_date, { weekday: 'long' })}</p>
              <p><strong>Time:</strong> ${data.booking.start_time} - ${data.booking.end_time}</p>
              <p><strong>Duration:</strong> ${data.booking.duration_hours} hour${data.booking.duration_hours > 1 ? 's' : ''}</p>
              <p><strong>Attendees:</strong> ${data.booking.attendees}</p>
              <p><strong>Total Cost:</strong> ${data.isMemberBooking ? 'FREE (Member Hours)' : `${data.booking.total_amount.toFixed(2)}`}</p>
              <p><strong>Booking ID:</strong> ${data.booking.id}</p>
              ${data.booking.purpose ? `<p><strong>Purpose:</strong> ${data.booking.purpose}</p>` : ''}
            </div>

            ${data.isMemberBooking ? `
              <div class="member-hours">
                <h4 style="margin-top: 0;">📊 Member Hours Update</h4>
                <p><strong>Hours Used for This Booking:</strong> ${data.memberHoursUsed || data.booking.duration_hours}</p>
                ${data.remainingHours !== undefined ? `<p><strong>Remaining Hours This Month:</strong> ${data.remainingHours}</p>` : ''}
                <p style="margin: 0; font-size: 14px; color: #666;">Member hours reset monthly. Need more hours? You can always book additional time with online payment.</p>
              </div>
            ` : ''}

            <p><strong>Location:</strong> Merritt Workspace, 2246 Irving Street, Denver, CO 80211</p>
            
            <p>The room includes:</p>
            <ul>
              <li>75" Smart TV with wireless presentation</li>
              <li>High-speed WiFi</li>
              <li>Conference calling capabilities</li>
              <li>Comfortable seating for up to 8 people</li>
              <li>Access to our snackshop for refreshments</li>
            </ul>

            ${data.isMemberBooking ? `
              <div class="alert">
                <p style="margin: 0;"><strong>📱 What's Next:</strong> A calendar invitation has been sent to your email. Simply show up at your scheduled time!</p>
              </div>
            ` : `
              <p>Your payment has been processed securely. A calendar invitation has been sent to your email.</p>
            `}

            <p>If you need to make any changes or cancel your booking, please contact us as soon as possible.</p>
            
            <a href="#" class="calendar-button">📅 Add to Calendar</a>
          </div>
          
          <div class="footer">
            <p><strong>Merritt Workspace</strong></p>
            <p>Where Work Meets Community</p>
            <p>2246 Irving Street, Denver, CO 80211</p>
            <p>Email: memberservices@merrittworkspace.net | Phone: (303) 359-8337</p>
          </div>
        </div>
      </body>
    </html>
  `,
    text: `
Meeting Room Booking Confirmation

Hi ${data.customerName},

Your ${data.isMemberBooking ? 'member' : 'paid'} meeting room booking has been confirmed!

Booking Details:
- Room: ${data.roomName}
- Date: ${formatBookingDate(data.booking.booking_date, { weekday: 'long' })}
- Time: ${data.booking.start_time} - ${data.booking.end_time}
- Duration: ${data.booking.duration_hours} hour${data.booking.duration_hours > 1 ? 's' : ''}
- Attendees: ${data.booking.attendees}
- Total Cost: ${data.isMemberBooking ? 'FREE (Member Hours)' : `${data.booking.total_amount.toFixed(2)}`}
- Booking ID: ${data.booking.id}
${data.booking.purpose ? `- Purpose: ${data.booking.purpose}` : ''}

${data.isMemberBooking ? `
Member Hours Update:
- Hours Used for This Booking: ${data.memberHoursUsed || data.booking.duration_hours}
${data.remainingHours !== undefined ? `- Remaining Hours This Month: ${data.remainingHours}` : ''}

Member hours reset monthly. Need more hours? You can always book additional time with online payment.
` : ''}

Location: Merritt Workspace, 2246 Irving Street, Denver, CO 80211

Room includes:
- 75" Smart TV with wireless presentation
- High-speed WiFi
- Conference calling capabilities
- Comfortable seating for up to 8 people
- Access to our snackshop for refreshments

${data.isMemberBooking ?
            'A calendar invitation has been sent to your email. Simply show up at your scheduled time!' :
            'Your payment has been processed securely. A calendar invitation has been sent to your email.'
        }

If you need to make changes or cancel, please contact us immediately.

Contact: memberservices@merrittworkspace.net | (303) 359-8337

Thank you for choosing Merritt Workspace!
  `
});

// Manager notification for member bookings
export const managerMemberBookingNotification = (data: {
    customerName: string;
    booking: Booking;
    roomName: string;
    isMemberBooking: boolean;
    memberInfo?: {
        membership_type: string;
        remaining_hours: number;
    };
}) => ({
    subject: `🏢 ${data.isMemberBooking ? 'Member' : 'Paid'} Meeting Room Booking - ${data.roomName} | ${formatBookingDate(data.booking.booking_date)}`,
    html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .booking-details { background: #fff; border: 1px solid #e5e5e5; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .member-info { background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; }
          .paid-info { background: #fff8e1; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; }
          .badge { padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; color: white; }
          .member-badge { background: #28a745; }
          .paid-badge { background: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div style="text-align:center;padding:6px 0 18px;">
            <img src="${LOGO_URL}" alt="Merritt Workspace" width="180" style="display:inline-block;width:180px;max-width:70%;height:auto;border:0;" />
          </div>
          <div class="header">
            <h2 style="margin: 0;">New Meeting Room Booking</h2>
            <span class="badge ${data.isMemberBooking ? 'member-badge' : 'paid-badge'}">
              ${data.isMemberBooking ? 'MEMBER BOOKING' : 'PAID BOOKING'}
            </span>
          </div>
          
          <div class="booking-details">
            <h3>Booking Details</h3>
            <p><strong>Customer:</strong> ${data.customerName}</p>
            <p><strong>Email:</strong> ${data.booking.customer_email}</p>
            <p><strong>Room:</strong> ${data.roomName}</p>
            <p><strong>Date:</strong> ${formatBookingDate(data.booking.booking_date, { weekday: 'long' })}</p>
            <p><strong>Time:</strong> ${data.booking.start_time} - ${data.booking.end_time}</p>
            <p><strong>Duration:</strong> ${data.booking.duration_hours} hour${data.booking.duration_hours > 1 ? 's' : ''}</p>
            <p><strong>Attendees:</strong> ${data.booking.attendees}</p>
            <p><strong>Total:</strong> ${data.isMemberBooking ? 'FREE (Member Hours)' : `${data.booking.total_amount.toFixed(2)}`}</p>
            <p><strong>Booking ID:</strong> ${data.booking.id}</p>
            ${data.booking.purpose ? `<p><strong>Purpose:</strong> ${data.booking.purpose}</p>` : ''}
          </div>
          
          ${data.isMemberBooking && data.memberInfo ? `
            <div class="member-info">
              <h4 style="margin-top: 0;">Member Information</h4>
              <p><strong>Membership Type:</strong> ${data.memberInfo.membership_type.replace('_', ' ').toUpperCase()}</p>
              <p><strong>Hours Used:</strong> ${data.booking.duration_hours}</p>
              <p><strong>Remaining Hours:</strong> ${data.memberInfo.remaining_hours}</p>
              <p style="margin: 0; font-size: 14px; color: #666;">Calendar event created automatically.</p>
            </div>
          ` : `
            <div class="paid-info">
              <h4 style="margin-top: 0;">Payment Information</h4>
              <p><strong>Amount Paid:</strong> ${data.booking.total_amount.toFixed(2)}</p>
              <p><strong>Payment Status:</strong> ${data.booking.payment_status.toUpperCase()}</p>
              <p style="margin: 0; font-size: 14px; color: #666;">Calendar event created automatically.</p>
            </div>
          `}
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="margin: 0;"><strong>📅 Next Steps:</strong> The room is reserved and a calendar event has been created. Customer confirmation email sent automatically.</p>
          </div>
        </div>
      </body>
    </html>
  `,
    text: `
NEW MEETING ROOM BOOKING - ${data.isMemberBooking ? 'MEMBER' : 'PAID'}

Customer: ${data.customerName}
Email: ${data.booking.customer_email}
Room: ${data.roomName}
Date: ${formatBookingDate(data.booking.booking_date, { weekday: 'long' })}
Time: ${data.booking.start_time} - ${data.booking.end_time}
Duration: ${data.booking.duration_hours} hour${data.booking.duration_hours > 1 ? 's' : ''}
Attendees: ${data.booking.attendees}
Total: ${data.isMemberBooking ? 'FREE (Member Hours)' : `${data.booking.total_amount.toFixed(2)}`}
Booking ID: ${data.booking.id}
${data.booking.purpose ? `Purpose: ${data.booking.purpose}` : ''}

${data.isMemberBooking && data.memberInfo ? `
MEMBER INFO:
- Membership Type: ${data.memberInfo.membership_type.replace('_', ' ').toUpperCase()}
- Hours Used: ${data.booking.duration_hours}
- Remaining Hours: ${data.memberInfo.remaining_hours}
` : `
PAYMENT INFO:
- Amount Paid: ${data.booking.total_amount.toFixed(2)}
- Payment Status: ${data.booking.payment_status.toUpperCase()}
`}

The room is reserved and a calendar event has been created. Customer confirmation email sent automatically.
  `
});

// Updated sendBookingConfirmationEmail function
export async function sendMemberBookingConfirmationEmail(data: {
    to: string;
    customerName: string;
    booking: Booking;
    roomName: string;
    isMemberBooking: boolean;
    memberHoursUsed?: number;
    remainingHours?: number;
    memberInfo?: {
        membership_type: string;
        remaining_hours: number;
    };
}) {
    try {
        const customerTemplate = memberBookingConfirmation(data);
        const managerTemplate = managerMemberBookingNotification(data);

        // Send to customer
        const customerEmail = await resend.emails.send({
            from: 'Merritt Workspace Meetings <memberservices@merrittworkspace.net>',
            replyTo: MEMBER_SERVICES_EMAIL,
            to: data.to,
            subject: customerTemplate.subject,
            html: customerTemplate.html,
            text: customerTemplate.text,
            headers: getTransactionalEmailHeaders(),
            tags: [{ name: 'category', value: 'member_booking_confirmation' }],
        });

        await delay(1000);

        // Send notification to member services
        const memberServicesEmail = await resend.emails.send({
            from: 'Merritt Workspace Meetings <memberservices@merrittworkspace.net>',
            to: MEMBER_SERVICES_EMAIL,
            subject: managerTemplate.subject,
            html: managerTemplate.html,
            text: managerTemplate.text,
        });

        console.log('Booking confirmation emails sent:', { customerEmail, memberServicesEmail });
        return { customerEmail, memberServicesEmail };
    } catch (error) {
        console.error('Failed to send booking confirmation emails:', error);
        throw error;
    }
}

// Onboarding email sent to non-members who rent the conference room.
// Mirrors the trial-day onboarding email so first-time visitors have everything
// they need (address, WiFi, parking, hours, etc.) for the day of their booking.
export const nonMemberConferenceRoomOnboarding = (data: {
    customerName: string;
    booking: Booking;
    roomName: string;
}) => {
    const firstName = (data.customerName || '').trim().split(/\s+/)[0] || 'there';
    const bookingDateDisplay = data.booking.booking_date
        ? formatBookingDate(data.booking.booking_date, { weekday: 'long' })
        : 'your scheduled day';

    return {
        subject: `Your Conference Room Booking at Merritt Workspace | What to Expect`,
        html: `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Conference Room Booking at Merritt Workspace</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 30px; text-align: center; border-radius: 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
          .info-block { background: #fff8e1; padding: 18px; border-radius: 8px; border-left: 4px solid #ed7611; margin: 18px 0; }
          .info-block h3 { margin-top: 0; color: #ad4a00; }
          .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-radius: 0 0 8px 8px; font-size: 13px; }
          ul { padding-left: 20px; }
          li { margin: 4px 0; }
          .kv td { padding: 6px 4px; border-bottom: 1px solid #eee; }
          .kv td:first-child { font-weight: 600; width: 140px; color: #555; }
        </style>
      </head>
      <body>
        <div class="container">
          ${EMAIL_LOGO_BAND}
          <div class="header">
            <h1>You're Set for Your Meeting</h1>
            <p style="margin: 8px 0 0 0;">Everything you need for your day at Merritt Workspace</p>
          </div>

          <div class="content">
            <p>Hi ${firstName},</p>

            <p>Thanks for booking the conference room at Merritt Workspace. We're looking forward to hosting you on <strong>${bookingDateDisplay}</strong>. A separate confirmation with your booking details and calendar invite has been sent — the info below covers everything you need to walk in and get to work.</p>

            <div class="info-block">
              <h3>Your booking</h3>
              <table class="kv">
                <tr><td>Room</td><td>${data.roomName}</td></tr>
                <tr><td>Date</td><td>${bookingDateDisplay}</td></tr>
                <tr><td>Time</td><td>${data.booking.start_time} – ${data.booking.end_time}</td></tr>
              </table>
            </div>

            <div class="info-block">
              <h3>Where to find us</h3>
              <table class="kv">
                <tr><td>Address</td><td>2246 Irving Street, Denver, CO 80211</td></tr>
                <tr><td>Neighborhood</td><td>Sloan's Lake — 3 minutes to I-25</td></tr>
                <tr><td>Hours</td><td>Building open Mon–Fri, 7:30 AM – 5:30 PM</td></tr>
                <tr><td>Parking</td><td>Onsite parking available</td></tr>
              </table>
            </div>

            <div class="info-block">
              <h3>When you arrive</h3>
              <ul>
                <li>No front desk — just let yourself in through the main entrance during building hours (7:30 AM – 5:30 PM).</li>
                <li>Head to ${data.roomName}; it will be reserved under your name for your booking window.</li>
                <li>Feel free to use the kitchen, snack shop, phone booths, and bathrooms while you're here.</li>
              </ul>
            </div>

            <div class="info-block">
              <h3>WiFi</h3>
              <table class="kv">
                <tr><td>Network</td><td><code>merrittcowork</code></td></tr>
                <tr><td>Password</td><td><code>Merritt23X</code></td></tr>
              </table>
            </div>

            <div class="info-block">
              <h3>What's in the room</h3>
              <ul>
                <li>75" Smart TV with wireless presentation</li>
                <li>Conference calling capabilities</li>
                <li>Comfortable seating for up to 8 people</li>
                <li>High-speed WiFi</li>
              </ul>
            </div>

            <div class="info-block">
              <h3>What to bring</h3>
              <ul>
                <li>Laptop, charger, and any adapters you need for the TV</li>
                <li>A water bottle (filtered water on tap)</li>
              </ul>
            </div>

            <div class="info-block">
              <h3>What's on us</h3>
              <ul>
                <li>Coffee, tea, and beer — help yourself in the kitchen</li>
              </ul>
            </div>

            <div class="info-block">
              <h3>Snacks &amp; other beverages (available for purchase)</h3>
              <ul>
                <li>Snacks and other drinks in the kitchen are not included with your booking.</li>
                <li>Scan the QR code posted in the kitchen — it takes you to our website where you can check out and pay.</li>
                <li>Snack shop: <a href="https://www.merrittworkspace.net/snackshop">www.merrittworkspace.net/snackshop</a></li>
              </ul>
            </div>

            <div class="info-block">
              <h3>A few house notes</h3>
              <ul>
                <li>If you need to step out for a one-on-one call, phone booths are available outside the conference room.</li>
                <li>Printers are by the kitchen.</li>
                <li>Please leave the room as you found it for the next group.</li>
              </ul>
            </div>

            <div class="info-block">
              <h3>Thinking about membership?</h3>
              <p style="margin: 0;">Members get <strong>24/7 building access with a personal access code</strong> plus included monthly conference room hours. If you'd like to learn more, just reply to this email.</p>
            </div>

            <div class="info-block">
              <h3>Questions or need anything day-of?</h3>
              <p style="margin: 0;">Text or call Member Services at <strong>(303) 359-8337</strong> or email <a href="mailto:memberservices@merrittworkspace.net">memberservices@merrittworkspace.net</a> and we'll get back to you quickly.</p>
            </div>

            <p style="margin-top: 24px;">See you soon!</p>
            <p style="margin: 0;">— The Merritt Workspace team</p>
          </div>

          <div class="footer">
            <p style="margin: 0;"><strong>Merritt Workspace</strong> · 2246 Irving Street, Denver, CO 80211</p>
            <p style="margin: 4px 0 0 0;">memberservices@merrittworkspace.net · (303) 359-8337</p>
          </div>
        </div>
      </body>
    </html>
  `,
        text: `
YOU'RE SET FOR YOUR MEETING AT MERRITT WORKSPACE

Hi ${firstName},

Thanks for booking the conference room at Merritt Workspace. We're looking
forward to hosting you on ${bookingDateDisplay}. A separate confirmation
with your booking details and calendar invite has been sent — the info
below covers everything you need to walk in and get to work.

YOUR BOOKING
Room: ${data.roomName}
Date: ${bookingDateDisplay}
Time: ${data.booking.start_time} – ${data.booking.end_time}

WHERE TO FIND US
Address:      2246 Irving Street, Denver, CO 80211
Neighborhood: Sloan's Lake — 3 minutes to I-25
Hours:        Building open Mon–Fri, 7:30 AM – 5:30 PM
Parking:      Onsite parking available

WHEN YOU ARRIVE
- No front desk — just let yourself in through the main entrance during
  building hours (7:30 AM – 5:30 PM).
- Head to ${data.roomName}; it will be reserved under your name for your
  booking window.
- Feel free to use the kitchen, snack shop, phone booths, and bathrooms
  while you're here.

WIFI
- Network:  merrittcowork
- Password: Merritt23X

WHAT'S IN THE ROOM
- 75" Smart TV with wireless presentation
- Conference calling capabilities
- Comfortable seating for up to 8 people
- High-speed WiFi

WHAT TO BRING
- Laptop, charger, and any adapters you need for the TV
- A water bottle (filtered water on tap)

WHAT'S ON US
- Coffee, tea, and beer — help yourself in the kitchen

SNACKS & OTHER BEVERAGES (available for purchase)
- Snacks and other drinks in the kitchen are not included with your booking.
- Scan the QR code posted in the kitchen — it takes you to our website
  where you can check out and pay.
- Snack shop: www.merrittworkspace.net/snackshop

A FEW HOUSE NOTES
- If you need to step out for a one-on-one call, phone booths are
  available outside the conference room.
- Printers are by the kitchen.
- Please leave the room as you found it for the next group.

THINKING ABOUT MEMBERSHIP?
Members get 24/7 building access with a personal access code plus included
monthly conference room hours. If you'd like to learn more, just reply to
this email.

QUESTIONS OR NEED ANYTHING DAY-OF?
Text or call Member Services at (303) 359-8337 or email
memberservices@merrittworkspace.net and we'll get back to you quickly.

See you soon!
— The Merritt Workspace team

Merritt Workspace · 2246 Irving Street, Denver, CO 80211
memberservices@merrittworkspace.net · (303) 359-8337
  `
    };
};

export async function sendNonMemberConferenceRoomOnboardingEmail(data: {
    to: string;
    customerName: string;
    booking: Booking;
    roomName: string;
}) {
    try {
        const template = nonMemberConferenceRoomOnboarding(data);

        const result = await resend.emails.send({
            from: 'Merritt Workspace Meetings <memberservices@merrittworkspace.net>',
            replyTo: MEMBER_SERVICES_EMAIL,
            to: data.to,
            subject: template.subject,
            html: template.html,
            text: template.text,
            headers: getTransactionalEmailHeaders(),
            tags: [{ name: 'category', value: 'conference_room_onboarding' }],
        });

        console.log('Non-member conference room onboarding email sent:', result);
        return result;
    } catch (error) {
        console.error('Failed to send non-member conference room onboarding email:', error);
        throw error;
    }
}