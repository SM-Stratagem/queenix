/**
 * Which console ACTIONS a role may perform — the UI mirror of the Convex
 * guards (the backend stays the source of truth; this only hides buttons
 * that would fail with FORBIDDEN). Page access lives in lib/access.ts.
 * Roles are canonical session roles ('owner' already normalized to 'finance').
 */
import { ROLE_RANK, type Role } from '@queenix/auth/roles';

const ELEVATED = ['superadmin', 'admin'];

const ACTION_ROLES = {
  // mutations/membershipAdmin STAFF_ROLES (freeze/unfreeze/cancel, plans): owner = finance
  'membership.manage': ['finance'],
  // mutations/branches createBranch/updateBranch/setBranchActive: owner = finance
  'branch.manage': ['finance'],
  // mutations/teamOrg setStaffRoles/upsertStaffProfile + queries/teamOrg userByEmail: owner = finance
  'staff.roles': ['finance'],
  // mutations/commerce MANAGE (salon services / coffee menu add, (de)activate, delete)
  'venue.catalog': ['finance', 'operations'],
  // permissions.ts approvalCapability: payment.* / payout.* approvals need finance.write
  'approval.money': ['finance'],
} as const satisfies Record<string, readonly string[]>;

export type Action = keyof typeof ACTION_ROLES;

export function canDo(roles: string[], action: Action): boolean {
  if (roles.some((r) => ELEVATED.includes(r))) return true;
  const allowed: readonly string[] = ACTION_ROLES[action];
  return roles.some((r) => allowed.includes(r));
}

function topRank(roles: string[]): number {
  return Math.max(0, ...roles.map((r) => ROLE_RANK[r as Role] ?? 0));
}

/**
 * Roles `actorRoles` may hand out — mirrors roleChangeError in
 * packages/convex/convex/permissions.ts: superadmin assigns anything,
 * everyone else only roles strictly below their own rank.
 */
export function assignableRoles(actorRoles: string[], all: readonly string[]): string[] {
  const rank = topRank(actorRoles);
  if (rank >= ROLE_RANK.superadmin) return [...all];
  return all.filter((r) => (ROLE_RANK[r as Role] ?? 0) < rank);
}

/** Why the actor can't edit `target`'s roles (same rules as roleChangeError), or null. */
export function roleEditBlock(
  actor: { email?: string | null; roles: string[] },
  target: { email?: string | null; roles: string[] },
): string | null {
  if (actor.email && target.email && actor.email.toLowerCase() === target.email.toLowerCase()) {
    return 'You cannot change your own roles.';
  }
  const rank = topRank(actor.roles);
  if (rank >= ROLE_RANK.superadmin) return null;
  if (topRank(target.roles) >= rank) return 'This person is at or above your level — ask a superadmin.';
  return null;
}

/**
 * Why the actor can't decide this approval (mirrors approvalDecisionError in
 * permissions.ts), or null. Capability grants aren't in the web session, so a
 * granted finance.write holder sees the hint but the backend would still allow it.
 */
export function approvalBlock(
  actor: { email?: string | null; roles: string[] },
  approval: { type: string; requestor?: { email?: string | null } | null },
): string | null {
  const own = actor.email && approval.requestor?.email;
  if (own && actor.email!.toLowerCase() === approval.requestor!.email!.toLowerCase()) {
    return 'Your own request — someone else must decide it.';
  }
  const money = approval.type.startsWith('payment.') || approval.type.startsWith('payout.');
  if (money && !canDo(actor.roles, 'approval.money')) return 'Payment and payout requests are decided by finance.';
  return null;
}
