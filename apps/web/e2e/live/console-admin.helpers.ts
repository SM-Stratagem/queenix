/**
 * Shared helpers for the console-admin live suite (superadmin / admin /
 * finance web console against the production build).
 *
 *   E2E_BASE_URL=http://10.12.19.174:4000 \
 *   QUEENIX_ADMIN_TOKEN=$(grep '^QUEENIX_ADMIN_TOKEN=' .env.prod.local | cut -d= -f2-) \
 *   npx playwright test e2e/live/console-admin
 *
 * Sign-in is rate limited (10/min/IP, shared by every tester), so each
 * account signs in ONCE per run and the storageState is reused.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, request, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';
import { submitLogin, PASSWORD } from '../login';

export { PASSWORD };
export const BASE = process.env.E2E_BASE_URL ?? 'http://10.12.19.174:4000';
export const CONVEX_URL = process.env.E2E_CONVEX_URL ?? 'http://10.12.19.174:4210';
export const ADMIN_TOKEN = process.env.QUEENIX_ADMIN_TOKEN ?? 'queenix-dev-admin-token';
export const SHOTS = process.env.E2E_SHOTS_DIR;
export const api = anyApi as any;
export const stamp = Date.now().toString(36);

// Outside apps/web/test-results: other suites' runs wipe that directory.
const AUTH_DIR = process.env.E2E_AUTH_DIR ?? path.join(os.tmpdir(), 'queenix-console-admin-auth');

/** Every console route (apps/web/src/app minus (site), api, login). */
export const CONSOLE_ROUTES = [
  '/dashboard', '/members', '/trainers', '/trainer', '/team', '/approvals', '/classes', '/branches',
  '/events', '/valet', '/finance', '/coffee', '/salon', '/crm', '/promotions', '/partners', '/documents',
  '/notifications', '/sales-push', '/website', '/website/media', '/website/blog', '/website/blog/new',
  '/reports', '/audit', '/settings',
];

/** Uncaught page errors + console errors; a crashing route fails the test. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror ${page.url()} ${e.message.slice(0, 300)}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // Browser noise unrelated to the app (favicon / aborted RSC prefetch on navigation).
    if (/favicon|net::ERR_ABORTED|Failed to fetch RSC payload/.test(t)) return;
    errors.push(`console ${page.url()} ${t.slice(0, 300)}`);
  });
  return errors;
}

export const main = (page: Page) => page.locator('main');

/** Page rendered real content: no gate, no degraded query boundary, no crash. */
export async function expectLive(page: Page) {
  await expect(main(page)).not.toBeEmpty();
  await expect(main(page)).not.toContainText('Connecting…', { timeout: 30_000 });
  await expect(main(page)).not.toContainText('Live data unavailable');
  await expect(main(page)).not.toContainText("Live data couldn't be authorized");
  await expect(main(page)).not.toContainText('Staff only');
}

export async function expectStaffOnly(page: Page, route: string) {
  await page.goto(route);
  await expect(main(page).getByRole('alert')).toContainText('Staff only', { timeout: 30_000 });
}

export async function navLinks(page: Page): Promise<string[]> {
  const nav = page.getByRole('navigation', { name: 'Admin' });
  await expect(nav.getByRole('link').first()).toBeVisible({ timeout: 30_000 });
  return nav.getByRole('link').allTextContents();
}

export async function navSections(page: Page): Promise<string[]> {
  const nav = page.getByRole('navigation', { name: 'Admin' });
  await expect(nav.getByRole('link').first()).toBeVisible({ timeout: 30_000 });
  return nav.evaluate((n) => [...n.children].map((s) => (s.children[0]!.textContent ?? '').trim()));
}

/** Screenshot at phone + desktop width when E2E_SHOTS_DIR is set; checks no horizontal page scroll at 390. */
export async function shoot(page: Page, name: string): Promise<{ overflowPx: number }> {
  let overflowPx = 0;
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(400);
    if (width === 390) {
      overflowPx = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    }
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/console-admin-${name}-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  return { overflowPx };
}

/** Sign-up is rate limited per IP like sign-in (shared by all testers): wait out 429s. */
async function postSignUp(ctx: import('@playwright/test').APIRequestContext, data: Record<string, string>) {
  for (let attempt = 0; ; attempt++) {
    const r = await ctx.post('/api/auth/sign-up/email', { data });
    if (r.status() === 429 && attempt < 8) {
      const wait = Number(r.headers()['x-retry-after'] ?? r.headers()['retry-after'] ?? 10);
      await new Promise((res) => setTimeout(res, (wait + 1) * 1000));
      continue;
    }
    if (r.status() >= 500 && attempt < 3 && /timed out/.test(await r.text())) continue;
    return r;
  }
}

/** Create a fresh BetterAuth account (member) → BetterAuth user id. */
export async function signUp(email: string, name: string): Promise<string> {
  const ctx = await request.newContext({ baseURL: BASE, extraHTTPHeaders: { origin: BASE } });
  const res = await postSignUp(ctx, { email, password: PASSWORD, name, fullName: name });
  const body = await res.json().catch(() => ({}));
  await ctx.dispose();
  if (!res.ok()) throw new Error(`sign-up ${email} → ${res.status()} ${JSON.stringify(body)}`);
  return body.user.id as string;
}

