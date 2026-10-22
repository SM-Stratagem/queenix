/**
 * Harness for driving the Expo app's WEB export (apps/mobile, `expo export -p web`)
 * at a phone viewport. Base URL: MOBILE_WEB_URL (the served export, e.g. http://10.12.19.174:8090).
 *
 * CORS shim: the web export runs on a different origin than auth (AUTH_URL), and the
 * Next.js auth/API routes send no CORS headers and trust only their own origin, so a
 * real browser cannot sign in from the web build (reported as a bug). Native apps send
 * no browser Origin, so to exercise the app we proxy every AUTH_URL request through
 * Playwright: Origin/Referer rewritten to AUTH_URL, CORS headers added to the reply.
 * ponytail: shim only — set MOBILE_NO_CORS_SHIM=1 to see the raw browser behavior.
 */
import { expect, type Browser, type BrowserContext, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

export const MOBILE_URL = (process.env.MOBILE_WEB_URL ?? 'http://10.12.19.174:8090').replace(/\/$/, '');
export const AUTH_URL = (process.env.MOBILE_AUTH_URL ?? 'http://10.12.19.174:4000').replace(/\/$/, '');
export const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8026';
export const PASSWORD = 'QueenixDemo123!';
export const SHOTS =
  process.env.MOBILE_SHOTS ??
  '/private/tmp/claude-501/-Users-suhayl-Downloads-Aasim-Queenix-Gym/cf250510-03bc-4d84-9dd8-b2bedc64fc6f/scratchpad/shots';
const STATE_DIR = process.env.MOBILE_STATE_DIR ?? path.join(SHOTS, '..', 'mobile-state');
export const REPO = path.resolve(__dirname, '../../../..');

export const PHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

async function corsShim(route: Route) {
  const req = route.request();
  const origin = req.headers()['origin'] ?? MOBILE_URL;
  const cors = {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': req.headers()['access-control-request-headers'] ?? '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const headers = { ...req.headers(), origin: AUTH_URL, referer: `${AUTH_URL}/` };
  let res;
  for (let i = 0; ; i++) {
    try {
      res = await route.fetch({ headers, maxRedirects: 0, timeout: 120_000 });
    } catch {
      return route.abort('timedout').catch(() => {}); // page closed or server stalled (shared, loaded box)
    }
    // Shared prod sign-in limit (10/min/IP): wait it out instead of failing the test.
    if (res.status() !== 429 || i >= 4) break;
    const wait = Number(res.headers()['x-retry-after'] ?? res.headers()['retry-after'] ?? 10);
    await new Promise((r) => setTimeout(r, (wait + 1) * 1000));
  }
  await route.fulfill({ response: res, headers: { ...res.headers(), ...cors } }).catch(() => {});
}

export type Errors = string[];

/** New phone-sized context (optionally from a saved login), with the CORS shim + error capture. */
export async function phoneContext(browser: Browser, storageState?: string) {
  const ctx = await browser.newContext({ ...PHONE, storageState });
  if (!process.env.MOBILE_NO_CORS_SHIM) await ctx.route(`${AUTH_URL}/**`, corsShim);
  return ctx;
}

export function watch(page: Page): Errors {
  const errors: Errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text().slice(0, 300)}`);
  });
  return errors;
}

export async function shot(page: Page, name: string) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, `mobile-${name}.png`), fullPage: false });
}

/** Wait until no ActivityIndicator/skeleton spinners remain (catches infinite spinners). */
export async function settled(page: Page, timeout = 30_000) {
  await expect(page.locator('[role=progressbar]:visible')).toHaveCount(0, { timeout });
}

/** Wait until the visible text stops changing for `quietMs` (skeleton → data), up to `timeout`. */
export async function textStable(page: Page, quietMs = 2500, timeout = 30_000) {
  const end = Date.now() + timeout;
  let last = '';
  let since = Date.now();
  while (Date.now() < end) {
    const now = await page.locator('body').innerText().catch(() => '');
    if (now !== last) {
      last = now;
      since = Date.now();
    } else if (Date.now() - since >= quietMs) return true;
    await page.waitForTimeout(400);
  }
  return false;
}

export async function goto(page: Page, route: string) {
  await page.goto(`${MOBILE_URL}${route}`);
  await settled(page);
  await textStable(page);
}

export async function signInUi(page: Page, email: string, password = PASSWORD) {
  await page.goto(`${MOBILE_URL}/login`);
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('Your password').fill(password);
  await page.getByText('Sign in', { exact: true }).click();
  await page.waitForURL((u) => !/\/(login)?$/.test(u.pathname), { timeout: 60_000 });
  await settled(page);
}

/** Signed-in context for a role, reusing a saved storageState so prod's sign-in rate limit isn't hit. */
export async function roleContext(browser: Browser, email: string, password = PASSWORD) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  const file = path.join(STATE_DIR, `${email}.json`);
  if (fs.existsSync(file) && Date.now() - fs.statSync(file).mtimeMs < 6 * 3600_000) {
    return phoneContext(browser, file);
  }
  const ctx = await phoneContext(browser);
  const page = await ctx.newPage();
  await signInUi(page, email, password);
  await ctx.storageState({ path: file });
  await page.close();
  return ctx;
}

/** Latest Mailpit message to `to` matching `subject` after `since`, returning the 6-digit code. */
export async function mailCode(to: string, since: number, subject = /./): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const list = (await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`)).json()) as {
      messages: { ID: string; Subject: string; Created: string; Snippet: string }[];
    };
    const msg = list.messages.find((m) => Date.parse(m.Created) >= since - 2000 && subject.test(m.Subject));
    if (msg) {
      const full = (await (await fetch(`${MAILPIT}/api/v1/message/${msg.ID}`)).json()) as { Text: string; Subject: string };
      const code = `${full.Subject} ${full.Text}`.match(/\b(\d{6})\b/);
      if (code) return code[1]!;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`no code mail for ${to}`);
}

