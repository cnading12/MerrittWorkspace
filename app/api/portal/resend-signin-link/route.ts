import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { sendOnboardingMagicLink } from '@/lib/portal/magicLink';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

// Public, unauthenticated endpoint: a member whose original sign-in
// link has expired can request a new one without contacting an admin.
//
// Always returns 200 OK regardless of whether the email belongs to a
// member, to avoid leaking the membership list. We only actually issue
// a link when the email matches a `members` row.
//
// Rate limited on two keys, because an unthrottled endpoint that mails a
// working sign-in link on demand is both a mail-bomb aimed at whichever
// member's address the caller names and a way to burn our Resend quota:
//   • per IP — stops one caller working through a list of addresses;
//   • per email — stops a distributed caller repeatedly hitting one inbox.
// Both limits are deliberately generous enough for a real member who
// mistypes their address or doesn't see the first mail arrive.
const PER_IP = { windowMs: 15 * 60 * 1000, max: 10 };
const PER_EMAIL = { windowMs: 15 * 60 * 1000, max: 3 };

export async function POST(req: NextRequest) {
  let email: string | null = null;
  try {
    const body = await req.json();
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const ipLimit = checkRateLimit(`resend-signin:ip:${getClientIp(req)}`, PER_IP);
  if (ipLimit.limited) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(ipLimit.retryAfterSeconds) } }
    );
  }

  const emailLimit = checkRateLimit(`resend-signin:email:${email}`, PER_EMAIL);
  if (emailLimit.limited) {
    // Same opaque 200 as the "no such member" case — telling the caller they
    // hit a per-address limit would confirm the address belongs to a member,
    // which is exactly what the constant response above exists to hide.
    return NextResponse.json({ ok: true });
  }

  const sb = getServiceSupabase();
  const { data: member } = await sb
    .from('members')
    .select('email, first_name')
    .eq('email', email)
    .maybeSingle();

  if (member) {
    await sendOnboardingMagicLink({
      email: member.email,
      firstName: member.first_name,
    });
  }

  return NextResponse.json({ ok: true });
}
