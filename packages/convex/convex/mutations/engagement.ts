/**
 * Queenix Gym — engagement writes (custom notification + sales/promo composer).
 *
 * Persists to the EXISTING `notifications` table (one row per recipient with
 * `data.broadcast == true` + a `batchId`) and appends one row to the
 * EXISTING `auditEvents` table per send, so the mobile app can consume
 * broadcasts through its normal notifications feed. With `push: true`
 * (requires the `notifications.push` capability) `sendBroadcastNotification`
 * also schedules `internal.push.sendToUsers` to deliver to phones via Expo.
 *
 * Fan-out pages over `users` with a cursor, PAGE users per transaction:
 * the first page is delivered inline, then `continueFanOut` reschedules
 * itself with the next cursor until the table is exhausted, so every
 * recipient gets exactly one notification whatever the audience size.
 * Phone push is queued per page. Returns `{ sent, batchId, capped,
 * continuing }` (+ `pushQueued`): `sent`/`pushQueued` count the first page;
 * `continuing` is true while later pages are still being delivered.
 * `capped` is always false now and `offset` is ignored (kept for old clients).
 *
 * Role contract: 'superadmin' | 'admin' | 'owner' | 'operations'.
 */

import { ConvexError, v } from 'convex/values';

import { internal } from '../_generated/api';
import { internalMutation, mutation } from '../_generated/server';
import { requireRole } from '../_helpers';
import { requireCapability } from '../permissions';

const STAFF = ['superadmin', 'admin', 'owner', 'operations'] as any;

/** Users read per fan-out transaction (members are filtered inside each page). */
export const FANOUT_PAGE = 500;

const audienceArg = v.union(v.literal('all'), v.literal('members'));

const notificationType = v.union(
  v.literal('booking'),
  v.literal('class_reminder'),
  v.literal('payment'),
  v.literal('membership'),
  v.literal('access'),
  v.literal('reward'),
  v.literal('system'),
  v.literal('promotion'),
);

export function inAudience(u: { roles?: string[] }, audience: 'all' | 'members'): boolean {
  return audience === 'all' || (u.roles ?? []).includes('member');
}

const fanOutArgs = {
  actorId: v.id('users'),
  batchId: v.string(),
  audience: audienceArg,
  title: v.string(),
  body: v.string(),
  type: notificationType,
  data: v.any(),
  push: v.boolean(),
  cursor: v.union(v.string(), v.null()),
};
type FanOut = {
  actorId: any;
  batchId: string;
  audience: 'all' | 'members';
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown>;
  push: boolean;
  cursor: string | null;
};

/**
 * Deliver one page of a broadcast and schedule the next. The inserts and the
 * continuation commit in the same transaction, so no page is sent twice or
 * skipped.
 */
export async function fanOutPage(ctx: any, a: FanOut) {
  const res = await ctx.db.query('users').paginate({ numItems: FANOUT_PAGE, cursor: a.cursor });
  const recipients = (res.page as any[]).filter((u) => inAudience(u, a.audience));
  const now = Date.now();
  for (const u of recipients) {
    await ctx.db.insert('notifications', {
      userId: u._id,
      title: a.title,
      body: a.body,
      type: a.type,
      read: false,
      data: a.data,
      createdAt: now,
    });
  }
  if (a.push && recipients.length) {
    await ctx.scheduler.runAfter(0, internal.push.sendToUsers, {
      actorId: a.actorId,
      userIds: recipients.map((u) => u._id),
      title: a.title,
      body: a.body,
      type: a.type,
      batchId: a.batchId,
    });
  }
  if (!res.isDone) {
    await ctx.scheduler.runAfter(0, internal.mutations.engagement.continueFanOut, {
      ...a,
      cursor: res.continueCursor,
    });
  }
  return { sent: recipients.length, isDone: res.isDone as boolean };
}

/** Next page of a broadcast (scheduled by `fanOutPage`). */
export const continueFanOut = internalMutation({
  args: fanOutArgs,
  handler: async (ctx, a) => {
    await fanOutPage(ctx, a);
    return null;
  },
});

/**
 * Custom notification composer: one in-app notification per recipient.
 * Mobile-consumable via each recipient's notifications feed
 * (`notifications` table, `by_user` / `by_user_unread` indexes).
 */
export const sendBroadcastNotification = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    type: v.optional(notificationType),
    audience: v.optional(audienceArg),
    offset: v.optional(v.number()),
    /** Also deliver to recipients' phones (Expo Push). Needs `notifications.push`. */
    push: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.push) await requireCapability(ctx, 'notifications.push');
    const actor = await requireRole(ctx as any, STAFF);
    if (!args.title.trim()) throw new ConvexError('title is required');
    if (!args.body.trim()) throw new ConvexError('body is required');
    const audience = args.audience ?? 'members';
    const now = Date.now();
    const batchId = `bcast_${now}_${Math.floor(Math.random() * 1e6)}`;
    const title = args.title.trim();
    const body = args.body.trim();
    const type = args.type ?? 'system';

    const { sent, isDone } = await fanOutPage(ctx, {
      actorId: actor._id,
      batchId,
      audience,
      title,
      body,
      type,
      data: { broadcast: true, batchId, kind: 'custom', audience },
      push: !!args.push,
      cursor: null,
    });
    await ctx.db.insert('auditEvents', {
      actorId: actor._id,
      action: 'broadcast.notification',
      entityType: 'broadcast',
      entityId: batchId,
      after: { title, type, audience, sent, continuing: !isDone, push: !!args.push },
      timestamp: now,
    });
    const pushQueued = args.push ? sent : 0;
    return { sent, batchId, capped: false, continuing: !isDone, pushQueued };
  },
});

/**
 * Custom sales/promo composer: same fan-out as above with
 * `type == 'promotion'` plus optional CTA + price metadata in `data`,
 * so the mobile app can render promo cards later.
 */
export const sendSalesPush = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    cta: v.optional(v.string()),
    priceCents: v.optional(v.number()),
    audience: v.optional(audienceArg),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx as any, STAFF);
    if (!args.title.trim()) throw new ConvexError('title is required');
    if (!args.body.trim()) throw new ConvexError('body is required');
    if (args.priceCents !== undefined && !(Number.isFinite(args.priceCents) && args.priceCents >= 0)) {
      throw new ConvexError('priceCents must be >= 0');
    }
    const audience = args.audience ?? 'members';
    const now = Date.now();
    const batchId = `promo_${now}_${Math.floor(Math.random() * 1e6)}`;
    const title = args.title.trim();
    const body = args.body.trim();

    const { sent, isDone } = await fanOutPage(ctx, {
      actorId: actor._id,
      batchId,
      audience,
      title,
      body,
      type: 'promotion',
      data: {
        broadcast: true,
        batchId,
        kind: 'promo',
        audience,
        cta: args.cta ?? null,
        priceCents: args.priceCents ?? null,
      },
      push: false,
      cursor: null,
    });
    await ctx.db.insert('auditEvents', {
      actorId: actor._id,
      action: 'broadcast.promotion',
      entityType: 'broadcast',
      entityId: batchId,
      after: {
        title,
        audience,
        sent,
        continuing: !isDone,
        cta: args.cta ?? null,
        priceCents: args.priceCents ?? null,
      },
      timestamp: now,
    });
    return { sent, batchId, capped: false, continuing: !isDone };
  },
});
