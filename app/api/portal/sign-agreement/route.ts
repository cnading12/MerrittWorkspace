import { NextRequest, NextResponse } from 'next/server';
import { requireMember, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const member = await requireMember(req);
    if (!member.required_docs_complete) {
      return NextResponse.json(
        { error: 'Submit required documents first' },
        { status: 400 }
      );
    }
    const { agreement_type, signature_name, metadata } = await req.json();
    if (
      !['member_agreement', 'terms_and_conditions', 'fee_agreement'].includes(
        agreement_type
      )
    ) {
      return NextResponse.json({ error: 'Invalid agreement_type' }, { status: 400 });
    }
    if (agreement_type === 'fee_agreement') {
      if (member.monthly_cost_cents == null) {
        return NextResponse.json(
          { error: 'No monthly cost assigned to your membership yet — contact the team.' },
          { status: 400 }
        );
      }
      const required = ['street', 'city_state_zip', 'phone', 'email', 'payment_method'];
      const missing = required.filter((k) => !metadata?.[k]);
      if (missing.length) {
        return NextResponse.json(
          { error: `Missing fee agreement fields: ${missing.join(', ')}` },
          { status: 400 }
        );
      }
    }
    if (!signature_name || typeof signature_name !== 'string') {
      return NextResponse.json({ error: 'signature_name required' }, { status: 400 });
    }

    const sb = getServiceSupabase();
    await sb.from('member_agreements').upsert(
      {
        member_id: member.id,
        agreement_type,
        signature_name,
        ip_address: req.headers.get('x-forwarded-for') || null,
        user_agent: req.headers.get('user-agent') || null,
        document_version: 'v2-2026-04',
        metadata: metadata || null,
      },
      { onConflict: 'member_id,agreement_type' }
    );

    // Mark agreement_signed if BOTH docs signed.
    const { data: agreements } = await sb
      .from('member_agreements')
      .select('agreement_type')
      .eq('member_id', member.id);
    const types = new Set((agreements || []).map((a: any) => a.agreement_type));
    const fullySigned =
      types.has('member_agreement') &&
      types.has('terms_and_conditions') &&
      types.has('fee_agreement');
    if (fullySigned !== member.agreement_signed) {
      await sb.from('members').update({ agreement_signed: fullySigned }).eq('id', member.id);
    }
    return NextResponse.json({ ok: true, agreement_signed: fullySigned });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
