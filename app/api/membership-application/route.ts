// app/api/membership-application/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

// Lazy-load Resend client to avoid build-time errors
let resendClient: Resend | null = null;

function getResend(): Resend {
    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
}

const resend = {
    emails: {
        send: (params: Parameters<Resend['emails']['send']>[0]) => getResend().emails.send(params)
    }
};

const MANAGER_EMAIL = 'manager@merrittworkspace.net';
const MEMBER_SERVICES_EMAIL = 'memberservices@merrittworkspace.net';

export async function POST(request: NextRequest) {
  try {
    const applicationData = await request.json();

    console.log('📝 Processing membership application:', {
      applicant: applicationData.first_name + ' ' + applicationData.last_name,
      email: applicationData.customer_email,
      membership_type: applicationData.membership_type
    });

    // Validate required fields
    const requiredFields = [
      'first_name', 'last_name', 'email', 'phone', 
      'company_name', 'membership_type', 'start_date'
    ];

    for (const field of requiredFields) {
      if (!applicationData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Generate application ID
    const applicationId = `APP-${Date.now()}`;
    const submittedAt = new Date();

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not configured');
      return NextResponse.json({
        success: false,
        error: 'Email system not configured. Please contact support.',
        application_id: applicationId
      }, { status: 500 });
    }

    let emailResults = {
      applicant_sent: false,
      manager_sent: false,
      member_services_sent: false,
      applicant_error: null as string | null,
      manager_error: null as string | null,
      member_services_error: null as string | null
    };

    // Format membership type for display
    const membershipTypeDisplay = applicationData.membership_type
      .replace(/_/g, ' ')
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Helper to avoid Resend rate limit (2 req/sec on free plan)
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Send confirmation email to applicant
    try {
      console.log('📧 Sending applicant confirmation email...');
      
      const applicantEmail = await resend.emails.send({
        from: 'Merritt Workspace Membership <membership@merrittworkspace.net>',
        to: applicationData.email,
        subject: 'Membership Application Received | Merritt Workspace',
        html: generateApplicantEmailHTML({
          firstName: applicationData.first_name,
          lastName: applicationData.last_name,
          email: applicationData.email,
          membershipType: membershipTypeDisplay,
          applicationId,
          submittedAt
        }),
        text: generateApplicantEmailText({
          firstName: applicationData.first_name,
          lastName: applicationData.last_name,
          email: applicationData.email,
          membershipType: membershipTypeDisplay,
          applicationId,
          submittedAt
        })
      });

      emailResults.applicant_sent = true;
      console.log('✅ Applicant email sent:', applicantEmail.data?.id);
    } catch (error: any) {
      console.error('❌ Applicant email failed:', error);
      emailResults.applicant_error = error.message;
    }

    // Wait to avoid Resend rate limit
    await delay(1000);

    // Send notification to manager with full application details
    try {
      console.log('📧 Sending manager notification email...');
      
      const managerEmail = await resend.emails.send({
        from: 'Merritt Workspace Membership <membership@merrittworkspace.net>',
        to: MANAGER_EMAIL,
        subject: `🆕 New Membership Application - ${applicationData.first_name} ${applicationData.last_name} (${membershipTypeDisplay})`,
        html: generateManagerEmailHTML({
          applicationData,
          membershipTypeDisplay,
          applicationId,
          submittedAt
        }),
        text: generateManagerEmailText({
          applicationData,
          membershipTypeDisplay,
          applicationId,
          submittedAt
        })
      });

      emailResults.manager_sent = true;
      console.log('✅ Manager email sent:', managerEmail.data?.id);
    } catch (error: any) {
      console.error('❌ Manager email failed:', error);
      emailResults.manager_error = error.message;
    }

    // Wait to avoid Resend rate limit
    await delay(1000);

    // Send notification to member services with full application details
    try {
      console.log('📧 Sending member services notification email...');

      const memberServicesEmail = await resend.emails.send({
        from: 'Merritt Workspace Membership <membership@merrittworkspace.net>',
        to: MEMBER_SERVICES_EMAIL,
        subject: `🆕 New Membership Application - ${applicationData.first_name} ${applicationData.last_name} (${membershipTypeDisplay})`,
        html: generateManagerEmailHTML({
          applicationData,
          membershipTypeDisplay,
          applicationId,
          submittedAt
        }),
        text: generateManagerEmailText({
          applicationData,
          membershipTypeDisplay,
          applicationId,
          submittedAt
        })
      });

      emailResults.member_services_sent = true;
      console.log('✅ Member services email sent:', memberServicesEmail.data?.id);
    } catch (error: any) {
      console.error('❌ Member services email failed:', error);
      emailResults.member_services_error = error.message;
    }

    console.log('📊 Email results:', emailResults);

    // Return success if at least one email was sent
    if (emailResults.applicant_sent || emailResults.manager_sent) {
      return NextResponse.json({
        success: true,
        application_id: applicationId,
        message: emailResults.applicant_sent 
          ? `Application submitted successfully! Check your email at ${applicationData.email} for confirmation.`
          : 'Application submitted successfully! You will receive confirmation shortly.',
        email_status: emailResults
      });
    } else {
      // Both emails failed
      return NextResponse.json({
        success: false,
        error: 'Failed to send confirmation emails. Application received but email system unavailable.',
        application_id: applicationId,
        email_status: emailResults
      }, { status: 500 });
    }

  } catch (error) {
    console.error('💥 Membership Application API Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process application. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({ 
    message: 'Membership Application API is working!', 
    timestamp: new Date().toISOString(),
    resend_configured: !!process.env.RESEND_API_KEY
  });
}

// Email template functions
function generateApplicantEmailHTML(data: {
  firstName: string;
  lastName: string;
  email: string;
  membershipType: string;
  applicationId: string;
  submittedAt: Date;
}) {
  return `
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
            <p>Hi ${data.firstName},</p>
            
            <p>Thank you for your interest in joining the Merritt Workspace community! We've received your membership application and are excited to review it.</p>
            
            <div class="application-info">
              <h3 style="margin-top: 0;">Application Details</h3>
              <p><strong>Applicant:</strong> ${data.firstName} ${data.lastName}</p>
              <p><strong>Email:</strong> ${data.email}</p>
              <p><strong>Membership Type:</strong> ${data.membershipType}</p>
              <p><strong>Application ID:</strong> ${data.applicationId}</p>
              <p><strong>Submitted:</strong> ${data.submittedAt.toLocaleDateString('en-US', {
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
            
            <a href="mailto:membership@merrittworkspace.net" class="button">Questions? Contact Us</a>
          </div>
          
          <div class="footer">
            <p><strong>Merritt Workspace</strong></p>
            <p>Where Work Meets Community</p>
            <p>2246 Irving Street, Denver, CO 80211</p>
            <p>Email: membership@merrittworkspace.net | Phone: (123) 456-7890</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateApplicantEmailText(data: {
  firstName: string;
  lastName: string;
  email: string;
  membershipType: string;
  applicationId: string;
  submittedAt: Date;
}) {
  return `
Membership Application Received - Merritt Workspace

Hi ${data.firstName},

Thank you for applying to join Merritt Workspace! We've received your application and are excited to review it.

Application Details:
- Applicant: ${data.firstName} ${data.lastName}
- Email: ${data.email}
- Membership Type: ${data.membershipType}
- Application ID: ${data.applicationId}
- Submitted: ${data.submittedAt.toLocaleString()}

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

Questions? Contact us at membership@merrittworkspace.net or (123) 456-7890

Welcome to the community!

Merritt Workspace Team
2246 Irving Street, Denver, CO 80211
  `;
}

function generateManagerEmailHTML(data: {
  applicationData: any;
  membershipTypeDisplay: string;
  applicationId: string;
  submittedAt: Date;
}) {
  const app = data.applicationData;
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { background: #ed7611; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 15px 0; }
          .alert { background: #fff8e1; padding: 15px; border-radius: 8px; border-left: 4px solid #ed7611; margin: 15px 0; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          td { padding: 8px; border-bottom: 1px solid #e5e5e5; }
          td:first-child { font-weight: bold; width: 200px; }
          .reference-box { background: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">🆕 New Membership Application</h2>
            <p style="margin: 5px 0 0 0;">Action Required: Follow up within 1-2 business days</p>
          </div>
          
          <div class="alert">
            <h3 style="margin-top: 0;">Application Summary</h3>
            <p><strong>Applicant:</strong> ${app.first_name} ${app.last_name}</p>
            <p><strong>Email:</strong> ${app.email}</p>
            <p><strong>Phone:</strong> ${app.phone}</p>
            <p><strong>Membership Type:</strong> ${data.membershipTypeDisplay}</p>
            <p><strong>Preferred Start Date:</strong> ${new Date(app.start_date).toLocaleDateString()}</p>
            <p><strong>Application ID:</strong> ${data.applicationId}</p>
            <p><strong>Submitted:</strong> ${data.submittedAt.toLocaleString()}</p>
          </div>

          <div class="section">
            <h3>Personal Information</h3>
            <table>
              <tr><td>Name</td><td>${app.first_name} ${app.last_name}</td></tr>
              <tr><td>Email</td><td>${app.email}</td></tr>
              <tr><td>Phone</td><td>${app.phone}</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>Professional Information</h3>
            <table>
              <tr><td>Company</td><td>${app.company_name}</td></tr>
              <tr><td>Job Title</td><td>${app.job_title}</td></tr>
              <tr><td>Industry</td><td>${app.industry}</td></tr>
              <tr><td>Team Size</td><td>${app.team_size}</td></tr>
              ${app.linkedin_url ? `<tr><td>LinkedIn</td><td><a href="${app.linkedin_url}">${app.linkedin_url}</a></td></tr>` : ''}
              ${app.website_url ? `<tr><td>Website</td><td><a href="${app.website_url}">${app.website_url}</a></td></tr>` : ''}
            </table>
          </div>

          <div class="section">
            <h3>Work Preferences</h3>
            <table>
              <tr><td>Work Style</td><td>${app.work_style?.join(', ') || 'Not specified'}</td></tr>
              <tr><td>Meeting Frequency</td><td>${app.meeting_frequency}</td></tr>
              <tr><td>Referral Source</td><td>${app.referral_source}</td></tr>
            </table>
          </div>

          ${app.credit_references && app.credit_references.length > 0 ? `
          <div class="section">
            <h3>Credit References</h3>
            ${app.credit_references.map((ref: any, index: number) => `
              <div class="reference-box">
                <h4>Reference ${index + 1}</h4>
                <table>
                  <tr><td>Institution</td><td>${ref.institution_name}</td></tr>
                  <tr><td>Account Type</td><td>${ref.account_type}</td></tr>
                  <tr><td>Contact Name</td><td>${ref.contact_name}</td></tr>
                  <tr><td>Contact Phone</td><td>${ref.contact_phone}</td></tr>
                  ${ref.contact_email ? `<tr><td>Contact Email</td><td>${ref.contact_email}</td></tr>` : ''}
                  ${ref.relationship ? `<tr><td>Relationship</td><td>${ref.relationship}</td></tr>` : ''}
                </table>
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${app.prior_lease ? `
          <div class="section">
            <h3>Prior Lease Information</h3>
            <table>
              <tr><td>Type</td><td>${app.prior_lease.type === 'residential' ? 'Residential' : 'Commercial/Office'}</td></tr>
              <tr><td>Property Name</td><td>${app.prior_lease.property_name}</td></tr>
              <tr><td>Address</td><td>${app.prior_lease.address}</td></tr>
              <tr><td>Landlord Name</td><td>${app.prior_lease.landlord_name}</td></tr>
              <tr><td>Landlord Phone</td><td>${app.prior_lease.landlord_phone}</td></tr>
              <tr><td>Landlord Email</td><td>${app.prior_lease.landlord_email}</td></tr>
              <tr><td>Monthly Rent</td><td>${app.prior_lease.monthly_rent}</td></tr>
              <tr><td>Lease Period</td><td>${app.prior_lease.lease_start_date} to ${app.prior_lease.lease_end_date}</td></tr>
              ${app.prior_lease.reason_for_leaving ? `<tr><td>Reason for Leaving</td><td>${app.prior_lease.reason_for_leaving}</td></tr>` : ''}
            </table>
          </div>
          ` : ''}

          <div class="section">
            <h3>Emergency Contact</h3>
            <table>
              <tr><td>Name</td><td>${app.emergency_contact_name}</td></tr>
              <tr><td>Phone</td><td>${app.emergency_contact_phone}</td></tr>
              <tr><td>Relationship</td><td>${app.emergency_contact_relationship}</td></tr>
            </table>
          </div>

          ${app.special_requirements ? `
          <div class="section">
            <h3>Special Requirements</h3>
            <p>${app.special_requirements}</p>
          </div>
          ` : ''}

          <div class="section">
            <h3>Consents & Agreements</h3>
            <ul>
              <li>Terms & Conditions: ${app.agrees_to_terms ? '✅ Agreed' : '❌ Not Agreed'}</li>
              <li>Background Check: ${app.agrees_to_background_check ? '✅ Consented' : '❌ Not Consented'}</li>
              <li>Marketing Communications: ${app.marketing_consent ? '✅ Opted In' : '❌ Opted Out'}</li>
            </ul>
          </div>

          <div class="alert">
            <h3 style="margin-top: 0;">📋 Next Steps</h3>
            <ol>
              <li>Review the application details above</li>
              <li>Contact ${app.first_name} at ${app.email} or ${app.phone} to schedule a tour</li>
              <li>Arrange their free trial day</li>
              <li>Process background check if required</li>
              <li>Verify credit references</li>
              <li>Send membership agreement for signature</li>
            </ol>
            <p><strong>⏰ Action Required:</strong> Please follow up within 1-2 business days as promised to the applicant.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateManagerEmailText(data: {
  applicationData: any;
  membershipTypeDisplay: string;
  applicationId: string;
  submittedAt: Date;
}) {
  const app = data.applicationData;
  
  return `
NEW MEMBERSHIP APPLICATION

Applicant: ${app.first_name} ${app.last_name}
Email: ${app.email}
Phone: ${app.phone}
Membership Type: ${data.membershipTypeDisplay}
Preferred Start Date: ${new Date(app.start_date).toLocaleDateString()}
Application ID: ${data.applicationId}
Submitted: ${data.submittedAt.toLocaleString()}

PERSONAL INFORMATION
Name: ${app.first_name} ${app.last_name}
Email: ${app.email}
Phone: ${app.phone}

PROFESSIONAL INFORMATION
Company: ${app.company_name}
Job Title: ${app.job_title}
Industry: ${app.industry}
Team Size: ${app.team_size}
${app.linkedin_url ? `LinkedIn: ${app.linkedin_url}` : ''}
${app.website_url ? `Website: ${app.website_url}` : ''}

WORK PREFERENCES
Work Style: ${app.work_style?.join(', ') || 'Not specified'}
Meeting Frequency: ${app.meeting_frequency}
Referral Source: ${app.referral_source}

${app.credit_references && app.credit_references.length > 0 ? `
CREDIT REFERENCES
${app.credit_references.map((ref: any, index: number) => `
Reference ${index + 1}:
- Institution: ${ref.institution_name}
- Account Type: ${ref.account_type}
- Contact: ${ref.contact_name}
- Phone: ${ref.contact_phone}
${ref.contact_email ? `- Email: ${ref.contact_email}` : ''}
${ref.relationship ? `- Relationship: ${ref.relationship}` : ''}
`).join('\n')}
` : ''}

${app.prior_lease ? `
PRIOR LEASE INFORMATION
Type: ${app.prior_lease.type === 'residential' ? 'Residential' : 'Commercial/Office'}
Property: ${app.prior_lease.property_name}
Address: ${app.prior_lease.address}
Landlord: ${app.prior_lease.landlord_name}
Landlord Phone: ${app.prior_lease.landlord_phone}
Landlord Email: ${app.prior_lease.landlord_email}
Monthly Rent: ${app.prior_lease.monthly_rent}
Lease Period: ${app.prior_lease.lease_start_date} to ${app.prior_lease.lease_end_date}
${app.prior_lease.reason_for_leaving ? `Reason for Leaving: ${app.prior_lease.reason_for_leaving}` : ''}
` : ''}

EMERGENCY CONTACT
Name: ${app.emergency_contact_name}
Phone: ${app.emergency_contact_phone}
Relationship: ${app.emergency_contact_relationship}

${app.special_requirements ? `
SPECIAL REQUIREMENTS
${app.special_requirements}
` : ''}

CONSENTS & AGREEMENTS
- Terms & Conditions: ${app.agrees_to_terms ? 'Agreed' : 'Not Agreed'}
- Background Check: ${app.agrees_to_background_check ? 'Consented' : 'Not Consented'}
- Marketing Communications: ${app.marketing_consent ? 'Opted In' : 'Opted Out'}

NEXT STEPS:
1. Review the application details
2. Contact ${app.first_name} at ${app.email} or ${app.phone} to schedule a tour
3. Arrange their free trial day
4. Process background check if required
5. Verify credit references
6. Send membership agreement for signature

ACTION REQUIRED: Please follow up within 1-2 business days.
  `;
}