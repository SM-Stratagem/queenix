/**
 * POST /api/team/roles { userId } — copy a user's roles from Convex (where
 * Team → Permissions saves them, role-ceiling-gated + audited) into
 * BetterAuth, which gates web routes. Roles come only from Convex, never the
 * body, and the caller must be allowed to manage that user (canSyncRoles):
 * a strictly higher-ranked staff manager, or the user themself without
 * escalating. The target's cached session cookie refreshes within a minute.
 */
import { NextResponse } from 'next/server';
import { auth } from '@queenix/auth/server';
import { convexAdmin } from '@queenix/auth/convex-admin';
import { canSyncRoles } from '@queenix/auth/roles';

export const dynamic = 'force-dynamic';

const rolesOf = (u: unknown): string[] => {
  const r = (u as { roles?: unknown } | null)?.roles;
  return Array.isArray(r) ? r.filter((x): x is string => typeof x === 'string') : [];
};

export async function POST(req: Request) {
  // Fresh from the DB: authorization must not trust a minute-old cached role.
  const session = await auth.api.getSession({ headers: req.headers, query: { disableCookieCache: true } });
  if (!session?.user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { userId } = (await req.json().catch(() => ({}))) as { userId?: unknown };
  if (typeof userId !== 'string' || !userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const u = (await convexAdmin('query', 'queries/users:rolesForSync', { userId }).catch(() => null)) as
    | { betterAuthUserId: string; roles: string[]; activeRole: string }
    | null;
  if (!u) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  const ctx = await auth.$context;
  const target = await ctx.internalAdapter.findUserById(u.betterAuthUserId);
  if (!target) return NextResponse.json({ error: 'user not found' }, { status: 404 });

  const allowed = canSyncRoles(rolesOf(session.user), {
    isSelf: target.id === session.user.id,
    currentRoles: rolesOf(target),
    newRoles: u.roles,
  });
  if (!allowed) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  await ctx.internalAdapter.updateUser(u.betterAuthUserId, { roles: u.roles, activeRole: u.activeRole });
  return NextResponse.json({ ok: true, roles: u.roles, activeRole: u.activeRole });
}
