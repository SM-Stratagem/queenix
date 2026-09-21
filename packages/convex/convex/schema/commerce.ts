/**
 * Queenix Gym — commerce domain schema (salon + coffee).
 *
 * Maintainer: this file is NEW. Register it in `convex/schema.ts`
 * (see SCHEMA ADDS in the delivery note). Payments are cash/test-mode
 * only — no processor fields live here on purpose.
 */

import { defineTable } from 'convex/server';
import { v } from 'convex/values';

const bookingStatus = v.union(
  v.literal('pending'),
  v.literal('confirmed'),
  v.literal('cancelled'),
  v.literal('completed'),
);

const orderStatus = v.union(
  v.literal('queued'),
  v.literal('preparing'),
  v.literal('ready'),
  v.literal('served'),
  v.literal('cancelled'),
);

/**
 * How an order/booking is paid. `cash` is counter-only: it can only be
 * set by venue staff (counter sale or cash received), never by members.
 * Members order with `counter` (pay at pickup) or `test`.
 */
const paymentMode = v.union(v.literal('cash'), v.literal('test'), v.literal('counter'));

export const salonServices = defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  priceCents: v.number(),
  durationMin: v.number(),
  isActive: v.boolean(),
  createdAt: v.number(),
}).index('by_active', ['isActive']);

export const salonBookings = defineTable({
  serviceId: v.id('salonServices'),
  userId: v.id('users'),
  startAt: v.number(),
  status: bookingStatus,
  paymentMode,
  note: v.optional(v.string()),
  createdAt: v.number(),
  // Online payment state (payment links). Secrets stay in env vars;
  // only the provider choice + resulting link live here.
  paymentProvider: v.optional(v.union(v.literal('cash'), v.literal('tap'), v.literal('stripe'))),
  paymentLink: v.optional(v.string()),
  paidAt: v.optional(v.number()),
})
  .index('by_user', ['userId'])
  .index('by_service_start', ['serviceId', 'startAt'])
  .index('by_status', ['status']);

/**
 * Per-venue payment gateway settings (coffee shop, salon).
 * The provider choice + currency live here; API secrets stay in env vars
 * (STRIPE_SECRET_KEY / TAP_SECRET_KEY) and are never stored in the DB.
 */
export const venuePaymentSettings = defineTable({
  venue: v.union(v.literal('coffee'), v.literal('salon')),
  provider: v.union(v.literal('cash'), v.literal('tap'), v.literal('stripe')),
  currency: v.string(),
  enabled: v.boolean(),
  updatedAt: v.number(),
}).index('by_venue', ['venue']);

export const coffeeItems = defineTable({
  name: v.string(),
  description: v.optional(v.string()),
  priceCents: v.number(),
  isActive: v.boolean(),
  createdAt: v.number(),
}).index('by_active', ['isActive']);

export const coffeeOrders = defineTable({
  userId: v.id('users'),
  items: v.array(
    v.object({
      itemId: v.id('coffeeItems'),
      qty: v.number(),
      unitPriceCents: v.number(),
    }),
  ),
  totalCents: v.number(),
  status: orderStatus,
  paymentMode,
  createdAt: v.number(),
  // Online payment state (payment links). Secrets stay in env vars;
  // only the provider choice + resulting link live here.
  paymentProvider: v.optional(v.union(v.literal('cash'), v.literal('tap'), v.literal('stripe'))),
  paymentLink: v.optional(v.string()),
  paidAt: v.optional(v.number()),
})
  .index('by_user', ['userId'])
  .index('by_status', ['status']);
