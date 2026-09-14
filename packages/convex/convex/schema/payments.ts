/**
 * Queenix Gym — Convex schema tables: Payments
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const payments = defineTable({
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
    provider: v.union(v.literal('stripe'), v.literal('tap')),
    stripePaymentIntentId: v.optional(v.string()),
    tapChargeId: v.optional(v.string()),
    invoiceNumber: v.optional(v.string()),
    invoiceId: v.optional(v.id('invoices')),
    metadata: v.optional(v.any()),
    failureReason: v.optional(v.string()),
    refundedAmountCents: v.optional(v.number()),
    receiptUrl: v.optional(v.string()),
    idempotencyKey: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_idempotencyKey', ['idempotencyKey'])
    .index('by_status', ['status'])
    .index('by_stripePaymentIntentId', ['stripePaymentIntentId'])
    .index('by_tapChargeId', ['tapChargeId'])

export const paymentMethods = defineTable({
    userId: v.id('users'),
    type: v.union(v.literal('card'), v.literal('apple_pay'), v.literal('google_pay')),
    provider: v.union(v.literal('stripe'), v.literal('tap')),
    last4: v.optional(v.string()),
    brand: v.optional(v.string()),
    expiryMonth: v.optional(v.number()),
    expiryYear: v.optional(v.number()),
    stripePaymentMethodId: v.optional(v.string()),
    tapTokenId: v.optional(v.string()),
    isDefault: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_default', ['userId', 'isDefault'])

export const invoices = defineTable({
    paymentId: v.id('payments'),
    userId: v.id('users'),
    invoiceNumber: v.string(),
    status: v.union(
      v.literal('draft'),
      v.literal('issued'),
      v.literal('paid'),
      v.literal('refunded'),
      v.literal('void')
    ),
    subtotalCents: v.number(),
    vatRate: v.number(),
    vatCents: v.number(),
    totalCents: v.number(),
    currency: v.string(),
    lineItems: v.array(
      v.object({
        description: v.string(),
        quantity: v.number(),
        unitPriceCents: v.number(),
        totalCents: v.number(),
      })
    ),
    issuedAt: v.number(),
    paidAt: v.optional(v.number()),
    receiptUrl: v.optional(v.string()),
  })
    .index('by_paymentId', ['paymentId'])
    .index('by_user', ['userId'])
    .index('by_invoiceNumber', ['invoiceNumber'])
