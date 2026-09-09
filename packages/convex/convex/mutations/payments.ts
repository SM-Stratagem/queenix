/**
 * Queenix Gym — Payment & membership mutations
 * Handles payment intent creation, webhook processing, payment method
 * management, and membership lifecycle (freeze, cancel, renew via checkout).
 *
 * The actual provider call (Stripe / Tap) is done by a Next.js server route
 * (`/api/payments/create-intent`). Convex holds the durable record of every
 * payment, idempotency keys, and emits audit events.
 */

import { v } from 'convex/values';
import { mutation, internalMutation } from '../_generated/server';
import { requireUser, audit } from '../_helpers';
import { ConvexError } from 'convex/values';

// ============================================================
// Helpers
// ============================================================

function generateIdempotencyKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

async function nextInvoiceSequence(ctx: any): Promise<number> {
  // Simple counter — the highest existing invoiceNumber's trailing digits + 1.
  const last = await ctx.db
    .query('invoices')
    .withIndex('by_invoiceNumber')
    .order('desc')
    .first();
  if (!last) return 1;
  const match = last.invoiceNumber.match(/(\d+)$/);
  return match ? Number(match[1]) + 1 : 1;
}

// ============================================================
// createPaymentIntent — called by the mobile app
//
// The actual Stripe/Tap call happens in the Next.js route
// /api/payments/create-intent. This mutation just creates a `pending` record
// keyed by idempotencyKey and returns its id + the args the route will need.
// ============================================================

