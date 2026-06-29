import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { memberHasEverPaid, deleteMemberCompletely } from '@/lib/portal/memberRemoval';

export const dynamic = 'force-dynamic';

// Admin-only permanent deletion of a never-paid member.
//
// This is the cleanup step after a never-paid (trial-day) member has cancelled:
// it removes their record, login, documents, agreements, payment history, and
// application entirely, and frees their email for reuse. Members who ever paid
// are protected — they should be ARCHIVED (soft hide, recoverable), not
// deleted, so their financial records are preserved. Only an admin can delete.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await requireAdmin(req);
    const sb = getServiceSupabase();

    const { data: member, error: memErr } = await sb
      .from('members')
      .select('*')
      .eq('id', id)
      .single();
    if (memErr || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Protect paid members from accidental hard deletion — archive them instead.
    if (await memberHasEverPaid(sb, member.id)) {
      return NextResponse.json(
        {
          error:
            'This member has paid before, so they cannot be deleted. Use "Archive member" to remove them from the roster while keeping their records.',
          paid: true,
        },
        { status: 400 },
      );
    }

    await deleteMemberCompletely({ sb, member });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