function convexCli(args: string[]): string {
  const env = fs.readFileSync(path.join(REPO, '.env.prod.local'), 'utf8');
  const key = env.split('\n').filter((l) => l.startsWith('CONVEX_DEPLOY_KEY=')).pop()!.slice('CONVEX_DEPLOY_KEY='.length);
  return execFileSync('npx', ['convex', ...args], {
    cwd: path.join(REPO, 'packages/convex'),
    env: { ...process.env, CONVEX_SELF_HOSTED_URL: 'http://localhost:4210', CONVEX_SELF_HOSTED_ADMIN_KEY: key },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * One-off Convex CLI call against the prod backend (admin key read from .env.prod.local, never printed).
 * `asUser` = BetterAuth user id: runs the function with that identity (JWT sub), like the app does.
 */
export function convexRun<T = unknown>(fn: string, args: Record<string, unknown> = {}, asUser?: string): T {
  const extra = asUser ? ['--identity', JSON.stringify({ subject: asUser, issuer: AUTH_URL })] : [];
  for (let i = 0; ; i++) {
    try {
      const out = convexCli(['run', fn, JSON.stringify(args), ...extra]);
      try {
        return JSON.parse(out) as T;
      } catch {
        return out.trim() as unknown as T;
      }
    } catch (e: any) {
      // The shared prod backend intermittently times out UDFs (1s limit) under load: retry.
      if (i < 4 && /timed out/i.test(String(e?.stderr ?? e))) continue;
      throw new Error(`convex run ${fn} failed: ${String(e?.stderr ?? e).slice(0, 500)}`);
    }
  }
}

/** Newest rows of a Convex table (admin read). */
export function convexData<T = any>(table: string, limit = 50): T[] {
  const out = convexCli(['data', table, '--limit', String(limit), '--order', 'desc', '--format', 'jsonLines']);
  return out.split('\n').filter((l) => l.startsWith('{')).map((l) => JSON.parse(l));
}

/** BetterAuth user of a signed-in phone context (via its session cookie). */
export async function sessionUser(ctx: BrowserContext): Promise<{ id: string; email: string; [k: string]: any }> {
  const cookie = (await ctx.cookies(AUTH_URL)).map((c) => `${c.name}=${c.value}`).join('; ');
  const res = await fetch(`${AUTH_URL}/api/auth/get-session`, { headers: { cookie, origin: AUTH_URL } });
  const body = (await res.json()) as { user?: any } | null;
  if (!body?.user) throw new Error('no session');
  return body.user;
}

export const adminToken = () =>
  fs
    .readFileSync(path.join(REPO, '.env.prod.local'), 'utf8')
    .split('\n')
    .find((l) => l.startsWith('QUEENIX_ADMIN_TOKEN='))!
    .slice('QUEENIX_ADMIN_TOKEN='.length);

export type { BrowserContext, Page };
