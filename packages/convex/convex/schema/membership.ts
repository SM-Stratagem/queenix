/**
 * Queenix Gym — Convex schema tables: Membership
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const membershipPlans = defineTable({
    name: v.string(),
    description: v.string(),
    durationDays: v.number(),
    priceCents: v.number(),
    currency: v.string(),
    features: v.array(v.string()),
    isActive: v.boolean(),
    isTrial: v.boolean(),
    trialDays: v.number(),
    maxClassesPerMonth: v.number(),
    maxPTSessions: v.number(),
  }).index('by_active', ['isActive'])

export const memberships = defineTable({
    userId: v.id('users'),
    planId: v.id('membershipPlans'),
    status: v.union(
      v.literal('active'),
      v.literal('pending'),
      v.literal('frozen'),
      v.literal('cancelled'),
      v.literal('expired'),
      v.literal('trial')
    ),
    startDate: v.number(),
    endDate: v.number(),
    freezes: v.array(
      v.object({
        startDate: v.number(),
        endDate: v.number(),
        reason: v.optional(v.string()),
      })
    ),
    autoRenew: v.boolean(),
    remainingClasses: v.number(),
    remainingPTSessions: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_endDate', ['endDate'])
