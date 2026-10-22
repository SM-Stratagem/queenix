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
  | 'member.self'
  | 'content.manage'
  | 'notifications.push';

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
    'content.manage',
    'notifications.push',
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
    'content.manage',
    'notifications.push',
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
    'content.manage',
    'notifications.push',
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

// ============================================================
// Pure authorization rules (unit-tested in tests/unit/authz.test.ts)
// ============================================================

/** Mirrors ROLE_RANK in packages/auth/src/roles.ts (same duplication note as normalizeRole). */
export const ROLE_RANK: Record<Role, number> = {
  superadmin: 7,
  admin: 6,
  finance: 5,
  owner: 5,
  operations: 4,
  salon: 3,
  coffee: 3,
  trainer: 3,
  member: 1,
};

/** Highest rank among a user's roles (0 for none). */
export function topRank(roles: readonly Role[]): number {
  return Math.max(0, ...roles.map((r) => ROLE_RANK[normalizeRole(r)] ?? 0));
}

type Subject = { id: string; roles: Role[] };

/**
 * Why `actor` may not set `target`'s roles to `nextRoles`, or null if allowed.
 * Superadmin may assign anything; everyone else may only edit people ranked
 * strictly below them and only assign roles strictly below their own rank
 * (so only superadmin hands out superadmin/admin). Nobody edits themselves.
 */
export function roleChangeError(actor: Subject, target: Subject, nextRoles: Role[]): string | null {
  if (actor.id === target.id) return 'You cannot change your own roles';
  const rank = topRank(actor.roles);
  if (rank >= ROLE_RANK.superadmin) return null;
  if (topRank(target.roles) >= rank) {
    return 'You cannot change the roles of someone at or above your level';
  }
  const tooHigh = nextRoles.filter((r) => ROLE_RANK[normalizeRole(r)] >= rank);
  if (tooHigh.length > 0) return `You cannot assign: ${tooHigh.join(', ')}`;
  return null;
}

/**
 * Why `actor` may not grant (or revoke) `capability` for `target`, or null.
 * The actor must hold the capability through their own roles (grants don't
 * chain) and outrank the target — so platform.manage is superadmin-only.
 * Self-grants are refused; dropping your own grant only removes access.
 */
export function grantChangeError(
  actor: Subject,
  target: Subject,
  capability: Capability,
  opts?: { revoke?: boolean },
): string | null {
  if (actor.id === target.id) {
    return opts?.revoke ? null : 'You cannot grant capabilities to yourself';
  }
  if (!userHasCapability(actor.roles, capability)) {
    return `You can only grant capabilities your role holds (${capability})`;
  }
  if (topRank(actor.roles) <= topRank(target.roles)) {
    return 'You can only manage access for people ranked below you';
  }
  return null;
}

/** Money approvals (refunds, payouts) need finance.write; the rest staff.read (finance/ops). */
export function approvalCapability(type: string): Capability {
  return type.startsWith('payment.') || type.startsWith('payout.') ? 'finance.write' : 'staff.read';
}

/** Why `actor` may not decide `approval`, or null. Never your own request. */
export function approvalDecisionError(
  actor: Subject,
  approval: { type: string; requestorId: string },
  granted: Capability[] = [],
): string | null {
  if (actor.id === approval.requestorId) return 'You cannot decide your own request';
  const cap = approvalCapability(approval.type);
  if (!userHasCapabilityWithGrants(actor.roles, cap, granted)) {
    return cap === 'finance.write'
      ? 'Only finance can decide payment and payout requests'
      : 'Only finance or operations can decide requests';
  }
  return null;
}

/** Throw FORBIDDEN with `message` when a rule above refuses. */
export function forbidIf(message: string | null): void {
  if (message) throw new ConvexError({ code: 'FORBIDDEN', message });
}
