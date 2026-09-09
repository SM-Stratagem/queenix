/**
 * Queenix Gym — Payment & invoice queries
 * Read-side helpers for the mobile app and web admin.
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireUser } from '../_helpers';

export const getMyPaymentMethods = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query('paymentMethods')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .collect();
  },
});

export const getMyInvoices = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query('invoices')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(limit);
  },
});

export const getMyPayments = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query('payments')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .order('desc')
      .take(limit);
  },
});

export const getInvoiceById = query({
  args: { invoiceId: v.id('invoices') },
  handler: async (ctx, { invoiceId }) => {
    const user = await requireUser(ctx);
    const invoice = await ctx.db.get(invoiceId);
    if (!invoice) return null;
    if (invoice.userId !== user._id) return null;
    const payment = await ctx.db.get(invoice.paymentId);
    const member = await ctx.db.get(invoice.userId);
    return { ...invoice, payment, member };
  },
});

/**
 * Used by the web receipt route. Returns full receipt context for a payment
 * the caller is allowed to view (their own payments, or any payment for admins
 * — admin gating is the caller's responsibility; this is the read).
 */
export const getReceiptContext = query({
  args: { paymentId: v.id('payments') },
  handler: async (ctx, { paymentId }) => {
    const user = await requireUser(ctx);
    const payment = await ctx.db.get(paymentId);
    if (!payment) return null;
    if (payment.userId !== user._id && !user.roles.includes('owner') && !user.roles.includes('operations')) {
      return null;
    }
    const invoice = payment.invoiceId ? await ctx.db.get(payment.invoiceId) : null;
    const member = await ctx.db.get(payment.userId);
    const defaultPm = await ctx.db
      .query('paymentMethods')
      .withIndex('by_default', (q) => q.eq('userId', payment.userId).eq('isDefault', true))
      .first();
    return { payment, invoice, member, defaultPaymentMethod: defaultPm };
  },
});
