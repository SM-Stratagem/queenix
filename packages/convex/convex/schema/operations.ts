/**
 * Queenix Gym — Convex schema tables: Loyalty, Notifications, Operations
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

// ============================================================
// Loyalty & Referrals
// ============================================================
export const loyaltyLedger = defineTable({
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
    .index('by_createdAt', ['createdAt'])

export const referrals = defineTable({
    referrerId: v.id('users'),
    refereeId: v.optional(v.id('users')),
    code: v.string(),
    status: v.union(v.literal('pending'), v.literal('converted'), v.literal('expired')),
    rewardPoints: v.number(),
    createdAt: v.number(),
    convertedAt: v.optional(v.number()),
  })
    .index('by_referrer', ['referrerId'])
    .index('by_code', ['code'])

// ============================================================
// Notifications
// ============================================================
export const notifications = defineTable({
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
    .index('by_user_unread', ['userId', 'read'])

// ============================================================
// Operations: shifts, incidents, support tickets, scanners
// ============================================================
export const shifts = defineTable({
    userId: v.id('users'),
    startsAt: v.number(),
    endsAt: v.number(),
    role: v.string(),
    status: v.union(
      v.literal('scheduled'),
      v.literal('active'),
      v.literal('completed'),
      v.literal('missed')
    ),
  })
    .index('by_user', ['userId'])
    .index('by_startsAt', ['startsAt'])

export const incidents = defineTable({
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
    title: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.string(),
    reportedBy: v.id('users'),
    status: v.optional(
      v.union(
        v.literal('open'),
        v.literal('in_progress'),
        v.literal('resolved')
      )
    ),
    resolved: v.boolean(),
    resolvedBy: v.optional(v.id('users')),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_resolved', ['resolved'])
    .index('by_status', ['status'])
    .index('by_createdAt', ['createdAt'])

export const supportTickets = defineTable({
    memberId: v.optional(v.id('users')),
    memberName: v.optional(v.string()),
    subject: v.string(),
    description: v.string(),
    category: v.optional(
      v.union(
        v.literal('billing'),
        v.literal('access'),
        v.literal('class'),
        v.literal('general')
      )
    ),
    priority: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('critical')
    ),
    status: v.union(
      v.literal('open'),
      v.literal('in_progress'),
      v.literal('waiting'),
      v.literal('resolved')
    ),
    assignedTo: v.optional(v.id('users')),
    createdBy: v.id('users'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_status', ['status'])
    .index('by_priority', ['priority'])
    .index('by_member', ['memberId'])
    .index('by_createdAt', ['createdAt'])

export const scannerDevices = defineTable({
    deviceId: v.string(),
    name: v.string(),
    location: v.string(),
    model: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    apiKey: v.string(),
    isActive: v.boolean(),
    lastSeenAt: v.optional(v.number()),
    lastScanAt: v.optional(v.number()),
    totalScans: v.number(),
    registeredBy: v.optional(v.id('users')),
    registeredAt: v.number(),
  })
    .index('by_deviceId', ['deviceId'])
    .index('by_active', ['isActive'])
    .index('by_lastSeen', ['lastSeenAt'])

export const auditEvents = defineTable({
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
    .index('by_timestamp', ['timestamp'])

export const approvals = defineTable({
    type: v.union(
      v.literal('membership.freeze_requested'),
      v.literal('payment.refund_requested'),
      v.literal('document.resign_requested'),
      v.literal('trainer.cert_expiring'),
      v.literal('access.override_requested'),
      v.literal('payout.early_requested')
    ),
    requestorId: v.id('users'),
    payload: v.any(),
    status: v.union(
      v.literal('pending'),
      v.literal('approved'),
      v.literal('denied'),
      v.literal('cancelled')
    ),
    decidedBy: v.optional(v.id('users')),
    decidedAt: v.optional(v.number()),
    decisionNote: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_status', ['status'])
    .index('by_type', ['type'])
    .index('by_requestor', ['requestorId'])
    .index('by_createdAt', ['createdAt'])

export const punchEvents = defineTable({
    userId: v.id('users'),
    method: v.union(v.literal('fingerprint'), v.literal('app'), v.literal('manual')),
    punchType: v.union(v.literal('in'), v.literal('out')),
    timestamp: v.number(),
    deviceId: v.optional(v.string()),
    location: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_timestamp', ['userId', 'timestamp'])
    .index('by_timestamp', ['timestamp'])
