import { NextResponse } from 'next/server';
import { auth } from '@queenix/auth/server';
import { signConvexToken } from '@/lib/jwks';

export const dynamic = 'force-dynamic';

/**
 * Mint a short-lived RS256 JWT for the currently logged-in BetterAuth user.
 *
 * Convex verifies it via OIDC discovery against this app
 * (see `/.well-known/openid-configuration` + `/api/jwks`):
 *   iss = AUTH_BASE_URL, aud = 'queenix-gym', sub = BetterAuth user id.
 * requireUser() then matches `sub` to users.betterAuthUserId.
 *
 * Used by both web admin and mobile (Expo) clients before they open a
 * Convex query stream (client.setAuth with this endpoint).
 */
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id || !session?.session?.id) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const token = await signConvexToken({
    sub: session.user.id,
    sid: session.session.id,
  });
  return NextResponse.json({ token });
}
