/**
 * Queenix Gym — Member schemas
 */

import { z } from 'zod'

export const MemberProfileSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['female', 'male', 'other', 'prefer_not_to_say']).default('female'),
  emergencyContact: z
    .object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string().optional(),
    })
    .optional(),
  vehicles: z
    .array(
      z.object({
        plate: z.string(),
        make: z.string().optional(),
        model: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .default([]),
  preferences: z.object({
    notifications: z.boolean().default(true),
    marketing: z.boolean().default(false),
    language: z.enum(['en', 'ar']).default('en'),
  }),
})
export type MemberProfile = z.infer<typeof MemberProfileSchema>
