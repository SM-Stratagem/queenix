/**
 * Queenix Gym — CRM mutations (staff only: admin / superadmin / owner).
 */

import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireRole } from '../_helpers';

const STAFF_ROLES = ['admin', 'superadmin', 'owner'] as any;

const leadStage = v.union(
  v.literal('new'),
  v.literal('contacted'),
  v.literal('trial'),
  v.literal('converted'),
  v.literal('lost')
);

const channel = v.union(
  v.literal('call'),
  v.literal('whatsapp'),
  v.literal('visit'),
  v.literal('note')
);

export const createLead = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    source: v.optional(v.string()),
    stage: v.optional(leadStage),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.id('users')),
  },
  handler: async (ctx, args) => {
    const staff = await requireRole(ctx as any, STAFF_ROLES);
    const now = Date.now();
    return await ctx.db.insert('crmLeads', {
      name: args.name,
      phone: args.phone,
      email: args.email,
      source: args.source ?? 'walk-in',
      stage: args.stage ?? 'new',
      notes: args.notes,
      assignedTo: args.assignedTo,
      createdBy: staff._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateLead = mutation({
  args: {
    leadId: v.id('crmLeads'),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    source: v.optional(v.string()),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.id('users')),
    convertedUserId: v.optional(v.id('users')),
  },
  handler: async (ctx, { leadId, ...patch }) => {
    await requireRole(ctx as any, STAFF_ROLES);
    const lead = await ctx.db.get(leadId);
    if (!lead) throw new Error('Lead not found');
    const clean: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(patch)) {
      if (val !== undefined) clean[k] = val;
    }
    await ctx.db.patch(leadId, { ...clean, updatedAt: Date.now() });
  },
});

export const moveLead = mutation({
  args: { leadId: v.id('crmLeads'), stage: leadStage },
  handler: async (ctx, { leadId, stage }) => {
    await requireRole(ctx as any, STAFF_ROLES);
    const lead = await ctx.db.get(leadId);
    if (!lead) throw new Error('Lead not found');
    await ctx.db.patch(leadId, { stage, updatedAt: Date.now() });
  },
});

export const logInteraction = mutation({
  args: {
    leadId: v.id('crmLeads'),
    channel,
    summary: v.string(),
    outcome: v.optional(v.string()),
    followUpAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const staff = await requireRole(ctx as any, STAFF_ROLES);
    const lead = await ctx.db.get(args.leadId);
    if (!lead) throw new Error('Lead not found');
    const now = Date.now();
    const id = await ctx.db.insert('crmInteractions', {
      leadId: args.leadId,
      authorId: staff._id,
      channel: args.channel,
      summary: args.summary,
      outcome: args.outcome,
      followUpAt: args.followUpAt,
      createdAt: now,
    });
    await ctx.db.patch(args.leadId, { lastContactAt: now, updatedAt: now });
    return id;
  },
});

export const assignTask = mutation({
  args: {
    title: v.string(),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.id('users')),
    leadId: v.optional(v.id('crmLeads')),
    relatedUserId: v.optional(v.id('users')),
    dueAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx as any, STAFF_ROLES);
    const now = Date.now();
    return await ctx.db.insert('crmTasks', {
      title: args.title,
      notes: args.notes,
      assignedTo: args.assignedTo,
      leadId: args.leadId,
      relatedUserId: args.relatedUserId,
      dueAt: args.dueAt,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const completeTask = mutation({
  args: { taskId: v.id('crmTasks'), note: v.optional(v.string()) },
  handler: async (ctx, { taskId, note }) => {
    await requireRole(ctx as any, STAFF_ROLES);
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error('Task not found');
    await ctx.db.patch(taskId, {
      status: 'done',
      completedAt: Date.now(),
      updatedAt: Date.now(),
      ...(note !== undefined ? { notes: note } : {}),
    });
  },
});
