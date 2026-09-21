/**
 * Queenix Gym — server-side role → capability matrix.
 * Uses requireUser / requireRole from convex/_helpers.
 *
 * DEPRECATED ALIAS: 'owner' is the pre-rename name of 'finance'.
 * It carries the exact same capabilities and is normalized to 'finance'
 * by userHasCapability / requireCapability. Do not assign it to new users.
 *
 * MODULAR CUSTOM ACCESS: individual users can hold extra capabilities
 * (optionally scoped to one branch) via the `capabilityGrants` table
 * (see convex/schema/grants.ts). Grants are ADDITIVE ONLY — they can
 * never remove a capability implied by a role. requireCapability checks
 * role capabilities first, then grants.
 */

import { ConvexError } from 'convex/values';
import { requireUser } from './_helpers';

/**
 * Canonicalize roles: 'owner' is the deprecated alias of 'finance'.
 * (Duplicated from packages/auth/src/roles.ts — Convex functions must
 * stay self-contained inside convex/ and cannot import across packages.)
 */
function normalizeRole(role: Role): Role {
  return role === 'owner' ? 'finance' : role;
}

function normalizeRoles(userRoles: Role[]): Role[] {
  const out: Role[] = [];
  for (const r of userRoles) {
    const n = normalizeRole(r);
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

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

/** The 8 capabilities held by the finance role (owner alias holds the same). */
const FINANCE_CAPABILITIES: Capability[] = [
  'finance.read',
  'finance.write',
  'staff.manage',
  'staff.read',
  'classes.manage',
  'bookings.manage',
  'bookings.scan',
  'member.self',
];

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
  finance: FINANCE_CAPABILITIES,
  /** @deprecated Alias of finance — identical capabilities. */
  owner: FINANCE_CAPABILITIES,
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
    'finance',
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
  return normalizeRoles(userRoles).some((role) =>
    (ROLE_CAPABILITIES[normalizeRole(role)] ?? []).includes(capability),
  );
}

/** Options for grant-aware capability checks. */
export type CapabilityCheckOptions = {
  /**
   * Branch the action targets. Branch-scoped grants only apply when this
   * matches the grant's branchId. Global grants (no branchId) always apply.
   */
  branchId?: string;
  /** Extra granted capabilities (e.g. pre-fetched) — additive only. */
  extraGrants?: Capability[];
};

/**
 * Read a user's live capability grants from the `capabilityGrants` table.
 * Skips expired grants. When `branchId` is given, branch-scoped grants for
 * that branch are included; otherwise only global grants apply.
 */
export async function getUserGrantedCapabilities(
  ctx: any,
  userId: any,
  opts?: { branchId?: string },
): Promise<Capability[]> {
  const now = Date.now();
  const rows = await ctx.db
    .query('capabilityGrants')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .collect();
  const out: Capability[] = [];
  for (const g of rows) {
    if (g.expiresAt != null && g.expiresAt <= now) continue;
    if (g.branchId != null && g.branchId !== opts?.branchId) continue;
    if (!out.includes(g.capability as Capability)) out.push(g.capability as Capability);
  }
  return out;
}

/**
 * Additive capability check: true when the role matrix OR the granted
 * capabilities (grants are additive-only) include the capability.
 */
export function userHasCapabilityWithGrants(
  userRoles: Role[],
  capability: Capability,
  granted: Capability[],
): boolean {
  if (userHasCapability(userRoles, capability)) return true;
  return granted.includes(capability);
}

/**
 * Require that the caller holds a capability via their roles or via an
 * additive capability grant. Throws ConvexError FORBIDDEN otherwise.
 */
export async function requireCapability(
  ctx: any,
  capability: Capability,
  opts?: CapabilityCheckOptions,
) {
  const user = await requireUser(ctx);
  const roles = (user.roles ?? []) as Role[];
  if (userHasCapability(roles, capability)) return user;
  const granted: Capability[] = [
    ...((opts?.extraGrants ?? []) as Capability[]),
    ...(await getUserGrantedCapabilities(ctx, user._id, { branchId: opts?.branchId })),
  ];
  if (userHasCapabilityWithGrants(roles, capability, granted)) return user;
  throw new ConvexError({
    code: 'FORBIDDEN',
    message: `Requires capability: ${capability}`,
  });
}

/** Lightweight self-access check (any signed-in user). */
export async function requireSelf(ctx: any) {
  return requireUser(ctx);
}
