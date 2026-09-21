/**
 * Queenix Gym — Convex auth helpers
 * Server-side role-based authorization.
 */

import { mutation, query } from './_generated/server';
import { ConvexError } from 'convex/values';

export type Role =
  | 'superadmin'
  | 'admin'
  | 'finance'
  | 'operations'
  | 'salon'
  | 'coffee'
  | 'trainer'
  | 'member'
  /** @deprecated Renamed to 'finance'. Accepted as an alias, normalized away. */
  | 'owner';

/** Canonicalize roles: 'owner' is the deprecated alias of 'finance'. */
export function normalizeRole(role: Role): Role {
  return role === 'owner' ? 'finance' : role;
}

/**
 * Get the current user from session, or throw if not signed in.
 */
export async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ code: 'UNAUTHORIZED', message: 'Not signed in' });
  }
  const user = await ctx.db
    .query('users')
    .withIndex('by_betterAuthUserId', (q: any) => q.eq('betterAuthUserId', identity.subject))
    .first();
  if (!user) {
    throw new ConvexError({ code: 'USER_NOT_FOUND', message: 'User not found' });
  }
  return user;
}

/**
 * Require a specific role(s). Throws if user doesn't have any of the required roles.
 */
export async function requireRole(ctx: any, roles: Role | Role[]) {
  const user = await requireUser(ctx);
  const required = (Array.isArray(roles) ? roles : [roles]).map(normalizeRole);
  const userRoles = (user.roles ?? []).map(normalizeRole);
  const hasPermission = required.some((r) => userRoles.includes(r));
  if (!hasPermission) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: `Requires one of: ${required.join(', ')}`,
    });
  }
  return user;
}

/**
 * Get the active role for the current session.
 */
export async function getActiveRole(ctx: any): Promise<Role> {
  const user = await requireUser(ctx);
  return user.activeRole as Role;
}

/**
 * Audit log helper.
 */
export async function audit(
  ctx: any,
  params: {
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    before?: any;
    after?: any;
  }
) {
  await ctx.db.insert('auditEvents', {
    ...params,
    timestamp: Date.now(),
  });
}
