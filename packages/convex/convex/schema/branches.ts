/**
 * Queenix Gym — Convex schema tables: branches (multi-branch from day 1).
 *
 * Staff assignment to branches lives in `branchStaff` so the existing
 * `users` / `staffProfiles` tables stay untouched.
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const branches = defineTable({
  name: v.string(),
  city: v.string(),
  address: v.optional(v.string()),
  phone: v.optional(v.string()),
  isActive: v.boolean(),
  openedAt: v.optional(v.number()),
  createdBy: v.id('users'),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_active', ['isActive'])
  .index('by_name', ['name'])

export const branchStaff = defineTable({
  branchId: v.id('branches'),
  userId: v.id('users'),
  role: v.string(),
  isPrimary: v.boolean(),
  assignedBy: v.id('users'),
  createdAt: v.number(),
})
  .index('by_branch', ['branchId'])
  .index('by_user', ['userId'])
  .index('by_branch_user', ['branchId', 'userId'])
