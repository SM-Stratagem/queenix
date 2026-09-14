/**
 * Queenix Gym — Classes & Training schemas
 */

import { z } from 'zod'

export const ClassTypeSchema = z.object({
  _id: z.string(),
  name: z.string(),
  description: z.string(),
  durationMinutes: z.number().int().positive(),
  capacity: z.number().int().positive(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  category: z.string(),
  imageUrl: z.string().url().optional(),
  trainerId: z.string().optional(),
})
export type ClassType = z.infer<typeof ClassTypeSchema>

export const ClassInstanceSchema = z.object({
  _id: z.string(),
  classTypeId: z.string(),
  trainerId: z.string().optional(),
  roomId: z.string().optional(),
  startsAt: z.number(),
  endsAt: z.number(),
  capacity: z.number().int().positive(),
  bookedCount: z.number().int().nonnegative().default(0),
  waitlistCount: z.number().int().nonnegative().default(0),
  status: z.enum(['scheduled', 'cancelled', 'completed']).default('scheduled'),
  notes: z.string().optional(),
})
export type ClassInstance = z.infer<typeof ClassInstanceSchema>

export const BookingSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  classInstanceId: z.string(),
  status: z.enum(['confirmed', 'waitlisted', 'cancelled', 'attended', 'no_show']),
  bookedAt: z.number(),
  cancelledAt: z.number().optional(),
  idempotencyKey: z.string(),
})
export type Booking = z.infer<typeof BookingSchema>

export const TrainerProfileSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  bio: z.string().optional(),
  specialties: z.array(z.string()).default([]),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string(),
        issuedAt: z.number(),
        expiresAt: z.number().optional(),
        documentUrl: z.string().url().optional(),
      })
    )
    .default([]),
  rating: z.number().min(0).max(5).default(0),
  reviewCount: z.number().int().nonnegative().default(0),
  isAvailable: z.boolean().default(true),
  hourlyRateCents: z.number().int().nonnegative(),
  currency: z.string().default('AED'),
  profileImageUrl: z.string().url().optional(),
})
export type TrainerProfile = z.infer<typeof TrainerProfileSchema>

export const PTSessionSchema = z.object({
  _id: z.string(),
  trainerId: z.string(),
  memberId: z.string(),
  scheduledAt: z.number(),
  durationMinutes: z.number().int().positive(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']),
  notes: z.string().optional(),
  exercises: z
    .array(
      z.object({
        name: z.string(),
        sets: z.number().int().nonnegative(),
        reps: z.number().int().nonnegative(),
        weightKg: z.number().nonnegative().optional(),
        notes: z.string().optional(),
      })
    )
    .default([]),
  packageId: z.string().optional(),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().default('AED'),
})
export type PTSession = z.infer<typeof PTSessionSchema>
