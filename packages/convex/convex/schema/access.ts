/**
 * Queenix Gym — Convex schema tables: Access & QR
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const accessCredentials = defineTable({
    userId: v.id('users'),
    membershipId: v.id('memberships'),
    status: v.union(
      v.literal('active'),
      v.literal('blocked'),
      v.literal('expired'),
      v.literal('suspended')
    ),
    token: v.string(),
    tokenExpiresAt: v.number(),
    deviceFingerprint: v.optional(v.string()),
    lastUsedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_token', ['token'])
    .index('by_membership', ['membershipId'])

export const accessEvents = defineTable({
    userId: v.id('users'),
    credentialId: v.id('accessCredentials'),
    accessPointId: v.string(),
    direction: v.union(v.literal('in'), v.literal('out')),
    granted: v.boolean(),
    reason: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_credential', ['credentialId'])
    .index('by_timestamp', ['timestamp'])

export const occupancySnapshots = defineTable({
    accessPointId: v.string(),
    count: v.number(),
    timestamp: v.number(),
  }).index('by_accessPoint_timestamp', ['accessPointId', 'timestamp'])
