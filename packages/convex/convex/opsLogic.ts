/**
 * Queenix Gym — pure rules for bookings, venue queues, memberships, the
 * public trial form and CMS uploads (no Convex ctx). Shared by the
 * mutations and their vitest (tests/unit/ops-logic.test.ts).
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

/* ---------------- class bookings ---------------- */

export type BookingStatus = 'confirmed' | 'waitlisted' | 'cancelled' | 'attended' | 'no_show';
export type ClassCounts = { bookedCount: number; waitlistCount: number };

/**
 * Counter changes when a booking is cancelled. Only a confirmed booking
 * holds a seat (and frees one for the waitlist); a waitlisted one holds a
 * waitlist slot. attended / no_show are history and can't be cancelled.
 */
export function cancelBookingEffect(
  status: BookingStatus,
  counts: ClassCounts,
  hasWaitlisted: boolean,
): { ok: false } | { ok: true; counts: ClassCounts; promote: boolean } {
  const booked = Math.max(0, counts.bookedCount);
  const waiting = Math.max(0, counts.waitlistCount ?? 0);
  if (status === 'cancelled') return { ok: true, counts: { bookedCount: booked, waitlistCount: waiting }, promote: false };
  if (status === 'waitlisted') {
    return { ok: true, counts: { bookedCount: booked, waitlistCount: Math.max(0, waiting - 1) }, promote: false };
  }
  if (status !== 'confirmed') return { ok: false };
  // The freed seat goes straight to the earliest waitlisted booking.
  if (hasWaitlisted) {
    return { ok: true, counts: { bookedCount: booked, waitlistCount: Math.max(0, waiting - 1) }, promote: true };
  }
  return { ok: true, counts: { bookedCount: Math.max(0, booked - 1), waitlistCount: waiting }, promote: false };
}

const STAFF_ROLES = new Set(['superadmin', 'admin', 'finance', 'owner', 'operations', 'salon', 'coffee', 'trainer']);

/**
 * Members need a live membership (active or trial, not past its end date)
 * to book or waitlist a class. Staff and trainers book without one.
 */
export function canBookClass(
  roles: string[],
  memberships: { status: string; endDate: number }[],
  now: number,
): boolean {
  if (roles.some((r) => STAFF_ROLES.has(r))) return true;
  return memberships.some((m) => (m.status === 'active' || m.status === 'trial') && m.endDate > now);
}

/* ---------------- coffee / salon state machines ---------------- */

export const COFFEE_NEXT: Record<string, string[]> = {
  queued: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'cancelled'],
  served: [],
  cancelled: [],
};

export const SALON_NEXT: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/** 'same' = already there (a racing second click), treat as a no-op. */
export function transition(map: Record<string, string[]>, from: string, to: string): 'ok' | 'same' | 'invalid' {
  if (from === to) return 'same';
  return (map[from] ?? []).includes(to) ? 'ok' : 'invalid';
}

/* ---------------- memberships ---------------- */

type Freeze = { startDate: number; endDate: number; reason?: string };

/**
 * Unfreezing before the freeze runs out gives back only the days actually
 * frozen: the unused part comes off `endDate` and the freeze record closes
 * at `now`.
 */
export function unfreezeEarly(m: { endDate: number; freezes: Freeze[] }, now: number): { endDate: number; freezes: Freeze[] } {
  const i = m.freezes.length - 1;
  const last = m.freezes[i];
  if (!last || last.endDate <= now) return { endDate: m.endDate, freezes: m.freezes };
  const unused = last.endDate - Math.max(now, last.startDate);
  const freezes = m.freezes.slice();
  freezes[i] = { ...last, endDate: Math.max(now, last.startDate) };
  return { endDate: m.endDate - unused, freezes };
}

/* ---------------- public trial form ---------------- */

export const TRIAL_DEDUPE_WINDOW_MS = DAY_MS;
export const TRIAL_THROTTLE_WINDOW_MS = 60 * 1000;
/** ponytail: global cap, not per-IP (a mutation can't see the IP); per-IP limiting belongs in a route in front. */
export const TRIAL_THROTTLE_MAX = 20;

/**
 * `recentLeads` = website leads created inside the throttle window;
 * `samePhoneLeads` = createdAt of website leads with the same phone digits.
 */
export function trialLeadDecision(
  now: number,
  recentLeads: number,
  samePhoneLeads: number[],
): 'insert' | 'duplicate' | 'throttled' {
  if (samePhoneLeads.some((t) => t > now - TRIAL_DEDUPE_WINDOW_MS)) return 'duplicate';
  if (recentLeads >= TRIAL_THROTTLE_MAX) return 'throttled';
  return 'insert';
}

export function phoneDigits(s: string): string {
  return s.replace(/\D/g, '');
}

/* ---------------- CMS ---------------- */

const RASTER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

/** Raster images only — SVG can carry script and is served from our origin. */
export function isAllowedImageType(contentType: string | undefined): boolean {
  const base = (contentType ?? '').split(';')[0]!.trim().toLowerCase();
  return RASTER_TYPES.has(base);
}

/** Link fields: relative paths, anchors, http(s), mailto, tel. Never javascript:/data:. */
export function isSafeHref(href: string): boolean {
  const h = href.trim();
  if (h === '' || h.startsWith('#') || (h.startsWith('/') && !h.startsWith('//'))) return true;
  return /^(https?:\/\/|mailto:|tel:)/i.test(h);
}

/* ---------------- venue payment links ---------------- */

/** Old rows stored `stripe:<id>:<client_secret>` as the "link" — never hand that out. */
export function safePaymentLink(link: string | undefined | null): string | undefined {
  return link && !link.startsWith('stripe:') ? link : undefined;
}

/** Row copy with an unsafe stored `paymentLink` dropped. */
export function scrubPaymentLink<T extends { paymentLink?: string | null }>(row: T): T {
  return row.paymentLink === undefined || safePaymentLink(row.paymentLink) ? row : { ...row, paymentLink: undefined };
}
