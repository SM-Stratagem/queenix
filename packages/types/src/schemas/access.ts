/**
 * Queenix Gym — Access & QR schemas
 */

import { z } from 'zod'

export const AccessStatusSchema = z.enum(['active', 'blocked', 'expired', 'suspended'])
export type AccessStatus = z.infer<typeof AccessStatusSchema>

export const AccessCredentialSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  membershipId: z.string(),
  status: AccessStatusSchema,
  token: z.string(),
  tokenExpiresAt: z.number(),
  deviceFingerprint: z.string().optional(),
  lastUsedAt: z.number().optional(),
})
export type AccessCredential = z.infer<typeof AccessCredentialSchema>

export const AccessEventSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  credentialId: z.string(),
  accessPointId: z.string(),
  direction: z.enum(['in', 'out']),
  granted: z.boolean(),
  reason: z.string().optional(),
  timestamp: z.number(),
})
export type AccessEvent = z.infer<typeof AccessEventSchema>
