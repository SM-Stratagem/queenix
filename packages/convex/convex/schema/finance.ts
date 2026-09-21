/**
 * Queenix Gym — Convex schema tables: finance (payouts, voids)
 * The transaction ledger itself lives in `payments`; refunds are
 * `payments` rows with status 'refunded'; audit trail is `auditEvents`.
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const payouts = defineTable({
  recipientId: v.optional(v.id('users')),
  recipientName: v.string(),
  amountCents: v.number(),
  currency: v.string(),
  method: v.union(
    v.literal('bank_transfer'),
    v.literal('cash'),
    v.literal('wallet')
  ),
  status: v.union(
    v.literal('pending'),
    v.literal('paid'),
    v.literal('cancelled')
  ),
  reference: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdBy: v.id('users'),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_status', ['status'])
  .index('by_createdAt', ['createdAt'])

export const financeVoids = defineTable({
  paymentId: v.id('payments'),
  reason: v.string(),
  voidedBy: v.id('users'),
  createdAt: v.number(),
}).index('by_payment', ['paymentId'])

/**
 * Manual bookkeeping entries: off-system income and expenses
 * (cash, rent, utilities, adjustments) that never pass through
 * Stripe/Tap. Included in P&L alongside payments and payouts.
 */
export const journalEntries = defineTable({
  entryDate: v.number(),
  kind: v.union(v.literal('income'), v.literal('expense')),
  category: v.string(),
  amountCents: v.number(),
  currency: v.string(),
  note: v.optional(v.string()),
  createdBy: v.id('users'),
  createdAt: v.number(),
})
  .index('by_entryDate', ['entryDate'])
  .index('by_kind', ['kind'])
