/**
 * Shared helpers for the live console-ops / site suites (not a spec).
 *
 * - One sign-in per role per ~25 min: storageState is cached on disk, because
 *   production rate-limits sign-in (10/min/IP) across every tester.
 * - Convex endpoints derive from E2E_BASE_URL (web :4000 → Convex :4210,
 *   anything else → :3210) unless E2E_CONVEX_URL is set.
 * - Admin-key Convex CLI (`cx`) for asserts staff can't read (audit rows):
 *   prod key from .env.prod.local (single key, never sourced) when targeting :4000.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, type APIRequestContext, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { ConvexHttpClient } from 'convex/browser';
import { submitLogin, PASSWORD } from '../login';

export { PASSWORD };
export const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3300';
const baseUrl = new URL(BASE);
const PROD = baseUrl.port === '4000';
export const CONVEX = process.env.E2E_CONVEX_URL ?? `${baseUrl.protocol}//${baseUrl.hostname}:${PROD ? 4210 : 3210}`;
const REPO = path.resolve(__dirname, '../../../..');
export const SHOTS = process.env.E2E_SHOTS_DIR ?? path.join(os.tmpdir(), 'queenix-e2e-shots');
fs.mkdirSync(SHOTS, { recursive: true });

/** One key from an env file without sourcing it (values may contain `|`). */
function envKey(file: string, key: string): string | undefined {
  try {
    const lines = fs.readFileSync(path.join(REPO, file), 'utf8').split('\n').filter((l) => l.startsWith(`${key}=`));
    return lines.at(-1)?.slice(key.length + 1).trim();
  } catch {
    return undefined;
  }
}

export const ADMIN_TOKEN =
  process.env.QUEENIX_ADMIN_TOKEN ?? (PROD ? envKey('.env.prod.local', 'QUEENIX_ADMIN_TOKEN') : 'queenix-dev-admin-token')!;
export const SCANNER_KEY = process.env.SCANNER_API_KEY ?? (PROD ? envKey('.env.prod.local', 'SCANNER_API_KEY') : '') ?? '';

// ─── sessions ───────────────────────────────────────────────────────────

const AUTH_DIR = path.join(os.tmpdir(), 'queenix-e2e-auth');
fs.mkdirSync(AUTH_DIR, { recursive: true });
const stateFile = (email: string) => path.join(AUTH_DIR, `${baseUrl.host.replace(/[^a-z0-9]/gi, '_')}-${email}.json`);

/** A browser context signed in as `email` (demo short name like 'ops' or a full email). */
export async function staffContext(browser: Browser, user: string): Promise<BrowserContext> {
  const email = user.includes('@') ? user : `${user}@queenix.test`;
  const file = stateFile(email);
  if (fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < 25 * 60_000) {
    const ctx = await browser.newContext({ storageState: file });
    const res = await ctx.request.get('/api/convex/token');
    if (res.ok()) return ctx;
    await ctx.close();
  }
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await submitLogin(page, email);
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 90_000 });
  await ctx.storageState({ path: file });
  await page.close();
  return ctx;
}

/** Collects uncaught page errors (incl. unhandled promise rejections). */
export function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`${page.url()} :: ${e.message.slice(0, 300)}`));
  return errors;
}

export const main = (page: Page) => page.locator('main');

/** Page rendered for this role: no gate, no failed-query fallback. */
export async function expectLive(page: Page) {
  await expect(main(page)).not.toBeEmpty();
  await expect(main(page)).not.toContainText('Staff only');
  await expect(main(page)).not.toContainText('Live data unavailable');
}

export async function expectStaffOnly(page: Page, route: string) {
  await page.goto(route);
  await expect(main(page).getByRole('alert')).toContainText('Staff only', { timeout: 30_000 });
}

export async function shot(page: Page, name: string, fullPage = true) {
  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage });
  return file;
}

// ─── Convex ─────────────────────────────────────────────────────────────

/** Convex client authed as the context's signed-in user (same JWT the console uses). */
export async function convexAs(req: APIRequestContext) {
  const res = await req.get(`${BASE}/api/convex/token`);
  expect(res.ok(), `convex token ${res.status()}`).toBeTruthy();
  const { token } = await res.json();
  const client = new ConvexHttpClient(CONVEX);
  client.setAuth(token);
  // The shared machine (load avg 30-60) sometimes trips Convex's 1s UDF limit;
  // a timed-out function is rolled back, so retrying is safe.
  const q = client.query.bind(client);
  const m = client.mutation.bind(client);
  client.query = ((fn: any, args: any) => retryTimeout(() => q(fn, args))) as any;
  client.mutation = ((fn: any, args: any) => retryTimeout(() => m(fn, args))) as any;
  return client;
}

export const isTimeout = (e: unknown) => /timed out|Function execution took/i.test(String((e as Error)?.message ?? e));

export async function retryTimeout<T>(fn: () => Promise<T>, tries = 5): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= tries || !isTimeout(e)) throw e;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

