/**
 * Queenix Gym — Convex schema tables: Identity & Auth
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const users = defineTable({
    email: v.string(),
    phone: v.optional(v.string()),
    fullName: v.string(),
    avatarUrl: v.optional(v.string()),
    activeRole: v.union(
      v.literal('superadmin'),
      v.literal('admin'),
      v.literal('owner'),
      v.literal('operations'),
      v.literal('salon'),
      v.literal('coffee'),
      v.literal('trainer'),
      v.literal('member')
    ),
    roles: v.array(
      v.union(
        v.literal('superadmin'),
        v.literal('admin'),
        v.literal('owner'),
        v.literal('operations'),
        v.literal('salon'),
        v.literal('coffee'),
        v.literal('trainer'),
        v.literal('member')
      )
    ),
    emailVerified: v.boolean(),
    phoneVerified: v.boolean(),
    hashedPassword: v.optional(v.string()),
    betterAuthUserId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_phone', ['phone'])
    .index('by_betterAuthUserId', ['betterAuthUserId'])

export const devices = defineTable({
    userId: v.id('users'),
    deviceFingerprint: v.string(),
    platform: v.union(v.literal('ios'), v.literal('android'), v.literal('web')),
    pushToken: v.optional(v.string()),
    lastActiveAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_fingerprint', ['deviceFingerprint'])

export const consents = defineTable({
    userId: v.id('users'),
    type: v.union(
      v.literal('marketing_email'),
      v.literal('marketing_sms'),
      v.literal('marketing_push'),
      v.literal('data_processing'),
      v.literal('photo_consent')
    ),
    granted: v.boolean(),
    grantedAt: v.number(),
    ipAddress: v.optional(v.string()),
  }).index('by_user', ['userId'])
