import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);
const MANAGER_EMAIL = 'manager@merrittworkspace.net';

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json();
    
    // Validate required fields
    const requiredFields = ['customer_name', 'customer_email', 'office_number', 'selected_items'];
    
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    if (orderData.selected_items.trim() === '') {
      return NextResponse.json(
        { error: 'Please select at least one item' },
        { status: 400 }
      );
    }

    // Generate a simple order ID
    const orderId = `MW${Date.now().toString().slice(-8)}`;
    const orderTime = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Send confirmation email to customer
    try {
      await resend.emails.send({
        from: 'Merritt Workspace Snackshop <snackshop@merrittworkspace.net>',
        to: orderData.customer_email,
        subject: `Snackshop Request Received - ${orderId} | Merritt Workspace`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Snackshop Request Confirmation</title>
              <style>
                body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .header h1 { margin: 0; font-size: 24px; }
                .content { background: white; padding: 30px; border: 1px solid #e5e5e5; }
                .request-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
                .delivery-info { background: #fff8e1; padding: 20px; border-radius: 8px; border-left: 4px solid #ed7611; margin: 20px 0; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; border-radius: 0 0 8px 8px; }
                .status-badge { background: #28a745; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Request Received!</h1>
                  <p>Thank you for your snackshop request</p>
                </div>
                
                <div class="content">
                  <p>Hi ${orderData.customer_name},</p>
                  
                  <p>We've received your snackshop request and will prepare your items for delivery!</p>
                  
                  <div class="request-info">
                    <h3 style="margin-top: 0;">Request Details</h3>
                    <p><strong>Request ID:</strong> ${orderId}</p>
                    <p><strong>Office/Desk:</strong> ${orderData.office_number}</p>
                    <p><strong>Submitted:</strong> ${orderTime}</p>
                    <p><strong>Status:</strong> <span class="status-badge">RECEIVED</span></p>
                    ${orderData.notes ? `<p><strong>Notes:</strong> ${orderData.notes}</p>` : ''}
                  </div>

                  <h3>Requested Items</h3>
                  <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p style="margin: 0; font-weight: 500;">${orderData.selected_items}</p>
                  </div>

                  <div class="delivery-info">
                    <h3 style="margin-top: 0;">📍 Next Steps</h3>
                    <p><strong>We'll prepare your items and deliver them to ${orderData.office_number} within 15-30 minutes.</strong></p>
                    <p>Someone from our team will contact you if we have any questions about your request.</p>
                  </div>

                  <p>Thank you for using Merritt Workspace Snackshop!</p>
                </div>
                
                <div class="footer">
                  <p><strong>Merritt Workspace Snackshop</strong></p>
                  <p>2246 Irving Street, Denver, CO 80211</p>
                  <p>Email: snackshop@merrittworkspace.net | Phone: (123) 456-7890</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Snackshop Request Received - ${orderId}

Hi ${orderData.customer_name},

We've received your snackshop request and will prepare your items for delivery!

Request Details:
- Request ID: ${orderId}
- Office/Desk: ${orderData.office_number}
- Submitted: ${orderTime}
- Status: RECEIVED
${orderData.notes ? `- Notes: ${orderData.notes}` : ''}

Requested Items:
${orderData.selected_items}

Next Steps:
We'll prepare your items and deliver them to ${orderData.office_number} within 15-30 minutes.
Someone from our team will contact you if we have any questions about your request.

Thank you for using Merritt Workspace Snackshop!

Merritt Workspace Team
2246 Irving Street, Denver, CO 80211
        `
      });
      
      console.log('✅ Customer confirmation email sent successfully');
    } catch (emailError) {
      console.error('❌ Failed to send customer confirmation email:', emailError);
    }

    // Send notification email to manager
    try {
      await resend.emails.send({
        from: 'Merritt Workspace Snackshop <snackshop@merrittworkspace.net>',
        to: MANAGER_EMAIL,
        subject: `🛒 New Snackshop Request - ${orderId}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #fff8e1; padding: 15px; margin-bottom: 20px; border-radius: 5px; border-left: 4px solid #ed7611; }
                .request-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
                .action-required { background: #e8f5e8; padding: 15px; border-radius: 5px; border-left: 4px solid #28a745; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin-top: 0;">🛒 New Snackshop Request Received</h2>
                  <p>Request ID: <strong>${orderId}</strong></p>
                </div>
                
                <div class="request-details">
                  <h3>Customer Details:</h3>
                  <p><strong>Name:</strong> ${orderData.customer_name}</p>
                  <p><strong>Email:</strong> ${orderData.customer_email}</p>
                  <p><strong>Office/Desk:</strong> ${orderData.office_number}</p>
                  <p><strong>Submitted:</strong> ${orderTime}</p>
                  ${orderData.notes ? `<p><strong>Notes:</strong> ${orderData.notes}</p>` : ''}
                </div>
                
                <h3>Requested Items:</h3>
                <div style="background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                  <p style="margin: 0; font-weight: 500;">${orderData.selected_items}</p>
                </div>
                
                <div class="action-required">
                  <p style="margin: 0;"><strong>⏰ Action Required:</strong> Please prepare and deliver these items to <strong>${orderData.office_number}</strong> within 15-30 minutes.</p>
                </div>
                
                <p style="margin-top: 20px; color: #666; font-size: 14px;"><em>A confirmation email was automatically sent to the customer.</em></p>
              </div>
            </body>
          </html>
        `,
        text: `
NEW SNACKSHOP REQUEST: ${orderId}

Customer: ${orderData.customer_name}
Email: ${orderData.customer_email}
Office/Desk: ${orderData.office_number}
Submitted: ${orderTime}
${orderData.notes ? `Notes: ${orderData.notes}` : ''}

Requested Items:
${orderData.selected_items}

ACTION REQUIRED: Please prepare and deliver these items to ${orderData.office_number} within 15-30 minutes.

A confirmation email was automatically sent to the customer.
        `
      });
      
      console.log('✅ Manager notification email sent successfully');
    } catch (managerEmailError) {
      console.error('❌ Failed to send manager notification email:', managerEmailError);
    }

    return NextResponse.json({
      success: true,
      message: 'Snackshop request submitted successfully! Confirmation emails have been sent.',
      request_id: orderId
    });

  } catch (error) {
    console.error('Error processing snackshop request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}