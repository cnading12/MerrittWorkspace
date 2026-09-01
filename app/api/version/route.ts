import { NextResponse } from 'next/server';
import { currentBuildStamp } from '@/lib/buildStamp';

export const dynamic = 'force-dynamic';

// Which deployment is serving right now. Public and secret-free — the value
// is a commit SHA prefix that is already visible in the client bundle.
//
// The admin panel polls this on focus and compares it against the stamp
// baked into its own bundle; lib/buildStamp.ts explains why a mismatch is
// worth interrupting an admin for.
export async function GET() {
  return NextResponse.json({ build: currentBuildStamp() });
}
