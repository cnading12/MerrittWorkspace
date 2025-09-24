// Create this file at: app/api/snackshop/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);
const MANAGER_EMAIL = 'manager@merrittworkspace.net'; // Update this to your actual manager email

export async function POST(request: NextRequest) {
  console.log('🛒 Snackshop API route hit!');
  
  try {
    const orderData = await request.json();
    console.log('📦 Order data received:', orderData);
    
    // Validate required fields
    const requiredFields = ['customer_name', 'customer_email', 'office_number', 'selected_items'];
    
    for (const field of requiredFields) {
      if (!orderData[field]) {
        console.error(`❌ Missing field: ${field}`);
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    if (orderData.selected_items.trim() === '') {
      console.error('❌ No items selected');
      return NextResponse.json(
        { error: 'Please select at least one item' },
        { status: 400 }
      );
    }

    // Calculate total cost based on selected items
    const calculateTotal = (selectedItems: string): number => {
      // Product prices - update these as needed
      const PRODUCT_PRICES: { [key: string]: number } = {
        'Celsius Energy Drink': 2.50,
        'Chocolate Milk': 1.75,
        'IZZE Sparkling Juice': 2.25,
        'Naked Smoothie': 3.50,
        'Premium Soda': 2.00,
        'Herbal Tea': 1.50,
        'Spring Water': 1.25,
        'CLIF Energy Bar': 2.75,
        'KIND Nut Bar': 2.50,
        'Nature Valley Granola Bar': 1.75,
        'Trail Mix': 3.25,
        'Cereal Bowl': 3.50,
        'Instant Oatmeal': 2.75,
        'Quaker Instant Meal': 3.00,
        'Instant Ramen': 2.25,
        'Sweet Corn Cup': 2.50
      };

      const items = selectedItems.split(', ');
      let total = 0;
      
      items.forEach(item => {
        const price = PRODUCT_PRICES[item.trim()];
        if (price) {
          total += price;
        }
      });
      
      return total;
    };

    const totalAmount = calculateTotal(orderData.selected_items);

    // Generate order ID and timestamp
    const orderId = `MW${Date.now().toString().slice(-8)}`;
    const orderTime = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    console.log('📋 Processing order:', { 
      orderId, 
      customer: orderData.customer_name,
      total: `$${totalAmount.toFixed(2)}`
    });

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      return NextResponse.json({
        success: true, // Still return success to avoid breaking the user flow
        message: 'Order received but email configuration is missing. Please contact support.',
        request_id: orderId,
        total_amount: totalAmount,
        formatted_total: `$${totalAmount.toFixed(2)}`,
        email_status: { error: 'No RESEND_API_KEY configured' }
      });
    }

    let emailResults = {
      customer_sent: false,
      manager_sent: false,
      customer_error: null as string | null,
      manager_error: null as string | null
    };

    // Send customer confirmation email
    try {
      console.log('📧 Sending customer email to:', orderData.customer_email);
      
      const customerResult = await resend.emails.send({
        from: 'Merritt Workspace Snackshop <snackshop@merrittworkspace.net>',
        to: orderData.customer_email,
        subject: `Snackshop Purchase - ${orderId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 20px; text-align: center;">
              <h1>🛒 Snackshop Purchase</h1>
              <p>Your items are ready in the kitchen!</p>
            </div>
            
            <div style="padding: 20px; background: white;">
              <p>Hi <strong>${orderData.customer_name}</strong>,</p>
              
              <p><strong>Your items are now available in the kitchen!</strong> Please take your items and complete payment using the honor system.</p>
              
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3>🧾 Purchase Details</h3>
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><strong>Customer:</strong> ${orderData.customer_name}</p>
                <p><strong>Office/Desk:</strong> ${orderData.office_number}</p>
                <p><strong>Order Time:</strong> ${orderTime}</p>
                <p><strong style="color: #ed7611; font-size: 18px;">Total Amount: $${totalAmount.toFixed(2)}</strong></p>
                ${orderData.notes ? `<p><strong>Notes:</strong> ${orderData.notes}</p>` : ''}
              </div>

              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3>🍿 Your Items</h3>
                <p style="font-weight: 500;">${orderData.selected_items}</p>
              </div>

              <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60;">
                <h3>💳 Payment Instructions</h3>
                <p><strong>Please complete your payment now using one of these methods:</strong></p>
                <ul>
                  <li>Cash payment box in the kitchen</li>
                  <li>Venmo: @MerrittWorkspace</li>
                  <li>Online payment (coming soon)</li>
                </ul>
                <p style="color: #666; font-size: 14px; margin-top: 10px;">
                  <em>Thank you for being part of our honor system community!</em>
                </p>
              </div>

              <p>Enjoy your snacks and thank you for using Merritt Workspace Kitchen! 🧡</p>
            </div>
            
            <div style="background: #2c3e50; color: white; padding: 20px; text-align: center;">
              <p><strong>Merritt Workspace</strong></p>
              <p>2246 Irving Street, Denver, CO 80211</p>
            </div>
          </div>
        `,
        text: `
Snackshop Purchase - ${orderId}

Hi ${orderData.customer_name},

Your items are now available in the kitchen! Please take your items and complete payment using the honor system.

Purchase Details:
- Order ID: ${orderId}
- Customer: ${orderData.customer_name}
- Office/Desk: ${orderData.office_number}
- Order Time: ${orderTime}
- TOTAL AMOUNT: $${totalAmount.toFixed(2)}
${orderData.notes ? `- Notes: ${orderData.notes}` : ''}

Your Items:
${orderData.selected_items}

Payment Instructions:
Please complete your payment now using one of these methods:
- Cash payment box in the kitchen
- Venmo: @MerrittWorkspace
- Online payment (coming soon)

Thank you for being part of our honor system community!

Enjoy your snacks!
Merritt Workspace Team
        `
      });
      
      emailResults.customer_sent = true;
      console.log('✅ Customer email sent:', customerResult.data?.id);
    } catch (error: any) {
      console.error('❌ Customer email failed:', error);
      emailResults.customer_error = error.message;
    }

    // Send manager notification
    try {
      console.log('📧 Sending manager notification to:', MANAGER_EMAIL);
      
      const managerResult = await resend.emails.send({
        from: 'Merritt Workspace Snackshop <snackshop@merrittworkspace.net>',
        to: MANAGER_EMAIL,
        subject: `💰 Member Kitchen Purchase - $${totalAmount.toFixed(2)} - ${orderId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #27ae60; color: white; padding: 20px; text-align: center;">
              <h2>💰 MEMBER KITCHEN PURCHASE</h2>
              <p style="font-size: 18px; margin: 5px 0;"><strong>$${totalAmount.toFixed(2)}</strong></p>
            </div>
            
            <div style="padding: 20px;">
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p><strong>🧾 Order ID:</strong> ${orderId}</p>
                <p><strong>⏰ Time:</strong> ${orderTime}</p>
                <p><strong>💵 Amount:</strong> <span style="font-size: 18px; color: #e67e22;"><strong>$${totalAmount.toFixed(2)}</strong></span></p>
              </div>
            
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3>👤 Member Information</h3>
                <p><strong>Name:</strong> ${orderData.customer_name}</p>
                <p><strong>Email:</strong> ${orderData.customer_email}</p>
                <p><strong>Office/Desk:</strong> ${orderData.office_number}</p>
                ${orderData.notes ? `<p><strong>Notes:</strong> ${orderData.notes}</p>` : ''}
              </div>
            
              <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border: 2px solid #27ae60; margin-bottom: 20px;">
                <h3>🛒 Items Purchased:</h3>
                <p style="font-size: 16px; font-weight: bold;">${orderData.selected_items}</p>
              </div>

              <div style="background: #fff8e1; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h3>💳 Payment Status</h3>
                <p><strong>Honor System Purchase</strong> - Member has access to kitchen and will pay using:</p>
                <ul>
                  <li>Cash payment box in kitchen</li>
                  <li>Venmo: @MerrittWorkspace</li>
                  <li>Online payment (when available)</li>
                </ul>
                <p style="color: #666; font-size: 14px;"><em>Member confirmation email sent automatically.</em></p>
              </div>
            </div>
          </div>
        `,
        text: `
MEMBER KITCHEN PURCHASE: $${totalAmount.toFixed(2)}

Order ID: ${orderId}
Time: ${orderTime}
Amount: $${totalAmount.toFixed(2)}

Member Information:
- Name: ${orderData.customer_name}
- Email: ${orderData.customer_email}
- Office/Desk: ${orderData.office_number}
${orderData.notes ? `- Notes: ${orderData.notes}` : ''}

Items Purchased:
${orderData.selected_items}

PAYMENT STATUS: Honor System Purchase
Member has kitchen access and will pay using:
- Cash payment box in kitchen  
- Venmo: @MerrittWorkspace
- Online payment (when available)

Member confirmation email sent automatically.
        `
      });
      
      emailResults.manager_sent = true;
      console.log('✅ Manager email sent:', managerResult.data?.id);
    } catch (error: any) {
      console.error('❌ Manager email failed:', error);
      emailResults.manager_error = error.message;
    }

    console.log('📊 Email results:', emailResults);

    return NextResponse.json({
      success: true,
      message: emailResults.customer_sent 
        ? `Purchase confirmed! Total: ${totalAmount.toFixed(2)}. Please take your items from the kitchen and complete payment using the honor system.` 
        : `Purchase confirmed! Total: ${totalAmount.toFixed(2)}. Please take your items from the kitchen. (Note: Email confirmation may be delayed)`,
      request_id: orderId,
      total_amount: totalAmount,
      formatted_total: `${totalAmount.toFixed(2)}`,
      email_status: {
        customer_email_sent: emailResults.customer_sent,
        manager_email_sent: emailResults.manager_sent,
        customer_sent: emailResults.customer_sent // Add this for backward compatibility
      }
    });

  } catch (error) {
    console.error('💥 API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Add a GET method for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Snackshop API is working!', 
    timestamp: new Date().toISOString(),
    resend_configured: !!process.env.RESEND_API_KEY
  });
}