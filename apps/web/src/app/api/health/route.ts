import { NextResponse } from 'next/server';
import { pingAuthDb } from '@queenix/auth/server';

export const dynamic = 'force-dynamic';

/** Liveness + auth-DB reachability for load balancers / container healthchecks. */
export async function GET() {
  try {
    await pingAuthDb();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'auth database unreachable' }, { status: 503 });
  }
}
