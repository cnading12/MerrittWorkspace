// app/api/test-email/route.ts - Diagnostic: test different FROM addresses
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const results: Record<string, any> = {};

    // Test 1: from manager@ to memberservices@ (WORKED last time)
    try {
        const r = await resend.emails.send({
            from: 'Merritt Workspace <manager@merrittworkspace.net>',
            to: 'memberservices@merrittworkspace.net',
            subject: 'Test 1: FROM manager@ TO memberservices@',
            text: 'This email was sent FROM manager@merrittworkspace.net. If you receive this, the from=manager address works.',
        });
        results.test1_from_manager = { data: r.data, error: r.error };
    } catch (e: any) {
        results.test1_from_manager = { thrown_error: e.message };
    }

    // Test 2: from membership@ to memberservices@ (this is what applications use)
    try {
        const r = await resend.emails.send({
            from: 'Merritt Workspace Membership <membership@merrittworkspace.net>',
            to: 'memberservices@merrittworkspace.net',
            subject: 'Test 2: FROM membership@ TO memberservices@',
            text: 'This email was sent FROM membership@merrittworkspace.net. If you receive this, the from=membership address works.',
        });
        results.test2_from_membership = { data: r.data, error: r.error };
    } catch (e: any) {
        results.test2_from_membership = { thrown_error: e.message };
    }

    // Test 3: from snackshop@ to memberservices@ (this is what snackshop orders use)
    try {
        const r = await resend.emails.send({
            from: 'Merritt Workspace Snackshop <snackshop@merrittworkspace.net>',
            to: 'memberservices@merrittworkspace.net',
            subject: 'Test 3: FROM snackshop@ TO memberservices@',
            text: 'This email was sent FROM snackshop@merrittworkspace.net. If you receive this, the from=snackshop address works.',
        });
        results.test3_from_snackshop = { data: r.data, error: r.error };
    } catch (e: any) {
        results.test3_from_snackshop = { thrown_error: e.message };
    }

    // Test 4: from meetings@ to memberservices@ (this is what booking confirmations use)
    try {
        const r = await resend.emails.send({
            from: 'Merritt Workspace Meetings <meetings@merrittworkspace.net>',
            to: 'memberservices@merrittworkspace.net',
            subject: 'Test 4: FROM meetings@ TO memberservices@',
            text: 'This email was sent FROM meetings@merrittworkspace.net. If you receive this, the from=meetings address works.',
        });
        results.test4_from_meetings = { data: r.data, error: r.error };
    } catch (e: any) {
        results.test4_from_meetings = { thrown_error: e.message };
    }

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        results,
        instructions: 'All 4 tests send TO memberservices@. Check which ones actually ARRIVE in the inbox. Resend will accept all of them, but Google Workspace may silently drop ones from non-existent sender addresses on your domain.',
    });
}
