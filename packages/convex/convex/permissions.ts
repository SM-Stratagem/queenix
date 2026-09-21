/**
 * Queenix Gym — server-side role → capability matrix.
 * Uses requireUser / requireRole from convex/_helpers.
 */

import { ConvexError } from 'convex/values';
import { requireRole, requireUser } from './_helpers';

export type Role =
  | 'superadmin'
  | 'admin'
  | 'owner'
  | 'operations'
  | 'salon'
  | 'coffee'
  | 'trainer'
  | 'member';

export type Capability =
  | 'platform.manage'
  | 'finance.read'
  | 'finance.write'
  | 'staff.manage'
  | 'staff.read'
  | 'classes.manage'
  | 'bookings.manage'
  | 'bookings.scan'
  | 'salon.serve'
  | 'coffee.serve'
  | 'training.coach'
  | 'member.self';

/** Every capability maps to the roles that hold it. Ordered high → low. */
export const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  superadmin: [
    'platform.manage',
    'finance.read',
    'finance.write',
    'staff.manage',
    'staff.read',
    'classes.manage',
    'bookings.manage',
    'bookings.scan',
    'salon.serve',
    'coffee.serve',
    'training.coach',
    'member.self',
  ],
  admin: [
    'finance.read',
    'finance.write',
    'staff.manage',
    'staff.read',
    'classes.manage',
    'bookings.manage',
    'bookings.scan',
    'salon.serve',
    'coffee.serve',
    'training.coach',
    'member.self',
  ],
  owner: [
    'finance.read',
    'finance.write',
    'staff.manage',
    'staff.read',
    'classes.manage',
    'bookings.manage',
    'bookings.scan',
    'member.self',
  ],
  operations: [
    'staff.read',
    'classes.manage',
    'bookings.manage',
    'bookings.scan',
    'member.self',
  ],
  salon: ['salon.serve', 'bookings.scan', 'member.self'],
  coffee: ['coffee.serve', 'bookings.scan', 'member.self'],
  trainer: ['training.coach', 'classes.manage', 'bookings.scan', 'member.self'],
  member: ['member.self'],
};

/** Invert the matrix: which roles hold a capability. */
export function rolesForCapability(capability: Capability): Role[] {
  const all: Role[] = [
    'superadmin',
    'admin',
    'owner',
    'operations',
    'salon',
    'coffee',
    'trainer',
    'member',
  ];
  return all.filter((role) => ROLE_CAPABILITIES[role].includes(capability));
}

export function userHasCapability(
  userRoles: Role[],
  capability: Capability,
): boolean {
  return userRoles.some((role) =>
    (ROLE_CAPABILITIES[role] ?? []).includes(capability),
  );
}

/**
 * Require that the caller holds a capability. Throws ConvexError FORBIDDEN
 * otherwise. Delegates identity + role lookup to requireRole from _helpers
 * (cast: _helpers Role union is a subset of this file's contract union).
 */
export async function requireCapability(ctx: any, capability: Capability) {
  const allowed = rolesForCapability(capability);
  const user = await requireRole(ctx, allowed as any);
  if (!userHasCapability((user.roles ?? []) as Role[], capability)) {
    throw new ConvexError({
      code: 'FORBIDDEN',
      message: `Requires capability: ${capability}`,
    });
  }
  return user;
}

/** Lightweight self-access check (any signed-in user). */
export async function requireSelf(ctx: any) {
  return requireUser(ctx);
}