/** Role API (x-queenix-admin-token): sets BetterAuth roles + syncs Convex. */
export async function setRoles(baUserId: string, roles: string[], activeRole = roles[0]!) {
  const ctx = await request.newContext({ baseURL: BASE });
  try {
    // Retries only Convex 1s UDF timeouts (machine-load flake); any other failure throws at once.
    for (let attempt = 0; ; attempt++) {
      const res = await ctx.post(`/api/admin/users/${baUserId}/role`, {
        headers: { 'x-queenix-admin-token': ADMIN_TOKEN, 'content-type': 'application/json' },
        data: { activeRole, roles },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok()) return body;
      if (attempt < 4 && /timed out/.test(JSON.stringify(body))) continue;
      throw new Error(`role API ${baUserId} → ${res.status()} ${JSON.stringify(body)}`);
    }
  } finally {
    await ctx.dispose();
  }
}

/** One sign-in per account per ~2h; the storageState file is reused across spec files. */
export async function sessionFile(browser: Browser, email: string): Promise<string> {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const file = path.join(AUTH_DIR, `${email.replace(/[^a-z0-9]/gi, '_')}.json`);
  if (fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < 2 * 3600_000) return file;
  const ctx = await browser.newContext({ baseURL: BASE });
  const page = await ctx.newPage();
  await submitLogin(page, email);
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 90_000 });
  await ctx.storageState({ path: file });
  await ctx.close();
  return file;
}

/** A browser context signed in as `email` (reusing its stored session). */
export async function contextAs(browser: Browser, email: string): Promise<BrowserContext> {
  return browser.newContext({ baseURL: BASE, storageState: await sessionFile(browser, email), viewport: { width: 1440, height: 900 } });
}

/** Convex client authed exactly like the web app: JWT minted by /api/convex/token for this session. */
export async function convexAs(ctx: BrowserContext): Promise<Convex> {
  const res = await ctx.request.get(`${BASE}/api/convex/token`);
  expect(res.status(), 'convex token mint').toBe(200);
  const { token } = await res.json();
  const client = new ConvexHttpClient(CONVEX_URL);
  client.setAuth(token);
  return retrying(client);
}

/** Sign up + promote a fresh user; returns its email. */
export async function freshUser(kind: string, roles: string[], activeRole = roles[0]!) {
  const email = `t-console-admin-${kind}-${stamp}@queenix.test`;
  const name = `CA ${kind} ${stamp}`;
  const baId = await signUp(email, name);
  if (!(roles.length === 1 && roles[0] === 'member')) await setRoles(baId, roles, activeRole);
  return { email, name, baId };
}

/**
 * The shared box runs at load avg 30-50, so Convex UDFs sporadically hit the
 * 1s execution cap. A timed-out UDF is rolled back, so retrying is safe; any
 * other error (FORBIDDEN, validation) surfaces immediately.
 */
export async function retry<T>(fn: () => Promise<T>, tries = 8): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i < tries && /timed out|fetch failed|ECONNRESET|socket hang up/.test(String(e?.message ?? e))) {
        await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      throw e;
    }
  }
}

export type Convex = { query: (f: any, a: any) => Promise<any>; mutation: (f: any, a: any) => Promise<any> };
function retrying(c: ConvexHttpClient): Convex {
  return {
    query: (f, a) => retry(() => c.query(f, a)),
    mutation: (f, a) => retry(() => c.mutation(f, a)),
  };
}

/** Parse "1,234.50 AED" → 123450 cents. */
export function cents(text: string): number {
  const m = text.replace(/[,−]/g, (c) => (c === ',' ? '' : '-')).match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`no amount in "${text}"`);
  return Math.round(Number(m[0]) * 100);
}

/**
 * Fresh account driven purely over HTTP (no rate-limited sign-in): the
 * sign-up response's session cookie stays in `http`, and `convex` is authed
 * with a JWT from /api/convex/token — the same token the web/mobile apps use.
 */
export async function freshApiUser(kind: string, roles: string[], activeRole = roles[0]!) {
  const email = `t-console-admin-${kind}-${stamp}@queenix.test`;
  const name = `CA ${kind} ${stamp}`;
  const http = await request.newContext({ baseURL: BASE, extraHTTPHeaders: { origin: BASE } });
  const res = await postSignUp(http, { email, password: PASSWORD, name, fullName: name });
  if (!res.ok()) throw new Error(`sign-up ${email} → ${res.status()} ${await res.text()}`);
  const baId = (await res.json()).user.id as string;
  if (!(roles.length === 1 && roles[0] === 'member')) await setRoles(baId, roles, activeRole);
  const tok = await http.get('/api/convex/token');
  expect(tok.status(), 'convex token mint').toBe(200);
  const raw = new ConvexHttpClient(CONVEX_URL);
  raw.setAuth((await tok.json()).token);
  const convex = retrying(raw);
  const me = await convex.query(api.queries.users.getCurrentUser, {});
  return { email, name, baId, http, convex, userId: me._id as string };
}