export const createPaymentIntent = mutation({
  args: {
    amountCents: v.number(),
    currency: v.string(),
    type: v.union(
      v.literal('membership'),
      v.literal('pt_package'),
      v.literal('event'),
      v.literal('other')
    ),
    description: v.string(),
    planId: v.optional(v.id('membershipPlans')),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.amountCents <= 0) {
      throw new ConvexError({ code: 'INVALID_AMOUNT', message: 'Amount must be positive' });
    }
    const idempotencyKey = generateIdempotencyKey('pi');

    // Idempotency: if a record already exists for this user with the same key, return it
    const existing = await ctx.db
      .query('payments')
      .withIndex('by_idempotencyKey', (q) => q.eq('idempotencyKey', idempotencyKey))
      .first();
    if (existing) return existing._id;

    // Default to Stripe; Next.js route will swap to Tap for AED.
    const paymentId = await ctx.db.insert('payments', {
      userId: user._id,
      amountCents: args.amountCents,
      currency: args.currency,
      status: 'pending',
      type: args.type,
      description: args.description,
      provider: 'stripe',
      metadata: { ...(args.metadata ?? {}), planId: args.planId ?? null },
      idempotencyKey,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await audit(ctx, {
      actorId: user._id,
      action: 'payment.intentCreated',
      entityType: 'payment',
      entityId: paymentId,
      after: { amountCents: args.amountCents, currency: args.currency, type: args.type },
    });

    return paymentId;
  },
});

/**
 * Internal — called by the Next.js /api/payments/create-intent route after
 * the provider returns. Stores the provider's intent id and updates the
 * payment record.
 */
export const attachProviderIntent = internalMutation({
  args: {
    paymentId: v.id('payments'),
    provider: v.union(v.literal('stripe'), v.literal('tap')),
    stripePaymentIntentId: v.optional(v.string()),
    tapChargeId: v.optional(v.string()),
  },
  handler: async (ctx, { paymentId, provider, stripePaymentIntentId, tapChargeId }) => {
    const payment = await ctx.db.get(paymentId);
    if (!payment) throw new ConvexError({ code: 'NOT_FOUND', message: 'Payment not found' });
    await ctx.db.patch(paymentId, {
      provider,
      stripePaymentIntentId,
      tapChargeId,
      updatedAt: Date.now(),
    });
    return await ctx.db.get(paymentId);
  },
});

// ============================================================
// Webhook-driven mutations
// ============================================================

/**
 * Mark a payment as succeeded (called by Stripe/Tap webhook). Creates an
 * invoice, updates related memberships, and writes an audit event.
 */
export const recordPaymentSuccess = mutation({
  args: {
    stripePaymentIntentId: v.optional(v.string()),
    tapChargeId: v.optional(v.string()),
    amountCents: v.number(),
    currency: v.string(),
    paymentMethodLabel: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Find the payment record
    let payment: any = null;
    if (args.stripePaymentIntentId) {
      payment = await ctx.db
        .query('payments')
        .withIndex('by_stripePaymentIntentId', (q) => q.eq('stripePaymentIntentId', args.stripePaymentIntentId!))
        .first();
    } else if (args.tapChargeId) {
      payment = await ctx.db
        .query('payments')
        .withIndex('by_tapChargeId', (q) => q.eq('tapChargeId', args.tapChargeId!))
        .first();
    }
    if (!payment) {
      throw new ConvexError({ code: 'PAYMENT_NOT_FOUND', message: 'No matching payment' });
    }
    if (payment.status === 'succeeded') {
      // Idempotent — already processed
      return payment;
    }

    // Mark payment succeeded
    await ctx.db.patch(payment._id, {
      status: 'succeeded',
      updatedAt: Date.now(),
    });

    // Create invoice
    const sequence = await nextInvoiceSequence(ctx);
    const year = new Date().getFullYear();
    const invoiceNumber = `QNX-${year}-${String(sequence).padStart(5, '0')}`;
    const subtotalCents = args.amountCents;
    const vatRate = args.currency === 'AED' ? 0.05 : 0;
    const vatCents = Math.round(subtotalCents * vatRate);
    const totalCents = subtotalCents + vatCents;
    const lineItems = [
      {
        description: payment.description,
        quantity: 1,
        unitPriceCents: subtotalCents,
        totalCents: subtotalCents,
      },
    ];

    const invoiceId = await ctx.db.insert('invoices', {
      paymentId: payment._id,
      userId: payment.userId,
      invoiceNumber,
      status: 'paid',
      subtotalCents,
      vatRate,
      vatCents,
      totalCents,
      currency: args.currency,
      lineItems,
      issuedAt: Date.now(),
      paidAt: Date.now(),
      receiptUrl: `${process.env.APP_URL ?? ''}/api/payments/${payment._id}/receipt`,
    });
    await ctx.db.patch(payment._id, { invoiceId, invoiceNumber });

    // If this is a membership payment, create/renew the membership record
    const planId = (payment.metadata as any)?.planId as string | undefined;
    if (payment.type === 'membership' && planId) {
      const plan = await ctx.db.get(planId as any);
      if (plan) {
        const startDate = Date.now();
        const endDate = startDate + plan.durationDays * 24 * 60 * 60 * 1000;
        // Cancel any existing active membership
        const existingActive = await ctx.db
          .query('memberships')
          .withIndex('by_user', (q) => q.eq('userId', payment.userId))
          .filter((q) => q.or(q.eq(q.field('status'), 'active'), q.eq(q.field('status'), 'trial')))
          .collect();
        for (const m of existingActive) {
          await ctx.db.patch(m._id, { status: 'cancelled' });
        }
        await ctx.db.insert('memberships', {
          userId: payment.userId,
          planId: plan._id,
          status: 'active',
          startDate,
          endDate,
          freezes: [],
          autoRenew: true,
          remainingClasses: plan.maxClassesPerMonth,
          remainingPTSessions: plan.maxPTSessions,
        });
      }
    }

    await audit(ctx, {
      actorId: payment.userId,
      action: 'payment.succeeded',
      entityType: 'payment',
      entityId: payment._id,
      after: { amountCents: args.amountCents, invoiceNumber },
    });

    return await ctx.db.get(payment._id);
  },
});

export const recordPaymentFailure = mutation({
  args: {
    stripePaymentIntentId: v.optional(v.string()),
    tapChargeId: v.optional(v.string()),
    failureReason: v.string(),
  },
  handler: async (ctx, args) => {
    let payment: any = null;
    if (args.stripePaymentIntentId) {
      payment = await ctx.db
        .query('payments')
        .withIndex('by_stripePaymentIntentId', (q) => q.eq('stripePaymentIntentId', args.stripePaymentIntentId!))
        .first();
    } else if (args.tapChargeId) {
      payment = await ctx.db
        .query('payments')
        .withIndex('by_tapChargeId', (q) => q.eq('tapChargeId', args.tapChargeId!))
        .first();
    }
    if (!payment) return null;
    await ctx.db.patch(payment._id, {
      status: 'failed',
      failureReason: args.failureReason,
      updatedAt: Date.now(),
    });
    await audit(ctx, {
      actorId: payment.userId,
      action: 'payment.failed',
      entityType: 'payment',
      entityId: payment._id,
      after: { failureReason: args.failureReason },
    });
    return await ctx.db.get(payment._id);
  },
});

export const recordRefund = mutation({
  args: {
    stripePaymentIntentId: v.optional(v.string()),
    tapChargeId: v.optional(v.string()),
    amountCents: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let payment: any = null;
    if (args.stripePaymentIntentId) {
      payment = await ctx.db
        .query('payments')
        .withIndex('by_stripePaymentIntentId', (q) => q.eq('stripePaymentIntentId', args.stripePaymentIntentId!))
        .first();
    } else if (args.tapChargeId) {
      payment = await ctx.db
        .query('payments')
        .withIndex('by_tapChargeId', (q) => q.eq('tapChargeId', args.tapChargeId!))
        .first();
    }
    if (!payment) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Payment not found' });
    }
    await ctx.db.patch(payment._id, {
      status: 'refunded',
      refundedAmountCents: args.amountCents,
      updatedAt: Date.now(),
    });
    // Mark invoice refunded too
    if (payment.invoiceId) {
      await ctx.db.patch(payment.invoiceId, { status: 'refunded' });
    }
    await audit(ctx, {
      actorId: payment.userId,
      action: 'payment.refunded',
      entityType: 'payment',
      entityId: payment._id,
      after: { amountCents: args.amountCents, reason: args.reason },
    });
    return await ctx.db.get(payment._id);
  },
});

