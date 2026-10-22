/**
 * Queenix Gym — commerce reads (salon + coffee).
 * Role contract: 'superadmin' | 'admin' | 'owner' | 'operations'
 *   | 'salon' | 'coffee' | 'trainer' | 'member'
 */

import { v } from 'convex/values';

import { query, internalQuery } from '../_generated/server';
import { requireRole, requireUser } from '../_helpers';
import { safePaymentLink, scrubPaymentLink } from '../opsLogic';

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

const staff = (ctx: any, roles: CommerceRole[]) =>
  requireRole(ctx as any, roles as any);

/** ponytail: per-status cap on the open queues; page them if a venue ever has more open at once. */
const QUEUE_MAX = 200;

/** Active salon service catalogue (any signed-in user). */
export const listSalonServices = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx as any);
    return ctx.db
      .query('salonServices')
      .withIndex('by_active', (q: any) => q.eq('isActive', true))
      .collect();
  },
});

/**
 * Booked (non-cancelled) slots for one service inside [dayStart, dayEnd).
 * The client renders free slots from `durationMin` minus these holds.
 */
export const salonAvailability = query({
  args: {
    serviceId: v.id('salonServices'),
    dayStart: v.number(),
    dayEnd: v.number(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx as any);
    const service = await ctx.db.get(args.serviceId);
    if (!service) return { durationMin: 30, holds: [] as { startAt: number }[] };
    const holds = await ctx.db
      .query('salonBookings')
      .withIndex('by_service_start', (q: any) => q.eq('serviceId', args.serviceId))
      .collect();
    return {
      durationMin: (service as any).durationMin as number,
      holds: holds
        .filter(
          (b: any) =>
            b.status !== 'cancelled' && b.startAt >= args.dayStart && b.startAt < args.dayEnd,
        )
        .map((b: any) => ({ startAt: b.startAt as number })),
    };
  },
});

/** Current user's salon bookings, newest first. */
export const mySalonBookings = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx as any);
    const rows = await ctx.db
      .query('salonBookings')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id))
      .collect();
    return rows
      .filter((r: any) => !r.walkIn)
      .sort((a: any, b: any) => b.createdAt - a.createdAt)
      .map(scrubPaymentLink);
  },
});

/** Open salon queue for staff (pending + confirmed, soonest first). */
export const salonQueue = query({
  args: {},
  handler: async (ctx) => {
    await staff(ctx, STAFF_SALON);
    const open = await Promise.all(
      (['pending', 'confirmed'] as const).map((status) =>
        ctx.db
          .query('salonBookings')
          .withIndex('by_status', (q) => q.eq('status', status))
          .take(QUEUE_MAX),
      ),
    );
    const rows = open.flat().sort((a: any, b: any) => a.startAt - b.startAt);
    return Promise.all(
      rows.map(async (b: any) => {
        const [user, service] = await Promise.all([ctx.db.get(b.userId), ctx.db.get(b.serviceId)]);
        return {
          ...scrubPaymentLink(b),
          customerName: b.walkIn ? 'Walk-in' : ((user as any)?.fullName ?? 'Guest'),
          serviceName: (service as any)?.name ?? 'Service',
        };
      }),
    );
  },
});

/** Active coffee menu (any signed-in user). */
export const coffeeMenu = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx as any);
    return ctx.db
      .query('coffeeItems')
      .withIndex('by_active', (q: any) => q.eq('isActive', true))
      .collect();
  },
});

/** Current user's coffee orders, newest first. */
export const myCoffeeOrders = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx as any);
    const rows = await ctx.db
      .query('coffeeOrders')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id))
      .collect();
    return rows
      .filter((r: any) => !r.walkIn)
      .sort((a: any, b: any) => b.createdAt - a.createdAt)
      .map(scrubPaymentLink);
  },
});

/** Open coffee queue for staff (queued + preparing + ready, oldest first). */
export const coffeeQueue = query({
  args: {},
  handler: async (ctx) => {
    await staff(ctx, STAFF_COFFEE);
    // 'ready' stays in the queue until handed over (served) or cancelled.
    const open = await Promise.all(
      (['queued', 'preparing', 'ready'] as const).map((status) =>
        ctx.db
          .query('coffeeOrders')
          .withIndex('by_status', (q) => q.eq('status', status))
          .take(QUEUE_MAX),
      ),
    );
    const rows = open.flat().sort((a: any, b: any) => a.createdAt - b.createdAt);
    return Promise.all(
      rows.map(async (o: any) => {
        const user = await ctx.db.get(o.userId);
        const names = await Promise.all(
          o.items.map(async (l: any) => `${l.qty}× ${((await ctx.db.get(l.itemId)) as any)?.name ?? 'item'}`),
        );
        return { ...scrubPaymentLink(o), customerName: o.walkIn ? 'Walk-in' : ((user as any)?.fullName ?? 'Guest'), itemsLabel: names.join(', ') };
      }),
    );
  },
});

/**
 * A venue's payment gateway settings. Defaults to cash/AED when the
 * venue has never been configured.
 */
export const getVenuePaymentSettings = query({
  args: { venue: v.union(v.literal('coffee'), v.literal('salon')) },
  handler: async (ctx, args) => {
    await requireUser(ctx as any);
    const found = await ctx.db
      .query('venuePaymentSettings')
      .withIndex('by_venue', (q) => q.eq('venue', args.venue))
      .first();
    return (
      found ?? {
        venue: args.venue,
        provider: 'cash' as const,
        currency: 'AED',
        enabled: true,
      }
    );
  },
});

/**
 * Read one order/booking for payment-link creation.
 * Internal (deploy key): the API route already authorized the staff user.
 */
export const getOrderForPayment = internalQuery({
  args: {
    venue: v.union(v.literal('coffee'), v.literal('salon')),
    orderId: v.string(),
  },
  handler: async (ctx, args) => {
    const table = args.venue === 'coffee' ? 'coffeeOrders' : 'salonBookings';
    // normalizeId: the id must belong to this venue's table (the route gates staff by venue).
    const id = ctx.db.normalizeId(table, args.orderId);
    const row = id ? await ctx.db.get(id) : null;
    if (!row) return null;
    const amountCents =
      args.venue === 'coffee'
        ? (row as any).totalCents
        : await servicePrice(ctx, (row as any).serviceId);
    return {
      id: row._id,
      userId: (row as any).userId,
      amountCents,
      status: (row as any).status,
      paidAt: (row as any).paidAt ?? null,
      paymentLink: safePaymentLink((row as any).paymentLink) ?? null,
      paymentProvider: (row as any).paymentProvider ?? null,
      table,
    };
  },
});

async function servicePrice(ctx: any, serviceId: any): Promise<number> {
  const service = await ctx.db.get(serviceId);
  return (service as any)?.priceCents ?? 0;
}

/**
 * Venue settings for the payment-link API route.
 * Internal (deploy key): same defaults as the public query.
 */
export const getVenueSettingsInternal = internalQuery({
  args: { venue: v.union(v.literal('coffee'), v.literal('salon')) },
  handler: async (ctx, args) => {
    const found = await ctx.db
      .query('venuePaymentSettings')
      .withIndex('by_venue', (q) => q.eq('venue', args.venue))
      .first();
    return (
      found ?? {
        venue: args.venue,
        provider: 'cash' as const,
        currency: 'AED',
        enabled: true,
      }
    );
  },
});
