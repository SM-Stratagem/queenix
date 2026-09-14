/**
 * Queenix Gym — Convex schema tables: Classes & Scheduling
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const classTypes = defineTable({
    name: v.string(),
    description: v.string(),
    durationMinutes: v.number(),
    capacity: v.number(),
    difficulty: v.union(
      v.literal('beginner'),
      v.literal('intermediate'),
      v.literal('advanced')
    ),
    category: v.string(),
    imageUrl: v.optional(v.string()),
    trainerId: v.optional(v.id('users')),
  }).index('by_category', ['category'])

export const classInstances = defineTable({
    classTypeId: v.id('classTypes'),
    trainerId: v.optional(v.id('users')),
    roomId: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    capacity: v.number(),
    bookedCount: v.number(),
    waitlistCount: v.number(),
    status: v.union(
      v.literal('scheduled'),
      v.literal('cancelled'),
      v.literal('completed')
    ),
    notes: v.optional(v.string()),
  })
    .index('by_classType', ['classTypeId'])
    .index('by_startsAt', ['startsAt'])
    .index('by_trainer', ['trainerId'])

export const bookings = defineTable({
    userId: v.id('users'),
    classInstanceId: v.id('classInstances'),
    status: v.union(
      v.literal('confirmed'),
      v.literal('waitlisted'),
      v.literal('cancelled'),
      v.literal('attended'),
      v.literal('no_show')
    ),
    bookedAt: v.number(),
    cancelledAt: v.optional(v.number()),
    idempotencyKey: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_classInstance', ['classInstanceId'])
    .index('by_idempotencyKey', ['idempotencyKey'])
