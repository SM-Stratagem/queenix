/**
 * Queenix Gym — Convex schema
 * Eight domains per PRD §22.
 */

import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // ============================================================
  // Identity & Auth
  // ============================================================
  users: defineTable({
    email: v.string(),
    phone: v.optional(v.string()),
    fullName: v.string(),
    avatarUrl: v.optional(v.string()),
    activeRole: v.union(
      v.literal('member'),
      v.literal('trainer'),
      v.literal('owner'),
      v.literal('operations')
    ),
    roles: v.array(
      v.union(
        v.literal('member'),
        v.literal('trainer'),
        v.literal('owner'),
        v.literal('operations')
      )
    ),
    emailVerified: v.boolean(),
    phoneVerified: v.boolean(),
    hashedPassword: v.optional(v.string()),
    betterAuthUserId: v.optional(v.string()), // link to BetterAuth user
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_phone', ['phone'])
    .index('by_betterAuthUserId', ['betterAuthUserId']),

  devices: defineTable({
    userId: v.id('users'),
    deviceFingerprint: v.string(),
    platform: v.union(v.literal('ios'), v.literal('android'), v.literal('web')),
    pushToken: v.optional(v.string()),
    lastActiveAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_fingerprint', ['deviceFingerprint']),

  consents: defineTable({
    userId: v.id('users'),
    type: v.union(
      v.literal('marketing_email'),
      v.literal('marketing_sms'),
      v.literal('marketing_push'),
      v.literal('data_processing'),
      v.literal('photo_consent')
    ),
    granted: v.boolean(),
    grantedAt: v.number(),
    ipAddress: v.optional(v.string()),
  }).index('by_user', ['userId']),

  // ============================================================
  // Member
  // ============================================================
  memberProfiles: defineTable({
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
  }).index('by_user', ['userId']),

  // ============================================================
  // Membership
  // ============================================================
  membershipPlans: defineTable({
    name: v.string(),
    description: v.string(),
    durationDays: v.number(),
    priceCents: v.number(),
    currency: v.string(),
    features: v.array(v.string()),
    isActive: v.boolean(),
    isTrial: v.boolean(),
    trialDays: v.number(),
    maxClassesPerMonth: v.number(),
    maxPTSessions: v.number(),
  }).index('by_active', ['isActive']),

  memberships: defineTable({
    userId: v.id('users'),
    planId: v.id('membershipPlans'),
    status: v.union(
      v.literal('active'),
      v.literal('pending'),
      v.literal('frozen'),
      v.literal('cancelled'),
      v.literal('expired'),
      v.literal('trial')
    ),
    startDate: v.number(),
    endDate: v.number(),
    freezes: v.array(
      v.object({
        startDate: v.number(),
        endDate: v.number(),
        reason: v.optional(v.string()),
      })
    ),
    autoRenew: v.boolean(),
    remainingClasses: v.number(),
    remainingPTSessions: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_endDate', ['endDate']),

  // ============================================================
  // Payments
  // ============================================================
  payments: defineTable({
    userId: v.id('users'),
    amountCents: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('succeeded'),
      v.literal('failed'),
      v.literal('refunded'),
      v.literal('cancelled')
    ),
    type: v.union(
      v.literal('membership'),
      v.literal('pt_package'),
      v.literal('event'),
      v.literal('other')
    ),
    description: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    invoiceUrl: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
    idempotencyKey: v.string(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_idempotencyKey', ['idempotencyKey'])
    .index('by_status', ['status']),

  paymentMethods: defineTable({
    userId: v.id('users'),
    type: v.union(v.literal('card'), v.literal('apple_pay'), v.literal('google_pay')),
    last4: v.optional(v.string()),
    brand: v.optional(v.string()),
    expiryMonth: v.optional(v.number()),
    expiryYear: v.optional(v.number()),
    stripePaymentMethodId: v.string(),
    isDefault: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_default', ['userId', 'isDefault']),

  // ============================================================
  // Documents & Signatures
  // ============================================================
  documentTemplates: defineTable({
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
    .index('by_type_version', ['type', 'version']),

  signatures: defineTable({
    userId: v.id('users'),
    templateId: v.id('documentTemplates'),
    documentVersion: v.string(),
    signedAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    signatureData: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_template', ['templateId']),

  // ============================================================
  // Access & QR
  // ============================================================
  accessCredentials: defineTable({
    userId: v.id('users'),
    membershipId: v.id('memberships'),
    status: v.union(
      v.literal('active'),
      v.literal('blocked'),
      v.literal('expired'),
      v.literal('suspended')
    ),
    token: v.string(),
    tokenExpiresAt: v.number(),
    deviceFingerprint: v.optional(v.string()),
    lastUsedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_token', ['token'])
    .index('by_membership', ['membershipId']),

  accessEvents: defineTable({
    userId: v.id('users'),
    credentialId: v.id('accessCredentials'),
    accessPointId: v.string(),
    direction: v.union(v.literal('in'), v.literal('out')),
    granted: v.boolean(),
    reason: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_credential', ['credentialId'])
    .index('by_timestamp', ['timestamp']),

  occupancySnapshots: defineTable({
    accessPointId: v.string(),
    count: v.number(),
    timestamp: v.number(),
  }).index('by_accessPoint_timestamp', ['accessPointId', 'timestamp']),

  // ============================================================
  // Classes & Scheduling
  // ============================================================
  classTypes: defineTable({
    name: v.string(),
    description: v.string(),
    durationMinutes: v.number(),
    capacity: v.number(),
    difficulty: v.union(
      v.literal('beginner'),
      v.literal('intermediate'),
      v.literal('advanced')
    ),
    category: v.string(),
    imageUrl: v.optional(v.string()),
    trainerId: v.optional(v.id('users')),
  }).index('by_category', ['category']),

  classInstances: defineTable({
    classTypeId: v.id('classTypes'),
    trainerId: v.optional(v.id('users')),
    roomId: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    capacity: v.number(),
    bookedCount: v.number(),
    waitlistCount: v.number(),
    status: v.union(
      v.literal('scheduled'),
      v.literal('cancelled'),
      v.literal('completed')
    ),
    notes: v.optional(v.string()),
  })
    .index('by_classType', ['classTypeId'])
    .index('by_startsAt', ['startsAt'])
    .index('by_trainer', ['trainerId']),

  bookings: defineTable({
    userId: v.id('users'),
    classInstanceId: v.id('classInstances'),
    status: v.union(
      v.literal('confirmed'),
      v.literal('waitlisted'),
      v.literal('cancelled'),
      v.literal('attended'),
      v.literal('no_show')
    ),
    bookedAt: v.number(),
    cancelledAt: v.optional(v.number()),
    idempotencyKey: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_classInstance', ['classInstanceId'])
    .index('by_idempotencyKey', ['idempotencyKey']),

  // ============================================================
  // Personal Training
  // ============================================================
  trainerProfiles: defineTable({
    userId: v.id('users'),
    bio: v.optional(v.string()),
    specialties: v.array(v.string()),
    certifications: v.array(
      v.object({
        name: v.string(),
        issuer: v.string(),
        issuedAt: v.number(),
        expiresAt: v.optional(v.number()),
        documentUrl: v.optional(v.string()),
      })
    ),
    rating: v.number(),
    reviewCount: v.number(),
    isAvailable: v.boolean(),
    hourlyRateCents: v.number(),
    currency: v.string(),
    profileImageUrl: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_available', ['isAvailable']),

  ptSessions: defineTable({
    trainerId: v.id('users'),
    memberId: v.id('users'),
    scheduledAt: v.number(),
    durationMinutes: v.number(),
    status: v.union(
      v.literal('scheduled'),
      v.literal('completed'),
      v.literal('cancelled'),
      v.literal('no_show')
    ),
    notes: v.optional(v.string()),
    exercises: v.array(
      v.object({
        name: v.string(),
        sets: v.number(),
        reps: v.number(),
        weightKg: v.optional(v.number()),
        notes: v.optional(v.string()),
      })
    ),
    packageId: v.optional(v.string()),
    priceCents: v.number(),
    currency: v.string(),
  })
    .index('by_trainer', ['trainerId'])
    .index('by_member', ['memberId'])
    .index('by_scheduledAt', ['scheduledAt']),

  trainerEarnings: defineTable({
    trainerId: v.id('users'),
    sessionId: v.id('ptSessions'),
    amountCents: v.number(),
    currency: v.string(),
    commissionRate: v.number(),
    status: v.union(v.literal('pending'), v.literal('paid'), v.literal('cancelled')),
    paidAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_trainer', ['trainerId'])
    .index('by_status', ['status']),

  // ============================================================
  // Loyalty & Referrals
  // ============================================================
  loyaltyLedger: defineTable({
    userId: v.id('users'),
    type: v.union(
      v.literal('earned'),
      v.literal('redeemed'),
      v.literal('expired'),
      v.literal('adjusted')
    ),
    points: v.number(),
    reason: v.string(),
    referenceId: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_createdAt', ['createdAt']),

  referrals: defineTable({
    referrerId: v.id('users'),
    refereeId: v.optional(v.id('users')),
    code: v.string(),
    status: v.union(v.literal('pending'), v.literal('converted'), v.literal('expired')),
    rewardPoints: v.number(),
    createdAt: v.number(),
    convertedAt: v.optional(v.number()),
  })
    .index('by_referrer', ['referrerId'])
    .index('by_code', ['code']),

  // ============================================================
  // Notifications
  // ============================================================
  notifications: defineTable({
    userId: v.id('users'),
    title: v.string(),
    body: v.string(),
    type: v.union(
      v.literal('booking'),
      v.literal('class_reminder'),
      v.literal('payment'),
      v.literal('membership'),
      v.literal('access'),
      v.literal('reward'),
      v.literal('system'),
      v.literal('promotion')
    ),
    read: v.boolean(),
    data: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_unread', ['userId', 'read']),

  // ============================================================
  // Operations
  // ============================================================
  shifts: defineTable({
    userId: v.id('users'),
    startsAt: v.number(),
    endsAt: v.number(),
    role: v.string(), // e.g. "front_desk", "manager"
    status: v.union(
      v.literal('scheduled'),
      v.literal('active'),
      v.literal('completed'),
      v.literal('missed')
    ),
  })
    .index('by_user', ['userId'])
    .index('by_startsAt', ['startsAt']),

  incidents: defineTable({
    type: v.union(
      v.literal('access_denied'),
      v.literal('equipment'),
      v.literal('safety'),
      v.literal('complaint'),
      v.literal('other')
    ),
    severity: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('critical')
    ),
    description: v.string(),
    reportedBy: v.id('users'),
    resolved: v.boolean(),
    resolvedBy: v.optional(v.id('users')),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_resolved', ['resolved'])
    .index('by_createdAt', ['createdAt']),

  auditEvents: defineTable({
    actorId: v.id('users'),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    before: v.optional(v.any()),
    after: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index('by_actor', ['actorId'])
    .index('by_entity', ['entityType', 'entityId'])
    .index('by_timestamp', ['timestamp']),
});
