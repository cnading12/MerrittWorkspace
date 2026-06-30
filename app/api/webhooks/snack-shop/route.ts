// app/api/webhooks/snackshop/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { getTransactionalEmailHeaders } from '@/lib/portal/emails';
import { recordSnackOrder } from '@/lib/snackshop/orders';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

// Lazy-load Resend client to avoid build-time errors
let resendClient: Resend | null = null;
function getResend(): Resend {
    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}
const resend = { emails: { send: (params: Parameters<Resend['emails']['send']>[0]) => getResend().emails.send(params) } };
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET_SNACKSHOP!;
const MEMBER_SERVICES_EMAIL = 'memberservices@merrittworkspace.net';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = headers();
  const sig = headersList.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, endpointSecret);
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    );
  }

  console.log('🔔 Snackshop webhook received:', event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('🎯 Processing completed snackshop checkout session:', session.id);

  try {
    const {
      order_id,
      customer_name,
      customer_email,
      office_number,
      notes,
      cart_items
    } = session.metadata || {};

    if (!order_id || !customer_email || !customer_name) {
      console.error('❌ Missing required snackshop data in session metadata');
      return;
    }

    console.log('✅ Payment successful for snackshop order:', order_id);

    // Parse cart items
    let parsedCartItems = [];
    try {
      parsedCartItems = cart_items ? JSON.parse(cart_items) : [];
    } catch (error) {
      console.error('❌ Error parsing cart items:', error);
    }

    // Calculate total from session
    const totalAmount = (session.amount_total || 0) / 100; // Convert from cents

    // Prepare order details
    const orderDetails = {
      order_id,
      total: totalAmount,
      customer_name,
      customer_email,
      office_number: office_number || '',
      notes: notes || '',
      items: parsedCartItems,
      session_id: session.id,
      payment_status: 'completed',
      timestamp: new Date().toISOString()
    };

    // Persist the order so it shows up in the member portal history and is
    // available for reconciliation. Idempotent: a duplicate webhook delivery
    // is a no-op. Done before emails so the record survives email failures.
    try {
      await recordSnackOrder({
        memberId: session.metadata?.member_id || null,
        orderNumber: order_id,
        customerName: customer_name,
        customerEmail: customer_email,
        officeNumber: office_number || null,
        notes: notes || null,
        items: parsedCartItems,
        totalCents: session.amount_total ?? Math.round(totalAmount * 100),
        currency: session.currency || 'usd',
        paymentMethod: 'card',
        isMemberOrder: Boolean(session.metadata?.member_id),
        stripeSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string' ? session.payment_intent : null,
        paidAt: new Date().toISOString(),
      });
    } catch (dbError) {
      console.error('⚠️ Failed to persist snackshop order (continuing):', dbError);
      // Don't throw - emails + Stripe success matter more than the record.
    }

    console.log('📧 Sending confirmation emails for paid snackshop order...');

    // Send confirmation emails
    try {
      await sendPaymentConfirmationEmails(orderDetails);
      console.log('✅ Snackshop confirmation emails sent successfully');
    } catch (emailError) {
      console.error('⚠️ Failed to send confirmation emails:', emailError);
      // Don't throw - we still want to return success to Stripe
    }

    console.log('✅✅✅ SNACKSHOP ORDER COMPLETE: Payment confirmed, emails sent');

  } catch (error) {
    console.error('❌ Error processing snackshop checkout session:', error);
    throw error;
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log('⚠️ Processing failed payment intent for snackshop:', paymentIntent.id);

  try {
    // Get session with this payment intent
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntent.id,
      limit: 1
    });

    if (sessions.data.length === 0) {
      console.log('No session found for failed payment intent');
      return;
    }

    const session = sessions.data[0];
    const orderInfo = session.metadata;

    console.log('💔 Failed payment for order:', orderInfo?.order_id);

    // Optional: Send failure notification to customer
    if (orderInfo?.customer_email) {
      try {
        await resend.emails.send({
          from: 'Merritt Workspace Snackshop <memberservices@merrittworkspace.net>',
          replyTo: MEMBER_SERVICES_EMAIL,
          to: orderInfo.customer_email,
          subject: `Payment Failed - Order ${orderInfo.order_id}`,
          headers: getTransactionalEmailHeaders(),
          tags: [{ name: 'category', value: 'snackshop_payment_failed' }],
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #fee; padding: 20px; text-align: center;">
                <h1 style="color: #c00;">Payment Failed</h1>
              </div>
              <div style="padding: 20px;">
                <p>Hi ${orderInfo.customer_name},</p>
                <p>Unfortunately, we were unable to process your payment for order <strong>${orderInfo.order_id}</strong>.</p>
                <p>Please try again or contact us if you need assistance.</p>
                <p>You can retry your order at: <a href="${process.env.NEXT_PUBLIC_BASE_URL}/member-resources/snackshop">Merritt Snackshop</a></p>
              </div>
            </div>
          `
        });
        console.log('✅ Payment failure notification sent');
      } catch (emailError) {
        console.error('⚠️ Failed to send payment failure email:', emailError);
      }
    }

  } catch (error) {
    console.error('❌ Error processing failed payment:', error);
    throw error;
  }
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  console.log('⏰ Processing expired checkout session:', session.id);

  const orderInfo = session.metadata;
  console.log('Session expired for order:', orderInfo?.order_id);

  // Optional: Clean up any pending orders or notify customer
  // Most of the time you don't need to do anything here
}

// Helper to avoid Resend rate limit (2 req/sec on free plan)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to send confirmation emails
async function sendPaymentConfirmationEmails(orderDetails: any) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ No RESEND_API_KEY configured, skipping emails');
    return;
  }

  const {
    order_id,
    total,
    customer_name,
    customer_email,
    office_number,
    notes,
    items
  } = orderDetails;

  const itemsList = items.map((item: any) => 
    item.quantity > 1 
      ? `${item.name} (x${item.quantity})`
      : item.name
  ).join(', ');

  const itemsTable = items.map((item: any) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e5e5;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right;">$${item.price.toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

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

  // Send customer confirmation email
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
${items.map((item: any) => `- ${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Total Paid: $${total.toFixed(2)}

Pickup Instructions:
Your items are ready for pickup in the kitchen! Simply go to the kitchen and collect your paid items. 
Your payment is complete - no further action needed.

Thank you for using Merritt Workspace Snackshop!

Merritt Workspace Team
2246 Irving Street, Denver, CO 80211
      `
    });
    
    console.log('✅ Customer confirmation email sent');
  } catch (error) {
    console.error('❌ Failed to send customer email:', error);
    throw error; // Throw so we know emails failed
  }

  // Wait to avoid Resend rate limit
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
${items.map((item: any) => `- ${item.name} (x${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`).join('\n')}

Order Status:
✅ Payment: COMPLETED
📍 Pickup: Ready in kitchen

Customer confirmation email sent automatically.
      `
    });

    console.log('✅ Member services notification email sent');
  } catch (error) {
    console.error('❌ Failed to send member services email:', error);
    // Don't throw - member services email is less critical
  }
}