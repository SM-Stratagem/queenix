/**
 * Queenix Gym — Operations queries
 * Reads for the operations dashboard: incidents, shifts, support queue.
 */

import { query } from "../_generated/server"
import { requireUser } from "../_helpers"

export const getIncidents = query({
  args: {},
  handler: async () => {
    return []
  },
})

export const getMyActiveShift = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    return await ctx.db
      .query("shifts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first()
  },
})

export const getMyShifts = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx)
    return await ctx.db
      .query("shifts")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(20)
  },
})

export const getSupportQueue = query({
  args: {},
  handler: async () => {
    return []
  },
})
