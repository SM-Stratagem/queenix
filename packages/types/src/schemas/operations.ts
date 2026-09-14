/**
 * Queenix Gym — Loyalty, Notifications, Operations schemas
 */

import { z } from 'zod'

export const LoyaltyLedgerSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  type: z.enum(['earned', 'redeemed', 'expired', 'adjusted']),
  points: z.number().int(),
  reason: z.string(),
  referenceId: z.string().optional(),
  expiresAt: z.number().optional(),
  createdAt: z.number(),
})
export type LoyaltyLedger = z.infer<typeof LoyaltyLedgerSchema>

export const ReferralSchema = z.object({
  _id: z.string(),
  referrerId: z.string(),
  refereeId: z.string().optional(),
  code: z.string(),
  status: z.enum(['pending', 'converted', 'expired']),
  rewardPoints: z.number().int().nonnegative().default(0),
  createdAt: z.number(),
  convertedAt: z.number().optional(),
})
export type Referral = z.infer<typeof ReferralSchema>

export const NotificationSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  type: z.enum([
    'booking',
    'class_reminder',
    'payment',
    'membership',
    'access',
    'reward',
    'system',
    'promotion',
  ]),
  read: z.boolean().default(false),
  data: z.record(z.string(), z.any()).optional(),
  createdAt: z.number(),
})
export type Notification = z.infer<typeof NotificationSchema>

export const IncidentSchema = z.object({
  _id: z.string(),
  type: z.enum(['access_denied', 'equipment', 'safety', 'complaint', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  reportedBy: z.string(),
  resolved: z.boolean().default(false),
  resolvedBy: z.string().optional(),
  resolvedAt: z.number().optional(),
  createdAt: z.number(),
})
export type Incident = z.infer<typeof IncidentSchema>
