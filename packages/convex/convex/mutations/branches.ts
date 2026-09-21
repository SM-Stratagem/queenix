/**
 * Queenix Gym — Branch & event mutations. Branches are owner-managed;
 * events can be run by owner or operations.
 */

import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireRole, audit } from '../_helpers';

export const createBranch = mutation({
  args: {
    name: v.string(),
    city: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { name, city, address, phone }) => {
    const actor = await requireRole(ctx, ['owner']);
    if (!name.trim() || !city.trim()) {
      throw new ConvexError({ code: 'INVALID', message: 'Name and city are required' });
    }
    const now = Date.now();
    const id = await ctx.db.insert('branches', {
      name: name.trim(),
      city: city.trim(),
      address,
      phone,
      isActive: true,
      createdBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });
    await audit(ctx, {
      actorId: actor._id,
      action: 'branch.created',
      entityType: 'branch',
      entityId: id,
      after: { name, city },
    });
    return await ctx.db.get(id);
  },
});

export const updateBranch = mutation({
  args: {
    branchId: v.id('branches'),
    name: v.optional(v.string()),
    city: v.optional(v.string()),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, { branchId, ...patch }) => {
    const actor = await requireRole(ctx, ['owner']);
    const branch = await ctx.db.get(branchId);
    if (!branch) throw new ConvexError({ code: 'NOT_FOUND', message: 'Branch not found' });
    const clean: Record<string, unknown> = { updatedAt: Date.now() };
    if (patch.name !== undefined) {
      if (!patch.name.trim()) {
        throw new ConvexError({ code: 'INVALID', message: 'Name cannot be empty' });
      }
      clean.name = patch.name.trim();
    }
    if (patch.city !== undefined) {
      if (!patch.city.trim()) {
        throw new ConvexError({ code: 'INVALID', message: 'City cannot be empty' });
      }
      clean.city = patch.city.trim();
    }
    if (patch.address !== undefined) clean.address = patch.address;
    if (patch.phone !== undefined) clean.phone = patch.phone;
    await ctx.db.patch(branchId, clean as any);
    await audit(ctx, {
      actorId: actor._id,
      action: 'branch.updated',
      entityType: 'branch',
      entityId: branchId,
      before: { ...branch },
      after: clean,
    });
    return await ctx.db.get(branchId);
  },
});

export const setBranchActive = mutation({
  args: { branchId: v.id('branches'), isActive: v.boolean() },
  handler: async (ctx, { branchId, isActive }) => {
    const actor = await requireRole(ctx, ['owner']);
    const branch = await ctx.db.get(branchId);
    if (!branch) throw new ConvexError({ code: 'NOT_FOUND', message: 'Branch not found' });
    await ctx.db.patch(branchId, { isActive, updatedAt: Date.now() });
    await audit(ctx, {
      actorId: actor._id,
      action: isActive ? 'branch.activated' : 'branch.deactivated',
      entityType: 'branch',
      entityId: branchId,
    });
    return await ctx.db.get(branchId);
  },
});

export const createEvent = mutation({
  args: {
    branchId: v.optional(v.id('branches')),
    title: v.string(),
    description: v.optional(v.string()),
    startsAt: v.number(),
    endsAt: v.number(),
    capacity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx, ['owner', 'operations']);
    if (!args.title.trim()) {
      throw new ConvexError({ code: 'INVALID', message: 'Title is required' });
    }
    if (args.endsAt <= args.startsAt) {
      throw new ConvexError({ code: 'INVALID', message: 'End must be after start' });
    }
    if (args.branchId) {
      const branch = await ctx.db.get(args.branchId);
      if (!branch) throw new ConvexError({ code: 'NOT_FOUND', message: 'Branch not found' });
    }
    const now = Date.now();
    const id = await ctx.db.insert('gymEvents', {
      branchId: args.branchId,
      title: args.title.trim(),
      description: args.description,
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      capacity: args.capacity,
      status: 'scheduled',
      createdBy: actor._id,
      createdAt: now,
      updatedAt: now,
    });
    return await ctx.db.get(id);
  },
});

export const updateEvent = mutation({
  args: {
    eventId: v.id('gymEvents'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    capacity: v.optional(v.number()),
    branchId: v.optional(v.id('branches')),
  },
  handler: async (ctx, { eventId, ...patch }) => {
    await requireRole(ctx, ['owner', 'operations']);
    const event = await ctx.db.get(eventId);
    if (!event) throw new ConvexError({ code: 'NOT_FOUND', message: 'Event not found' });
    if (event.status !== 'scheduled') {
      throw new ConvexError({ code: 'INVALID', message: 'Only scheduled events can be edited' });
    }
    const startsAt = patch.startsAt ?? event.startsAt;
    const endsAt = patch.endsAt ?? event.endsAt;
    if (endsAt <= startsAt) {
      throw new ConvexError({ code: 'INVALID', message: 'End must be after start' });
    }
    const clean: Record<string, unknown> = { startsAt, endsAt, updatedAt: Date.now() };
    if (patch.title !== undefined) {
      if (!patch.title.trim()) {
        throw new ConvexError({ code: 'INVALID', message: 'Title cannot be empty' });
      }
      clean.title = patch.title.trim();
    }
    if (patch.description !== undefined) clean.description = patch.description;
    if (patch.capacity !== undefined) clean.capacity = patch.capacity;
    if (patch.branchId !== undefined) {
      const branch = await ctx.db.get(patch.branchId);
      if (!branch) throw new ConvexError({ code: 'NOT_FOUND', message: 'Branch not found' });
      clean.branchId = patch.branchId;
    }
    await ctx.db.patch(eventId, clean as any);
    return await ctx.db.get(eventId);
  },
});

export const cancelEvent = mutation({
  args: { eventId: v.id('gymEvents') },
  handler: async (ctx, { eventId }) => {
    await requireRole(ctx, ['owner', 'operations']);
    const event = await ctx.db.get(eventId);
    if (!event) throw new ConvexError({ code: 'NOT_FOUND', message: 'Event not found' });
    if (event.status === 'cancelled') return event;
    await ctx.db.patch(eventId, { status: 'cancelled', updatedAt: Date.now() });
    return await ctx.db.get(eventId);
  },
});
