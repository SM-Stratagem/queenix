/**
 * Queenix Gym — Sample data seeder
 * Run: npx convex run seed:seedSampleData
 */

import { mutation } from './_generated/server';

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
