/**
 * Web console route access — the one place that says which staff role can
 * open which admin page. Mirrors the Convex role guards each page's queries
 * enforce (the backend stays the source of truth; this only keeps the UI
 * from offering pages that would fail). Used by AdminNav (which links to
 * show) and AdminShell (staff-only panel instead of a broken page).
 */
import { WEB_LANDING, type Role } from '@queenix/auth/roles';
import { useQuery } from 'convex/react';
import { makeFunctionReference } from 'convex/server';
import { authClient } from './auth-client';

/** Canonical role names from a BetterAuth session user ('owner' → 'finance'). */
export function sessionRoles(user: unknown): string[] {
  const u = user as { roles?: unknown; activeRole?: unknown } | undefined;
  const raw = Array.isArray(u?.roles) ? (u.roles as unknown[]) : u?.activeRole ? [u.activeRole] : [];
  const out: string[] = [];
  for (const r of raw) {
    if (typeof r !== 'string') continue;
    const n = r === 'owner' ? 'finance' : r;
    if (!out.includes(n)) out.push(n);
  }
  return out;
}

/** Roles of the signed-in web user (empty while loading / signed out). */
export function useSessionRoles(): string[] {
  const { data } = authClient.useSession();
  return sessionRoles(data?.user);
}

// packages/convex/convex/queries/capabilities.ts (by name: no codegen needed).
const myGrantsRef = makeFunctionReference<'query', Record<string, never>, string[]>('queries/capabilities:mine');

/**
 * The signed-in user's capability grants (Convex `capabilityGrants`, additive
 * to roles). undefined while loading; pass enabled=false to skip the query
 * (e.g. before Convex has accepted the auth token).
 */
export function useCapabilityGrants(enabled = true): string[] | undefined {
  return useQuery(myGrantsRef, enabled ? {} : 'skip');
}

export function isPureMember(roles: string[]): boolean {
  return roles.length > 0 && roles.every((r) => r === 'member');
}

/** superadmin/admin open everything; everyone else is listed per route. */
const ELEVATED = ['superadmin', 'admin'];

const ROUTE_ROLES: Record<string, string[]> = {
  '/dashboard': ['finance', 'operations'],
  '/members': ['finance', 'operations'],
  '/trainers': ['finance', 'operations'],
  '/trainer': ['trainer'],
  '/team': ['finance', 'operations'],
  '/approvals': ['finance', 'operations'],
  '/classes': ['finance', 'operations', 'trainer'],
  '/branches': ['finance', 'operations'],
  '/events': ['finance', 'operations'],
  '/valet': ['finance', 'operations'],
  '/finance': ['finance'],
  '/coffee': ['finance', 'operations', 'coffee'],
  '/salon': ['finance', 'operations', 'salon'],
  '/crm': ['finance', 'operations'],
  '/promotions': ['finance'],
  '/partners': ['finance'],
  '/documents': ['finance'],
  // Not trainer: engagement queries/mutations reject trainers (STAFF only).
  '/notifications': ['finance', 'operations'],
  '/sales-push': ['finance', 'operations'],
  '/reports': ['finance'],
  '/audit': ['finance'],
  '/settings': ['finance', 'operations', 'salon', 'coffee'],
  // Website CMS (content.manage capability): operations + superadmin/admin,
  // plus anyone granted content.manage (ROUTE_CAPABILITY).
  '/website': ['operations'],
};

/** Routes a capability grant also opens — must match the page's backend requireCapability. */
const ROUTE_CAPABILITY: Record<string, string> = {
  '/website': 'content.manage',
};

/** The capability that would open this path for a non-role holder, if any. */
export function routeCapability(pathname: string): string | undefined {
  const route = routeFor(pathname);
  return route ? ROUTE_CAPABILITY[route] : undefined;
}

/**
 * Public website routes: rendered without the staff console frame or auth.
 * Everything else is the console.
 */
const PUBLIC_ROUTES = ['/', '/schedule', '/gallery', '/contact', '/blog'];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_ROUTES.some((r) => pathname === r || (r !== '/' && pathname.startsWith(`${r}/`)));
}

/** Longest registered route prefix for a pathname ('/members/abc' → '/members'). */
function routeFor(pathname: string): string | undefined {
  return Object.keys(ROUTE_ROLES)
    .filter((r) => r !== '/' && (pathname === r || pathname.startsWith(`${r}/`)))
    .sort((a, b) => b.length - a.length)[0];
}

/** Unlisted paths (login, api) are not gated here. `grants` = capability grants (useCapabilityGrants). */
export function canOpen(roles: string[], pathname: string, grants: readonly string[] = []): boolean {
  if (roles.some((r) => ELEVATED.includes(r))) return true;
  const route = routeFor(pathname);
  if (!route) return true;
  if (roles.some((r) => ROUTE_ROLES[route]!.includes(r))) return true;
  const cap = ROUTE_CAPABILITY[route];
  return !!cap && grants.includes(cap);
}

/**
 * ?next → a same-origin path ('/x?y#z'), or undefined. Resolved the way the
 * router will resolve it, so '//host', '/\\host', 'https:…', 'javascript:'
 * and tab/newline tricks ('/\t/evil.example' → http://evil.example/) all fail.
 */
export function safeNextPath(next: string): string | undefined {
  const base = 'http://queenix.invalid';
  if (!next.startsWith('/')) return undefined;
  try {
    const u = new URL(next, base);
    if (u.origin !== base) return undefined;
    return u.pathname + u.search + u.hash;
  } catch {
    return undefined;
  }
}

/**
 * Where a staff user starts after sign-in. Single-role staff with a home
 * surface (WEB_LANDING: finance/trainer/salon/coffee) go there; admins and
 * operations honor ?next (default '/dashboard') when they can open it.
 */
export function landingFor(roles: string[], next = '/dashboard'): string {
  // Same-site paths only: anything resolving off-origin would be an open redirect.
  next = safeNextPath(next) ?? '/dashboard';
  // '/' is the public website — staff signing in want the console.
  if (next === '/') next = '/dashboard';
  const path = next.split(/[?#]/)[0]!; // gate on the path, not '/finance?x'
  const staff = roles.filter((r) => r !== 'member');
  if (staff.length === 1) {
    const home = WEB_LANDING[staff[0] as Role];
    if (home && home !== '/dashboard' && (next === '/dashboard' || !canOpen(roles, path))) return home;
  }
  if (canOpen(roles, path)) return next;
  return Object.keys(ROUTE_ROLES).find((r) => canOpen(roles, r)) ?? '/dashboard';
}

/**
 * Who may OCR which document kind via /api/ocr (superadmin/admin always).
 * Members may scan only ID documents (their own — the save mutation enforces it).
 */
const OCR_ROLES: Record<string, string[]> = {
  emirates_id: ['operations', 'finance', 'member'],
  passport: ['operations', 'finance', 'member'],
  plate: ['operations'],
  receipt: ['finance'],
  document: ['operations', 'finance', 'trainer', 'salon', 'coffee'],
};

export function canOcr(roles: string[], kind: string): boolean {
  if (roles.some((r) => ELEVATED.includes(r))) return true;
  return roles.some((r) => OCR_ROLES[kind]?.includes(r) ?? false);
}
