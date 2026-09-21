/**
 * Queenix Gym — Org chart queries.
 *
 * Reads `users` + `staffProfiles` and assembles a manager tree.
 * Staff = any user whose activeRole is not 'member'.
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireRole } from '../_helpers';

export type StaffRole =
  | 'superadmin'
  | 'admin'
  | 'owner'
  | 'operations'
  | 'salon'
  | 'coffee'
  | 'trainer'
  | 'member';

export const staffDirectory = query({
  args: {
    search: v.optional(v.string()),
    department: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { search, department, limit = 100 }) => {
    await requireRole(ctx, ['owner', 'operations']);
    const users = await ctx.db.query('users').take(500);
    const staff = users.filter((u) => u.activeRole !== 'member');
    const joined = await Promise.all(
      staff.map(async (user) => {
        const profile = await ctx.db
          .query('staffProfiles')
          .withIndex('by_user', (q) => q.eq('userId', user._id))
          .first();
        return { user, profile };
      })
    );
    const q = (search ?? '').trim().toLowerCase();
    return joined
      .filter(({ user, profile }) => {
        if (department && profile?.department !== department) return false;
        if (q) {
          const hay =
            `${user.fullName} ${user.email} ${profile?.title ?? ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .slice(0, limit);
  },
});

export const staffTree = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ['owner', 'operations']);
    const users = await ctx.db.query('users').take(500);
    const staff = users.filter((u) => u.activeRole !== 'member');
    const profiles = await Promise.all(
      staff.map(async (user) => {
        const profile = await ctx.db
          .query('staffProfiles')
          .withIndex('by_user', (q) => q.eq('userId', user._id))
          .first();
        return { user, profile };
      })
    );
    type Node = {
      userId: string;
      fullName: string;
      email: string;
      activeRole: StaffRole;
      title: string | null;
      department: string | null;
      reportsToId: string | null;
      children: Node[];
    };
    const nodes = new Map<string, Node>();
    for (const { user, profile } of profiles) {
      const id = user._id as unknown as string;
      nodes.set(id, {
        userId: id,
        fullName: user.fullName,
        email: user.email,
        activeRole: user.activeRole as StaffRole,
        title: profile?.title ?? null,
        department: profile?.department ?? null,
        reportsToId: (profile?.reportsToId as unknown as string) ?? null,
        children: [],
      });
    }
    const roots: Node[] = [];
    for (const node of nodes.values()) {
      const parent =
        node.reportsToId != null ? nodes.get(node.reportsToId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
    return roots;
  },
});
