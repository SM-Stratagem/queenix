/**
 * Queenix Gym — Convex schema tables: org chart (staff profiles)
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const staffProfiles = defineTable({
  userId: v.id('users'),
  title: v.string(),
  department: v.string(),
  reportsToId: v.optional(v.id('users')),
})
  .index('by_user', ['userId'])
  .index('by_department', ['department'])
