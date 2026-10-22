/**
 * POST /api/team/roles { userId } — copy a user's roles from Convex (where
 * Team → Permissions saves them, owner-gated + audited) into BetterAuth,
 * which gates web routes. Convex is the source, so any signed-in caller is
 * safe: this can only make BetterAuth match what an owner already saved.
 * The target's cached session cookie refreshes within 5 minutes.
 */
import { NextResponse } from 'next/server';
import { auth } from '@queenix/auth/server';
import { convexAdmin } from '@queenix/auth/convex-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { userId } = (await req.json().catch(() => ({}))) as { userId?: string };
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const u = (await convexAdmin('query', 'queries/users:rolesForSync', { userId }).catch(() => null)) as
    | { betterAuthUserId: string; roles: string[]; activeRole: string }
    | null;
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  const ctx = await auth.$context;
  await ctx.internalAdapter.updateUser(u.betterAuthUserId, { roles: u.roles, activeRole: u.activeRole });
  return NextResponse.json({ ok: true, roles: u.roles, activeRole: u.activeRole });
}
