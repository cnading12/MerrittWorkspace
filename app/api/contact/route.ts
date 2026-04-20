import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

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

const INQUIRY_LABELS: Record<string, string> = {
    general: 'General Information',
    trial_day: 'Book a Free Trial Day',
    tour: 'Schedule a Tour',
    membership: 'Membership Inquiry',
    meeting_room: 'Meeting Room Booking',
    current_member: 'Current Member Support',
    other: 'Other',
};

// --- Spam Protection ---

// Rate limiting: track submissions by IP (in-memory, resets on server restart)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 3; // max submissions per window

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const timestamps = rateLimitMap.get(ip) || [];
    // Remove expired entries
    const recent = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
    rateLimitMap.set(ip, recent);

    if (recent.length >= RATE_LIMIT_MAX) {
        return true;
    }
    recent.push(now);
    rateLimitMap.set(ip, recent);
    return false;
}

// Email validation - stricter than just "type=email"
function isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return false;
    // Block disposable/temporary email domains commonly used by spammers
    const disposableDomains = [
        'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
        'fakeinbox.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
        'dispostable.com', 'yopmail.com', 'trashmail.com', 'tempail.com',
        'maildrop.cc', 'temp-mail.org', 'getnada.com', '10minutemail.com',
    ];
    const domain = email.split('@')[1]?.toLowerCase();
    if (disposableDomains.includes(domain)) return false;
    return true;
}

