/**
 * Queenix Gym — People & org mutations (staff profiles, roles, time off,
 * branch staffing). Owner-gated except time-off recording (operations ok).
 */

import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireRole, requireUser, audit } from '../_helpers';

const roleLiteral = v.union(
  v.literal('superadmin'),
  v.literal('admin'),
  v.literal('finance'),
  v.literal('owner'),
  v.literal('operations'),
  v.literal('salon'),
  v.literal('coffee'),
  v.literal('trainer'),
  v.literal('member')
);

export const upsertStaffProfile = mutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    department: v.string(),
    reportsToId: v.optional(v.id('users')),
  },
  handler: async (ctx, { userId, title, department, reportsToId }) => {
    const actor = await requireRole(ctx, ['owner']);
    const target = await ctx.db.get(userId);
    if (!target) throw new ConvexError({ code: 'NOT_FOUND', message: 'User not found' });
    if (reportsToId) {
      const manager = await ctx.db.get(reportsToId);
      if (!manager) throw new ConvexError({ code: 'NOT_FOUND', message: 'Manager not found' });
      if (reportsToId === userId) {
        throw new ConvexError({ code: 'INVALID', message: 'Cannot report to self' });
      }
    }
    const existing = await ctx.db
      .query('staffProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { title, department, reportsToId });
      await audit(ctx, {
        actorId: actor._id,
        action: 'staffProfile.updated',
        entityType: 'staffProfile',
        entityId: existing._id,
        before: { ...existing },
        after: { title, department, reportsToId: reportsToId ?? null },
      });
      return await ctx.db.get(existing._id);
    }
    const id = await ctx.db.insert('staffProfiles', {
      userId,
      title,
      department,
      reportsToId,
    });
    await audit(ctx, {
      actorId: actor._id,
      action: 'staffProfile.created',
      entityType: 'staffProfile',
      entityId: id,
      after: { userId, title, department },
    });
    return await ctx.db.get(id);
  },
});

/** Owner grants/revokes roles and sets the staffer's active role. */
export const setStaffRoles = mutation({
  args: {
    userId: v.id('users'),
    roles: v.array(roleLiteral),
    activeRole: roleLiteral,
  },
  handler: async (ctx, { userId, roles, activeRole }) => {
    const actor = await requireRole(ctx, ['owner']);
    if (roles.length === 0) {
      throw new ConvexError({ code: 'INVALID', message: 'At least one role is required' });
    }
    if (!roles.includes(activeRole as any)) {
      throw new ConvexError({
        code: 'INVALID',
        message: 'Active role must be one of the granted roles',
      });
    }
    const target = await ctx.db.get(userId);
    if (!target) throw new ConvexError({ code: 'NOT_FOUND', message: 'User not found' });
    const before = { roles: target.roles, activeRole: target.activeRole };
    await ctx.db.patch(userId, {
      roles: roles as any,
      activeRole: activeRole as any,
      updatedAt: Date.now(),
    });
    await audit(ctx, {
      actorId: actor._id,
      action: 'staffRoles.updated',
      entityType: 'user',
      entityId: userId,
      before,
      after: { roles, activeRole },
    });
    await ctx.db.insert('notifications', {
      userId,
      title: 'Your roles were updated',
      body: `Active role: ${activeRole}. Granted: ${roles.join(', ')}.`,
      type: 'system',
      read: false,
      createdAt: Date.now(),
    });
    return await ctx.db.get(userId);
  },
});

/** Record a sick day or leave day (starts as pending). */
export const recordTimeOff = mutation({
  args: {
    userId: v.id('users'),
    date: v.string(),
    kind: v.union(v.literal('sick'), v.literal('leave')),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { userId, date, kind, note }) => {
    const actor = await requireRole(ctx, ['owner', 'operations']);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ConvexError({ code: 'INVALID', message: 'Date must be YYYY-MM-DD' });
    }
    const target = await ctx.db.get(userId);
    if (!target) throw new ConvexError({ code: 'NOT_FOUND', message: 'User not found' });
    const id = await ctx.db.insert('staffTimeOff', {
      userId,
      date,
      kind,
      note,
      status: 'pending',
      recordedBy: actor._id,
      createdAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const decideTimeOff = mutation({
  args: {
    timeOffId: v.id('staffTimeOff'),
    decision: v.union(v.literal('approved'), v.literal('denied')),
  },
  handler: async (ctx, { timeOffId, decision }) => {
    const actor = await requireRole(ctx, ['owner', 'operations']);
    const record = await ctx.db.get(timeOffId);
    if (!record) throw new ConvexError({ code: 'NOT_FOUND', message: 'Time-off record not found' });
    if (record.status !== 'pending') {
      throw new ConvexError({ code: 'INVALID', message: 'Record already decided' });
    }
    await ctx.db.patch(timeOffId, {
      status: decision,
      decidedBy: actor._id,
      decidedAt: Date.now(),
    });
    await ctx.db.insert('notifications', {
      userId: record.userId,
      title: `Time off ${decision}`,
      body: `${record.kind} on ${record.date} was ${decision}.`,
      type: 'system',
      read: false,
      createdAt: Date.now(),
    });
    return await ctx.db.get(timeOffId);
  },
});

/** Assign a staffer to a branch (upsert on branch+user). */
export const assignBranchStaff = mutation({
  args: {
    branchId: v.id('branches'),
    userId: v.id('users'),
    role: v.string(),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, { branchId, userId, role, isPrimary = false }) => {
    const actor = await requireRole(ctx, ['owner', 'operations']);
    const branch = await ctx.db.get(branchId);
    if (!branch) throw new ConvexError({ code: 'NOT_FOUND', message: 'Branch not found' });
    const target = await ctx.db.get(userId);
    if (!target) throw new ConvexError({ code: 'NOT_FOUND', message: 'User not found' });
    const existing = await ctx.db
      .query('branchStaff')
      .withIndex('by_branch_user', (q) =>
        q.eq('branchId', branchId).eq('userId', userId)
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { role, isPrimary });
      return await ctx.db.get(existing._id);
    }
    const id = await ctx.db.insert('branchStaff', {
      branchId,
      userId,
      role,
      isPrimary,
      assignedBy: actor._id,
      createdAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const unassignBranchStaff = mutation({
  args: {
    branchId: v.id('branches'),
    userId: v.id('users'),
  },
  handler: async (ctx, { branchId, userId }) => {
    await requireRole(ctx, ['owner', 'operations']);
    const existing = await ctx.db
      .query('branchStaff')
      .withIndex('by_branch_user', (q) =>
        q.eq('branchId', branchId).eq('userId', userId)
      )
      .first();
    if (!existing) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Assignment not found' });
    }
    await ctx.db.delete(existing._id);
    return { ok: true };
  },
});

/**
 * Self-service day-off request: any staff member files for themselves.
 * Lands as `pending` for owner/operations to decide (decideTimeOff).
 */
export const requestTimeOff = mutation({
  args: {
    date: v.string(),
    kind: v.union(v.literal('sick'), v.literal('leave')),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { date, kind, note }) => {
    const user = await requireUser(ctx);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new ConvexError({ code: 'INVALID', message: 'Date must be YYYY-MM-DD' });
    }
    const id = await ctx.db.insert('staffTimeOff', {
      userId: user._id,
      date,
      kind,
      note,
      status: 'pending',
      recordedBy: user._id,
      createdAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});
