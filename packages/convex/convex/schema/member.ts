/**
 * Queenix Gym — Convex schema tables: Member
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const memberProfiles = defineTable({
    userId: v.id('users'),
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(v.string()),
    emergencyContact: v.optional(
      v.object({
        name: v.string(),
        phone: v.string(),
        relationship: v.optional(v.string()),
      })
    ),
    vehicles: v.array(
      v.object({
        plate: v.string(),
        make: v.optional(v.string()),
        model: v.optional(v.string()),
        color: v.optional(v.string()),
      })
    ),
    preferences: v.object({
      notifications: v.boolean(),
      marketing: v.boolean(),
      language: v.union(v.literal('en'), v.literal('ar')),
    }),
    // ID document read by OCR and confirmed by a human (mutations/scans.ts).
    // verifiedBy === userId means the member self-scanned; otherwise staff verified.
    identity: v.optional(
      v.object({
        docType: v.union(v.literal('emirates_id'), v.literal('passport')),
        docNumber: v.string(),
        fullName: v.string(),
        nationality: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
        expiryDate: v.optional(v.string()),
        sex: v.optional(v.string()),
        verifiedAt: v.number(),
        verifiedBy: v.id('users'),
        scanStorageId: v.optional(v.id('_storage')),
      })
    ),
  }).index('by_user', ['userId'])
