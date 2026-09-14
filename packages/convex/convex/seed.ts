/**
 * Queenix Gym — Sample data seeder
 * Run: npx convex run seed:seedSampleData
 *      npx convex run seed:seedDemoUsers --args '<json>'  (called by scripts/seed-demo-users.mjs)
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const seedSampleData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existingPlans = await ctx.db.query('membershipPlans').take(1);
    if (existingPlans.length > 0) {
      return { ok: false, message: 'Already seeded' };
    }

    // Plans
    const basicPlanId = await ctx.db.insert('membershipPlans', {
      name: 'Basic',
      description: 'Full gym access during off-peak hours',
      durationDays: 30,
      priceCents: 29900,
      currency: 'AED',
      features: ['Off-peak gym access', 'Locker room', '1 group class/week'],
      isActive: true,
      isTrial: false,
      trialDays: 0,
      maxClassesPerMonth: 4,
      maxPTSessions: 0,
    });

    const premiumPlanId = await ctx.db.insert('membershipPlans', {
      name: 'Premium',
      description: 'Unlimited gym access + all group classes',
      durationDays: 30,
      priceCents: 49900,
      currency: 'AED',
      features: ['Unlimited gym access', 'All group classes', 'Locker room', '1 PT session/month'],
      isActive: true,
      isTrial: false,
      trialDays: 0,
      maxClassesPerMonth: 0,
      maxPTSessions: 1,
    });

    const vipPlanId = await ctx.db.insert('membershipPlans', {
      name: 'VIP',
      description: 'All access + 4 PT sessions + priority booking',
      durationDays: 30,
      priceCents: 99900,
      currency: 'AED',
      features: ['24/7 access', 'All group classes', '4 PT sessions/month', 'Priority booking', 'Towel service'],
      isActive: true,
      isTrial: false,
      trialDays: 0,
      maxClassesPerMonth: 0,
      maxPTSessions: 4,
    });

    return {
      ok: true,
      message: 'Seeded membership plans',
      plans: { basicPlanId, premiumPlanId, vipPlanId },
    };
  },
});

export const listDemoUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    return users.map((u) => ({
      email: u.email,
      activeRole: u.activeRole,
      roles: u.roles,
      emailVerified: u.emailVerified,
      betterAuthUserId: u.betterAuthUserId,
    }));
  },
});

export const seedDemoUsers = mutation({
  args: {
    users: v.array(
      v.object({
        email: v.string(),
        betterAuthUserId: v.string(),
        fullName: v.string(),
        roles: v.array(v.string()),
        activeRole: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let created = 0;
    let skipped = 0;
    for (const u of args.users) {
      const existing = await ctx.db
        .query('users')
        .withIndex('by_email', (q: any) => q.eq('email', u.email))
        .first();
      if (existing) {
        skipped++;
        continue;
      }
      await ctx.db.insert('users', {
        betterAuthUserId: u.betterAuthUserId,
        email: u.email,
        fullName: u.fullName,
        activeRole: u.activeRole as 'member' | 'trainer' | 'owner' | 'operations',
        roles: u.roles as ('member' | 'trainer' | 'owner' | 'operations')[],
        emailVerified: true,
        phoneVerified: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      created++;
    }
    return { ok: true, created, skipped };
  },
});

export const syncFromBetterAuth = mutation({
  args: {
    betterAuthUserId: v.string(),
    email: v.string(),
    fullName: v.string(),
    roles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_betterAuthUserId', (q: any) =>
        q.eq('betterAuthUserId', args.betterAuthUserId)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        fullName: args.fullName,
        roles: args.roles as ('member' | 'trainer' | 'owner' | 'operations')[],
        updatedAt: Date.now(),
      });
      return { ok: true, created: false };
    }
    await ctx.db.insert('users', {
      betterAuthUserId: args.betterAuthUserId,
      email: args.email,
      fullName: args.fullName,
      activeRole: (args.roles[0] ?? 'member') as 'member' | 'trainer' | 'owner' | 'operations',
      roles: args.roles as ('member' | 'trainer' | 'owner' | 'operations')[],
      emailVerified: true,
      phoneVerified: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { ok: true, created: true };
  },
});
