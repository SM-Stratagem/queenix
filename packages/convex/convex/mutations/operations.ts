/**
 * Queenix Gym — Operations mutations
 * Support tickets, incidents, and shift lifecycle.
 */

import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireRole, requireUser, audit } from '../_helpers';
import { ConvexError } from 'convex/values';

export const createSupportTicket = mutation({
  args: {
    memberId: v.optional(v.id('users')),
    memberName: v.optional(v.string()),
    subject: v.string(),
    description: v.string(),
    category: v.optional(
      v.union(
        v.literal('billing'),
        v.literal('access'),
        v.literal('class'),
        v.literal('general')
      )
    ),
    priority: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('critical')
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ['operations', 'owner', 'member']);
    const now = Date.now();
    const id = await ctx.db.insert('supportTickets', {
      memberId: args.memberId,
      memberName: args.memberName,
      subject: args.subject,
      description: args.description,
      category: args.category,
      priority: args.priority,
      status: 'open',
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
    await audit(ctx, {
      actorId: user._id,
      action: 'supportTicket.created',
      entityType: 'supportTicket',
      entityId: id,
      after: { subject: args.subject, priority: args.priority },
    });
    return await ctx.db.get(id);
  },
});

export const createIncident = mutation({
  args: {
    type: v.union(
      v.literal('access_denied'),
      v.literal('equipment'),
      v.literal('safety'),
      v.literal('complaint'),
      v.literal('other')
    ),
    severity: v.union(
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('critical')
    ),
    title: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ['operations', 'owner', 'trainer']);
    const now = Date.now();
    const id = await ctx.db.insert('incidents', {
      type: args.type,
      severity: args.severity,
      title: args.title,
      location: args.location,
      description: args.description,
      reportedBy: user._id,
      status: 'open',
      resolved: false,
      createdAt: now,
    });
    await audit(ctx, {
      actorId: user._id,
      action: 'incident.reported',
      entityType: 'incident',
      entityId: id,
      after: { type: args.type, severity: args.severity, title: args.title },
    });
    return await ctx.db.get(id);
  },
});

export const resolveIncident = mutation({
  args: { incidentId: v.id('incidents') },
  handler: async (ctx, { incidentId }) => {
    const user = await requireRole(ctx, ['operations', 'owner']);
    const incident = await ctx.db.get(incidentId);
    if (!incident) throw new ConvexError({ code: 'NOT_FOUND', message: 'Incident not found' });
    if (incident.resolved) return incident;
    const before = { ...incident };
    await ctx.db.patch(incidentId, {
      resolved: true,
      status: 'resolved',
      resolvedBy: user._id,
      resolvedAt: Date.now(),
    });
    await audit(ctx, {
      actorId: user._id,
      action: 'incident.resolved',
      entityType: 'incident',
      entityId: incidentId,
      before,
      after: { resolved: true, status: 'resolved' },
    });
    return await ctx.db.get(incidentId);
  },
});

export const startShift = mutation({
  args: {
    role: v.optional(v.string()),
  },
  handler: async (ctx, { role = 'front_desk' }) => {
    const user = await requireRole(ctx, ['operations', 'owner', 'trainer']);
    // End any active shifts first (defensive)
    const activeShifts = await ctx.db
      .query('shifts')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .filter((q) => q.eq(q.field('status'), 'active'))
      .collect();
    for (const s of activeShifts) {
      await ctx.db.patch(s._id, {
        status: 'completed',
        endsAt: Date.now(),
      });
    }
    const now = Date.now();
    // Default to 8h shift window
    const endsAt = now + 8 * 60 * 60 * 1000;
    const id = await ctx.db.insert('shifts', {
      userId: user._id,
      startsAt: now,
      endsAt,
      role,
      status: 'active',
    });
    await audit(ctx, {
      actorId: user._id,
      action: 'shift.started',
      entityType: 'shift',
      entityId: id,
      after: { role },
    });
    return await ctx.db.get(id);
  },
});

export const endShift = mutation({
  args: { shiftId: v.optional(v.id('shifts')) },
  handler: async (ctx, { shiftId }) => {
    const user = await requireRole(ctx, ['operations', 'owner', 'trainer']);
    let target = shiftId;
    if (!target) {
      const active = await ctx.db
        .query('shifts')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .filter((q) => q.eq(q.field('status'), 'active'))
        .first();
      if (!active) {
        throw new ConvexError({ code: 'NO_ACTIVE_SHIFT', message: 'No active shift to end' });
      }
      target = active._id;
    }
    const before = await ctx.db.get(target);
    if (!before) throw new ConvexError({ code: 'NOT_FOUND', message: 'Shift not found' });
    await ctx.db.patch(target, {
      status: 'completed',
      endsAt: Date.now(),
    });
    await audit(ctx, {
      actorId: user._id,
      action: 'shift.ended',
      entityType: 'shift',
      entityId: target,
      before,
      after: { status: 'completed' },
    });
    return await ctx.db.get(target);
  },
});

/**
 * Register or update a physical scanner device.
 * Called by the Next.js /api/scanner/register webhook after env-var validation.
 */
export const registerScannerDevice = mutation({
  args: {
    deviceId: v.string(),
    name: v.string(),
    location: v.string(),
    model: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('scannerDevices')
      .withIndex('by_deviceId', (q) => q.eq('deviceId', args.deviceId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        location: args.location,
        model: args.model,
        ipAddress: args.ipAddress,
        apiKey: args.apiKey,
        isActive: true,
        lastSeenAt: Date.now(),
      });
      return await ctx.db.get(existing._id);
    }
    const id = await ctx.db.insert('scannerDevices', {
      deviceId: args.deviceId,
      name: args.name,
      location: args.location,
      model: args.model,
      ipAddress: args.ipAddress,
      apiKey: args.apiKey,
      isActive: true,
      lastScanAt: undefined,
      totalScans: 0,
      registeredAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

/**
 * Heartbeat from the physical scanner — called by the Next.js
 * /api/scanner/health route after every successful scan.
 */
export const recordScannerHeartbeat = mutation({
  args: {
    deviceId: v.string(),
    lastScanAt: v.optional(v.number()),
  },
  handler: async (ctx, { deviceId, lastScanAt }) => {
    const device = await ctx.db
      .query('scannerDevices')
      .withIndex('by_deviceId', (q) => q.eq('deviceId', deviceId))
      .first();
    if (!device) return null;
    await ctx.db.patch(device._id, {
      lastSeenAt: Date.now(),
      lastScanAt: lastScanAt ?? device.lastScanAt,
      totalScans: lastScanAt ? (device.totalScans ?? 0) + 1 : device.totalScans ?? 0,
    });
    return await ctx.db.get(device._id);
  },
});

/**
 * Mark one inbox notification read (own only).
 */
export const markNotificationRead = mutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const note = await ctx.db.get(args.notificationId);
    if (!note) throw new ConvexError('Notification not found');
    if (String((note as any).userId) !== String(user._id)) {
      throw new ConvexError('Not your notification');
    }
    await ctx.db.patch(args.notificationId, { read: true });
    return args.notificationId;
  },
});

/**
 * Mark the whole inbox read.
 */
export const markAllNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_unread', (q: any) => q.eq('userId', user._id).eq('read', false))
      .collect();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
    return unread.length;
  },
});
