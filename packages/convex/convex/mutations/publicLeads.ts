/**
 * Queenix Gym — public website trial form → CRM lead.
 *
 * Unauthenticated by design. Abuse limits: length caps, a honeypot field
 * (bots fill it; we pretend success and store nothing), and per-phone dedupe
 * against recent website leads so resubmits don't flood the pipeline.
 */

import { v } from 'convex/values';
import { mutation } from '../_generated/server';

const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export const submitTrialRequest = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    preferredTime: v.optional(v.string()),
    message: v.optional(v.string()),
    /** Honeypot: hidden input humans never see. */
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const input = validateTrialRequest(args);
    if (!input.ok) throw new Error(input.error);
    if (args.website && args.website.trim() !== '') return { ok: true as const };

    const now = Date.now();
    const recent = await ctx.db
      .query('crmLeads')
      .withIndex('by_stage', (q) => q.eq('stage', 'new'))
      .order('desc')
      .take(200);
    const dupe = recent.some(
      (l) => l.source === 'website' && l.createdAt > now - DEDUPE_WINDOW_MS && digits(l.phone) === digits(input.phone),
    );
    if (dupe) return { ok: true as const };

    const notes = [
      'Free trial request from the website.',
      input.preferredTime && `Preferred time: ${input.preferredTime}`,
      input.message && `Message: ${input.message}`,
    ]
      .filter(Boolean)
      .join('\n');
    await ctx.db.insert('crmLeads', {
      name: input.name,
      phone: input.phone,
      email: input.email,
      source: 'website',
      stage: 'new',
      notes,
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true as const };
  },
});

type TrialInput = { name: string; phone: string; email?: string; preferredTime?: string; message?: string };

/** Trim + validate. Shared shape with the web form; returns the first problem in plain words. */
export function validateTrialRequest(a: {
  name: string;
  phone: string;
  email?: string;
  preferredTime?: string;
  message?: string;
}): { ok: true } & TrialInput | { ok: false; error: string } {
  const name = a.name.trim().replace(/\s+/g, ' ');
  const phone = a.phone.trim();
  const email = a.email?.trim() || undefined;
  const preferredTime = a.preferredTime?.trim().slice(0, 60) || undefined;
  const message = a.message?.trim() || undefined;
  if (name.length < 2 || name.length > 80) return { ok: false, error: 'Please enter your name (2–80 characters).' };
  if (!/^\+?[0-9\s\-().]{7,20}$/.test(phone) || digits(phone).length < 7)
    return { ok: false, error: 'Please enter a valid phone number, e.g. +971 50 123 4567.' };
  if (email && (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    return { ok: false, error: 'That email address doesn’t look right.' };
  if (message && message.length > 1000) return { ok: false, error: 'Please keep your message under 1000 characters.' };
  return { ok: true, name, phone, email, preferredTime, message };
}

function digits(s: string): string {
  return s.replace(/\D/g, '');
}
