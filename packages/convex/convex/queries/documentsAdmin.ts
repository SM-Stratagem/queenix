/**
 * Queenix Gym — Legal documents admin queries (staff only: admin / superadmin / owner).
 *
 * Reads the existing `documentTemplates` + `signatures` tables
 * (see schema/documents.ts). There is no prior query module for these
 * tables; this file is the first reader.
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireRole, requireUser } from '../_helpers';

const STAFF_ROLES = ['admin', 'superadmin', 'owner'] as any;

/** Every legal template with its signature count, newest effective first. */
export const listDocumentTemplates = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx as any, STAFF_ROLES);
    const templates = await ctx.db.query('documentTemplates').collect();
    const rows = await Promise.all(
      templates.map(async (t) => {
        const sigs = await ctx.db
          .query('signatures')
          .withIndex('by_template', (q) => q.eq('templateId', t._id))
          .collect();
        return { ...t, signatureCount: sigs.length };
      })
    );
    return rows.sort((a, b) => b.effectiveDate - a.effectiveDate);
  },
});

/** Signatures for one template, newest first, joined with member name. */
export const listSignatures = query({
  args: { templateId: v.id('documentTemplates'), limit: v.optional(v.number()) },
  handler: async (ctx, { templateId, limit = 50 }) => {
    await requireRole(ctx as any, STAFF_ROLES);
    const sigs = await ctx.db
      .query('signatures')
      .withIndex('by_template', (q) => q.eq('templateId', templateId))
      .order('desc')
      .take(limit);
    return await Promise.all(
      sigs.map(async (s) => {
        const user = await ctx.db.get(s.userId);
        return { ...s, memberName: user?.fullName ?? null, memberEmail: user?.email ?? null };
      })
    );
  },
});

/**
 * Active templates for members, each annotated with the member's own
 * signature (if any) for that version. Unsigned required docs sort first.
 */
export const listActiveTemplates = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx as any);
    const templates = await ctx.db.query('documentTemplates').collect();
    const mine = await ctx.db
      .query('signatures')
      .withIndex('by_user', (q: any) => q.eq('userId', user._id))
      .collect();
    const rows = templates.map((t: any) => ({
      ...t,
      mySignature: mine.find((s: any) => String(s.templateId) === String(t._id) && s.documentVersion === t.version) ?? null,
    }));
    return rows.sort((a: any, b: any) => {
      const aOpen = a.required && !a.mySignature ? 0 : 1;
      const bOpen = b.required && !b.mySignature ? 0 : 1;
      return aOpen - bOpen || b.effectiveDate - a.effectiveDate;
    });
  },
});
