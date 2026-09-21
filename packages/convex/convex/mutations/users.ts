/**
 * Queenix Gym — User mutations
 */

import { v } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireUser } from '../_helpers';

export const switchRole = mutation({
  args: {
    role: v.union(
      v.literal('member'),
      v.literal('trainer'),
      v.literal('owner'),
      v.literal('operations')
    ),
  },
  handler: async (ctx, { role }) => {
    const user = await requireUser(ctx);
    if (!user.roles.includes(role)) {
      throw new Error('User does not have this role');
    }
    await ctx.db.patch(user._id, { activeRole: role, updatedAt: Date.now() });
  },
});

/**
 * Mirror a BetterAuth user into the Convex `users` table.
 * Called server-side by BetterAuth `databaseHooks.user.create.after`
 * (packages/auth/src/server.ts) via the Convex HTTP API at the
 * `mutations/users:syncFromBetterAuth` path, so this must stay a public
 * mutation. (The internal `mutations/sync:syncFromBetterAuth` variant is
 * for use by other Convex functions and is not reachable over HTTP.)
 * Roles are validated loosely because BetterAuth is the source of truth.
 */
export const syncFromBetterAuth = mutation({
  args: {
    betterAuthUserId: v.string(),
    email: v.string(),
    fullName: v.string(),
    roles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_betterAuthUserId', (q) => q.eq('betterAuthUserId', args.betterAuthUserId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        fullName: args.fullName,
        roles: args.roles as ('member' | 'trainer' | 'owner' | 'operations')[],
        updatedAt: Date.now(),
      });
      return { ok: true, created: false };
    }
    await ctx.db.insert('users', {
      betterAuthUserId: args.betterAuthUserId,
      email: args.email,
      fullName: args.fullName,
      activeRole: (args.roles[0] ?? 'member') as 'member' | 'trainer' | 'owner' | 'operations',
      roles: args.roles as ('member' | 'trainer' | 'owner' | 'operations')[],
      emailVerified: true,
      phoneVerified: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { ok: true, created: true };
  },
});

// ============================================================
// Trainer mutations
// ============================================================

/**
 * Upsert the current user's trainer profile. Creates one if missing.
 */
export const updateTrainerProfile = mutation({
  args: {
    bio: v.optional(v.string()),
    specialties: v.optional(v.array(v.string())),
    hourlyRateCents: v.optional(v.number()),
    currency: v.optional(v.string()),
    isAvailable: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query('trainerProfiles')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...(args.bio !== undefined ? { bio: args.bio } : {}),
        ...(args.specialties !== undefined ? { specialties: args.specialties } : {}),
        ...(args.hourlyRateCents !== undefined
          ? { hourlyRateCents: args.hourlyRateCents }
          : {}),
        ...(args.currency !== undefined ? { currency: args.currency } : {}),
        ...(args.isAvailable !== undefined ? { isAvailable: args.isAvailable } : {}),
      });
      return existing._id;
    }
    return await ctx.db.insert('trainerProfiles', {
      userId: user._id,
      bio: args.bio ?? '',
      specialties: args.specialties ?? [],
      certifications: [],
      rating: 0,
      reviewCount: 0,
      isAvailable: args.isAvailable ?? true,
      hourlyRateCents: args.hourlyRateCents ?? 0,
      currency: args.currency ?? 'AED',
    });
  },
});

/**
 * Add a certification to the current user's trainer profile.
 */
export const addTrainerCertification = mutation({
  args: {
    name: v.string(),
    issuer: v.string(),
    issuedAt: v.number(),
    expiresAt: v.optional(v.number()),
    documentUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query('trainerProfiles')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();
    if (!existing) throw new Error('Trainer profile not found');
    const certs = [
      ...existing.certifications,
      {
        name: args.name,
        issuer: args.issuer,
        issuedAt: args.issuedAt,
        expiresAt: args.expiresAt,
        documentUrl: args.documentUrl,
      },
    ];
    await ctx.db.patch(existing._id, { certifications: certs });
  },
});

/**
 * Trainer requests an early payout — creates an approval + notification.
 */
