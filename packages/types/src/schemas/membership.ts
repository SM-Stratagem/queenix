/**
 * Queenix Gym — Membership schemas
 */

import { z } from 'zod'

export const MembershipStatusSchema = z.enum([
  'active',
  'pending',
  'frozen',
  'cancelled',
  'expired',
  'trial',
])
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>

export const MembershipPlanSchema = z.object({
  _id: z.string(),
  name: z.string(),
  description: z.string(),
  durationDays: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().default('AED'),
  features: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  isTrial: z.boolean().default(false),
  trialDays: z.number().int().nonnegative().default(0),
  maxClassesPerMonth: z.number().int().nonnegative().default(0),
  maxPTSessions: z.number().int().nonnegative().default(0),
})
export type MembershipPlan = z.infer<typeof MembershipPlanSchema>

export const MembershipSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  planId: z.string(),
  status: MembershipStatusSchema,
  startDate: z.number(),
  endDate: z.number(),
  freezes: z
    .array(
      z.object({
        startDate: z.number(),
        endDate: z.number(),
        reason: z.string().optional(),
      })
    )
    .default([]),
  autoRenew: z.boolean().default(false),
  remainingClasses: z.number().int().nonnegative().default(0),
  remainingPTSessions: z.number().int().nonnegative().default(0),
})
export type Membership = z.infer<typeof MembershipSchema>
