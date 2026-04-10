// app/api/test-email/route.ts - Diagnostic: test different FROM addresses
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(request: NextRequest) {
    if (!process.env.RESEND_API_KEY) {
        return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const results: Record<string, any> = {};

    // Test 1: from manager@ to memberservices@
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

    await delay(1000);

    // Test 2: from manager@ with Membership display name (applications use this)
    try {
        const r = await resend.emails.send({
            from: 'Merritt Workspace Membership <manager@merrittworkspace.net>',
            to: 'memberservices@merrittworkspace.net',
            subject: 'Test 2: FROM manager@ (Membership) TO memberservices@',
            text: 'This email was sent FROM manager@merrittworkspace.net with the Membership display name. If you receive this, the address works.',
        });
        results.test2_from_membership = { data: r.data, error: r.error };
    } catch (e: any) {
        results.test2_from_membership = { thrown_error: e.message };
    }

    await delay(1000);

    // Test 3: from memberservices@ with Snackshop display name (snackshop orders use this)
    try {
        const r = await resend.emails.send({
            from: 'Merritt Workspace Snackshop <memberservices@merrittworkspace.net>',
            to: 'memberservices@merrittworkspace.net',
            subject: 'Test 3: FROM memberservices@ (Snackshop) TO memberservices@',
            text: 'This email was sent FROM memberservices@merrittworkspace.net with the Snackshop display name. If you receive this, the address works.',
        });
        results.test3_from_snackshop = { data: r.data, error: r.error };
    } catch (e: any) {
        results.test3_from_snackshop = { thrown_error: e.message };
    }

    await delay(1000);

    // Test 4: from memberservices@ with Meetings display name (booking confirmations use this)
    try {
        const r = await resend.emails.send({
            from: 'Merritt Workspace Meetings <memberservices@merrittworkspace.net>',
            to: 'memberservices@merrittworkspace.net',
            subject: 'Test 4: FROM memberservices@ (Meetings) TO memberservices@',
            text: 'This email was sent FROM memberservices@merrittworkspace.net with the Meetings display name. If you receive this, the address works.',
        });
        results.test4_from_meetings = { data: r.data, error: r.error };
    } catch (e: any) {
        results.test4_from_meetings = { thrown_error: e.message };
    }

    return NextResponse.json({
        timestamp: new Date().toISOString(),
        results,
        instructions: 'All 4 tests send TO memberservices@. Check which ones actually ARRIVE in the inbox.',
    });
}
