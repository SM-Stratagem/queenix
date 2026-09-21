/**
 * Queenix Gym — Convex schema tables: CRM (leads, interactions, tasks)
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

export const crmLeads = defineTable({
  name: v.string(),
  phone: v.string(),
  email: v.optional(v.string()),
  source: v.string(),
  stage: v.union(
    v.literal('new'),
    v.literal('contacted'),
    v.literal('trial'),
    v.literal('converted'),
    v.literal('lost')
  ),
  notes: v.optional(v.string()),
  assignedTo: v.optional(v.id('users')),
  convertedUserId: v.optional(v.id('users')),
  lastContactAt: v.optional(v.number()),
  createdBy: v.id('users'),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_stage', ['stage'])
  .index('by_assignee', ['assignedTo'])

export const crmInteractions = defineTable({
  leadId: v.id('crmLeads'),
  authorId: v.id('users'),
  channel: v.union(
    v.literal('call'),
    v.literal('whatsapp'),
    v.literal('visit'),
    v.literal('note')
  ),
  summary: v.string(),
  outcome: v.optional(v.string()),
  followUpAt: v.optional(v.number()),
  createdAt: v.number(),
}).index('by_lead', ['leadId'])

export const crmTasks = defineTable({
  title: v.string(),
  notes: v.optional(v.string()),
  assignedTo: v.optional(v.id('users')),
  leadId: v.optional(v.id('crmLeads')),
  relatedUserId: v.optional(v.id('users')),
  dueAt: v.optional(v.number()),
  status: v.union(v.literal('open'), v.literal('done')),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_status', ['status'])
  .index('by_assignee', ['assignedTo'])
  .index('by_due', ['dueAt'])