/** POST to a web API route, retrying when the route's Convex call hit the 1s timeout (502 + "timed out"). */
export async function postRetry(request: APIRequestContext, url: string, data: unknown, headers: Record<string, string>) {
  for (let i = 1; ; i++) {
    const res = await request.post(url, { data, headers });
    if (i >= 5 || res.status() !== 502 || !isTimeout(await res.text())) return res;
    await new Promise((r) => setTimeout(r, 1500 * i));
  }
}

/** Public (unauthenticated) Convex query over HTTP. */
export async function publicQuery<T>(request: APIRequestContext, fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await request.post(`${CONVEX}/api/query`, { data: { path: fn, args, format: 'json' } });
  const body = await res.json();
  expect(body.status, JSON.stringify(body).slice(0, 300)).toBe('success');
  return body.value as T;
}

export async function errorOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return 'NO_ERROR';
  } catch (e) {
    const err = e as { data?: { code?: string } | string; message?: string };
    if (err.data && typeof err.data === 'object' && err.data.code) return err.data.code;
    return String(err.data ?? err.message ?? e);
  }
}

const CONVEX_DIR = path.join(REPO, 'packages/convex');
/** Admin Convex CLI (prod key when targeting :4000; packages/convex/.env.local otherwise). */
export function cx(args: string[]): string {
  const env = { ...process.env };
  if (PROD) {
    env.CONVEX_SELF_HOSTED_URL = 'http://localhost:4210';
    env.CONVEX_SELF_HOSTED_ADMIN_KEY = envKey('.env.prod.local', 'CONVEX_DEPLOY_KEY');
  }
  // The loaded machine sometimes trips the 1s system-query limit: retry.
  let last: unknown;
  for (let i = 0; i < 4; i++) {
    try {
      return execFileSync('npx', ['convex', ...args], { cwd: CONVEX_DIR, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120_000 });
    } catch (e) {
      last = e;
    }
  }
  throw last;
}

export function cxTable(name: string, limit = 100): any[] {
  return cx(['data', name, '--limit', String(limit), '--order', 'desc', '--format', 'jsonLines'])
    .split('\n')
    .filter((l) => l.startsWith('{'))
    .map((l) => JSON.parse(l));
}

// ─── users ──────────────────────────────────────────────────────────────

/** Fresh BetterAuth user promoted with the role API. Returns its email. */
export async function freshStaff(request: APIRequestContext, area: string, role: string): Promise<string> {
  const email = `t-${area}-${role}-${Date.now().toString(36)}@queenix.test`;
  const body = { email, password: PASSWORD, name: `E2E ${role} ${area}`, fullName: `E2E ${role} ${area}` };
  let signup = await request.post(`${BASE}/api/auth/sign-up/email`, { headers: { origin: BASE }, data: body });
  for (let i = 0; i < 5 && signup.status() === 429; i++) {
    await new Promise((r) => setTimeout(r, 15_000));
    signup = await request.post(`${BASE}/api/auth/sign-up/email`, { headers: { origin: BASE }, data: body });
  }
  expect(signup.ok(), `sign-up ${signup.status()} ${await signup.text()}`).toBe(true);
  const { user } = await signup.json();
  const promote = await request.post(`${BASE}/api/admin/users/${user.id}/role`, {
    headers: { 'x-queenix-admin-token': ADMIN_TOKEN },
    data: { activeRole: role, roles: [role] },
  });
  expect(promote.ok(), `role API ${promote.status()} ${await promote.text()}`).toBe(true);
  return email;
}

/** API-only session (no browser) — for roles that can't use the web console (members). Cached like staffContext. */
export async function apiSession(playwright: { request: { newContext: (o: object) => Promise<APIRequestContext> } }, email: string) {
  const file = stateFile(email);
  if (fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < 25 * 60_000) {
    const cached = await playwright.request.newContext({ baseURL: BASE, extraHTTPHeaders: { Origin: BASE }, storageState: file });
    if ((await cached.get('/api/convex/token')).ok()) return cached;
    await cached.dispose();
  }
  const req = await playwright.request.newContext({ baseURL: BASE, extraHTTPHeaders: { Origin: BASE } });
  for (let i = 0; i < 6; i++) {
    const res = await req.post('/api/auth/sign-in/email', { data: { email, password: PASSWORD } });
    if (res.status() !== 429) {
      expect(res.ok(), `sign-in ${email} ${res.status()}`).toBe(true);
      await req.storageState({ path: file });
      return req;
    }
    await new Promise((r) => setTimeout(r, (Number(res.headers()['x-retry-after'] ?? res.headers()['retry-after'] ?? 10) + 1) * 1000));
  }
  throw new Error(`sign-in ${email}: rate limited`);
}

/** Synthetic test images drawn in the browser (fictional data). */
export async function drawImage(browser: Browser, html: string, type: 'png' | 'jpeg' = 'png') {
  const p = await browser.newPage();
  await p.setContent(`<body style="margin:0">${html}</body>`);
  const buffer = await p.locator('body > div').first().screenshot({ type });
  await p.close();
  return buffer;
}
