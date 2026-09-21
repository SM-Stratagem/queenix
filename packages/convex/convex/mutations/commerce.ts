/**
 * Queenix Gym — commerce writes (salon + coffee).
 * Cash / test-mode only. No Stripe/Tap SDK calls here.
 * Role contract: 'superadmin' | 'admin' | 'owner' | 'operations'
 *   | 'salon' | 'coffee' | 'trainer' | 'member'
 */

import { ConvexError, v } from 'convex/values';

import { mutation, internalMutation } from '../_generated/server';
import { requireRole, requireUser } from '../_helpers';

type CommerceRole =
  | 'superadmin'
  | 'admin'
  | 'owner'
  | 'operations'
  | 'salon'
  | 'coffee'
  | 'trainer'
  | 'member';

const STAFF_SALON: CommerceRole[] = ['superadmin', 'admin', 'owner', 'operations', 'salon'];
const STAFF_COFFEE: CommerceRole[] = ['superadmin', 'admin', 'owner', 'operations', 'coffee'];
const MANAGE: CommerceRole[] = ['superadmin', 'admin', 'owner', 'operations'];

const staff = (ctx: any, roles: CommerceRole[]) =>
  requireRole(ctx as any, roles as any);

/* ---------------- salon catalogue (manage) ---------------- */

