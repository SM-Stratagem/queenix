/**
 * Queenix Gym — demo account seeder (dev only).
 * Idempotent: upserts 5 demo users keyed by email, never duplicates.
 */

import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireRole } from '../_helpers';

type DemoSeed = {
  email: string;
  fullName: string;
  activeRole:
    | 'superadmin'
    | 'admin'
    | 'owner'
    | 'operations'
    | 'salon'
    | 'coffee'
    | 'trainer'
    | 'member';
  roles: string[];
};

const DEMOS: DemoSeed[] = [
  {
    email: 'superadmin.demo@queenix.fit',
    fullName: 'Demo Superadmin',
    activeRole: 'superadmin',
    roles: ['superadmin', 'admin'],
  },
  {
    email: 'salon.demo@queenix.fit',
    fullName: 'Demo Salon Stylist',
    activeRole: 'salon',
    roles: ['salon'],
  },
  {
    email: 'trainer.demo@queenix.fit',
    fullName: 'Demo Trainer Barista',
    activeRole: 'trainer',
    roles: ['trainer', 'coffee'],
  },
  {
    email: 'member.demo@queenix.fit',
    fullName: 'Demo Member Owner',
    activeRole: 'member',
    roles: ['member', 'owner'],
  },
  {
    email: 'ops.demo@queenix.fit',
    fullName: 'Demo Operations',
    activeRole: 'operations',
    roles: ['operations'],
  },
];

export const seedDemoAccounts = mutation({
  args: {
    /** Optional BetterAuth user id to link onto the superadmin demo row. */
    betterAuthUserId: v.optional(v.string()),
  },
  handler: async (ctx, { betterAuthUserId }) => {
    if ((process.env.NODE_ENV ?? 'development') === 'production') {
      throw new Error('seedDemoAccounts is disabled in production');
    }
    const now = Date.now();
    const ids: string[] = [];
    for (const demo of DEMOS) {
      const existing = await ctx.db
        .query('users')
        .withIndex('by_email', (q: any) => q.eq('email', demo.email))
        .first();
      const linkPatch =
        demo.email === DEMOS[0]?.email && betterAuthUserId
          ? { betterAuthUserId }
          : {};
      if (existing) {
        await ctx.db.patch(existing._id, {
          fullName: demo.fullName,
          activeRole: demo.activeRole as any,
          roles: demo.roles as any,
          emailVerified: true,
          phoneVerified: true,
          updatedAt: now,
          ...linkPatch,
        });
        ids.push(existing._id);
      } else {
        const id = await ctx.db.insert('users', {
          email: demo.email,
          fullName: demo.fullName,
          activeRole: demo.activeRole as any,
          roles: demo.roles as any,
          emailVerified: true,
          phoneVerified: true,
          createdAt: now,
          updatedAt: now,
          ...linkPatch,
        });
        ids.push(id);
      }
    }
    return { count: ids.length, ids };
  },
});

/** Admin-gated variant: only superadmin/admin can re-seed. */
export const seedDemoAccountsAsAdmin = mutation({
  args: { betterAuthUserId: v.optional(v.string()) },
  handler: async (ctx, { betterAuthUserId }): Promise<string[]> => {
    await requireRole(ctx, ['superadmin', 'admin'] as any);
    const now = Date.now();
    const ids: string[] = [];
    for (const demo of DEMOS) {
      const existing = await ctx.db
        .query('users')
        .withIndex('by_email', (q: any) => q.eq('email', demo.email))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          fullName: demo.fullName,
          activeRole: demo.activeRole as any,
          roles: demo.roles as any,
          emailVerified: true,
          phoneVerified: true,
          updatedAt: now,
          ...(betterAuthUserId ? { betterAuthUserId } : {}),
        });
        ids.push(existing._id);
      } else {
        ids.push(
          await ctx.db.insert('users', {
            email: demo.email,
            fullName: demo.fullName,
            activeRole: demo.activeRole as any,
            roles: demo.roles as any,
            emailVerified: true,
            phoneVerified: true,
            createdAt: now,
            updatedAt: now,
            ...(betterAuthUserId ? { betterAuthUserId } : {}),
          }),
        );
      }
    }
    return ids;
  },
});
