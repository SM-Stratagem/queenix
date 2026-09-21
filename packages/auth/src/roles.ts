/**
 * Queenix Gym — canonical role contract (client-safe, framework-free).
 *
 * FIXED ROLE CONTRACT — use literally everywhere, do not invent others:
 *   'superadmin' | 'admin' | 'owner' | 'operations' |
 *   'salon' | 'coffee' | 'trainer' | 'member'
 *
 * Hierarchy (high → low):
 *   superadmin > admin > owner > operations > salon = coffee = trainer > member
 */

export type Role =
  | 'superadmin'
  | 'admin'
  | 'owner'
  | 'operations'
  | 'salon'
  | 'coffee'
  | 'trainer'
  | 'member';

export const ROLES: readonly Role[] = [
  'superadmin',
  'admin',
  'owner',
  'operations',
  'salon',
  'coffee',
  'trainer',
  'member',
] as const;

/** Numeric rank — higher outranks lower. Salon/coffee/trainer share a rank. */
export const ROLE_RANK: Record<Role, number> = {
  superadmin: 7,
  admin: 6,
  owner: 5,
  operations: 4,
  salon: 3,
  coffee: 3,
  trainer: 3,
  member: 1,
};

export function isRole(value: unknown): value is Role {
  return (
    typeof value === 'string' &&
    (ROLES as readonly string[]).includes(value)
  );
}

export function hasRole(userRoles: Role[], required: Role): boolean {
  return userRoles.includes(required);
}

export function hasAnyRole(userRoles: Role[], required: Role[]): boolean {
  return required.some((r) => userRoles.includes(r));
}

/** True when any of the user's roles outranks (or equals) the required role. */
export function hasRank(
  userRoles: Role[],
  minimum: Role,
): boolean {
  const floor = ROLE_RANK[minimum];
  return userRoles.some((r) => ROLE_RANK[r] >= floor);
}

/** Staff = everyone except pure members. */
export function isStaff(userRoles: Role[]): boolean {
  return hasAnyRole(userRoles, [
    'superadmin',
    'admin',
    'owner',
    'operations',
    'salon',
    'coffee',
    'trainer',
  ]);
}

/** Admin surfaces: superadmin + admin + owner. */
export function canAccessAdmin(userRoles: Role[]): boolean {
  return hasAnyRole(userRoles, ['superadmin', 'admin', 'owner']);
}

/** Finance surfaces: superadmin + admin + owner only (no ops/staff). */
export function canAccessFinance(userRoles: Role[]): boolean {
  return hasAnyRole(userRoles, ['superadmin', 'admin', 'owner']);
}

/** Staff management: superadmin + admin can manage anyone; owner manages venue staff. */
export function canManageStaff(userRoles: Role[]): boolean {
  return hasAnyRole(userRoles, ['superadmin', 'admin', 'owner']);
}

/** Expo-router mobile home per role (existing route groups). */
export const MOBILE_HOME: Record<Role, string> = {
  superadmin: '/(owner)/overview',
  admin: '/(owner)/overview',
  owner: '/(owner)/overview',
  operations: '/(ops)/scanner',
  salon: '/(ops)/scanner',
  coffee: '/(ops)/scanner',
  trainer: '/(trainer)/today',
  member: '/(member)/home',
};

/** Next.js web landing per role. */
export const WEB_LANDING: Record<Role, string> = {
  superadmin: '/admin/platform',
  admin: '/admin',
  owner: '/owner',
  operations: '/ops',
  salon: '/salon',
  coffee: '/coffee',
  trainer: '/trainer',
  member: '/app',
};

export function mobileHomeFor(userRoles: Role[]): string {
  const ordered: Role[] = [
    'superadmin',
    'admin',
    'owner',
    'operations',
    'salon',
    'coffee',
    'trainer',
    'member',
  ];
  for (const r of ordered) {
    if (userRoles.includes(r)) return MOBILE_HOME[r];
  }
  return '/(auth)/login';
}

export function webLandingFor(userRoles: Role[]): string {
  const ordered: Role[] = [
    'superadmin',
    'admin',
    'owner',
    'operations',
    'salon',
    'coffee',
    'trainer',
    'member',
  ];
  for (const r of ordered) {
    if (userRoles.includes(r)) return WEB_LANDING[r];
  }
  return '/login';
}
