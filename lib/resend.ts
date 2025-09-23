import { Resend } from 'resend';
import { type Order, type OrderItem } from './snackshop';
import { type Booking } from './supabase';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

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
            .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
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
                <p><strong>Order Date:</strong> ${new Date(data.order.created_at).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}</p>
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
              <p>Email: snackshop@merrittworkspace.com | Phone: (123) 456-7890</p>
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
Order Date: ${new Date(data.order.created_at).toLocaleString()}
Status: ${data.order.status.replace('_', ' ').toUpperCase()}

Items Ordered:
${data.items.map(item => `- ${item.product_name} (Qty: ${item.quantity}) - $${item.total_price.toFixed(2)}`).join('\n')}

Total Amount: $${data.order.total_amount.toFixed(2)}

Your items will be delivered to ${data.order.office_number} within 15 minutes.

${data.order.delivery_notes ? `Delivery Notes: ${data.order.delivery_notes}` : ''}

Questions? Contact us at snackshop@merrittworkspace.com or (123) 456-7890

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
        subject: `Meeting Room Confirmed - ${new Date(data.booking.booking_date).toLocaleDateString()} | Merritt Workspace`,
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
            .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
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
                <p><strong>Date:</strong> ${new Date(data.booking.booking_date).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}</p>
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
              <p>Email: meetings@merrittworkspace.com | Phone: (123) 456-7890</p>
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
- Date: ${new Date(data.booking.booking_date).toLocaleDateString()}
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

Contact: meetings@merrittworkspace.com | (123) 456-7890

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
            .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
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
                <p><strong>Submitted:</strong> ${new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}</p>
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
              
              <a href="mailto:membership@merrittworkspace.com" class="button">Questions? Contact Us</a>
            </div>
            
            <div class="footer">
              <p><strong>Merritt Workspace</strong></p>
              <p>Where Work Meets Community</p>
              <p>2246 Irving Street, Denver, CO 80211</p>
              <p>Email: membership@merrittworkspace.com | Phone: (123) 456-7890</p>
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
- Submitted: ${new Date().toLocaleString()}

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

Questions? Contact us at membership@merrittworkspace.com or (123) 456-7890

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
            from: 'Merritt Workspace Snackshop <snackshop@merrittworkspace.com>',
            to: data.to,
            subject: template.subject,
            html: template.html,
            text: template.text,
        });

        // Send copy to manager
        const managerEmail = await resend.emails.send({
            from: 'Merritt Workspace Snackshop <snackshop@merrittworkspace.com>',
            to: 'manager@merrittworkspace.com',
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

        console.log('Order confirmation email sent to customer and manager:', { customerEmail, managerEmail });
        return { customerEmail, managerEmail };
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
            from: 'Merritt Workspace Meetings <meetings@merrittworkspace.com>',
            to: data.to,
            subject: template.subject,
            html: template.html,
            text: template.text,
        });

        // Send copy to manager
        const managerEmail = await resend.emails.send({
            from: 'Merritt Workspace Meetings <meetings@merrittworkspace.com>',
            to: 'manager@merrittworkspace.com',
            subject: `[COPY] ${template.subject}`,
            html: `
        <div style="background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 5px;">
          <strong>📅 Meeting Room Booking Copy</strong><br>
          <strong>Sent to:</strong> ${data.to}<br>
          <strong>Customer:</strong> ${data.customerName}<br>
          <strong>Room:</strong> ${data.roomName}<br>
          <strong>Date:</strong> ${data.booking.booking_date} at ${data.booking.start_time}
        </div>
        ${template.html}
      `,
            text: `[MEETING BOOKING COPY]\nSent to: ${data.to}\nCustomer: ${data.customerName}\nRoom: ${data.roomName}\nDate: ${data.booking.booking_date} at ${data.booking.start_time}\n\n${template.text}`,
        });

        console.log('Booking confirmation email sent to customer and manager:', { customerEmail, managerEmail });
        return { customerEmail, managerEmail };
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
            from: 'Merritt Workspace Membership <membership@merrittworkspace.com>',
            to: data.to,
            subject: template.subject,
            html: template.html,
            text: template.text,
        });

        // Send notification to manager
        const managerEmail = await resend.emails.send({
            from: 'Merritt Workspace Membership <membership@merrittworkspace.com>',
            to: 'manager@merrittworkspace.com',
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
          <p><strong>Submitted:</strong> ${new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</p>
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
            text: `NEW MEMBERSHIP APPLICATION\n\nApplicant: ${data.applicantName}\nEmail: ${data.email}\nMembership Type: ${data.membershipType}\nApplication ID: ${data.applicationId}\nSubmitted: ${new Date().toLocaleString()}\n\nNext Steps:\n1. Review the application\n2. Contact ${data.applicantName} to schedule a tour\n3. Arrange their free trial day\n4. Process membership approval\n\nACTION REQUIRED: Please follow up within 1-2 business days.\n\nA copy of the welcome email was also sent to the applicant.`,
        });

        console.log('Membership application email sent to applicant and manager:', { applicantEmail, managerEmail });
        return { applicantEmail, managerEmail };
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
            from: 'Merritt Workspace Snackshop <snackshop@merrittworkspace.com>',
            to: data.to,
            subject: `Order Update - ${data.orderNumber} | Merritt Workspace`,
            html: `
        <p>Hi ${data.customerName},</p>
        <p>Your order <strong>${data.orderNumber}</strong> status has been updated:</p>
        <p><strong>New Status:</strong> ${data.newStatus.replace('_', ' ').toUpperCase()}</p>
        <p>${data.message || statusMessages[data.newStatus as keyof typeof statusMessages] || 'Your order status has been updated.'}</p>
        <p>Thank you for using Merritt Workspace Snackshop!</p>
      `,
            text: `Hi ${data.customerName},\n\nYour order ${data.orderNumber} status has been updated to: ${data.newStatus.replace('_', ' ').toUpperCase()}\n\n${data.message || statusMessages[data.newStatus as keyof typeof statusMessages] || 'Your order status has been updated.'}\n\nThank you for using Merritt Workspace Snackshop!`
        });

        // Send copy to manager
        const managerEmail = await resend.emails.send({
            from: 'Merritt Workspace Snackshop <snackshop@merrittworkspace.com>',
            to: 'manager@merrittworkspace.com',
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

        console.log('Order status update email sent to customer and manager:', { customerEmail, managerEmail });
        return { customerEmail, managerEmail };
    } catch (error) {
        console.error('Failed to send order status update email:', error);
        throw error;
    }
}

