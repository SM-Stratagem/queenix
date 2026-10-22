/**
 * Queenix Gym — the caller's capability grants (W1: web route access).
 * The web console gates pages on roles; this lets a grant unlock the page it
 * covers too (e.g. /website for a `content.manage` grant). Read-only, self only.
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { getUserGrantedCapabilities } from '../permissions';

/** Live, unexpired global grants of the signed-in user ([] when signed out). */
export const mine = query({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db
      .query('users')
      .withIndex('by_betterAuthUserId', (q) => q.eq('betterAuthUserId', identity.subject))
      .first();
    if (!user) return [];
    return await getUserGrantedCapabilities(ctx, user._id);
  },
});
