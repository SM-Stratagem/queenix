/**
 * Queenix Gym — Website CMS staff reads (console /website). Unlike the public
 * queries these include drafts and unpublished media. Require `content.manage`.
 */

import { v } from 'convex/values';
import { query } from '../_generated/server';
import { requireCapability } from '../permissions';
import { SITE_KEYS, mergeSection, mediaUrl } from '../_site';

/** Every section's merged (defaults + stored) values. */
export const sections = query({
  args: {},
  handler: async (ctx) => {
    await requireCapability(ctx, 'content.manage');
    const rows = await ctx.db.query('siteContent').take(100);
    return SITE_KEYS.map((key) => {
      const row = rows.find((r) => r.key === key);
      return {
        key,
        data: mergeSection(key, row?.data) as Record<string, unknown>,
        updatedAt: row?.updatedAt ?? null,
      };
    });
  },
});

/** Media library (all albums or one), in album order, with display URLs. */
export const listMedia = query({
  args: { album: v.optional(v.union(v.literal('gallery'), v.literal('hero'), v.literal('blog'), v.literal('general'))) },
  handler: async (ctx, { album }) => {
    await requireCapability(ctx, 'content.manage');
    const rows = album
      ? await ctx.db.query('siteMedia').withIndex('by_album_order', (q) => q.eq('album', album)).take(500)
      : await ctx.db.query('siteMedia').withIndex('by_album_order').take(500);
    return await Promise.all(rows.map(async (m) => ({ ...m, src: await mediaUrl(ctx, m) })));
  },
});

/** Posts (newest edit first), optionally by status. */
export const listPosts = query({
  args: { status: v.optional(v.union(v.literal('draft'), v.literal('published'))) },
  handler: async (ctx, { status }) => {
    await requireCapability(ctx, 'content.manage');
    const rows = status
      ? await ctx.db.query('blogPosts').withIndex('by_status_published', (q) => q.eq('status', status)).take(300)
      : await ctx.db.query('blogPosts').take(300);
    return rows
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(({ body: _body, ...p }) => p);
  },
});

export const getPost = query({
  args: { id: v.id('blogPosts') },
  handler: async (ctx, { id }) => {
    await requireCapability(ctx, 'content.manage');
    return await ctx.db.get('blogPosts', id);
  },
});