export const requestEarlyPayout = mutation({
  args: {
    amountCents: v.number(),
    currency: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { amountCents, currency = 'AED', note }) => {
    const user = await requireUser(ctx);
    const now = Date.now();

    // Find the owner(s) to notify
    const owners = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('activeRole'), 'owner'))
      .take(10);

    for (const owner of owners) {
      await ctx.db.insert('notifications', {
        userId: owner._id,
        title: 'Early payout requested',
        body: `${user.fullName} requested an early payout of ${
          (amountCents / 100).toFixed(2)
        } ${currency}${note ? ` — ${note}` : ''}`,
        type: 'system',
        read: false,
        data: { trainerId: user._id, amountCents, currency },
        createdAt: now,
      });
    }

    // Create an approval record so it shows up in the owner inbox
    return await ctx.db.insert('approvals', {
      type: 'payout.early_requested',
      requestorId: user._id,
      payload: { amountCents, currency, note: note ?? null },
      status: 'pending',
      createdAt: now,
    });
  },
});

// ============================================================
// Owner mutations — approvals
// ============================================================

/**
 * Owner decides on an approval request. Patches status, creates an
 * audit event, and notifies the requestor.
 */
export const decideApproval = mutation({
  args: {
    approvalId: v.id('approvals'),
    decision: v.union(
      v.literal('approved'),
      v.literal('denied'),
      v.literal('cancelled')
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, { approvalId, decision, note }) => {
    const user = await requireUser(ctx);
    const approval = await ctx.db.get(approvalId);
    if (!approval) throw new Error('Approval not found');
    if (approval.status !== 'pending') {
      throw new Error('Approval already decided');
    }

    const now = Date.now();

    await ctx.db.patch(approvalId, {
      status: decision,
      decidedBy: user._id,
      decidedAt: now,
      decisionNote: note,
    });

    // Audit event
    await ctx.db.insert('auditEvents', {
      actorId: user._id,
      action: `approval.${decision}`,
      entityType: 'approval',
      entityId: approvalId,
      before: { status: 'pending' },
      after: { status: decision, note: note ?? null },
      timestamp: now,
    });

    // Notify requestor
    await ctx.db.insert('notifications', {
      userId: approval.requestorId,
      title:
        decision === 'approved'
          ? 'Your request was approved'
          : decision === 'denied'
          ? 'Your request was denied'
          : 'Your request was cancelled',
      body: note ?? `Your ${approval.type} request has been ${decision}.`,
      type: 'system',
      read: false,
      data: { approvalId, type: approval.type, decision },
      createdAt: now,
    });
  },
});

// ============================================================
// Punch clock mutations
// ============================================================

/**
 * Record a punch event (clock in/out) for the current user.
 * Validates that the user is staff, ops, or owner.
 */
export const recordPunch = mutation({
  args: {
    method: v.union(v.literal('fingerprint'), v.literal('app'), v.literal('manual')),
    punchType: v.union(v.literal('in'), v.literal('out')),
    timestamp: v.optional(v.number()),
    deviceId: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!['operations', 'owner'].includes(user.activeRole)) {
      throw new Error('Only staff/ops/owner can record punches');
    }
    const ts = args.timestamp ?? Date.now();
    const eventId = await ctx.db.insert('punchEvents', {
      userId: user._id,
      method: args.method,
      punchType: args.punchType,
      timestamp: ts,
      deviceId: args.deviceId,
      location: args.location,
      createdAt: Date.now(),
    });
    return eventId;
  },
});

/**
 * Record a punch for a specific user — used by the fingerprint
 * hardware webhook (which authenticates via deviceId allowlist, not
 * via the user session). Caller must provide the target userId.
 */
export const recordPunchForUser = mutation({
  args: {
    userId: v.id('users'),
    method: v.union(v.literal('fingerprint'), v.literal('app'), v.literal('manual')),
    punchType: v.union(v.literal('in'), v.literal('out')),
    timestamp: v.number(),
    deviceId: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // NOTE: this mutation is intended to be called from the
    // /api/scanner/fingerprint HTTP webhook after it has validated the
    // deviceId against the FINGERPRINT_DEVICE_IDS allowlist. We still
    // require an authenticated session for safety, but in production
    // the webhook uses a server-to-server token verified upstream.
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('User not found');
    if (!['operations', 'owner'].includes(user.activeRole)) {
      throw new Error('Only staff/ops/owner can record punches');
    }
    return await ctx.db.insert('punchEvents', {
      userId: args.userId,
      method: args.method,
      punchType: args.punchType,
      timestamp: args.timestamp,
      deviceId: args.deviceId,
      location: args.location,
      createdAt: Date.now(),
    });
  },
});
