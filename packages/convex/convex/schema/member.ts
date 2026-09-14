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
  }).index('by_user', ['userId'])
