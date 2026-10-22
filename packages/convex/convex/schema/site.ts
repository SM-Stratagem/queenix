/**
 * Queenix Gym — Convex schema tables: public website CMS
 * (section content, media library/gallery, blog).
 *
 * Section shapes + defaults live in `convex/_site.ts` (the one contract the
 * public site and the console editors both read).
 */

import { defineTable } from 'convex/server'
import { v } from 'convex/values'

/** One row per website section key ('hero', 'about', ...). `data` shape per key: see _site.ts. */
export const siteContent = defineTable({
  key: v.string(),
  data: v.any(),
  updatedBy: v.optional(v.id('users')),
  updatedAt: v.number(),
}).index('by_key', ['key'])

/** Media library. Either an uploaded file (storageId) or an external URL (seeded stock photos). */
export const siteMedia = defineTable({
  storageId: v.optional(v.id('_storage')),
  url: v.optional(v.string()),
  alt: v.string(),
  caption: v.optional(v.string()),
  album: v.union(v.literal('gallery'), v.literal('hero'), v.literal('blog'), v.literal('general')),
  order: v.number(),
  published: v.boolean(),
  createdBy: v.optional(v.id('users')),
  createdAt: v.number(),
}).index('by_album_order', ['album', 'order'])

export const blogPosts = defineTable({
  slug: v.string(),
  title: v.string(),
  excerpt: v.string(),
  /** Markdown. Rendered with raw HTML disabled. */
  body: v.string(),
  coverMediaId: v.optional(v.id('siteMedia')),
  tags: v.array(v.string()),
  status: v.union(v.literal('draft'), v.literal('published')),
  publishedAt: v.optional(v.number()),
  authorId: v.optional(v.id('users')),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_slug', ['slug'])
  .index('by_status_published', ['status', 'publishedAt'])
