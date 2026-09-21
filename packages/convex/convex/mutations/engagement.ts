/**
 * Queenix Gym — engagement writes (custom notification + sales/promo composer).
 *
 * Persists to the EXISTING `notifications` table (one row per recipient with
 * `data.broadcast == true` + a `batchId`) and appends one row to the
 * EXISTING `auditEvents` table per send, so the mobile app can consume
 * broadcasts through its normal notifications feed later. No push provider
 * is called here — delivery beyond the in-app feed is out of scope.
 *
 * Fan-out is capped at 500 recipients per call; the caller pages with
 * `offset` for larger audiences. Returns `{ sent, batchId, capped }`.
 *
 * Role contract: 'superadmin' | 'admin' | 'owner' | 'operations'.
 */

import { ConvexError, v } from 'convex/values';

import { mutation } from '../_generated/server';
import { requireRole } from '../_helpers';

const STAFF = ['superadmin', 'admin', 'owner', 'operations'] as any;

const FANOUT_CAP = 500;

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

async function resolveAudience(ctx: any, audience: 'all' | 'members', offset: number) {
  const page = await ctx.db.query('users').order('asc').take(offset + FANOUT_CAP + 1);
  const inScope =
    audience === 'members'
      ? page.filter((u: any) => (u.roles ?? []).includes('member'))
      : page;
  const slice = inScope.slice(offset, offset + FANOUT_CAP);
  return { recipients: slice, capped: inScope.length > offset + FANOUT_CAP };
}

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
  },
  handler: async (ctx, args) => {
    const actor = await requireRole(ctx as any, STAFF);
    if (!args.title.trim()) throw new ConvexError('title is required');
    if (!args.body.trim()) throw new ConvexError('body is required');
    const audience = args.audience ?? 'members';
    const offset = args.offset ?? 0;
    const now = Date.now();
    const batchId = `bcast_${now}_${Math.floor(Math.random() * 1e6)}`;

    const { recipients, capped } = await resolveAudience(ctx, audience, offset);
    for (const u of recipients as any[]) {
      await ctx.db.insert('notifications', {
        userId: u._id,
        title: args.title.trim(),
        body: args.body.trim(),
        type: args.type ?? 'system',
        read: false,
        data: { broadcast: true, batchId, kind: 'custom', audience },
        createdAt: now,
      });
    }
    await ctx.db.insert('auditEvents', {
      actorId: actor._id,
      action: 'broadcast.notification',
      entityType: 'broadcast',
      entityId: batchId,
      after: {
        title: args.title.trim(),
        type: args.type ?? 'system',
        audience,
        offset,
        sent: recipients.length,
      },
      timestamp: now,
    });
    return { sent: recipients.length, batchId, capped };
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
    if (args.priceCents !== undefined && args.priceCents < 0) {
      throw new ConvexError('priceCents must be >= 0');
    }
    const audience = args.audience ?? 'members';
    const offset = args.offset ?? 0;
    const now = Date.now();
    const batchId = `promo_${now}_${Math.floor(Math.random() * 1e6)}`;

    const { recipients, capped } = await resolveAudience(ctx, audience, offset);
    for (const u of recipients as any[]) {
      await ctx.db.insert('notifications', {
        userId: u._id,
        title: args.title.trim(),
        body: args.body.trim(),
        type: 'promotion',
        read: false,
        data: {
          broadcast: true,
          batchId,
          kind: 'promo',
          audience,
          cta: args.cta ?? null,
          priceCents: args.priceCents ?? null,
        },
        createdAt: now,
      });
    }
    await ctx.db.insert('auditEvents', {
      actorId: actor._id,
      action: 'broadcast.promotion',
      entityType: 'broadcast',
      entityId: batchId,
      after: {
        title: args.title.trim(),
        audience,
        offset,
        sent: recipients.length,
        cta: args.cta ?? null,
        priceCents: args.priceCents ?? null,
      },
      timestamp: now,
    });
    return { sent: recipients.length, batchId, capped };
  },
});
