/**
 * Shared helpers for the live auth & security suites (auth-*.spec.ts).
 *
 *   E2E_BASE_URL=http://10.12.19.174:4000 E2E_CONVEX_URL=http://10.12.19.174:4210 \
 *   MAILPIT_URL=http://localhost:8026 QUEENIX_ADMIN_TOKEN=… npx playwright test e2e/live/auth
 *
 * Sign-in is rate limited per IP (10/min, shared by every tester), so demo
 * sessions are cached on disk across files/runs and fresh users are created
 * with sign-up (which returns a session) instead of a sign-in.
 */
import { expect, request as pwRequest, type APIRequestContext, type BrowserContext } from '@playwright/test';
import { ConvexHttpClient } from 'convex/browser';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const BASE = (process.env.E2E_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
export const CONVEX = process.env.E2E_CONVEX_URL ?? BASE.replace(/:\d+$/, ':4210');
export const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';
export const ADMIN_TOKEN = process.env.QUEENIX_ADMIN_TOKEN ?? 'queenix-dev-admin-token';
export const DEMO_PASSWORD = 'QueenixDemo123!';
export const DEMO = {
  superadmin: 'superadmin@queenix.test',
  finance: 'owner@queenix.test',
  operations: 'ops@queenix.test',
  trainer: 'trainer@queenix.test',
  salon: 'salon@queenix.test',
  coffee: 'coffee@queenix.test',
  member: 'member@queenix.test',
} as const;
export type DemoRole = keyof typeof DEMO;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const stamp = () => `${Date.now()}${Math.floor(Math.random() * 1000)}`;

/** API context that looks like the web app (BetterAuth checks Origin on POSTs). */
export async function authApi(storageState?: string | object): Promise<APIRequestContext> {
  return pwRequest.newContext({ baseURL: BASE, extraHTTPHeaders: { origin: BASE }, storageState: storageState as any });
}

/** POST that waits out BetterAuth 429s (shared per-IP buckets) and retries. */
export async function postRetry(api: APIRequestContext, url: string, data: unknown, tries = 6) {
  for (let i = 0; ; i++) {
    // The shared test machine is overloaded at times: retry dropped connections too.
    const res = await api.post(url, { data, timeout: 60_000 }).catch((e) => {
      if (i >= tries || !/socket hang up|ECONNRESET|Timeout/i.test(String(e))) throw e;
      return null;
    });
    if (!res) {
      await sleep(3000);
      continue;
    }
    if (res.status() !== 429 || i >= tries) return res;
    const wait = Number(res.headers()['x-retry-after'] ?? res.headers()['retry-after'] ?? 10);
    await sleep((Math.min(wait, 65) + 1) * 1000);
  }
}

/** Newest 6-digit code sent to `to` at/after `since` (polls Mailpit). */
export async function codeFor(to: string, since: number): Promise<string> {
  const api = await pwRequest.newContext();
  try {
    for (let i = 0; i < 60; i++) {
      const res = await api.get(`${MAILPIT}/api/v1/search`, { params: { query: `to:"${to}"`, limit: '5' } });
      const { messages = [] } = (await res.json()) as { messages?: Array<{ ID: string; Created: string }> };
      const fresh = messages.find((m) => Date.parse(m.Created) >= since - 1500);
      if (fresh) {
        const msg = (await (await api.get(`${MAILPIT}/api/v1/message/${fresh.ID}`)).json()) as { Text: string };
        const code = msg.Text.match(/\b(\d{6})\b/)?.[1];
        if (code) return code;
      }
      await sleep(500);
    }
    throw new Error(`no code arrived for ${to}`);
  } finally {
    await api.dispose();
  }
}

/** How many messages Mailpit holds for `to` created at/after `since`. */
export async function countMessages(to: string, since: number): Promise<number> {
  const api = await pwRequest.newContext();
  try {
    const res = await api.get(`${MAILPIT}/api/v1/search`, { params: { query: `to:"${to}"`, limit: '50' } });
    const { messages = [] } = (await res.json()) as { messages?: Array<{ Created: string }> };
    return messages.filter((m) => Date.parse(m.Created) >= since - 1500).length;
  } finally {
    await api.dispose();
  }
}

const CACHE_DIR = path.join(os.tmpdir(), 'queenix-e2e-auth-sessions', encodeURIComponent(BASE));

/**
 * A signed-in API context for an existing account. Reuses a cached session
 * when it is still valid (saves the shared sign-in budget).
 */
export async function signedIn(email: string, password = DEMO_PASSWORD): Promise<APIRequestContext> {
  const file = path.join(CACHE_DIR, `${email}.json`);
  if (fs.existsSync(file)) {
    const api = await authApi(file);
    const s = await (await api.get('/api/auth/get-session?disableCookieCache=true')).json().catch(() => null);
    if (s?.user?.email === email) return api;
    await api.dispose();
  }
  const api = await authApi();
  const res = await postRetry(api, '/api/auth/sign-in/email', { email, password });
  expect(res.status(), `sign-in ${email}: ${await res.text()}`).toBe(200);
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  await api.storageState({ path: file });
  return api;
}

export const demo = (role: DemoRole) => signedIn(DEMO[role]);

/** Assign roles via the admin role API. */
export async function setRoles(userId: string, roles: string[], activeRole = roles[0], extra: Record<string, unknown> = {}) {
  const api = await pwRequest.newContext({ baseURL: BASE });
  try {
    const res = await api.post(`/api/admin/users/${userId}/role`, {
      headers: { 'x-queenix-admin-token': ADMIN_TOKEN },
      data: { activeRole, roles, ...extra },
    });
    expect(res.status(), await res.text()).toBe(200);
    return res.json();
  } finally {
    await api.dispose();
  }
}

export type TestUser = { email: string; password: string; id: string; api: APIRequestContext };

/**
 * Fresh account (sign-up returns a session, no sign-in needed), optionally
 * promoted. The cookie-cached session copy is dropped so the new roles are
 * read from the database straight away.
 */
export async function freshUser(prefix: string, roles?: string[]): Promise<TestUser> {
  const email = `t-auth-${prefix}-${stamp()}@queenix.test`;
  const password = `Pw-${stamp()}!x`;
  const api = await authApi();
  const res = await postRetry(api, '/api/auth/sign-up/email', { email, password, name: `Auth ${prefix}`, fullName: `Auth ${prefix}` });
  expect(res.status(), await res.text()).toBe(200);
  const id = (await res.json()).user.id as string;
  if (roles) await setRoles(id, roles);
  return { email, password, id, api: await dropCookieCache(api) };
}

/** Same session minus the 5-minute `session_data` cache cookie. */
export async function dropCookieCache(api: APIRequestContext): Promise<APIRequestContext> {
  const state = await api.storageState();
  state.cookies = state.cookies.filter((c) => !c.name.endsWith('session_data'));
  await api.dispose();
  return authApi(state);
}

/** Copy an API session into a browser context. */
export async function useSessionIn(context: BrowserContext, api: APIRequestContext) {
  const state = await api.storageState();
  await context.addCookies(state.cookies.filter((c) => !c.name.endsWith('session_data')));
}

/** Convex JWT minted for the session in `api`. */
export async function convexToken(api: APIRequestContext): Promise<string> {
  const res = await api.get('/api/convex/token');
  expect(res.status()).toBe(200);
  return (await res.json()).token as string;
}

/** ConvexHttpClient authenticated as the session in `api` (anonymous when omitted). */
export async function convexAs(api?: APIRequestContext): Promise<ConvexHttpClient> {
  const client = new ConvexHttpClient(CONVEX);
  if (api) client.setAuth(await convexToken(api));
  return client;
}

/** Outcome of a Convex call: 'ok' or the ConvexError code / message. */
export async function outcome(call: () => Promise<unknown>): Promise<string> {
  for (let i = 0; ; i++) {
    try {
      await call();
      return 'ok';
    } catch (e: any) {
      const data = e?.data;
      if (data && typeof data === 'object' && data.code) return String(data.code);
      if (typeof data === 'string') return data;
      const msg = String(e?.message ?? e);
      // Overloaded backend ("Function execution timed out"): not an authz answer, retry.
      if (i < 4 && /timed out|too many system operations|fetch failed|ECONNRESET/i.test(msg)) {
        await sleep(2000);
        continue;
      }
      return msg.replace(/\s+/g, ' ').slice(0, 200);
    }
  }
}

/** True when a Convex call was refused for authorization reasons. */
export const isDenied = (o: string) => /FORBIDDEN|UNAUTHORIZED|Not signed in|Requires|USER_NOT_FOUND/i.test(o);

/** Every e-mail / phone-looking string anywhere in a JSON value. */
export function piiIn(value: unknown): string[] {
  const s = JSON.stringify(value ?? null);
  const emails = s.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) ?? [];
  const phones = s.match(/\+\d{9,15}/g) ?? [];
  return [...emails, ...phones];
}
