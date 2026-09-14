/**
 * Queenix Gym — Identity & Auth schemas
 */

import { z } from 'zod'

export const RoleSchema = z.enum(['member', 'trainer', 'owner', 'operations'])
export type Role = z.infer<typeof RoleSchema>

export const ROLES: Role[] = ['member', 'trainer', 'owner', 'operations']

export const UserSchema = z.object({
  _id: z.string(),
  _creationTime: z.number(),
  email: z.string().email(),
  phone: z.string().optional(),
  fullName: z.string(),
  avatarUrl: z.string().url().optional(),
  activeRole: RoleSchema,
  roles: z.array(RoleSchema).min(1),
  emailVerified: z.boolean().default(false),
  phoneVerified: z.boolean().default(false),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type User = z.infer<typeof UserSchema>
