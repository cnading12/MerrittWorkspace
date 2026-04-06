import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, PortalError } from '@/lib/portal/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    return NextResponse.json({ user_id: user.id, email: user.email });
  } catch (e: any) {
    const status = e instanceof PortalError ? e.status : 500;
    return NextResponse.json({ error: e.message }, { status });
  }
}
