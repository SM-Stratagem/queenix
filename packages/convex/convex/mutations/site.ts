/**
 * Queenix Gym — Website CMS writes (console /website). Every write requires
 * capability `content.manage` and is audited. Section shapes come from the
 * one contract in `_site.ts`: saved data must match SITE_DEFAULTS[key]
 * exactly (no unknown fields, strings capped, lists capped).
 */

import { v, ConvexError } from 'convex/values';
import { mutation } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { audit } from '../_helpers';
import { requireCapability } from '../permissions';
import { SITE_DEFAULTS, isSiteKey, slugify } from '../_site';

const MAX_STR = 2000;
const MAX_LIST = 20;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const invalid = (message: string) => new ConvexError({ code: 'INVALID', message });
const editor = (ctx: MutationCtx) => requireCapability(ctx, 'content.manage');

/** Recursively check `val` against the default's shape; returns a clean copy. */
function conform(def: unknown, val: unknown, path: string): unknown {
  if (typeof def === 'string') {
    if (typeof val !== 'string') throw invalid(`${path} must be text`);
    if (val.length > MAX_STR) throw invalid(`${path} is too long (max ${MAX_STR} characters)`);
    return val;
  }
  if (Array.isArray(def)) {
    if (!Array.isArray(val)) throw invalid(`${path} must be a list`);
    if (val.length > MAX_LIST) throw invalid(`${path} has too many items (max ${MAX_LIST})`);
    return val.map((item, i) => conform(def[0], item, `${path}[${i}]`));
  }
  if (!val || typeof val !== 'object' || Array.isArray(val)) throw invalid(`${path} must be an object`);
  const d = def as Record<string, unknown>;
  const o = val as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!(k in d)) throw invalid(`Unknown field ${path}.${k}`);
  return Object.fromEntries(Object.keys(d).map((k) => [k, conform(d[k], o[k], `${path}.${k}`)]));
}

export const saveSection = mutation({
  args: { key: v.string(), data: v.any() },
  handler: async (ctx, { key, data }) => {
    const me = await editor(ctx);
    if (!isSiteKey(key)) throw invalid(`Unknown section ${key}`);
    let mediaId: string | undefined;
    let input = data;
    if (key === 'hero' && data && typeof data === 'object' && 'mediaId' in data) {
      const { mediaId: raw, ...rest } = data as Record<string, unknown>;
      input = rest;
      if (raw !== undefined && raw !== null && raw !== '') {
        const id = ctx.db.normalizeId('siteMedia', String(raw));
        if (!id || !(await ctx.db.get('siteMedia', id))) throw invalid('Hero image not found');
        mediaId = id;
      }
    }
    const clean = conform(SITE_DEFAULTS[key], input, key) as Record<string, unknown>;
    if (mediaId) clean.mediaId = mediaId;
    const row = await ctx.db
      .query('siteContent')
      .withIndex('by_key', (q) => q.eq('key', key))
      .unique();
    const patch = { data: clean, updatedBy: me._id, updatedAt: Date.now() };
    if (row) await ctx.db.patch('siteContent', row._id, patch);
    else await ctx.db.insert('siteContent', { key, ...patch });
    await audit(ctx, {
      actorId: me._id,
      action: 'site.sectionSaved',
      entityType: 'siteContent',
      entityId: key,
      before: row?.data,
      after: clean,
    });
    return null;
  },
});

// ─── Media library ───────────────────────────────────────────────────────

const album = v.union(v.literal('gallery'), v.literal('hero'), v.literal('blog'), v.literal('general'));
type Album = 'gallery' | 'hero' | 'blog' | 'general';

function text(val: string | undefined, label: string, max: number, required = false) {
  const t = (val ?? '').trim();
  if (required && !t) throw invalid(`${label} is required`);
  if (t.length > max) throw invalid(`${label} is too long (max ${max} characters)`);
  return t;
}

async function nextOrder(ctx: MutationCtx, a: Album) {
  const last = await ctx.db
    .query('siteMedia')
    .withIndex('by_album_order', (q) => q.eq('album', a))
    .order('desc')
    .first();
  return (last?.order ?? 0) + 1;
}

