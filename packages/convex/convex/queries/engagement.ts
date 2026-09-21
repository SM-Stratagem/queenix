/**
 * Queenix Gym — engagement reads (broadcast history + audience sizing).
 *
 * Reads the EXISTING `notifications`, `auditEvents`, and `users` tables.
 * Broadcasts are notifications written with `data.broadcast == true` by
 * `mutations/engagement:sendBroadcastNotification` / `sendSalesPush`;
 * the audit trail uses actions `broadcast.notification` / `broadcast.promotion`.
 */

import { v } from 'convex/values';

import { query } from '../_generated/server';
import { requireRole } from '../_helpers';

const STAFF = ['superadmin', 'admin', 'owner', 'operations'] as any;

/** Recent broadcast sends (deduped by send batch), newest first. */
export const listBroadcasts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    await requireRole(ctx as any, STAFF);
    const notes = await ctx.db
      .query('notifications')
      .order('desc')
      .take(Math.min(limit * 4, 400));
    const seen = new Set<string>();
    const broadcasts: any[] = [];
    for (const n of notes as any[]) {
      if (!n.data || (n.data as any).broadcast !== true) continue;
      const batch = String((n.data as any).batchId ?? n._id);
      if (seen.has(batch)) continue;
      seen.add(batch);
      broadcasts.push({
        batchId: batch,
        title: n.title,
        body: n.body,
        type: n.type,
        kind: (n.data as any).kind ?? null,
        audience: (n.data as any).audience ?? null,
        createdAt: n.createdAt,
      });
      if (broadcasts.length >= Math.min(limit, 100)) break;
    }
    const events = await ctx.db
      .query('auditEvents')
      .withIndex('by_timestamp')
      .order('desc')
      .take(200);
    const audit = events
      .filter((e) => e.action === 'broadcast.notification' || e.action === 'broadcast.promotion')
      .slice(0, Math.min(limit, 100));
    return { broadcasts, audit };
  },
});

/**
 * Audience sizing preview for the composers. Counts are capped at 1000
 * scanned users; `capped` is true when the workspace is larger than that.
 */
export const audienceCount = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx as any, STAFF);
    const users = await ctx.db.query('users').take(1000);
    const members = users.filter((u: any) => (u.roles ?? []).includes('member')).length;
    return { total: users.length, members, capped: users.length >= 1000 };
  },
});
