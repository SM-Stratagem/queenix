/**
 * Queenix Gym — Convex schema tables: modular custom access (capability grants).
 *
 * Grants give individual users extra capabilities WITHOUT a role change,
 * e.g. a trainer who may read finance reports for one branch. Grants are
 * ADDITIVE ONLY: they can never remove a capability implied by a role.
 * A grant with no branchId is global; a grant with a branchId only
 * applies when the capability check targets that branch.
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

const capabilityLiteral = v.union(
  v.literal('platform.manage'),
  v.literal('finance.read'),
  v.literal('finance.write'),
  v.literal('staff.manage'),
  v.literal('staff.read'),
  v.literal('classes.manage'),
  v.literal('bookings.manage'),
  v.literal('bookings.scan'),
  v.literal('salon.serve'),
  v.literal('coffee.serve'),
  v.literal('training.coach'),
  v.literal('member.self')
)

export const capabilityGrants = defineTable({
  userId: v.id('users'),
  capability: capabilityLiteral,
  /** Omitted = global grant; set = applies only to this branch. */
  branchId: v.optional(v.id('branches')),
  grantedBy: v.optional(v.string()),
  grantedAt: v.number(),
  /** Omitted = never expires; otherwise unix ms. Expired grants are ignored. */
  expiresAt: v.optional(v.number()),
  note: v.optional(v.string()),
})
  .index('by_user', ['userId'])
  .index('by_user_capability', ['userId', 'capability'])