/** Upload URL for a website image (POST the file, get { storageId }). */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await editor(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Register an uploaded file. Non-images and files over 8 MB are deleted and
 * reported (returned, not thrown — a throw would roll back the delete).
 */
export const createMedia = mutation({
  args: { storageId: v.id('_storage'), alt: v.string(), caption: v.optional(v.string()), album },
  handler: async (ctx, args) => {
    const me = await editor(ctx);
    const meta = await ctx.db.system.get('_storage', args.storageId);
    if (!meta) throw invalid('Upload not found');
    if (!meta.contentType?.startsWith('image/') || meta.size > MAX_IMAGE_BYTES) {
      await ctx.storage.delete(args.storageId);
      return { ok: false as const, message: 'Images only, up to 8 MB.' };
    }
    const alt = text(args.alt, 'Alt text', 300, true);
    const caption = text(args.caption, 'Caption', 500) || undefined;
    const id = await ctx.db.insert('siteMedia', {
      storageId: args.storageId,
      alt,
      caption,
      album: args.album,
      order: await nextOrder(ctx, args.album),
      published: false,
      createdBy: me._id,
      createdAt: Date.now(),
    });
    await audit(ctx, { actorId: me._id, action: 'site.mediaCreated', entityType: 'siteMedia', entityId: id, after: { alt, album: args.album } });
    return { ok: true as const, id };
  },
});

export const updateMedia = mutation({
  args: {
    id: v.id('siteMedia'),
    alt: v.optional(v.string()),
    caption: v.optional(v.string()),
    album: v.optional(album),
    published: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...args }) => {
    const me = await editor(ctx);
    const m = await ctx.db.get('siteMedia', id);
    if (!m) throw invalid('Image not found');
    const patch: Record<string, unknown> = {};
    if (args.alt !== undefined) patch.alt = text(args.alt, 'Alt text', 300, true);
    if (args.caption !== undefined) patch.caption = text(args.caption, 'Caption', 500) || undefined;
    if (args.published !== undefined) patch.published = args.published;
    if (args.album !== undefined && args.album !== m.album) {
      patch.album = args.album;
      patch.order = await nextOrder(ctx, args.album);
    }
    await ctx.db.patch('siteMedia', id, patch);
    await audit(ctx, { actorId: me._id, action: 'site.mediaUpdated', entityType: 'siteMedia', entityId: id, before: { alt: m.alt, album: m.album, published: m.published }, after: patch });
    return null;
  },
});

/** Move an image one place up (-1) or down (+1) within its album. */
export const moveMedia = mutation({
  args: { id: v.id('siteMedia'), dir: v.union(v.literal(-1), v.literal(1)) },
  handler: async (ctx, { id, dir }) => {
    const me = await editor(ctx);
    const m = await ctx.db.get('siteMedia', id);
    if (!m) throw invalid('Image not found');
    // ponytail: renumbers the whole album (fixes seeded ties); fine for a few hundred images.
    const items = await ctx.db
      .query('siteMedia')
      .withIndex('by_album_order', (q) => q.eq('album', m.album))
      .take(500);
    const i = items.findIndex((x) => x._id === id);
    const j = i + dir;
    if (j < 0 || j >= items.length) return null;
    [items[i], items[j]] = [items[j]!, items[i]!];
    for (let k = 0; k < items.length; k++) {
      if (items[k]!.order !== k + 1) await ctx.db.patch('siteMedia', items[k]!._id, { order: k + 1 });
    }
    await audit(ctx, { actorId: me._id, action: 'site.mediaMoved', entityType: 'siteMedia', entityId: id, after: { dir } });
    return null;
  },
});

