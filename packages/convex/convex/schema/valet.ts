/**
 * Queenix Gym — Convex schema tables: valet parking reservations
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const valetReservations = defineTable({
  userId: v.id('users'),
  plate: v.string(),
  status: v.union(
    v.literal('reserved'),
    v.literal('checked_in'),
    v.literal('completed'),
    v.literal('cancelled')
  ),
  etaMin: v.number(),
  checkedInAt: v.optional(v.number()),
  checkedInBy: v.optional(v.id('users')),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_status', ['status'])