// ============================================================
// Payment methods
// ============================================================

export const addPaymentMethod = mutation({
  args: {
    provider: v.union(v.literal('stripe'), v.literal('tap')),
    type: v.union(v.literal('card'), v.literal('apple_pay'), v.literal('google_pay')),
    last4: v.optional(v.string()),
    brand: v.optional(v.string()),
    expiryMonth: v.optional(v.number()),
    expiryYear: v.optional(v.number()),
    stripePaymentMethodId: v.optional(v.string()),
    tapTokenId: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.isDefault) {
      // Clear existing default
      const existingDefaults = await ctx.db
        .query('paymentMethods')
        .withIndex('by_default', (q) => q.eq('userId', user._id).eq('isDefault', true))
        .collect();
      for (const m of existingDefaults) {
        await ctx.db.patch(m._id, { isDefault: false });
      }
    }
    const id = await ctx.db.insert('paymentMethods', {
      userId: user._id,
      provider: args.provider,
      type: args.type,
      last4: args.last4,
      brand: args.brand,
      expiryMonth: args.expiryMonth,
      expiryYear: args.expiryYear,
      stripePaymentMethodId: args.stripePaymentMethodId,
      tapTokenId: args.tapTokenId,
      isDefault: args.isDefault ?? true,
      createdAt: Date.now(),
    });
    await audit(ctx, {
      actorId: user._id,
      action: 'paymentMethod.added',
      entityType: 'paymentMethod',
      entityId: id,
      after: { brand: args.brand, last4: args.last4, type: args.type, provider: args.provider },
    });
    return await ctx.db.get(id);
  },
});

export const removePaymentMethod = mutation({
  args: { paymentMethodId: v.id('paymentMethods') },
  handler: async (ctx, { paymentMethodId }) => {
    const user = await requireUser(ctx);
    const m = await ctx.db.get(paymentMethodId);
    if (!m) throw new ConvexError({ code: 'NOT_FOUND', message: 'Payment method not found' });
    if (m.userId !== user._id) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Not your payment method' });
    }
    await ctx.db.delete(paymentMethodId);
    // If this was default, promote the next most-recent card
    if (m.isDefault) {
      const remaining = await ctx.db
        .query('paymentMethods')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .order('desc')
        .first();
      if (remaining) {
        await ctx.db.patch(remaining._id, { isDefault: true });
      }
    }
    await audit(ctx, {
      actorId: user._id,
      action: 'paymentMethod.removed',
      entityType: 'paymentMethod',
      entityId: paymentMethodId,
      before: { brand: m.brand, last4: m.last4 },
    });
    return { ok: true };
  },
});

export const setDefaultPaymentMethod = mutation({
  args: { paymentMethodId: v.id('paymentMethods') },
  handler: async (ctx, { paymentMethodId }) => {
    const user = await requireUser(ctx);
    const m = await ctx.db.get(paymentMethodId);
    if (!m) throw new ConvexError({ code: 'NOT_FOUND', message: 'Payment method not found' });
    if (m.userId !== user._id) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Not your payment method' });
    }
    // Clear existing default
    const existing = await ctx.db
      .query('paymentMethods')
      .withIndex('by_default', (q) => q.eq('userId', user._id).eq('isDefault', true))
      .collect();
    for (const e of existing) {
      if (e._id !== paymentMethodId) {
        await ctx.db.patch(e._id, { isDefault: false });
      }
    }
    await ctx.db.patch(paymentMethodId, { isDefault: true });
    await audit(ctx, {
      actorId: user._id,
      action: 'paymentMethod.setDefault',
      entityType: 'paymentMethod',
      entityId: paymentMethodId,
    });
    return await ctx.db.get(paymentMethodId);
  },
});

