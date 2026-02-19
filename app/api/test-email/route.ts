// app/api/test-email/route.ts - Diagnostic endpoint for email delivery
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const results: Record<string, any> = {};

    // Test 1: Send to manager@
    try {
        const managerResult = await resend.emails.send({
            from: 'Merritt Workspace <manager@merrittworkspace.net>',
            to: 'manager@merrittworkspace.net',
            subject: 'Diagnostic Test - Manager Email',
            text: 'This is a diagnostic test email sent to manager@merrittworkspace.net. If you receive this, email delivery to this address is working.',
        });
        results.manager = {
            data: managerResult.data,
            error: managerResult.error,
        };
    } catch (error: any) {
        results.manager = {
            thrown_error: error.message,
            stack: error.stack,
        };
    }

    // Test 2: Send to memberservices@
    try {
        const memberServicesResult = await resend.emails.send({
            from: 'Merritt Workspace <manager@merrittworkspace.net>',
            to: 'memberservices@merrittworkspace.net',
            subject: 'Diagnostic Test - Member Services Email',
            text: 'This is a diagnostic test email sent to memberservices@merrittworkspace.net. If you receive this, email delivery to this address is working.',
        });
        results.memberservices = {
            data: memberServicesResult.data,
            error: memberServicesResult.error,
        };
    } catch (error: any) {
        results.memberservices = {
            thrown_error: error.message,
            stack: error.stack,
        };
    }

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        resend_sdk_version: '6.x',
        results,
        instructions: 'Check the "error" field for each result. If "data.id" exists, Resend accepted the email. If "error" exists, Resend rejected it.',
    });
}
