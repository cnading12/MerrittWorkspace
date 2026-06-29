import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';
import { getServiceSupabase } from '@/lib/portal/supabaseAdmin';
import { validateManualAssignment } from '@/lib/portal/seating';

export const dynamic = 'force-dynamic';

// List all manual seating assignments. The portal-derived occupants are read
// from the members list the client already holds, so this endpoint only owns
// the manual second source.
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('seating_manual_assignments')
      .select('*')
      .order('space_type', { ascending: true })
      .order('space_number', { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ assignments: data || [] });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}

// Create a manual seating assignment.
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const v = validateManualAssignment(body);
    if (!v.ok) {
      return NextResponse.json({ error: v.error }, { status: 400 });
    }

    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('seating_manual_assignments')
      .insert({
        space_type: v.spaceType,
        space_number: v.spaceNumber,
        occupant_name: v.occupantName,
        created_by: admin.id,
      })
      .select('*')
      .single();

    if (error) {
      // Unique-index violation: a manual entry already exists for this space.
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

    return NextResponse.json({ assignment: data });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
