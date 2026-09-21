/**
 * Queenix Gym — commerce ops reads (coffee + salon sales / revenue / inflow).
 *
 * Aggregates the EXISTING `coffeeOrders`, `salonBookings`, `coffeeItems`,
 * and `salonServices` tables. Cancelled rows are excluded from revenue.
 * Cash / test-mode only — totals are in cents, matching the commerce schema.
 *
 * Role contract: 'superadmin' | 'admin' | 'owner' | 'operations'
 *   | 'salon' | 'coffee'.
 */

import { v } from 'convex/values';

import { query } from '../_generated/server';
import { requireRole } from '../_helpers';

const STAFF_COFFEE = ['superadmin', 'admin', 'owner', 'operations', 'coffee'] as any;
const STAFF_SALON = ['superadmin', 'admin', 'owner', 'operations', 'salon'] as any;
const STAFF_ALL = [
  'superadmin',
  'admin',
  'owner',
  'operations',
  'salon',
  'coffee',
] as any;

function inRange(ts: number, from?: number, to?: number) {
  if (from !== undefined && ts < from) return false;
  if (to !== undefined && ts > to) return false;
  return true;
}

/**
 * Coffee sales + revenue. Excludes `cancelled` orders from gross.
 * Optional `from`/`to` (epoch ms) bound `createdAt`.
 */
export const getCoffeeRevenue = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { from, to, limit = 500 }) => {
    await requireRole(ctx as any, STAFF_COFFEE);
    const rows = await ctx.db
      .query('coffeeOrders')
      .order('desc')
      .take(Math.min(limit, 1000));
    const scoped = rows.filter((o: any) => inRange(o.createdAt, from, to));
    const billable = scoped.filter((o: any) => o.status !== 'cancelled');
    const grossCents = billable.reduce((s: number, o: any) => s + o.totalCents, 0);
    const byStatus: Record<string, number> = {};
    const byPaymentMode: Record<string, number> = {};
    for (const o of scoped as any[]) {
      byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
      byPaymentMode[o.paymentMode] = (byPaymentMode[o.paymentMode] ?? 0) + 1;
    }
    return {
      grossCents,
      orderCount: billable.length,
      totalOrders: scoped.length,
      byStatus,
      byPaymentMode,
      recent: scoped.slice(0, 50),
    };
  },
});

/**
 * Salon sales + revenue. Revenue is priced from the linked `salonServices`
 * row at read time; bookings whose service was deleted price at 0 and are
 * flagged via `unpricedCount`. Excludes `cancelled` bookings from gross.
 */
export const getSalonRevenue = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { from, to, limit = 500 }) => {
    await requireRole(ctx as any, STAFF_SALON);
    const rows = await ctx.db
      .query('salonBookings')
      .order('desc')
      .take(Math.min(limit, 1000));
    const scoped = rows.filter((b: any) => inRange(b.createdAt, from, to));
    const priceOf = async (serviceId: any): Promise<number> => {
      const svc = (await ctx.db.get(serviceId)) as any;
      return svc ? (svc.priceCents as number) : 0;
    };
    let grossCents = 0;
    let unpricedCount = 0;
    const byStatus: Record<string, number> = {};
    const priced: { booking: any; priceCents: number }[] = [];
    for (const b of scoped as any[]) {
      byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
      if (b.status === 'cancelled') continue;
      const price = await priceOf(b.serviceId);
      if (price === 0) unpricedCount += 1;
      grossCents += price;
      priced.push({ booking: b, priceCents: price });
    }
    return {
      grossCents,
      bookingCount: priced.length,
      totalBookings: scoped.length,
      unpricedCount,
      byStatus,
      recent: scoped.slice(0, 50),
    };
  },
});

/**
 * Combined commerce summary (coffee + salon) for the ops dashboard.
 * Same range semantics as the per-vertical queries above.
 */
export const getCommerceSummary = query({
  args: {
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, { from, to }) => {
    await requireRole(ctx as any, STAFF_ALL);
    const [coffee, salon] = await Promise.all([
      ctx.db.query('coffeeOrders').order('desc').take(1000),
      ctx.db.query('salonBookings').order('desc').take(1000),
    ]);
    const coffeeScoped = (coffee as any[]).filter((o) => inRange(o.createdAt, from, to));
    const salonScoped = (salon as any[]).filter((b) => inRange(b.createdAt, from, to));
    const coffeeBillable = coffeeScoped.filter((o) => o.status !== 'cancelled');
    const coffeeGross = coffeeBillable.reduce((s, o) => s + o.totalCents, 0);

    let salonGross = 0;
    let salonBillable = 0;
    for (const b of salonScoped) {
      if (b.status === 'cancelled') continue;
      const svc = (await ctx.db.get(b.serviceId)) as any;
      salonGross += svc ? (svc.priceCents as number) : 0;
      salonBillable += 1;
    }
    return {
      coffee: { grossCents: coffeeGross, orderCount: coffeeBillable.length },
      salon: { grossCents: salonGross, bookingCount: salonBillable },
      totalGrossCents: coffeeGross + salonGross,
    };
  },
});