export const createSalonService = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    priceCents: v.number(),
    durationMin: v.number(),
  },
  handler: async (ctx, args) => {
    await staff(ctx, MANAGE);
    if (args.priceCents < 0) throw new ConvexError('priceCents must be >= 0');
    if (args.durationMin <= 0) throw new ConvexError('durationMin must be > 0');
    return ctx.db.insert('salonServices', {
      name: args.name,
      description: args.description,
      priceCents: args.priceCents,
      durationMin: args.durationMin,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const setSalonServiceActive = mutation({
  args: { serviceId: v.id('salonServices'), isActive: v.boolean() },
  handler: async (ctx, args) => {
    await staff(ctx, MANAGE);
    const svc = await ctx.db.get(args.serviceId);
    if (!svc) throw new ConvexError('Service not found');
    await ctx.db.patch(args.serviceId, { isActive: args.isActive });
    return args.serviceId;
  },
});

/**
 * Permanently remove a service. Blocked while non-cancelled bookings
 * reference it (they price live off the service) — deactivate instead.
 */
export const deleteSalonService = mutation({
  args: { serviceId: v.id('salonServices') },
  handler: async (ctx, args) => {
    await staff(ctx, MANAGE);
    const svc = await ctx.db.get(args.serviceId);
    if (!svc) throw new ConvexError('Service not found');
    const bookings = await ctx.db.query('salonBookings').collect();
    const blocking = bookings.filter(
      (b: any) => b.status !== 'cancelled' && String(b.serviceId) === String(args.serviceId)
    );
    if (blocking.length > 0) {
      throw new ConvexError(
        `Cannot remove: ${blocking.length} open booking(s) use this service. Deactivate it instead.`
      );
    }
    await ctx.db.delete(args.serviceId);
    return args.serviceId;
  },
});

/* ---------------- salon booking ---------------- */

export const bookSalon = mutation({
  args: {
    serviceId: v.id('salonServices'),
    startAt: v.number(),
    paymentMode: v.union(v.literal('cash'), v.literal('test'), v.literal('counter')),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx as any);
    if (args.paymentMode === 'cash') {
      await staff(ctx, STAFF_SALON);
    }
    const svc = (await ctx.db.get(args.serviceId)) as any;
    if (!svc || !svc.isActive) throw new ConvexError('Service is not available');
    if (args.startAt <= Date.now()) throw new ConvexError('startAt must be in the future');
    const clash = await ctx.db
      .query('salonBookings')
      .withIndex('by_service_start', (q: any) => q.eq('serviceId', args.serviceId))
      .collect();
    if (clash.some((b: any) => b.startAt === args.startAt && b.status !== 'cancelled')) {
      throw new ConvexError('Slot already booked');
    }
    return ctx.db.insert('salonBookings', {
      serviceId: args.serviceId,
      userId: user._id,
      startAt: args.startAt,
      status: 'pending',
      paymentMode: args.paymentMode,
      note: args.note,
      createdAt: Date.now(),
    });
  },
});

export const updateSalonBookingStatus = mutation({
  args: {
    bookingId: v.id('salonBookings'),
    status: v.union(
      v.literal('confirmed'),
      v.literal('cancelled'),
      v.literal('completed'),
    ),
  },
  handler: async (ctx, args) => {
    const booking = (await ctx.db.get(args.bookingId)) as any;
    if (!booking) throw new ConvexError('Booking not found');
    if (args.status === 'cancelled') {
      // Staff, or the member cancelling their own pending booking.
      try {
        await staff(ctx, STAFF_SALON);
      } catch {
        const user = await requireUser(ctx as any);
        if (String(booking.userId) !== String(user._id) || booking.status !== 'pending') {
          throw new ConvexError('FORBIDDEN');
        }
      }
    } else {
      await staff(ctx, STAFF_SALON);
    }
    await ctx.db.patch(args.bookingId, { status: args.status });
    return args.bookingId;
  },
});

/* ---------------- coffee menu (manage) ---------------- */

export const createCoffeeItem = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    priceCents: v.number(),
  },
  handler: async (ctx, args) => {
    await staff(ctx, MANAGE);
    if (args.priceCents < 0) throw new ConvexError('priceCents must be >= 0');
    return ctx.db.insert('coffeeItems', {
      name: args.name,
      description: args.description,
      priceCents: args.priceCents,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const setCoffeeItemActive = mutation({
  args: { itemId: v.id('coffeeItems'), isActive: v.boolean() },
  handler: async (ctx, args) => {
    await staff(ctx, MANAGE);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new ConvexError('Item not found');
    await ctx.db.patch(args.itemId, { isActive: args.isActive });
    return args.itemId;
  },
});

/**
 * Permanently remove a menu item. Blocked while non-cancelled orders
 * reference it (history keeps its price snapshot) — deactivate instead.
 */
export const deleteCoffeeItem = mutation({
  args: { itemId: v.id('coffeeItems') },
  handler: async (ctx, args) => {
    await staff(ctx, MANAGE);
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new ConvexError('Item not found');
    const orders = await ctx.db.query('coffeeOrders').collect();
    const blocking = orders.filter(
      (o: any) => o.status !== 'cancelled' && o.items.some((l: any) => String(l.itemId) === String(args.itemId))
    );
    if (blocking.length > 0) {
      throw new ConvexError(
        `Cannot remove: ${blocking.length} open order(s) use this item. Deactivate it instead.`
      );
    }
    await ctx.db.delete(args.itemId);
    return args.itemId;
  },
});

/* ---------------- coffee order ---------------- */

export const orderCoffee = mutation({
  args: {
    items: v.array(v.object({ itemId: v.id('coffeeItems'), qty: v.number() })),
    paymentMode: v.union(v.literal('cash'), v.literal('test'), v.literal('counter')),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx as any);
    if (args.paymentMode === 'cash') {
      await staff(ctx, STAFF_COFFEE);
    }
    if (args.items.length === 0) throw new ConvexError('Order is empty');
    const priced: { itemId: any; qty: number; unitPriceCents: number }[] = [];
    for (const line of args.items) {
      if (line.qty <= 0) throw new ConvexError('qty must be > 0');
      const item = (await ctx.db.get(line.itemId)) as any;
      if (!item || !item.isActive) throw new ConvexError('Menu item is not available');
      priced.push({ itemId: line.itemId, qty: line.qty, unitPriceCents: item.priceCents });
    }
    const totalCents = priced.reduce((s, l) => s + l.qty * l.unitPriceCents, 0);
    return ctx.db.insert('coffeeOrders', {
      userId: user._id,
      items: priced,
      totalCents,
      status: 'queued',
      paymentMode: args.paymentMode,
      createdAt: Date.now(),
    });
  },
});

export const updateCoffeeOrderStatus = mutation({
  args: {
    orderId: v.id('coffeeOrders'),
    status: v.union(
      v.literal('preparing'),
      v.literal('ready'),
      v.literal('served'),
      v.literal('cancelled'),
    ),
  },
  handler: async (ctx, args) => {
    await staff(ctx, STAFF_COFFEE);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError('Order not found');
    await ctx.db.patch(args.orderId, { status: args.status });
    return args.orderId;
  },
});

/* ---------------- venue payment settings + order payments ---------------- */

const venueProvider = v.union(v.literal('cash'), v.literal('tap'), v.literal('stripe'));

/**
 * Save a venue's payment gateway choice (owner/ops manage).
 * Secrets stay in env vars — only provider + currency live here.
 */
export const saveVenuePaymentSettings = mutation({
  args: {
    venue: v.union(v.literal('coffee'), v.literal('salon')),
    provider: venueProvider,
    currency: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await staff(ctx, MANAGE);
    const currency = args.currency.trim().toUpperCase() || 'AED';
    const existing = await ctx.db
      .query('venuePaymentSettings')
      .withIndex('by_venue', (q) => q.eq('venue', args.venue))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        provider: args.provider,
        currency,
        enabled: args.enabled,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    return ctx.db.insert('venuePaymentSettings', {
      venue: args.venue,
      provider: args.provider,
      currency,
      enabled: args.enabled,
      updatedAt: Date.now(),
    });
  },
});

async function markCashPaid(ctx: any, id: any, roles: CommerceRole[]) {
  await staff(ctx, roles);
  const row = await ctx.db.get(id);
  if (!row) throw new ConvexError('Order not found');
  if ((row as any).paidAt) throw new ConvexError('Already paid');
  await ctx.db.patch(id, { paidAt: Date.now(), paymentProvider: 'cash' as const });
  return id;
}

/** Confirm cash received for a coffee order (front desk). */
export const markCoffeeOrderCashPaid = mutation({
  args: { orderId: v.id('coffeeOrders') },
  handler: async (ctx, args) => markCashPaid(ctx, args.orderId, STAFF_COFFEE),
});

/** Confirm cash received for a salon booking (front desk). */
export const markSalonBookingCashPaid = mutation({
  args: { bookingId: v.id('salonBookings') },
  handler: async (ctx, args) => markCashPaid(ctx, args.bookingId, STAFF_SALON),
});

/* ---------------- counter sales (walk-up customers, staff only) ---------------- */

/**
 * Counter coffee sale: staff picks items for a walk-up customer.
 * Always cash. Linked to the member when identified at the till,
 * otherwise recorded as a counter sale under the staff account.
 */
export const createCounterCoffeeOrder = mutation({
  args: {
    items: v.array(v.object({ itemId: v.id('coffeeItems'), qty: v.number() })),
    memberId: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const staffUser = await staff(ctx, STAFF_COFFEE);
    if (args.items.length === 0) throw new ConvexError('Order is empty');
    const priced: { itemId: any; qty: number; unitPriceCents: number }[] = [];
    for (const line of args.items) {
      if (line.qty <= 0) throw new ConvexError('qty must be > 0');
      const item = (await ctx.db.get(line.itemId)) as any;
      if (!item || !item.isActive) throw new ConvexError('Menu item is not available');
      priced.push({ itemId: line.itemId, qty: line.qty, unitPriceCents: item.priceCents });
    }
    const totalCents = priced.reduce((s, l) => s + l.qty * l.unitPriceCents, 0);
    const userId = args.memberId ?? (staffUser as any)._id;
    return ctx.db.insert('coffeeOrders', {
      userId,
      items: priced,
      totalCents,
      status: 'queued',
      paymentMode: 'cash',
      paidAt: Date.now(),
      paymentProvider: 'cash' as const,
      createdAt: Date.now(),
    });
  },
});

/**
 * Counter salon booking: staff books a walk-up customer in.
 * Always cash. Linked to the member when identified at the till,
 * otherwise recorded as a counter sale under the staff account.
 */
export const createCounterSalonBooking = mutation({
  args: {
    serviceId: v.id('salonServices'),
    startAt: v.number(),
    memberId: v.optional(v.id('users')),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const staffUser = await staff(ctx, STAFF_SALON);
    const svc = (await ctx.db.get(args.serviceId)) as any;
    if (!svc || !svc.isActive) throw new ConvexError('Service is not available');
    if (args.startAt <= Date.now()) throw new ConvexError('startAt must be in the future');
    const clash = await ctx.db
      .query('salonBookings')
      .withIndex('by_service_start', (q: any) => q.eq('serviceId', args.serviceId))
      .collect();
    if (clash.some((b: any) => b.startAt === args.startAt && b.status !== 'cancelled')) {
      throw new ConvexError('Slot already booked');
    }
    const userId = args.memberId ?? (staffUser as any)._id;
    return ctx.db.insert('salonBookings', {
      serviceId: args.serviceId,
      userId,
      startAt: args.startAt,
      status: 'pending',
      paymentMode: 'cash',
      paidAt: Date.now(),
      paymentProvider: 'cash' as const,
      note: args.note,
      createdAt: Date.now(),
    });
  },
});

/**
 * Attach a provider payment link to an order/booking.
 * Internal (deploy key): the API route created the charge server-side
 * after the staff user asked for a link.
 */
export const setOrderPaymentLink = internalMutation({
  args: {
    venue: v.union(v.literal('coffee'), v.literal('salon')),
    orderId: v.string(),
    provider: v.union(v.literal('tap'), v.literal('stripe')),
    paymentLink: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.orderId as any);
    if (!row) throw new ConvexError('Order not found');
    if ((row as any).paidAt) throw new ConvexError('Already paid');
    await ctx.db.patch(args.orderId as any, {
      paymentProvider: args.provider,
      paymentLink: args.paymentLink,
    });
    return args.orderId;
  },
});
