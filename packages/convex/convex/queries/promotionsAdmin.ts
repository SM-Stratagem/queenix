/**
 * Queenix Gym — Promotions & partners admin queries
 * (staff only: admin / superadmin / owner).
 *
 * There are no dedicated promotion/partner tables in the schema, so this
 * module reads the real backend objects promotions run on: `referrals`
 * (referral codes + conversion), `loyaltyLedger` (points issued), and
 * `notifications` of type `promotion` (promo outreach). Partner payouts
 * remain in queries/finance.ts `listPayouts` and are linked from the
 * partners page.
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireRole } from '../_helpers';

const STAFF_ROLES = ['admin', 'superadmin', 'owner'] as any;

/** Referral funnel totals + points issued via referrals. */
export const referralStats = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx as any, STAFF_ROLES);
    const referrals = await ctx.db.query('referrals').order('desc').take(1000);
    const converted = referrals.filter((r) => r.status === 'converted');
    return {
      total: referrals.length,
      pending: referrals.filter((r) => r.status === 'pending').length,
      converted: converted.length,
      expired: referrals.filter((r) => r.status === 'expired').length,
      rewardPointsGranted: converted.reduce((sum, r) => sum + r.rewardPoints, 0),
    };
  },
});

/** Recent referral codes with referrer names, newest first. */
export const recentReferrals = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    await requireRole(ctx as any, STAFF_ROLES);
    const rows = await ctx.db.query('referrals').order('desc').take(limit);
    return await Promise.all(
      rows.map(async (r) => {
        const referrer = await ctx.db.get(r.referrerId);
        const referee = r.refereeId ? await ctx.db.get(r.refereeId) : null;
        return {
          ...r,
          referrerName: referrer?.fullName ?? null,
          refereeName: referee?.fullName ?? null,
        };
      })
    );
  },
});

/** Recent promotion-type notifications (promo outreach log). */
export const promoOutreach = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    await requireRole(ctx as any, STAFF_ROLES);
    const rows = await ctx.db
      .query('notifications')
      .filter((q) => q.eq(q.field('type'), 'promotion'))
      .order('desc')
      .take(limit);
    return rows;
  },
});
