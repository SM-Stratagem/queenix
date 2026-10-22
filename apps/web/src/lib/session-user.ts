import 'server-only';
import { auth } from '@queenix/auth/server';
import { convexAdmin } from '@queenix/auth/convex-admin';
import { hasAnyRole, type Role } from '@queenix/auth/roles';

export type SessionUser = { _id: string; roles: Role[]; fullName: string; email: string };

/**
 * The Convex user behind this request's BetterAuth session (cookie; the Expo
 * client sends it via authClient.$fetch), or null when signed out.
 */
export async function sessionUser(req: Request): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user?.id) return null;
  return convexAdmin<SessionUser | null>('query', 'queries/users:getByBetterAuthUserId', {
    betterAuthUserId: session.user.id,
  });
}

/** Role gate mirroring Convex requireRole: superadmin/admin always pass. */
export function hasStaffRole(user: SessionUser, roles: Role[]): boolean {
  return hasAnyRole(user.roles ?? [], ['superadmin', 'admin', ...roles]);
}
