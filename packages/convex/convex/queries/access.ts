/**
 * Queenix Gym — Access & QR queries
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireUser } from '../_helpers';

export const getMyAccessCredential = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query('accessCredentials')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .first();
  },
});

export const getCurrentOccupancy = query({
  args: { accessPointId: v.optional(v.string()) },
  handler: async (ctx, { accessPointId }) => {
    // Get most recent snapshot
    if (accessPointId) {
      return await ctx.db
        .query('occupancySnapshots')
        .withIndex('by_accessPoint_timestamp', (q) => q.eq('accessPointId', accessPointId))
        .order('desc')
        .first();
    }
    return await ctx.db.query('occupancySnapshots').order('desc').first();
  },
});

export const getRecentAccessEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 20 }) => {
    const events = await ctx.db
      .query('accessEvents')
      .withIndex('by_timestamp', (q) => q.gt('timestamp', Date.now() - 24 * 60 * 60 * 1000))
      .order('desc')
      .take(limit);
    const enriched = await Promise.all(
      events.map(async (e) => {
        const user = await ctx.db.get(e.userId);
        return {
          ...e,
          user: user
            ? {
                _id: user._id,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
              }
            : null,
        };
      })
    );
    return enriched;
  },
});

/**
 * Health check for the physical scanner bridge.
 * Returns "online" if any registered device has heartbeat within last 2 min.
 */
export const getScannerHealth = query({
  args: {},
  handler: async (ctx) => {
    const devices = await ctx.db.query('scannerDevices').withIndex('by_active', (q) => q.eq('isActive', true)).collect();
    const now = Date.now();
    const twoMin = 2 * 60 * 1000;
    const online = devices.filter((d) => d.lastSeenAt && now - d.lastSeenAt < twoMin);
    return {
      online: devices.length > 0 ? online.length > 0 : false,
      deviceCount: devices.length,
      onlineCount: online.length,
      lastSeenAt: devices
        .map((d) => d.lastSeenAt)
        .filter((t): t is number => typeof t === 'number')
        .reduce((acc, t) => Math.max(acc, t), 0) || null,
      devices: devices.map((d) => ({
        _id: d._id,
        deviceId: d.deviceId,
        name: d.name,
        location: d.location,
        lastSeenAt: d.lastSeenAt ?? null,
        lastScanAt: d.lastScanAt ?? null,
        totalScans: d.totalScans ?? 0,
        online: d.lastSeenAt ? now - d.lastSeenAt < twoMin : false,
      })),
    };
  },
});

// ============================================================
// Owner operations live status
// ============================================================

/**
 * Aggregated live status for the owner operations view: current
 * occupancy, today's class instances, active staff shifts, and open
 * incident count.
 */
export const getOperationsLiveStatus = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);

    // Current occupancy
    const latestSnapshot = await ctx.db
      .query('occupancySnapshots')
      .order('desc')
      .first();

    // Today window
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    // Today's class instances
    const todaysClasses = await ctx.db
      .query('classInstances')
      .withIndex('by_startsAt', (q) => q.gte('startsAt', startOfDay))
      .filter((q) => q.lt(q.field('startsAt'), endOfDay))
      .collect();

    const classesWithType = await Promise.all(
      todaysClasses.map(async (c) => {
        const classType = await ctx.db.get(c.classTypeId);
        return { ...c, classType };
      })
    );
    classesWithType.sort((a, b) => a.startsAt - b.startsAt);

    // Active staff shifts (now within shift window)
    const activeShifts = await ctx.db
      .query('shifts')
      .withIndex('by_startsAt', (q) => q.lte('startsAt', now.getTime()))
      .collect();
    const currentlyOnShift = activeShifts.filter(
      (s) => s.startsAt <= now.getTime() && s.endsAt >= now.getTime() && s.status !== 'missed'
    );

    const shiftsWithUser = await Promise.all(
      currentlyOnShift.map(async (s) => {
        const user = await ctx.db.get(s.userId);
        return { ...s, user };
      })
    );

    // Open incidents
    const openIncidents = await ctx.db
      .query('incidents')
      .withIndex('by_resolved', (q) => q.eq('resolved', false))
      .collect();

    return {
      currentOccupancy: latestSnapshot?.count ?? 0,
      occupancyTimestamp: latestSnapshot?.timestamp ?? null,
      classes: classesWithType,
      activeShifts: shiftsWithUser,
      openIncidentsCount: openIncidents.length,
    };
  },
});