// Content-based spam detection
function isSpamContent(message: string, name: string): boolean {
    const combined = `${name} ${message}`.toLowerCase();

    // Check for excessive URLs (more than 2 links is suspicious for a contact form)
    const urlCount = (combined.match(/https?:\/\//g) || []).length;
    if (urlCount > 2) return true;

    // Common spam phrases
    const spamPhrases = [
        'buy now', 'click here', 'free money', 'act now', 'limited time offer',
        'you have been selected', 'congratulations you won', 'dear friend',
        'nigerian prince', 'wire transfer', 'crypto opportunity', 'earn money fast',
        'work from home opportunity', 'double your income', 'million dollars',
        'casino online', 'online pharmacy', 'viagra', 'cialis',
        'seo services', 'backlink', 'link building', 'web traffic',
    ];
    for (const phrase of spamPhrases) {
        if (combined.includes(phrase)) return true;
    }

    // All-caps message (more than 80% uppercase and longer than 20 chars)
    if (message.length > 20) {
        const uppercaseCount = (message.match(/[A-Z]/g) || []).length;
        const letterCount = (message.match(/[a-zA-Z]/g) || []).length;
        if (letterCount > 0 && uppercaseCount / letterCount > 0.8) return true;
    }

    return false;
}

// Minimum time (ms) a human would need to fill out the form
const MIN_FORM_TIME_MS = 3000; // 3 seconds

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        const { name, email, phone, company, message, inquiry_type, website, _t } = data;

        // 1. Honeypot check - if the hidden "website" field is filled, it's a bot
        if (website) {
            // Return success to not tip off the bot, but don't actually send
            console.log('Spam blocked: honeypot field filled');
            return NextResponse.json({
                success: true,
                message: 'Your message has been sent. We will get back to you within 24 hours.',
            });
        }

        // 2. Timing check - bots submit forms instantly
        if (_t && typeof _t === 'number') {
            const elapsed = Date.now() - _t;
            if (elapsed < MIN_FORM_TIME_MS) {
                console.log(`Spam blocked: form submitted too fast (${elapsed}ms)`);
                return NextResponse.json({
                    success: true,
                    message: 'Your message has been sent. We will get back to you within 24 hours.',
                });
            }
        }

        // 3. Rate limiting by IP
        const forwarded = request.headers.get('x-forwarded-for');
        const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
        if (isRateLimited(ip)) {
            return NextResponse.json(
                { error: 'Too many messages sent. Please wait a few minutes before trying again.' },
                { status: 429 }
            );
        }

        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'Name, email, and message are required.' },
                { status: 400 }
            );
        }

        // 4. Stricter email validation
        if (!isValidEmail(email)) {
            return NextResponse.json(
                { error: 'Please enter a valid email address.' },
                { status: 400 }
            );
        }

        // 5. Content-based spam detection
        if (isSpamContent(message, name)) {
            console.log(`Spam blocked: suspicious content from ${email}`);
            return NextResponse.json({
                success: true,
                message: 'Your message has been sent. We will get back to you within 24 hours.',
            });
        }

        if (!process.env.RESEND_API_KEY) {
            console.error('RESEND_API_KEY not configured');
            return NextResponse.json(
                { error: 'Email system not configured. Please call us at (720) 357-9499.' },
                { status: 500 }
            );
        }

        const inquiryLabel = INQUIRY_LABELS[inquiry_type] || inquiry_type;
        const submittedAt = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        const notificationHtml = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #ed7611, #de5f07); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                  .header h2 { margin: 0; }
                  .content { background: white; padding: 25px; border: 1px solid #e5e5e5; }
                  .field { margin-bottom: 12px; }
                  .field-label { font-weight: bold; color: #555; }
                  .message-box { background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #ed7611; margin: 15px 0; }
                  .footer { background: #f8f9fa; padding: 15px; text-align: center; color: #666; border-radius: 0 0 8px 8px; font-size: 14px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h2>New Contact Form Submission</h2>
                    <p style="margin: 5px 0 0 0;">Inquiry Type: ${inquiryLabel}</p>
                  </div>
                  <div class="content">
                    <div class="field">
                      <span class="field-label">Name:</span> ${name}
                    </div>
                    <div class="field">
                      <span class="field-label">Email:</span> <a href="mailto:${email}">${email}</a>
                    </div>
                    ${phone ? `<div class="field"><span class="field-label">Phone:</span> <a href="tel:${phone}">${phone}</a></div>` : ''}
                    ${company ? `<div class="field"><span class="field-label">Company:</span> ${company}</div>` : ''}
                    <div class="field">
                      <span class="field-label">Submitted:</span> ${submittedAt}
                    </div>

                    <div class="message-box">
                      <p style="margin-top: 0;"><strong>Message:</strong></p>
                      <p style="margin-bottom: 0; white-space: pre-wrap;">${message}</p>
                    </div>

                    <p style="margin-top: 20px;"><strong>Reply directly to this email to respond to ${name}.</strong></p>
                  </div>
                  <div class="footer">
                    <p>Merritt Workspace Contact Form • 2246 Irving Street, Denver, CO 80211</p>
                  </div>
                </div>
              </body>
            </html>
        `;

        const notificationText = `NEW CONTACT FORM SUBMISSION

Inquiry Type: ${inquiryLabel}

Name: ${name}
Email: ${email}
${phone ? `Phone: ${phone}\n` : ''}${company ? `Company: ${company}\n` : ''}Submitted: ${submittedAt}

Message:
${message}

Reply directly to this email to respond to ${name}.`;

        // Helper to avoid Resend rate limit (2 req/sec on free plan)
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Send to manager
        let managerSent = false;
        try {
            await resend.emails.send({
                from: 'Merritt Workspace <manager@merrittworkspace.net>',
                replyTo: email,
                to: MANAGER_EMAIL,
                subject: `New Contact Form: ${inquiryLabel} - ${name}`,
                html: notificationHtml,
                text: notificationText,
            });
            managerSent = true;
            console.log('Contact form email sent to manager');
        } catch (error) {
            console.error('Failed to send contact form email to manager:', error);
        }

        // Wait to avoid Resend rate limit
        await delay(1000);

        // Send to member services
        let memberServicesSent = false;
        try {
            await resend.emails.send({
                from: 'Merritt Workspace <manager@merrittworkspace.net>',
                replyTo: email,
                to: MEMBER_SERVICES_EMAIL,
                subject: `New Contact Form: ${inquiryLabel} - ${name}`,
                html: notificationHtml,
                text: notificationText,
            });
            memberServicesSent = true;
            console.log('Contact form email sent to member services');
        } catch (error) {
            console.error('Failed to send contact form email to member services:', error);
        }

        if (managerSent || memberServicesSent) {
            return NextResponse.json({
                success: true,
                message: 'Your message has been sent. We will get back to you within 24 hours.',
            });
        }

        return NextResponse.json(
            { error: 'Failed to send your message. Please call us at (720) 357-9499.' },
            { status: 500 }
        );
    } catch (error) {
        console.error('Contact form API error:', error);
        return NextResponse.json(
            { error: 'Failed to process your message. Please try again.' },
            { status: 500 }
        );
    }
}
