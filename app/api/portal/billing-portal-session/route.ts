import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireMember, PortalError } from '@/lib/portal/auth';

export const dynamic = 'force-dynamic';

// Returns a Stripe customer billing portal URL so the member can update
// payment methods, view invoices, or cancel from inside their portal.
//
// NOTE: To allow members to add/swap ACH bank accounts (us_bank_account)
// as their saved payment method from the billing portal, enable
// "US bank account" under Settings → Billing → Customer portal →
// Payment methods in the Stripe dashboard. This is a one-time,
// environment-wide config — no code change required here.
export async function POST(req: NextRequest) {
  try {
    const member = await requireMember(req);
    if (!member.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer on file. Set up auto-pay first.' },
        { status: 400 }
      );
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-08-27.basil' as any,
    });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: member.stripe_customer_id,
      return_url: `${baseUrl}/portal`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