/** Delete an image (and its stored file); clears hero/blog-cover references to it. */
export const deleteMedia = mutation({
  args: { id: v.id('siteMedia') },
  handler: async (ctx, { id }) => {
    const me = await editor(ctx);
    const m = await ctx.db.get('siteMedia', id);
    if (!m) return null;
    if (m.storageId) await ctx.storage.delete(m.storageId);
    await ctx.db.delete('siteMedia', id);
    const hero = await ctx.db.query('siteContent').withIndex('by_key', (q) => q.eq('key', 'hero')).unique();
    if (hero?.data?.mediaId === id) {
      const { mediaId: _drop, ...rest } = hero.data;
      await ctx.db.patch('siteContent', hero._id, { data: rest });
    }
    // ponytail: blogPosts has no cover index; scans up to 500 posts.
    for (const p of await ctx.db.query('blogPosts').take(500)) {
      if (p.coverMediaId === id) await ctx.db.patch('blogPosts', p._id, { coverMediaId: undefined });
    }
    await audit(ctx, { actorId: me._id, action: 'site.mediaDeleted', entityType: 'siteMedia', entityId: id, before: { alt: m.alt, album: m.album } });
    return null;
  },
});

// ─── Blog ────────────────────────────────────────────────────────────────

/**
 * Create (no id) or update a post. `status: 'published'` publishes
 * (publishedAt is set on first publish only); `'draft'` unpublishes.
 */
export const savePost = mutation({
  args: {
    id: v.optional(v.id('blogPosts')),
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    body: v.string(),
    coverMediaId: v.optional(v.union(v.id('siteMedia'), v.null())),
    tags: v.array(v.string()),
    status: v.optional(v.union(v.literal('draft'), v.literal('published'))),
  },
  handler: async (ctx, { id, ...args }) => {
    const me = await editor(ctx);
    const existing = id ? await ctx.db.get('blogPosts', id) : null;
    if (id && !existing) throw invalid('Post not found');
    const title = text(args.title, 'Title', 200, true);
    const slug = args.slug.trim();
    if (!slug || slugify(slug) !== slug) throw invalid('Slug may only use lowercase letters, numbers and dashes');
    const clash = await ctx.db.query('blogPosts').withIndex('by_slug', (q) => q.eq('slug', slug)).first();
    if (clash && clash._id !== id) throw invalid(`Slug "${slug}" is already used by another post`);
    const excerpt = text(args.excerpt, 'Excerpt', 500);
    if (args.body.length > 100_000) throw invalid('Body is too long (max 100,000 characters)');
    if (args.tags.length > 10) throw invalid('At most 10 tags');
    const tags = [...new Set(args.tags.map((t) => text(t, 'Tag', 40)).filter(Boolean))];
    let coverMediaId: Id<'siteMedia'> | undefined;
    if (args.coverMediaId) {
      if (!(await ctx.db.get('siteMedia', args.coverMediaId))) throw invalid('Cover image not found');
      coverMediaId = args.coverMediaId;
    }
    const status = args.status ?? existing?.status ?? 'draft';
    const now = Date.now();
    const fields = {
      title,
      slug,
      excerpt,
      body: args.body,
      coverMediaId,
      tags,
      status,
      publishedAt: existing?.publishedAt ?? (status === 'published' ? now : undefined),
      updatedAt: now,
    };
    let postId: Id<'blogPosts'>;
    if (existing) {
      postId = existing._id;
      await ctx.db.patch('blogPosts', postId, fields);
    } else {
      postId = await ctx.db.insert('blogPosts', { ...fields, authorId: me._id, createdAt: now });
    }
    const action = !existing ? 'site.postCreated' : existing.status !== status ? `site.post${status === 'published' ? 'Published' : 'Unpublished'}` : 'site.postUpdated';
    await audit(ctx, { actorId: me._id, action, entityType: 'blogPosts', entityId: postId, before: existing ? { slug: existing.slug, status: existing.status } : undefined, after: { slug, status } });
    return postId;
  },
});

export const deletePost = mutation({
  args: { id: v.id('blogPosts') },
  handler: async (ctx, { id }) => {
    const me = await editor(ctx);
    const p = await ctx.db.get('blogPosts', id);
    if (!p) return null;
    await ctx.db.delete('blogPosts', id);
    await audit(ctx, { actorId: me._id, action: 'site.postDeleted', entityType: 'blogPosts', entityId: id, before: { slug: p.slug, title: p.title, status: p.status } });
    return null;
  },
});
