/**
 * Queenix Gym — canonical role contract (client-safe, framework-free).
 *
 * FIXED ROLE CONTRACT — use literally everywhere, do not invent others:
 *   'superadmin' | 'admin' | 'finance' | 'operations' |
 *   'salon' | 'coffee' | 'trainer' | 'member'
 *
 * DEPRECATED ALIAS: 'owner' is the pre-rename name of 'finance' and is
 * accepted everywhere a Role is accepted, normalized to 'finance'.
 * Do not assign 'owner' to new users; it exists only for stored data
 * and older clients. Route-group path segments named `(owner)` are
 * likewise legacy names and are intentionally unchanged.
 *
 * Hierarchy (high → low):
 *   superadmin > admin > finance > operations > salon = coffee = trainer > member
 */

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

/** Canonical roles — the fixed contract. 'owner' is NOT canonical. */
export const ROLES: readonly Role[] = [
  'superadmin',
  'admin',
  'finance',
  'operations',
  'salon',
  'coffee',
  'trainer',
  'member',
] as const;

/**
 * Deprecated aliases kept for stored data / older clients.
 * Maps alias → canonical role.
 */
export const DEPRECATED_ROLE_ALIASES: Readonly<Record<string, Role>> = {
  owner: 'finance',
} as const;

/** Normalize a role value: 'owner' → 'finance', everything else unchanged. */
export function normalizeRole(role: Role): Role {
  if (role === 'owner') return 'finance';
  return role;
}

/** Normalize a role list (alias-tolerant, preserves order, keeps dupes out). */
export function normalizeRoles(userRoles: Role[]): Role[] {
  const out: Role[] = [];
  for (const r of userRoles) {
    const n = normalizeRole(r);
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

/** Numeric rank — higher outranks lower. Salon/coffee/trainer share a rank. */
export const ROLE_RANK: Record<Role, number> = {
  superadmin: 7,
  admin: 6,
  finance: 5,
  /** @deprecated Alias of finance. */
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
    ((ROLES as readonly string[]).includes(value) ||
      value in DEPRECATED_ROLE_ALIASES)
  );
}

export function hasRole(userRoles: Role[], required: Role): boolean {
  const have = normalizeRoles(userRoles);
  return have.includes(normalizeRole(required));
}

export function hasAnyRole(userRoles: Role[], required: Role[]): boolean {
  const have = normalizeRoles(userRoles);
  return required.some((r) => have.includes(normalizeRole(r)));
}

/** True when any of the user's roles outranks (or equals) the required role. */
export function hasRank(
  userRoles: Role[],
  minimum: Role,
): boolean {
  const floor = ROLE_RANK[normalizeRole(minimum)];
  return normalizeRoles(userRoles).some((r) => ROLE_RANK[r] >= floor);
}

/** Staff = everyone except pure members. */
export function isStaff(userRoles: Role[]): boolean {
  return hasAnyRole(userRoles, [
    'superadmin',
    'admin',
    'finance',
    'operations',
    'salon',
    'coffee',
    'trainer',
  ]);
}

/** Admin surfaces: superadmin + admin + finance. */
export function canAccessAdmin(userRoles: Role[]): boolean {
  return hasAnyRole(userRoles, ['superadmin', 'admin', 'finance']);
}

/** Finance surfaces: superadmin + admin + finance only (no ops/staff). */
export function canAccessFinance(userRoles: Role[]): boolean {
  return hasAnyRole(userRoles, ['superadmin', 'admin', 'finance']);
}

/** Staff management: superadmin + admin can manage anyone; finance manages venue staff. */
export function canManageStaff(userRoles: Role[]): boolean {
  return hasAnyRole(userRoles, ['superadmin', 'admin', 'finance']);
}

/** Expo-router mobile home per role (existing route groups; `(owner)` is a legacy path name). */
export const MOBILE_HOME: Record<Role, string> = {
  superadmin: '/(owner)/overview',
  admin: '/(owner)/overview',
  finance: '/(owner)/overview',
  /** @deprecated Alias of finance. */
  owner: '/(owner)/overview',
  operations: '/(ops)/scanner',
  salon: '/(ops)/scanner',
  coffee: '/(ops)/scanner',
  trainer: '/(trainer)/today',
  member: '/(member)/home',
};

/** Next.js web landing per role (`/owner` redirects to `/finance` for compat). */
export const WEB_LANDING: Record<Role, string> = {
  superadmin: '/admin/platform',
  admin: '/admin',
  finance: '/finance',
  /** @deprecated Alias of finance. */
  owner: '/finance',
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
    'finance',
    'operations',
    'salon',
    'coffee',
    'trainer',
    'member',
  ];
  const have = normalizeRoles(userRoles);
  for (const r of ordered) {
    if (have.includes(r)) return MOBILE_HOME[r];
  }
  return '/(auth)/login';
}

export function webLandingFor(userRoles: Role[]): string {
  const ordered: Role[] = [
    'superadmin',
    'admin',
    'finance',
    'operations',
    'salon',
    'coffee',
    'trainer',
    'member',
  ];
  const have = normalizeRoles(userRoles);
  for (const r of ordered) {
    if (have.includes(r)) return WEB_LANDING[r];
  }
  return '/login';
}
