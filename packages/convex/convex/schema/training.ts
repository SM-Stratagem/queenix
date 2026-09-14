/**
 * Queenix Gym — Convex schema tables: Personal Training
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const trainerProfiles = defineTable({
    userId: v.id('users'),
    bio: v.optional(v.string()),
    specialties: v.array(v.string()),
    certifications: v.array(
      v.object({
        name: v.string(),
        issuer: v.string(),
        issuedAt: v.number(),
        expiresAt: v.optional(v.number()),
        documentUrl: v.optional(v.string()),
      })
    ),
    rating: v.number(),
    reviewCount: v.number(),
    isAvailable: v.boolean(),
    hourlyRateCents: v.number(),
    currency: v.string(),
    profileImageUrl: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_available', ['isAvailable'])

export const ptSessions = defineTable({
    trainerId: v.id('users'),
    memberId: v.id('users'),
    scheduledAt: v.number(),
    durationMinutes: v.number(),
    status: v.union(
      v.literal('scheduled'),
      v.literal('completed'),
      v.literal('cancelled'),
      v.literal('no_show')
    ),
    notes: v.optional(v.string()),
    exercises: v.array(
      v.object({
        name: v.string(),
        sets: v.number(),
        reps: v.number(),
        weightKg: v.optional(v.number()),
        notes: v.optional(v.string()),
      })
    ),
    packageId: v.optional(v.string()),
    priceCents: v.number(),
    currency: v.string(),
  })
    .index('by_trainer', ['trainerId'])
    .index('by_member', ['memberId'])
    .index('by_scheduledAt', ['scheduledAt'])

export const trainerEarnings = defineTable({
    trainerId: v.id('users'),
    sessionId: v.id('ptSessions'),
    amountCents: v.number(),
    currency: v.string(),
    commissionRate: v.number(),
    status: v.union(v.literal('pending'), v.literal('paid'), v.literal('cancelled')),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_trainer', ['trainerId'])
    .index('by_status', ['status'])

export const trainerNotes = defineTable({
    trainerId: v.id('users'),
    memberId: v.id('users'),
    note: v.string(),
    createdAt: v.number(),
  })
    .index('by_trainer', ['trainerId'])
    .index('by_member', ['memberId'])
    .index('by_createdAt', ['createdAt'])
