// Shared Snackshop confirmation emails.
//
// The exact customer + member-services confirmation emails that the Stripe
// webhook has always sent, extracted so the member one-click checkout route
// can send the identical messages without duplicating the markup. The live
// webhooks keep their own copies untouched; this module is used by the new
// member path (and is available for future consolidation).

import { Resend } from 'resend';
import { getTransactionalEmailHeaders } from '@/lib/portal/emails';

let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}
const resend = {
  emails: {
    send: (params: Parameters<Resend['emails']['send']>[0]) => getResend().emails.send(params),
  },
};

const MEMBER_SERVICES_EMAIL = 'memberservices@merrittworkspace.net';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface SnackOrderEmailDetails {
  order_id: string;
  total: number; // dollars
  customer_name: string;
  customer_email: string;
  office_number: string;
  notes?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}

/**
 * Send the customer confirmation + member-services notification emails for a
 * paid Snackshop order. Mirrors the webhook behavior: failures are logged
 * but never thrown, so a transient email error can't fail an already-charged
 * order.
 */
export async function sendSnackOrderConfirmationEmails(details: SnackOrderEmailDetails): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ No RESEND_API_KEY configured, skipping snackshop emails');
    return;
  }

  const { order_id, total, customer_name, customer_email, office_number, notes, items } = details;

  const itemsList = items
    .map((item) => (item.quantity > 1 ? `${item.name} (x${item.quantity})` : item.name))
    .join(', ');

  const itemsTable = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e5e5;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right;">$${item.price.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `,
    )
    .join('');

  const orderTime = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Denver',
    timeZoneName: 'short',
  });

  // Customer confirmation email
  try {
    await resend.emails.send({
      from: 'Merritt Workspace Snackshop <memberservices@merrittworkspace.net>',
      replyTo: MEMBER_SERVICES_EMAIL,
      to: customer_email,
      subject: `Payment Confirmed - Order ${order_id} | Merritt Workspace`,
      headers: getTransactionalEmailHeaders(),
      tags: [{ name: 'category', value: 'snackshop_payment_confirmed' }],
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 20px; text-align: center;">
            <h1>🎉 Payment Confirmed!</h1>
            <p>Your order is ready for pickup</p>
          </div>

          <div style="padding: 20px; background: white;">
            <p>Hi <strong>${customer_name}</strong>,</p>

            <p><strong>Your payment has been processed successfully!</strong> Your items are ready for pickup in the kitchen.</p>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3>🧾 Order Details</h3>
              <p><strong>Order ID:</strong> ${order_id}</p>
              <p><strong>Total Paid:</strong> $${total.toFixed(2)}</p>
              <p><strong>Pickup Location:</strong> ${office_number}</p>
              <p><strong>Order Time:</strong> ${orderTime}</p>
              ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            </div>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3>📦 Your Items</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background: #e9ecef;">
                    <th style="padding: 8px; text-align: left;">Item</th>
                    <th style="padding: 8px; text-align: center;">Qty</th>
                    <th style="padding: 8px; text-align: right;">Price</th>
                    <th style="padding: 8px; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsTable}
                  <tr style="font-weight: bold; border-top: 2px solid #27ae60;">
                    <td colspan="3" style="padding: 8px;">Total Paid</td>
                    <td style="padding: 8px; text-align: right;">$${total.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60;">
              <h3>📍 Pickup Instructions</h3>
              <p><strong>Your items are ready for pickup in the kitchen!</strong></p>
              <p>Simply go to the kitchen and collect your paid items. Your payment is complete - no further action needed.</p>
            </div>

            <p>Thank you for using Merritt Workspace Snackshop! 🧡</p>
          </div>

          <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
            <p><strong>Merritt Workspace</strong></p>
            <p>2246 Irving Street, Denver, CO 80211</p>
          </div>
        </div>
      `,
      text: `
Payment Confirmed - Order ${order_id}

Hi ${customer_name},

Your payment has been processed successfully! Your items are ready for pickup in the kitchen.

Order Details:
- Order ID: ${order_id}
- Total Paid: $${total.toFixed(2)}
- Pickup Location: ${office_number}
- Order Time: ${orderTime}
${notes ? `- Notes: ${notes}` : ''}

Your Items:
${items.map((item) => `- ${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Total Paid: $${total.toFixed(2)}

Pickup Instructions:
Your items are ready for pickup in the kitchen! Simply go to the kitchen and collect your paid items.
Your payment is complete - no further action needed.

Thank you for using Merritt Workspace Snackshop!

Merritt Workspace Team
2246 Irving Street, Denver, CO 80211
      `,
    });
  } catch (error) {
    console.error('❌ Failed to send snackshop customer email:', error);
  }

  // Avoid Resend's 2 req/sec rate limit on the free plan.
  await delay(1000);

  // Send member services notification
  try {
    await resend.emails.send({
      from: 'Merritt Workspace Snackshop <memberservices@merrittworkspace.net>',
      to: MEMBER_SERVICES_EMAIL,
      subject: `💳 Paid Order Complete - $${total.toFixed(2)} - ${order_id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #27ae60; color: white; padding: 20px; text-align: center;">
            <h2>💳 PAID SNACKSHOP ORDER</h2>
            <p style="font-size: 18px; margin: 5px 0;"><strong>$${total.toFixed(2)} PAID</strong></p>
          </div>

          <div style="padding: 20px;">
            <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #27ae60;">
              <p><strong>✅ Payment Completed</strong></p>
              <p><strong>💰 Amount:</strong> $${total.toFixed(2)}</p>
              <p><strong>🆔 Order ID:</strong> ${order_id}</p>
              <p><strong>⏰ Time:</strong> ${orderTime}</p>
            </div>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3>👤 Customer Information</h3>
              <p><strong>Name:</strong> ${customer_name}</p>
              <p><strong>Email:</strong> ${customer_email}</p>
              <p><strong>Office/Desk:</strong> ${office_number}</p>
              ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            </div>

            <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border: 2px solid #27ae60;">
              <h3>🛒 Paid Items:</h3>
              <p style="font-size: 16px; font-weight: bold;">${itemsList}</p>
            </div>

            <div style="background: #fff8e1; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin-top: 20px;">
              <h3>📋 Order Status</h3>
              <p><strong>✅ Payment: COMPLETED</strong></p>
              <p><strong>📍 Pickup: Ready in kitchen</strong></p>
              <p style="color: #666; font-size: 14px;"><em>Customer confirmation email sent automatically.</em></p>
            </div>
          </div>
        </div>
      `,
      text: `
PAID SNACKSHOP ORDER: $${total.toFixed(2)}

✅ Payment Completed
Order ID: ${order_id}
Amount: $${total.toFixed(2)}
Time: ${orderTime}

Customer Information:
- Name: ${customer_name}
- Email: ${customer_email}
- Office/Desk: ${office_number}
${notes ? `- Notes: ${notes}` : ''}

Paid Items:
${items.map((item) => `- ${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Order Status:
✅ Payment: COMPLETED
📍 Pickup: Ready in kitchen

Customer confirmation email sent automatically.
      `,
    });
  } catch (error) {
    console.error('❌ Failed to send snackshop member services email:', error);
  }
}
