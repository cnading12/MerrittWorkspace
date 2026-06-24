import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';

export const dynamic = 'force-dynamic';

// Soft-archive / restore for former members.
//
// Archiving hides a cancelled, once-paying member from the active roster and
// from "total members" counts, but KEEPS all their data (documents,
// agreements, payment history) in the database for recovery. This is the
// non-destructive counterpart to the hard-delete path used for never-paid
// trial signups (app/api/admin/members/[id]/cancel-subscription).
//
//   POST   -> archive   (set archived_at = now)
//   DELETE -> restore   (clear archived_at)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const adminUser = await requireAdmin(req);
    const sb = getServiceSupabase();

    const { data: member, error: memErr } = await sb
      .from('members')
      .select('id, status, archived_at')
      .eq('id', id)
      .single();
    if (memErr || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (member.archived_at) {
      // Already archived — idempotent success.
      return NextResponse.json({ ok: true, archived_at: member.archived_at });
    }

    // Only cancelled members can be archived. Active/pending/paused members
    // belong on the roster; cancel them first if they should be removed. (Any
    // never-paid member who cancels is hard-deleted, so a remaining cancelled
    // member is by construction a former paying member.)
    if (member.status !== 'cancelled') {
      return NextResponse.json(
        {
          error:
            'Only cancelled members can be archived. Cancel the membership first.',
        },
        { status: 400 },
      );
    }

    const archivedAt = new Date().toISOString();
    // Archiving frees the member's seat: a desk/office is considered "taken"
    // purely by the presence of desk_number/office_number on a member row
    // (see the clash check in app/api/portal/assignment), so clearing them
    // reopens the seat for the next member. The assignment isn't restored on
    // un-archive — the seat may have been reassigned in the meantime — so the
    // member would re-pick (or an admin re-assigns) if they ever return.
    const { error } = await sb
      .from('members')
      .update({
        archived_at: archivedAt,
        archived_by: adminUser.id,
        desk_number: null,
        office_number: null,
      })
      .eq('id', id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, archived_at: archivedAt });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

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
      .select('id')
      .eq('id', id)
      .single();
    if (memErr || !member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const { error } = await sb
      .from('members')
      .update({ archived_at: null, archived_by: null })
      .eq('id', id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, archived_at: null });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
