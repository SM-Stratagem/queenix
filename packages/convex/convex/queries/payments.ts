/**
 * Queenix Gym — Payment & invoice queries
 * Read-side helpers for the mobile app and web admin.
 */

import { v } from 'convex/values';
import { internalQuery, query } from '../_generated/server';
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
 * Internal (admin key): full receipt context for one payment. Used by the
 * web receipt + create-intent routes, which authenticate the BetterAuth
 * session and enforce owner/staff access themselves.
 */
export const getReceiptContext = internalQuery({
  args: { paymentId: v.string() },
  handler: async (ctx, args) => {
    const paymentId = ctx.db.normalizeId('payments', args.paymentId);
    const payment = paymentId ? await ctx.db.get(paymentId) : null;
    if (!payment) return null;
    const invoice = payment.invoiceId ? await ctx.db.get(payment.invoiceId) : null;
    const member = await ctx.db.get(payment.userId);
    const defaultPm = await ctx.db
      .query('paymentMethods')
      .withIndex('by_default', (q) => q.eq('userId', payment.userId).eq('isDefault', true))
      .first();
    return { payment, invoice, member, defaultPaymentMethod: defaultPm };
  },
});
