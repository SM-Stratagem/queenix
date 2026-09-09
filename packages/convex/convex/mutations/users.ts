/**
 * Queenix Gym — User & Profile mutations
 */

import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireUser, audit } from '../_helpers';
import { ConvexError } from 'convex/values';

export const updateMemberProfile = mutation({
  args: {
    dateOfBirth: v.optional(v.string()),
    emergencyContact: v.optional(
      v.object({
        name: v.string(),
        phone: v.string(),
        relationship: v.optional(v.string()),
      })
    ),
    vehicles: v.optional(
      v.array(
        v.object({
          plate: v.string(),
          make: v.optional(v.string()),
          model: v.optional(v.string()),
          color: v.optional(v.string()),
        })
      )
    ),
    preferences: v.optional(
      v.object({
        notifications: v.boolean(),
        marketing: v.boolean(),
        language: v.union(v.literal('en'), v.literal('ar')),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query('memberProfiles')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    } else {
      return await ctx.db.insert('memberProfiles', {
        userId: user._id,
        dateOfBirth: args.dateOfBirth,
        emergencyContact: args.emergencyContact,
        vehicles: args.vehicles ?? [],
        preferences: args.preferences ?? {
          notifications: true,
          marketing: false,
          language: 'en',
        },
      });
    }
  },
});

export const switchRole = mutation({
  args: { role: v.union(v.literal('member'), v.literal('trainer'), v.literal('owner'), v.literal('operations')) },
  handler: async (ctx, { role }) => {
    const user = await requireUser(ctx);
    if (!user.roles.includes(role)) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'You do not have this role' });
    }
    const before = { activeRole: user.activeRole };
    await ctx.db.patch(user._id, { activeRole: role, updatedAt: Date.now() });
    await audit(ctx, {
      actorId: user._id,
      action: 'user.roleSwitched',
      entityType: 'user',
      entityId: user._id,
      before,
      after: { activeRole: role },
    });
    return { ok: true };
  },
});