// Admin notification emails (only to manager)
export async function sendNewOrderNotification(order: Order, items: OrderItem[]) {
    try {
        const result = await resend.emails.send({
            from: 'Merritt Workspace Snackshop <snackshop@merrittworkspace.com>',
            to: 'manager@merrittworkspace.com',
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

        console.log('New order notification sent to manager:', result);
        return result;
    } catch (error) {
        console.error('Failed to send new order notification:', error);
        throw error;
    }
}

export async function sendLowStockAlert(products: Array<{ name: string; stock_quantity: number; }>) {
    try {
        const result = await resend.emails.send({
            from: 'Merritt Workspace System <system@merrittworkspace.com>',
            to: 'manager@merrittworkspace.com',
            subject: `⚠️ Low Stock Alert - Snackshop | Merritt Workspace`,
            html: `
        <div style="background: #fff3cd; padding: 15px; margin-bottom: 20px; border-radius: 5px; border-left: 4px solid #ffc107;">
          <h2 style="margin-top: 0;">⚠️ Low Stock Alert</h2>
          <p>The following products are running low in stock and need to be restocked:</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Product</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Stock Remaining</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(product => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${product.name}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${product.stock_quantity}</td>
                <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                  <span style="background: ${product.stock_quantity === 0 ? '#dc3545' : '#ffc107'}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 12px;">
                    ${product.stock_quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
          <p><strong>📋 Action Items:</strong></p>
          <ul>
            <li>Review inventory and place restocking orders</li>
            <li>Consider temporarily removing out-of-stock items from the snackshop</li>
            <li>Update product availability in the system if needed</li>
          </ul>
        </div>
      `,
            text: `LOW STOCK ALERT\n\nThe following products are running low in stock:\n\n${products.map(product => `- ${product.name}: ${product.stock_quantity} remaining${product.stock_quantity === 0 ? ' (OUT OF STOCK)' : ''}`).join('\n')}\n\nACTION ITEMS:\n- Review inventory and place restocking orders\n- Consider temporarily removing out-of-stock items\n- Update product availability in the system if needed\n\nPlease restock these items soon to avoid customer disappointment.`
        });

        console.log('Low stock alert sent to manager:', result);
        return result;
    } catch (error) {
        console.error('Failed to send low stock alert:', error);
        throw error;
    }


}
// Add these new email templates to your existing lib/resend.ts file

// Updated Meeting Room Booking Confirmation (supports both member and paid bookings)
export const memberBookingConfirmation = (data: {
    customerName: string;
    booking: Booking;
    roomName: string;
    isMemberBooking: boolean;
    memberHoursUsed?: number;
    remainingHours?: number;
}) => ({
    subject: `${data.isMemberBooking ? 'Member' : 'Paid'} Meeting Room Confirmed - ${new Date(data.booking.booking_date).toLocaleDateString()} | Merritt Workspace`,
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
          .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
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
              <p><strong>Date:</strong> ${new Date(data.booking.booking_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</p>
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
            <p>Email: meetings@merrittworkspace.com | Phone: (123) 456-7890</p>
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
- Date: ${new Date(data.booking.booking_date).toLocaleDateString()}
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

Contact: meetings@merrittworkspace.com | (123) 456-7890

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
    subject: `🏢 ${data.isMemberBooking ? 'Member' : 'Paid'} Meeting Room Booking - ${data.roomName} | ${new Date(data.booking.booking_date).toLocaleDateString()}`,
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
            <p><strong>Date:</strong> ${new Date(data.booking.booking_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}</p>
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
Date: ${new Date(data.booking.booking_date).toLocaleDateString()}
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
            from: 'Merritt Workspace Meetings <meetings@merrittworkspace.com>',
            to: data.to,
            subject: customerTemplate.subject,
            html: customerTemplate.html,
            text: customerTemplate.text,
        });

        // Send notification to manager
        const managerEmail = await resend.emails.send({
            from: 'Merritt Workspace Meetings <meetings@merrittworkspace.com>',
            to: 'manager@merrittworkspace.com',
            subject: managerTemplate.subject,
            html: managerTemplate.html,
            text: managerTemplate.text,
        });

        console.log('Booking confirmation emails sent:', { customerEmail, managerEmail });
        return { customerEmail, managerEmail };
    } catch (error) {
        console.error('Failed to send booking confirmation emails:', error);
        throw error;
    }
}