// Create this file at: app/api/payment-success/route.ts

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const resend = new Resend(process.env.RESEND_API_KEY);
const MANAGER_EMAIL = 'manager@merrittworkspace.net';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Processing successful payment for session:', sessionId);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer_details', 'payment_intent']
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session ID' },
        { status: 404 }
      );
    }

    if (session.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Payment not completed' },
        { status: 400 }
      );
    }

    // Extract order details from session metadata
    const {
      order_id,
      customer_name,
      customer_email,
      office_number,
      notes,
      cart_items
    } = session.metadata || {};

    if (!order_id || !customer_name || !customer_email) {
      return NextResponse.json(
        { error: 'Missing order information in session' },
        { status: 400 }
      );
    }

    // Parse cart items
    let parsedCartItems = [];
    try {
      parsedCartItems = cart_items ? JSON.parse(cart_items) : [];
    } catch (error) {
      console.error('Error parsing cart items:', error);
    }

    // Calculate total from session
    const totalAmount = (session.amount_total || 0) / 100; // Convert from cents

    // Prepare payment details
    const paymentDetails = {
      order_id,
      total: totalAmount,
      customer_name,
      customer_email,
      office_number,
      notes: notes || '',
      items: parsedCartItems,
      session_id: sessionId,
      payment_status: 'completed',
      timestamp: new Date().toISOString()
    };

    console.log('💳 Payment details prepared:', paymentDetails);

    // Send confirmation emails
    try {
      await sendPaymentConfirmationEmails(paymentDetails);
      console.log('✅ Confirmation emails sent');
    } catch (emailError) {
      console.error('❌ Failed to send confirmation emails:', emailError);
      // Don't fail the entire request if emails fail
    }

    return NextResponse.json({ 
      payment_details: paymentDetails,
      message: 'Payment processed successfully'
    });

  } catch (error: any) {
    console.error('❌ Payment success API error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: 'Payment session error', details: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to send confirmation emails
async function sendPaymentConfirmationEmails(paymentDetails: any) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('No RESEND_API_KEY configured, skipping emails');
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
  } = paymentDetails;

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

  const orderTime = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Send customer confirmation email
  try {
    await resend.emails.send({
      from: 'Merritt Workspace Snackshop <snackshop@merrittworkspace.net>',
      to: customer_email,
      subject: `Payment Confirmed - Order ${order_id} | Merritt Workspace`,
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
    console.error('Failed to send customer email:', error);
  }

  // Send manager notification
  try {
    await resend.emails.send({
      from: 'Merritt Workspace Snackshop <snackshop@merrittworkspace.net>',
      to: MANAGER_EMAIL,
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
    
    console.log('✅ Manager notification email sent');
  } catch (error) {
    console.error('Failed to send manager email:', error);
  }
}