/**
 * Queenix Gym — public website queries (no auth).
 *
 * Everything here is readable by anyone on the internet, so every query
 * returns an explicit, minimal shape: published rows only, no user emails or
 * phones, no internal ids beyond what a page needs to key a list.
 * Time-based queries take `now` from the caller (queries must not read the clock).
 */

import { v } from 'convex/values';
import { query, type QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { SITE_KEYS, mediaUrl, mergeSection, type SiteSections } from '../_site';

const DAY = 24 * 60 * 60 * 1000;

/** Every section, stored copy merged over defaults, plus the resolved hero image. */
export const getSections = query({
  args: {},
  handler: async (ctx) => {
    const out = {} as SiteSections;
    for (const key of SITE_KEYS) {
      const row = await ctx.db
        .query('siteContent')
        .withIndex('by_key', (q) => q.eq('key', key))
        .first();
      (out as Record<string, unknown>)[key] = mergeSection(key, row?.data);
    }
    // Hero image: the chosen media row if it is published, else the first published hero.
    let hero: Doc<'siteMedia'> | null = null;
    const chosen = out.hero.mediaId ? ctx.db.normalizeId('siteMedia', out.hero.mediaId) : null;
    if (chosen) {
      const m = await ctx.db.get(chosen);
      if (m?.published) hero = m;
    }
    if (!hero) {
      hero =
        (
          await ctx.db
            .query('siteMedia')
            .withIndex('by_album_order', (q) => q.eq('album', 'hero'))
            .filter((q) => q.eq(q.field('published'), true))
            .take(1)
        )[0] ?? null;
    }
    const heroImage = hero ? await publicMedia(ctx, hero) : null;
    const { mediaId: _omit, ...heroCopy } = out.hero;
    return { ...out, hero: heroCopy, heroImage };
  },
});

/** Published media of one album, in display order. */
export const listMedia = query({
  args: {
    album: v.union(v.literal('gallery'), v.literal('hero'), v.literal('blog'), v.literal('general')),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { album, limit }) => {
    const rows = await ctx.db
      .query('siteMedia')
      .withIndex('by_album_order', (q) => q.eq('album', album))
      .filter((q) => q.eq(q.field('published'), true))
      .take(clamp(limit ?? 60, 1, 200));
    const out = await Promise.all(rows.map((m) => publicMedia(ctx, m)));
    return out.filter((m): m is PublicMedia => m !== null);
  },
});

/** Published posts, newest first (no bodies). */
export const listPosts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const rows = await ctx.db
      .query('blogPosts')
      .withIndex('by_status_published', (q) => q.eq('status', 'published'))
      .order('desc')
      .take(clamp(limit ?? 50, 1, 100));
    return await Promise.all(
      rows.map(async (p) => ({
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt,
        tags: p.tags,
        publishedAt: p.publishedAt ?? p.createdAt,
        cover: await coverFor(ctx, p.coverMediaId),
      })),
    );
  },
});

/** One published post by slug (markdown body), or null. Drafts are never visible. */
export const getPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const p = await ctx.db
      .query('blogPosts')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .filter((q) => q.eq(q.field('status'), 'published'))
      .first();
    if (!p) return null;
    return {
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      body: p.body,
      tags: p.tags,
      publishedAt: p.publishedAt ?? p.createdAt,
      updatedAt: p.updatedAt,
      cover: await coverFor(ctx, p.coverMediaId),
    };
  },
});

/** Scheduled classes starting in [now, now + days). */
export const listSchedule = query({
  args: { now: v.number(), days: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, { now, days, limit }) => {
    const until = now + clamp(days ?? 7, 1, 14) * DAY;
    const rows = await ctx.db
      .query('classInstances')
      .withIndex('by_startsAt', (q) => q.gte('startsAt', now).lt('startsAt', until))
      .filter((q) => q.eq(q.field('status'), 'scheduled'))
      .take(clamp(limit ?? 100, 1, 200));
    const types = new Map<Id<'classTypes'>, Doc<'classTypes'> | null>();
    const names = new Map<Id<'users'>, string | null>();
    return await Promise.all(
      rows.map(async (ci) => {
        if (!types.has(ci.classTypeId)) types.set(ci.classTypeId, await ctx.db.get(ci.classTypeId));
        const t = types.get(ci.classTypeId);
        const coachId = ci.trainerId ?? t?.trainerId;
        if (coachId && !names.has(coachId)) names.set(coachId, (await ctx.db.get(coachId))?.fullName ?? null);
        return {
          id: ci._id,
          name: t?.name ?? 'Class',
          category: t?.category ?? '',
          difficulty: t?.difficulty ?? null,
          startsAt: ci.startsAt,
          endsAt: ci.endsAt,
          coach: coachId ? (names.get(coachId) ?? null) : null,
          spotsLeft: Math.max(0, ci.capacity - ci.bookedCount),
        };
      }),
    );
  },
});

/** Public coach cards: name, photo, bio, specialties, rating. */
export const listTrainers = query({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query('trainerProfiles').take(24);
    const cards = await Promise.all(
      profiles.map(async (p) => {
        const u = await ctx.db.get(p.userId);
        if (!u || !u.roles.includes('trainer')) return null;
        return {
          id: p._id,
          name: u.fullName,
          imageUrl: p.profileImageUrl ?? u.avatarUrl ?? null,
          bio: p.bio ?? '',
          specialties: p.specialties.slice(0, 4),
          rating: p.reviewCount > 0 ? p.rating : null,
          reviewCount: p.reviewCount,
        };
      }),
    );
    return cards.filter((c) => c !== null);
  },
});

/** Active, sellable membership plans, cheapest first. */
export const listPlans = query({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db
      .query('membershipPlans')
      .withIndex('by_active', (q) => q.eq('isActive', true))
      .take(30);
    return plans
      .filter((p) => !p.name.startsWith('__'))
      .sort((a, b) => a.priceCents - b.priceCents)
      .map((p) => ({
        id: p._id,
        name: p.name,
        description: p.description,
        durationDays: p.durationDays,
        priceCents: p.priceCents,
        currency: p.currency,
        features: p.features,
        isTrial: p.isTrial,
        trialDays: p.trialDays,
      }));
  },
});

// --- helpers -----------------------------------------------------------------

type PublicMedia = { id: Id<'siteMedia'>; url: string; alt: string; caption: string | null };

async function publicMedia(ctx: QueryCtx, m: Doc<'siteMedia'>): Promise<PublicMedia | null> {
  const url = await mediaUrl(ctx, m);
  return url ? { id: m._id, url, alt: m.alt, caption: m.caption ?? null } : null;
}

async function coverFor(ctx: QueryCtx, id: Id<'siteMedia'> | undefined): Promise<PublicMedia | null> {
  if (!id) return null;
  const m = await ctx.db.get(id);
  return m?.published ? await publicMedia(ctx, m) : null;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.floor(n)));
}