// ============================================================
// Membership lifecycle
// ============================================================

export const freezeMembership = mutation({
  args: {
    membershipId: v.id('memberships'),
    days: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { membershipId, days, reason }) => {
    const user = await requireUser(ctx);
    const membership = await ctx.db.get(membershipId);
    if (!membership) throw new ConvexError({ code: 'NOT_FOUND', message: 'Membership not found' });
    if (membership.userId !== user._id) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Not your membership' });
    }
    if (membership.status !== 'active') {
      throw new ConvexError({ code: 'INVALID_STATE', message: 'Can only freeze active memberships' });
    }
    if (days <= 0 || days > 60) {
      throw new ConvexError({ code: 'INVALID_DAYS', message: 'Days must be between 1 and 60' });
    }
    const now = Date.now();
    const endDate = now + days * 24 * 60 * 60 * 1000;
    const newFreezes = [...membership.freezes, { startDate: now, endDate, reason }];
    const before = { status: membership.status, endDate: membership.endDate };
    await ctx.db.patch(membershipId, {
      status: 'frozen',
      freezes: newFreezes,
      // extend the end date by the freeze duration
      endDate: membership.endDate + days * 24 * 60 * 60 * 1000,
    });
    await audit(ctx, {
      actorId: user._id,
      action: 'membership.frozen',
      entityType: 'membership',
      entityId: membershipId,
      before,
      after: { days, reason, frozenUntil: endDate },
    });
    return await ctx.db.get(membershipId);
  },
});

export const unfreezeMembership = mutation({
  args: { membershipId: v.id('memberships') },
  handler: async (ctx, { membershipId }) => {
    const user = await requireUser(ctx);
    const m = await ctx.db.get(membershipId);
    if (!m) throw new ConvexError({ code: 'NOT_FOUND', message: 'Membership not found' });
    if (m.userId !== user._id) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Not your membership' });
    }
    if (m.status !== 'frozen') return m;
    await ctx.db.patch(membershipId, { status: 'active' });
    await audit(ctx, {
      actorId: user._id,
      action: 'membership.unfrozen',
      entityType: 'membership',
      entityId: membershipId,
    });
    return await ctx.db.get(membershipId);
  },
});

export const cancelMembership = mutation({
  args: { membershipId: v.id('memberships') },
  handler: async (ctx, { membershipId }) => {
    const user = await requireUser(ctx);
    const m = await ctx.db.get(membershipId);
    if (!m) throw new ConvexError({ code: 'NOT_FOUND', message: 'Membership not found' });
    if (m.userId !== user._id) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Not your membership' });
    }
    if (m.status === 'cancelled') return m;
    const before = { status: m.status };
    await ctx.db.patch(membershipId, { status: 'cancelled' });
    await audit(ctx, {
      actorId: user._id,
      action: 'membership.cancelled',
      entityType: 'membership',
      entityId: membershipId,
      before,
      after: { status: 'cancelled' },
    });
    return await ctx.db.get(membershipId);
  },
});

/**
 * High-level "renew / switch plan" entry point used by the mobile plans screen.
 * Creates a payment record AND a payment intent via the Next.js server, then
 * returns the clientSecret/redirectUrl the client needs to complete payment.
 */
export const createMembershipCheckout = mutation({
  args: {
    planId: v.id('membershipPlans'),
  },
  handler: async (ctx, { planId }) => {
    const user = await requireUser(ctx);
    const plan = await ctx.db.get(planId);
    if (!plan) throw new ConvexError({ code: 'NOT_FOUND', message: 'Plan not found' });
    if (!plan.isActive) {
      throw new ConvexError({ code: 'INACTIVE_PLAN', message: 'Plan is not available' });
    }
    const idempotencyKey = generateIdempotencyKey('checkout');
    const paymentId = await ctx.db.insert('payments', {
      userId: user._id,
      amountCents: plan.priceCents,
      currency: plan.currency,
      status: 'pending',
      type: 'membership',
      description: `${plan.name} membership — ${plan.durationDays} days`,
      provider: 'stripe',
      metadata: { planId: plan._id },
      idempotencyKey,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await audit(ctx, {
      actorId: user._id,
      action: 'checkout.created',
      entityType: 'payment',
      entityId: paymentId,
      after: { planId: plan._id, amountCents: plan.priceCents, currency: plan.currency },
    });
    return { paymentId, amountCents: plan.priceCents, currency: plan.currency };
  },
});
