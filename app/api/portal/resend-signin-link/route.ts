import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { sendOnboardingMagicLink } from '@/lib/portal/magicLink';

export const dynamic = 'force-dynamic';

// Public, unauthenticated endpoint: a member whose original sign-in
// link has expired can request a new one without contacting an admin.
//
// Always returns 200 OK regardless of whether the email belongs to a
// member, to avoid leaking the membership list. We only actually issue
// a link when the email matches a `members` row.
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
