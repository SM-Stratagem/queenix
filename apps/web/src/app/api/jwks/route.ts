import { NextResponse } from 'next/server';
import { publicJwks } from '@/lib/jwks';

export const dynamic = 'force-dynamic';

/** Public RSA key Convex uses to verify our short-lived tokens. */
export async function GET() {
  return NextResponse.json(await publicJwks());
}
