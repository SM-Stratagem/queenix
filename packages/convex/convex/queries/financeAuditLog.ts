/**
 * Queenix Gym — General audit-log viewer (staff only: admin / superadmin / owner).
 *
 * Reads the EXISTING `auditEvents` table. Complements
 * queries/finance.ts `listFinanceAudit` (finance-scoped) with an unscoped,
 * filterable viewer for the audit page.
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireRole } from '../_helpers';

const STAFF_ROLES = ['admin', 'superadmin', 'owner'] as any;

/**
 * Newest-first audit events with optional filters:
 * `actionPrefix` (e.g. "payment.", "payout.", "finance."), `entityType`,
 * `entityId`. `limit` caps scanned rows (max 500).
 */
export const listAuditEvents = query({
  args: {
    actionPrefix: v.optional(v.string()),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { actionPrefix, entityType, entityId, limit = 100 }) => {
    await requireRole(ctx, STAFF_ROLES);
    const events = await ctx.db
      .query('auditEvents')
      .withIndex('by_timestamp')
      .order('desc')
      .take(Math.min(limit, 500));
    return events.filter((e) => {
      if (actionPrefix && !e.action.startsWith(actionPrefix)) return false;
      if (entityType && e.entityType !== entityType) return false;
      if (entityId && e.entityId !== entityId) return false;
      return true;
    });
  },
});
