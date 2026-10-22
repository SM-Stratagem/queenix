/**
 * Queenix Gym — Expo Push delivery for broadcasts.
 * Scheduled by `mutations/engagement:sendBroadcastNotification` when
 * `push: true` (once per fan-out page). Loads recipients' tokens
 * (`devices.pushToken`), drops users who turned push off in their profile
 * preferences, drops promotions for users without a granted
 * `marketing_push` consent, POSTs to
 * Expo in batches of 100, clears DeviceNotRegistered tokens, and writes ONE
 * `auditEvents` row (`broadcast.push`) per page with sent/failed/skippedNoConsent/skippedOptOut.
 */

import { v } from 'convex/values';

import { internal } from './_generated/api';
import { internalAction, internalMutation, internalQuery } from './_generated/server';
import {
  buildMessages,
  filterByConsent,
  filterByPushPreference,
  sendBatches,
  type ConsentRow,
  type PushTarget,
} from './pushLogic';

/** Push tokens of the recipients, consent-filtered for promotions. */
export const loadTargets = internalQuery({
  args: { userIds: v.array(v.id('users')), type: v.string() },
  handler: async (ctx, { userIds: requested, type }) => {
    const pushOff = new Set<string>();
    for (const userId of requested) {
      const profile = await ctx.db
        .query('memberProfiles')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .first();
      if (profile?.preferences?.notifications === false) pushOff.add(userId);
    }
    const { allowed: userIds, skippedOptOut } = filterByPushPreference(requested, pushOff);
    const consentsByUser: Record<string, ConsentRow[]> = {};
    if (type === 'promotion') {
      for (const userId of userIds) {
        consentsByUser[userId] = await ctx.db
          .query('consents')
          .withIndex('by_user', (q) => q.eq('userId', userId))
          .take(50);
      }
    }
    const { allowed, skippedNoConsent } = filterByConsent(type, userIds, consentsByUser);
    const targets: PushTarget[] = [];
    for (const userId of allowed) {
      // ponytail: 10 devices per user is plenty; raise if people really carry more.
      const devices = await ctx.db
        .query('devices')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .take(10);
      for (const d of devices) if (d.pushToken) targets.push({ userId, token: d.pushToken });
    }
    return { targets, skippedNoConsent, skippedOptOut };
  },
});

/** Clear dead tokens and write the single audit row for this push send. */
export const finish = internalMutation({
  args: {
    actorId: v.id('users'),
    batchId: v.string(),
    deadTokens: v.array(v.string()),
    after: v.any(),
  },
  handler: async (ctx, { actorId, batchId, deadTokens, after }) => {
    for (const token of deadTokens) {
      const rows = await ctx.db
        .query('devices')
        .withIndex('by_fingerprint', (q) => q.eq('deviceFingerprint', token))
        .take(10);
      for (const r of rows) await ctx.db.patch('devices', r._id, { pushToken: undefined });
    }
    await ctx.db.insert('auditEvents', {
      actorId,
      action: 'broadcast.push',
      entityType: 'broadcast',
      entityId: batchId,
      after,
      timestamp: Date.now(),
    });
    return null;
  },
});

export const sendToUsers = internalAction({
  args: {
    actorId: v.id('users'),
    userIds: v.array(v.id('users')),
    title: v.string(),
    body: v.string(),
    type: v.string(),
    batchId: v.string(),
  },
  handler: async (ctx, args) => {
    const { targets, skippedNoConsent, skippedOptOut } = await ctx.runQuery(internal.push.loadTargets, {
      userIds: args.userIds,
      type: args.type,
    });
    const messages = buildMessages(targets, args);
    const result = await sendBatches(messages, fetch, process.env.EXPO_PUSH_URL || undefined);
    await ctx.runMutation(internal.push.finish, {
      actorId: args.actorId,
      batchId: args.batchId,
      deadTokens: result.deadTokens,
      after: {
        type: args.type,
        recipients: args.userIds.length,
        tokens: messages.length,
        sent: result.sent,
        failed: result.failed,
        skippedNoConsent,
        skippedOptOut,
        clearedTokens: result.deadTokens.length,
        errors: result.errors,
      },
    });
    return null;
  },
});
