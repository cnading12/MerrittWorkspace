import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { validateManualAssignment } from '@/lib/portal/seating';

export const dynamic = 'force-dynamic';

// Edit a manual seating assignment (move it to a different space and/or rename
// the occupant).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const v = validateManualAssignment(body);
    if (!v.ok) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('seating_manual_assignments')
      .update({
        space_type: v.spaceType,
        space_number: v.spaceNumber,
        occupant_name: v.occupantName,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      if ((error as any).code === '23505') {
        return NextResponse.json(
          {
            error: `A manual entry already exists for ${v.spaceType} ${v.spaceNumber}. Edit or remove it instead.`,
          },
          { status: 409 }
        );
      }
      throw new Error(error.message);
    }
    if (!data) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json({ assignment: data });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

// Remove a manual seating assignment.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireAdmin(req);
    const sb = getServiceSupabase();
    const { error } = await sb
      .from('seating_manual_assignments')
      .delete()
      .eq('id', id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
