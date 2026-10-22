/**
 * Queenix Gym — User mutations
 */

import { v } from 'convex/values';
import { internalMutation, mutation } from '../_generated/server';
import { requireUser } from '../_helpers';

export const switchRole = mutation({
  args: {
    role: v.union(
      v.literal('member'),
      v.literal('trainer'),
      v.literal('finance'),
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
 * (packages/auth/src/server.ts) via convexAdmin (admin key) at the
 * `mutations/users:syncFromBetterAuth` path. Internal: a public version
 * let anyone create users / grant themselves any role.
 * Roles are validated loosely because BetterAuth is the source of truth.
 */
export const syncFromBetterAuth = internalMutation({
  args: {
    betterAuthUserId: v.string(),
    email: v.string(),
    fullName: v.string(),
    roles: v.array(v.string()),
    activeRole: v.optional(v.string()),
    // Self-heal on login: create the row if missing, never overwrite roles
    // (Team → Permissions edits roles in Convex first).
    createOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_betterAuthUserId', (q) => q.eq('betterAuthUserId', args.betterAuthUserId))
      .first();
    const activeRole = (args.activeRole ?? args.roles[0] ?? 'member') as 'member' | 'trainer' | 'finance' | 'owner' | 'operations';
    if (existing) {
      if (args.createOnly) return { ok: true, created: false };
      await ctx.db.patch(existing._id, {
        fullName: args.fullName,
        roles: args.roles as ('member' | 'trainer' | 'finance' | 'owner' | 'operations')[],
        activeRole,
        updatedAt: Date.now(),
      });
      return { ok: true, created: false };
    }
    await ctx.db.insert('users', {
      betterAuthUserId: args.betterAuthUserId,
      email: args.email,
      fullName: args.fullName,
      activeRole,
      roles: args.roles as ('member' | 'trainer' | 'finance' | 'owner' | 'operations')[],
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
    // Any staff member clocks in/out; members never punch.
    const roles = ((user.roles ?? [user.activeRole]) as string[]).filter((r) => r !== 'member');
    if (roles.length === 0) throw new Error('Only staff can record punches');
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
export const recordPunchForUser = internalMutation({
  args: {
    userId: v.id('users'),
    method: v.union(v.literal('fingerprint'), v.literal('app'), v.literal('manual')),
    punchType: v.union(v.literal('in'), v.literal('out')),
    timestamp: v.number(),
    deviceId: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Internal: only the /api/scanner/fingerprint route reaches this (admin
    // key), after SCANNER_API_KEY + FINGERPRINT_DEVICE_IDS checks.
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error('User not found');
    // Any staff member clocks in/out; members never punch.
    const roles = ((user.roles ?? [user.activeRole]) as string[]).filter((r) => r !== 'member');
    if (roles.length === 0) throw new Error('Only staff can record punches');
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

/**
 * Update the signed-in member's own profile: preferences, emergency
 * contact, date of birth, gender, vehicles. Creates the profile row
 * on first save. Powers account settings (toggles actually persist).
 */
export const updateMyProfile = mutation({
  args: {
    dateOfBirth: v.optional(v.string()),
    gender: v.optional(v.string()),
    emergencyContact: v.optional(
      v.object({
        name: v.string(),
        phone: v.string(),
        relationship: v.optional(v.string()),
      })
    ),
    vehicles: v.optional(
      v.array(
        v.object({
          plate: v.string(),
          make: v.optional(v.string()),
          model: v.optional(v.string()),
          color: v.optional(v.string()),
        })
      )
    ),
    preferences: v.optional(
      v.object({
        notifications: v.boolean(),
        marketing: v.boolean(),
        language: v.union(v.literal('en'), v.literal('ar')),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const existing = await ctx.db
      .query('memberProfiles')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();
    const patch: any = {};
    if (args.dateOfBirth !== undefined) patch.dateOfBirth = args.dateOfBirth;
    if (args.gender !== undefined) patch.gender = args.gender;
    if (args.emergencyContact !== undefined) patch.emergencyContact = args.emergencyContact;
    if (args.vehicles !== undefined) patch.vehicles = args.vehicles;
    if (args.preferences !== undefined) patch.preferences = args.preferences;
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return await ctx.db.get(existing._id);
    }
    return await ctx.db.get(
      await ctx.db.insert('memberProfiles', {
        userId: user._id,
        vehicles: [],
        preferences: { notifications: true, marketing: false, language: 'en' },
        ...patch,
      })
    );
  },
});
