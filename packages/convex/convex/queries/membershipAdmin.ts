/**
 * Queenix Gym — Membership admin queries (staff only: admin / superadmin / owner).
 *
 * Complements queries/memberships.ts (member-self reads) and
 * queries/users.ts (getMembersDirectory / getOwnerMemberDetail) with the
 * admin-side catalogue + aggregate views the web admin needs.
 */

import { query } from '../_generated/server';
import { requireRole } from '../_helpers';

const STAFF_ROLES = ['admin', 'superadmin', 'owner'] as any;

/** Full plan catalogue including inactive plans (admin view). */
export const listAllPlans = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx as any, STAFF_ROLES);
    const plans = await ctx.db.query('membershipPlans').collect();
    return plans.sort((a, b) => a.priceCents - b.priceCents);
  },
});

/** Member counts grouped by membership status. */
export const membershipStats = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx as any, STAFF_ROLES);
    const statuses = ['active', 'trial', 'frozen', 'pending', 'expired', 'cancelled'] as const;
    const counts: Record<string, number> = {};
    for (const status of statuses) {
      const rows = await ctx.db
        .query('memberships')
        .withIndex('by_status', (q) => q.eq('status', status as any))
        .collect();
      counts[status] = new Set(rows.map((m) => m.userId)).size;
    }
    const activeRows = await ctx.db
      .query('memberships')
      .withIndex('by_status', (q) => q.eq('status', 'active' as any))
      .collect();
    counts.activeMemberships = activeRows.length;
    // Headline mix: total user accounts vs accounts holding any membership row.
    const allUsers = await ctx.db.query('users').collect();
    const allMemberships = await ctx.db.query('memberships').collect();
    const usersWithMembership = new Set(allMemberships.map((m) => String(m.userId)));
    counts.totalUsers = allUsers.length;
    counts.usersWithMembership = usersWithMembership.size;
    counts.usersWithoutMembership = allUsers.filter(
      (u) => !usersWithMembership.has(String(u._id))
    ).length;
    return counts;
  },
});
