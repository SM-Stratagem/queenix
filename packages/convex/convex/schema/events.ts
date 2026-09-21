/**
 * Queenix Gym — Convex schema tables: gym events (per branch or gym-wide).
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const gymEvents = defineTable({
  branchId: v.optional(v.id('branches')),
  title: v.string(),
  description: v.optional(v.string()),
  startsAt: v.number(),
  endsAt: v.number(),
  capacity: v.optional(v.number()),
  status: v.union(
    v.literal('scheduled'),
    v.literal('cancelled'),
    v.literal('completed')
  ),
  createdBy: v.id('users'),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_branch', ['branchId'])
  .index('by_startsAt', ['startsAt'])
  .index('by_status', ['status'])
