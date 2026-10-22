/**
 * Sign-in rate limiting — runs LAST (file name) and briefly.
 *
 * BetterAuth keys its limiter on the client IP taken from x-forwarded-for.
 * Each test uses its own documentation-range IP in that header so it never
 * exhausts the bucket other testers share; the first test also proves that a
 * client-chosen header picks the bucket (the spoofing finding in the report).
 */
import { test, expect, request as pwRequest } from '@playwright/test';
import { BASE, sleep, stamp } from './auth-helpers';

test.describe.configure({ mode: 'serial' });
test.setTimeout(240_000);

const ip = () => `203.0.113.${Math.floor(Math.random() * 200) + 20}`;
const attempt = (api: Awaited<ReturnType<typeof pwRequest.newContext>>, email: string, xff?: string) =>
  api.post('/api/auth/sign-in/email', { data: { email, password: 'Wrong-password-1' }, headers: xff ? { 'x-forwarded-for': xff } : {} });

test('11th sign-in within a minute from one client gets 429 with Retry-After, then recovers', async () => {
  const api = await pwRequest.newContext({ baseURL: BASE, extraHTTPHeaders: { origin: BASE } });
  const client = ip();
  const email = `t-auth-rl-${stamp()}@queenix.test`;
  const statuses: number[] = [];
  let retryAfter = 0;
  for (let i = 0; i < 12; i++) {
    const res = await attempt(api, email, client);
    statuses.push(res.status());
    if (res.status() === 429) retryAfter = Number(res.headers()['x-retry-after'] ?? res.headers()['retry-after'] ?? 0);
  }
  test.info().annotations.push({ type: 'statuses', description: `${statuses.join(',')} retryAfter=${retryAfter}` });
  expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
  expect(statuses.slice(10)).toEqual([429, 429]);
  expect(retryAfter).toBeGreaterThan(0);
  expect(retryAfter).toBeLessThanOrEqual(60);

  await sleep((retryAfter + 2) * 1000);
  expect((await attempt(api, email, client)).status(), 'limit lifts after Retry-After').toBe(401);
  await api.dispose();
});

test('a different x-forwarded-for value gets a fresh bucket (client-controlled IP)', async () => {
  const api = await pwRequest.newContext({ baseURL: BASE, extraHTTPHeaders: { origin: BASE } });
  const email = `t-auth-rl2-${stamp()}@queenix.test`;
  const blocked = ip();
  for (let i = 0; i < 11; i++) await attempt(api, email, blocked);
  expect((await attempt(api, email, blocked)).status()).toBe(429);
  // Same attacker, new header value → not limited. With a trusted proxy that
  // overwrites the header this would stay 429.
  const rotated = (await attempt(api, email, ip())).status();
  test.info().annotations.push({ type: 'rotated-xff', description: String(rotated) });
  expect(rotated, 'rotating x-forwarded-for bypasses the sign-in limiter').toBe(429);
  await api.dispose();
});
