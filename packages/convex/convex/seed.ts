/**
 * Queenix Gym — demo user linker.
 * Run: npx convex run seed:seedDemoUsers --args '<json>'  (called by scripts/seed-demo-users.mjs)
 * Internal: admin key only.
 */

import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const seedDemoUsers = internalMutation({
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
    let linked = 0;
    for (const u of args.users) {
      const existing = await ctx.db
        .query('users')
        .withIndex('by_email', (q: any) => q.eq('email', u.email))
        .first();
      if (existing) {
        // Re-link: the BetterAuth DB may have been recreated since this row
        // was seeded, leaving a stale betterAuthUserId that breaks requireUser.
        // Match is by email (stable); refresh the linkage fields.
        // Always refresh: the sign-up hook may have created this row as a plain member.
        await ctx.db.patch(existing._id, {
          betterAuthUserId: u.betterAuthUserId,
          fullName: u.fullName,
          roles: u.roles as ('member' | 'trainer' | 'owner' | 'operations')[],
          activeRole: u.activeRole as 'member' | 'trainer' | 'owner' | 'operations',
          updatedAt: Date.now(),
        });
        if (existing.betterAuthUserId !== u.betterAuthUserId) linked++;
        else skipped++;
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
    return { ok: true, created, skipped, linked };
  },
});
