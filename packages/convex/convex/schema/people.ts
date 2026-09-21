/**
 * Queenix Gym — Convex schema tables: people ops (staff time off).
 *
 * Shifts already cover timings (`shifts` table); this file adds sick days
 * and leave requests with a pending → approved/denied workflow.
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const staffTimeOff = defineTable({
  userId: v.id('users'),
  date: v.string(),
  kind: v.union(v.literal('sick'), v.literal('leave')),
  note: v.optional(v.string()),
  status: v.union(
    v.literal('pending'),
    v.literal('approved'),
    v.literal('denied')
  ),
  recordedBy: v.id('users'),
  decidedBy: v.optional(v.id('users')),
  decidedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index('by_user', ['userId'])
  .index('by_status', ['status'])
  .index('by_date', ['date'])
