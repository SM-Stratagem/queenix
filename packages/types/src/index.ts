/**
 * Queenix Gym — Shared types
 * Used by Convex schema, React Native app, and web admin.
 */

import { z } from 'zod';

// ============================================================
// Identity & Auth
// ============================================================

export const RoleSchema = z.enum(['member', 'trainer', 'owner', 'operations']);
export type Role = z.infer<typeof RoleSchema>;

export const ROLES: Role[] = ['member', 'trainer', 'owner', 'operations'];

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
});
export type User = z.infer<typeof UserSchema>;

// ============================================================
// Member
// ============================================================

export const MemberProfileSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  dateOfBirth: z.string().optional(), // ISO date
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
});
export type MemberProfile = z.infer<typeof MemberProfileSchema>;

// ============================================================
// Membership
// ============================================================

export const MembershipStatusSchema = z.enum([
  'active',
  'pending',
  'frozen',
  'cancelled',
  'expired',
  'trial',
]);
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;

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
  maxClassesPerMonth: z.number().int().nonnegative().default(0), // 0 = unlimited
  maxPTSessions: z.number().int().nonnegative().default(0),
});
export type MembershipPlan = z.infer<typeof MembershipPlanSchema>;

export const MembershipSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  planId: z.string(),
  status: MembershipStatusSchema,
  startDate: z.number(), // timestamp
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
});
export type Membership = z.infer<typeof MembershipSchema>;

// ============================================================
// Payments
// ============================================================

export const PaymentStatusSchema = z.enum([
  'pending',
  'succeeded',
  'failed',
  'refunded',
  'cancelled',
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const PaymentSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  amountCents: z.number().int(),
  currency: z.string().default('AED'),
  status: PaymentStatusSchema,
  type: z.enum(['membership', 'pt_package', 'event', 'other']),
  description: z.string(),
  stripePaymentIntentId: z.string().optional(),
  invoiceUrl: z.string().url().optional(),
  receiptUrl: z.string().url().optional(),
  idempotencyKey: z.string(),
  createdAt: z.number(),
});
export type Payment = z.infer<typeof PaymentSchema>;

// ============================================================
// Documents & Signatures
// ============================================================

export const DocumentTypeSchema = z.enum([
  'membership_agreement',
  'liability_waiver',
  'health_declaration',
  'gym_rules',
  'par_q',
  'trainer_contract',
  'photo_consent',
]);
export type DocumentType = z.infer<typeof DocumentTypeSchema>;

export const DocumentTemplateSchema = z.object({
  _id: z.string(),
  type: DocumentTypeSchema,
  version: z.string(), // e.g. "1.0.0"
  title: z.string(),
  content: z.string(), // markdown
  required: z.boolean().default(true),
  effectiveDate: z.number(),
  expiresAt: z.number().optional(),
});
export type DocumentTemplate = z.infer<typeof DocumentTemplateSchema>;

export const SignatureSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  templateId: z.string(),
  documentVersion: z.string(),
  signedAt: z.number(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  signatureData: z.string(), // base64 or typed name
});
export type Signature = z.infer<typeof SignatureSchema>;

// ============================================================
// Access & QR
// ============================================================

export const AccessStatusSchema = z.enum(['active', 'blocked', 'expired', 'suspended']);
export type AccessStatus = z.infer<typeof AccessStatusSchema>;

export const AccessCredentialSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  membershipId: z.string(),
  status: AccessStatusSchema,
  token: z.string(), // rotating QR token
  tokenExpiresAt: z.number(),
  deviceFingerprint: z.string().optional(),
  lastUsedAt: z.number().optional(),
});
export type AccessCredential = z.infer<typeof AccessCredentialSchema>;

export const AccessEventSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  credentialId: z.string(),
  accessPointId: z.string(),
  direction: z.enum(['in', 'out']),
  granted: z.boolean(),
  reason: z.string().optional(),
  timestamp: z.number(),
});
export type AccessEvent = z.infer<typeof AccessEventSchema>;

// ============================================================
// Classes & Scheduling
// ============================================================

export const ClassTypeSchema = z.object({
  _id: z.string(),
  name: z.string(),
  description: z.string(),
  durationMinutes: z.number().int().positive(),
  capacity: z.number().int().positive(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  category: z.string(), // e.g. "HIIT", "Yoga", "Strength"
  imageUrl: z.string().url().optional(),
  trainerId: z.string().optional(),
});
export type ClassType = z.infer<typeof ClassTypeSchema>;

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
});
export type ClassInstance = z.infer<typeof ClassInstanceSchema>;

export const BookingSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  classInstanceId: z.string(),
  status: z.enum(['confirmed', 'waitlisted', 'cancelled', 'attended', 'no_show']),
  bookedAt: z.number(),
  cancelledAt: z.number().optional(),
  idempotencyKey: z.string(),
});
export type Booking = z.infer<typeof BookingSchema>;

// ============================================================
// Personal Training
// ============================================================

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
});
export type TrainerProfile = z.infer<typeof TrainerProfileSchema>;

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
});
export type PTSession = z.infer<typeof PTSessionSchema>;

// ============================================================
// Loyalty & Referrals
// ============================================================

export const LoyaltyLedgerSchema = z.object({
  _id: z.string(),
  userId: z.string(),
  type: z.enum(['earned', 'redeemed', 'expired', 'adjusted']),
  points: z.number().int(), // can be negative for redemptions
  reason: z.string(),
  referenceId: z.string().optional(), // booking, payment, etc.
  expiresAt: z.number().optional(),
  createdAt: z.number(),
});
export type LoyaltyLedger = z.infer<typeof LoyaltyLedgerSchema>;

export const ReferralSchema = z.object({
  _id: z.string(),
  referrerId: z.string(),
  refereeId: z.string().optional(),
  code: z.string(),
  status: z.enum(['pending', 'converted', 'expired']),
  rewardPoints: z.number().int().nonnegative().default(0),
  createdAt: z.number(),
  convertedAt: z.number().optional(),
});
export type Referral = z.infer<typeof ReferralSchema>;

// ============================================================
// Notifications
// ============================================================

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
});
export type Notification = z.infer<typeof NotificationSchema>;

// ============================================================
// Operations
// ============================================================

export const IncidentSchema = z.object({
  _id: z.string(),
  type: z.enum(['access_denied', 'equipment', 'safety', 'complaint', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string(),
  reportedBy: z.string(), // userId
  resolved: z.boolean().default(false),
  resolvedBy: z.string().optional(),
  resolvedAt: z.number().optional(),
  createdAt: z.number(),
});
export type Incident = z.infer<typeof IncidentSchema>;

// ============================================================
// API Response wrapper
// ============================================================

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } };

// ============================================================
// Helpers
// ============================================================

export const formatCurrency = (cents: number, currency = 'AED'): string => {
  const amount = cents / 100;
  return `${currency} ${amount.toFixed(2)}`;
};

export const formatDate = (timestamp: number, locale = 'en-US'): string => {
  return new Date(timestamp).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (timestamp: number, locale = 'en-US'): string => {
  return new Date(timestamp).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTime = (timestamp: number, locale = 'en-US'): string => {
  return new Date(timestamp).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
};
