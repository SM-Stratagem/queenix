/**
 * Queenix Gym — OCR scan saves.
 * Clients OCR through the web /api/ocr route, show the fields in a review
 * form, then (on confirm) upload the image here and save the human-checked
 * values. Nothing from OCR is stored without that confirmation.
 */

import { v, ConvexError } from 'convex/values';
import { mutation } from '../_generated/server';
import { audit, requireRole, requireUser } from '../_helpers';

/** Short-lived URL the client POSTs the scanned image to; returns { storageId }. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

const opt = (s?: string) => s?.trim() || undefined;

/**
 * Save a confirmed Emirates ID / passport onto a member profile.
 * No memberId (or your own) = self-scan; another member needs operations/finance.
 */
export const saveIdentity = mutation({
  args: {
    memberId: v.optional(v.id('users')),
    docType: v.union(v.literal('emirates_id'), v.literal('passport')),
    docNumber: v.string(),
    fullName: v.string(),
    nationality: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    sex: v.optional(v.string()),
    scanStorageId: v.optional(v.id('_storage')),
  },
  handler: async (ctx, { memberId, scanStorageId, ...doc }) => {
    const me = await requireUser(ctx);
    const target = memberId ?? me._id;
    if (String(target) !== String(me._id)) await requireRole(ctx, ['operations', 'finance']);
    if (!(await ctx.db.get(target))) throw new ConvexError({ code: 'NOT_FOUND', message: 'Member not found' });
    const docNumber = doc.docNumber.trim().toUpperCase();
    const fullName = doc.fullName.trim();
    if (!docNumber || !fullName) {
      throw new ConvexError({ code: 'INVALID_IDENTITY', message: 'Document number and full name are required' });
    }
    const identity = {
      docType: doc.docType,
      docNumber,
      fullName,
      nationality: opt(doc.nationality),
      dateOfBirth: opt(doc.dateOfBirth),
      expiryDate: opt(doc.expiryDate),
      sex: opt(doc.sex),
      verifiedAt: Date.now(),
      verifiedBy: me._id,
      scanStorageId,
    };
    const profile = await ctx.db
      .query('memberProfiles')
      .withIndex('by_user', (q) => q.eq('userId', target))
      .first();
    if (profile) await ctx.db.patch(profile._id, { identity });
    else {
      await ctx.db.insert('memberProfiles', {
        userId: target,
        vehicles: [],
        preferences: { notifications: true, marketing: false, language: 'en' },
        identity,
      });
    }
    await audit(ctx, {
      actorId: me._id,
      action: 'member.identityVerified',
      entityType: 'user',
      entityId: target,
      after: { docType: doc.docType, selfScan: String(target) === String(me._id) },
    });
    return identity;
  },
});

/**
 * Attach a scanned, signed paper form to a member as their signature for the
 * template's current version (patches an existing e-signature if present).
 */
export const attachPaperForm = mutation({
  args: {
    memberId: v.id('users'),
    templateId: v.id('documentTemplates'),
    scanStorageId: v.id('_storage'),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const staff = await requireRole(ctx, ['operations', 'finance']);
    const [member, template] = await Promise.all([ctx.db.get(args.memberId), ctx.db.get(args.templateId)]);
    if (!member || !template) throw new ConvexError({ code: 'NOT_FOUND', message: 'Member or document not found' });
    const paper = {
      paperScanStorageId: args.scanStorageId,
      paperText: args.text.slice(0, 20_000),
      uploadedBy: staff._id,
    };
    const existing = (
      await ctx.db
        .query('signatures')
        .withIndex('by_user', (q) => q.eq('userId', args.memberId))
        .collect()
    ).find((s) => String(s.templateId) === String(args.templateId) && s.documentVersion === template.version);
    const id = existing
      ? (await ctx.db.patch(existing._id, paper), existing._id)
      : await ctx.db.insert('signatures', {
          userId: args.memberId,
          templateId: args.templateId,
          documentVersion: template.version,
          signedAt: Date.now(),
          signatureData: member.fullName,
          ...paper,
        });
    await audit(ctx, {
      actorId: staff._id,
      action: 'document.paperAttached',
      entityType: 'signature',
      entityId: id,
      after: { memberId: args.memberId, templateId: args.templateId },
    });
    return await ctx.db.get(id);
  },
});
