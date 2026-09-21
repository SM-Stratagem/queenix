/**
 * Queenix Gym — CRM queries (staff only: admin / superadmin / owner).
 *
 * Requires new tables (see SCHEMA ADDS in delivery notes):
 *   crmLeads, crmInteractions, crmTasks
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireRole } from '../_helpers';

const STAFF_ROLES = ['admin', 'superadmin', 'owner'] as any;

const leadStage = v.union(
  v.literal('new'),
  v.literal('contacted'),
  v.literal('trial'),
  v.literal('converted'),
  v.literal('lost')
);

export const STAGES = ['new', 'contacted', 'trial', 'converted', 'lost'] as const;

/**
 * Leads pipeline grouped by stage, with per-stage counts.
 * Optional `stage` narrows to one column. Optional `assignedTo` filters owner.
 */
export const listLeadsByStage = query({
  args: {
    stage: v.optional(leadStage),
    assignedTo: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx as any, STAFF_ROLES);
    const all = await ctx.db.query('crmLeads').order('desc').collect();
    const filtered = all.filter(
      (l) =>
        (args.stage === undefined || l.stage === args.stage) &&
        (args.assignedTo === undefined || l.assignedTo === args.assignedTo)
    );
    const columns = STAGES.map((stage) => ({
      stage,
      count: filtered.filter((l) => l.stage === stage).length,
      leads: filtered.filter((l) => l.stage === stage),
    }));
    return { columns, total: filtered.length };
  },
});

/**
 * Single lead with its interaction history + linked member (if converted).
 */
export const getLead = query({
  args: { leadId: v.id('crmLeads') },
  handler: async (ctx, { leadId }) => {
    await requireRole(ctx as any, STAFF_ROLES);
    const lead = await ctx.db.get(leadId);
    if (!lead) return null;
    const interactions = await ctx.db
      .query('crmInteractions')
      .withIndex('by_lead', (q) => q.eq('leadId', leadId))
      .order('desc')
      .collect();
    const linkedUser = lead.convertedUserId ? await ctx.db.get(lead.convertedUserId) : null;
    return { lead, interactions, linkedUser };
  },
});

/**
 * Member 360: user + profile + memberships + recent payments + totals.
 */
export const member360 = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    await requireRole(ctx as any, STAFF_ROLES);
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const profile = await ctx.db
      .query('memberProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();
    const memberships = await ctx.db
      .query('memberships')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect();
    const payments = await ctx.db
      .query('payments')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(20);
    const paidCents = payments
      .filter((p) => p.status === 'succeeded')
      .reduce((acc, p) => acc + p.amountCents, 0);
    const openTasks = await ctx.db
      .query('crmTasks')
      .withIndex('by_status', (q) => q.eq('status', 'open' as any))
      .collect();
    return {
      user,
      profile,
      memberships,
      recentPayments: payments,
      lifetimePaidCents: paidCents,
      openTaskCount: openTasks.filter((t) => t.relatedUserId === userId).length,
    };
  },
});

/**
 * Tasks due at or before `before` (default now + 7d).
 */
export const tasksDue = query({
  args: {
    before: v.optional(v.number()),
    assignedTo: v.optional(v.id('users')),
    includeCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx as any, STAFF_ROLES);
    const before = args.before ?? Date.now() + 7 * 24 * 3600 * 1000;
    const tasks = await ctx.db.query('crmTasks').order('asc').collect();
    return tasks
      .filter(
        (t) =>
          (args.includeCompleted ?? false ? true : t.status === 'open') &&
          (t.dueAt === undefined || t.dueAt <= before) &&
          (args.assignedTo === undefined || t.assignedTo === args.assignedTo)
      )
      .sort((a, b) => (a.dueAt ?? Infinity) - (b.dueAt ?? Infinity));
  },
});
