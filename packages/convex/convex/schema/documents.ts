/**
 * Queenix Gym — Convex schema tables: Documents & Signatures
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const documentTemplates = defineTable({
    type: v.union(
      v.literal('membership_agreement'),
      v.literal('liability_waiver'),
      v.literal('health_declaration'),
      v.literal('gym_rules'),
      v.literal('par_q'),
      v.literal('trainer_contract'),
      v.literal('photo_consent')
    ),
    version: v.string(),
    title: v.string(),
    content: v.string(),
    required: v.boolean(),
    effectiveDate: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index('by_type', ['type'])
    .index('by_type_version', ['type', 'version'])

export const signatures = defineTable({
    userId: v.id('users'),
    templateId: v.id('documentTemplates'),
    documentVersion: v.string(),
    signedAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    signatureData: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_template', ['templateId'])
