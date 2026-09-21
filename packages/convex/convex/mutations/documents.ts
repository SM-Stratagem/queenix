/**
 * Queenix Gym — Member document signing.
 * Members read active templates and sign with a typed name; staff
 * review signatures in the documents dashboard.
 */

import { v } from 'convex/values';
import { ConvexError } from 'convex/values';
import { mutation } from '../_generated/server';
import { requireUser } from '../_helpers';

/**
 * Sign a document template version. One signature per member per
 * version — re-signing the same version is rejected.
 */
export const signDocument = mutation({
  args: {
    templateId: v.id('documentTemplates'),
    signatureData: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const name = args.signatureData.trim();
    if (!name) {
      throw new ConvexError({ code: 'INVALID_SIGNATURE', message: 'Type your full name to sign' });
    }
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Document not found' });
    }
    const existing = await ctx.db
      .query('signatures')
      .withIndex('by_template', (q) => q.eq('templateId', args.templateId))
      .collect();
    const mine = existing.find(
      (s) =>
        String(s.userId) === String(user._id) &&
        s.documentVersion === (template as any).version
    );
    if (mine) {
      throw new ConvexError({ code: 'ALREADY_SIGNED', message: 'You already signed this version' });
    }
    const id = await ctx.db.insert('signatures', {
      userId: user._id,
      templateId: args.templateId,
      documentVersion: (template as any).version,
      signedAt: Date.now(),
      signatureData: name,
    });
    return await ctx.db.get(id);
  },
});
