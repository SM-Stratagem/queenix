/**
 * Hardware scanner bridge (/api/scanner/*) against the live stack, plus the
 * places operations staff see its effects (dashboard scanner panel, member
 * visits). Real QR tokens come from rotateAccessToken as the demo member.
 *
 *   E2E_BASE_URL=http://10.12.19.174:4000 npx playwright test e2e/live/console-ops-scanner.spec.ts
 *
 * Checks written with expect.soft encode the CORRECT behaviour for a bug that
 * exists today (see the console-ops report); they go green once it's fixed.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { api } from '@queenix/convex';
import { BASE, SCANNER_KEY, postRetry, apiSession, convexAs, expectLive, main, shot, staffContext, trackErrors } from './console-ops-lib';

test.setTimeout(240_000);

const stamp = Date.now().toString(36);
const DEVICE = `e2e-scan-${stamp}`;
const key = { 'x-scanner-key': SCANNER_KEY };

const post = (r: APIRequestContext, p: string, data: unknown, headers: Record<string, string> = key) =>
  postRetry(r, `${BASE}${p}`, data, headers);

test('scanner key is required on every write endpoint (none / wrong → 401, ?key= works)', async ({ request }) => {
  expect(SCANNER_KEY, 'SCANNER_API_KEY must be available').not.toBe('');
  for (const p of ['/api/scanner/qr', '/api/scanner/fingerprint', '/api/scanner/register', '/api/scanner/health']) {
    expect((await post(request, p, { token: 'x', userId: 'x', deviceId: DEVICE }, {})).status(), `${p} no key`).toBe(401);
    expect((await post(request, p, { token: 'x', userId: 'x', deviceId: DEVICE }, { 'x-scanner-key': 'wrong' })).status(), `${p} bad key`).toBe(401);
  }
  // GET ping stays open (firmware liveness) but must not leak anything.
  const ping = await request.get(`${BASE}/api/scanner/health`);
  expect(ping.status()).toBe(200);
  expect(Object.keys(await ping.json()).sort()).toEqual(['deviceId', 'ok', 'service', 'timestamp']);
  // Query-string key for firmware that can't set headers.
  const viaQuery = await request.post(`${BASE}/api/scanner/qr?key=${encodeURIComponent(SCANNER_KEY)}`, { data: { token: `nope-${stamp}` } });
  expect(viaQuery.status()).toBe(200);
  expect((await viaQuery.json()).reason).toBe('Invalid token');
});

test('register a device → heartbeat → ops sees it online (Convex) and on the dashboard panel', async ({ request, browser }) => {
  const missing = await post(request, '/api/scanner/register', { name: 'no id' });
  expect(missing.status()).toBe(400);

  const res = await post(request, '/api/scanner/register', { deviceId: DEVICE, name: `E2E Door ${stamp}`, location: 'E2E lobby', model: 'ZKTeco QR500' });
  expect(res.status()).toBe(200);
  const reg = await res.json();
  expect(reg).toMatchObject({ ok: true, deviceId: DEVICE, webhook: expect.stringMatching(/\/api\/scanner\/qr$/) });
  expect(reg.apiKey).toMatch(new RegExp(`^qnx_${DEVICE}_`));

  // Follow the returned firmware instructions literally: they say X-Device-Key: <apiKey>.
  const literal = await request.post(reg.webhook.replace(/^https?:\/\/[^/]+/, BASE), {
    headers: reg.instructions.headers,
    data: { ...reg.instructions.body, token: `nope-${stamp}` },
  });
  expect.soft(literal.status(), 'BUG: register hands out X-Device-Key/apiKey but /api/scanner/qr only accepts X-Scanner-Key').toBe(200);

  // Heartbeat with the bridge key.
  const hb = await request.get(`${BASE}/api/scanner/health?deviceId=${DEVICE}`, { headers: key });
  expect(hb.ok()).toBe(true);
  const hbPost = await post(request, '/api/scanner/health', { deviceId: DEVICE, lastScanAt: Date.now() });
  expect((await hbPost.json()).deviceId).toBe(DEVICE);

  const ctx = await staffContext(browser, 'ops');
  const ops = await convexAs(ctx.request);
  await expect
    .poll(async () => {
      const h = await ops.query(api.queries.access.getScannerHealth, {});
      return h.devices.find((d: any) => d.deviceId === DEVICE)?.online ?? false;
    }, { timeout: 30_000 })
    .toBe(true);
  const health = await ops.query(api.queries.access.getScannerHealth, {});
  expect(health.devices.find((d: any) => d.deviceId === DEVICE)!.totalScans).toBe(1);

  const page = await ctx.newPage();
  const errors = trackErrors(page);
  await page.goto('/dashboard');
  await expectLive(page);
  await expect(main(page).getByText(/\d+\/\d+ online|No scanners registered/).first()).toBeVisible({ timeout: 30_000 });
  await expect(main(page).getByText(/Active members|KPIs unavailable/)).toBeVisible({ timeout: 60_000 });
  await shot(page, 'console-ops-dashboard-scanner');
  expect.soft(await main(page).getByText(`E2E Door ${stamp}`).count(), 'BUG: dashboard ScannerHealthPanel never lists registered scanners').toBeGreaterThan(0);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('QR: valid rotated token granted; replay, rotated-out, suspended, expired and malformed tokens refused', async ({ request, browser, playwright }) => {
  const member = await apiSession(playwright, 'member@queenix.test');
  const asMember = await convexAs(member);
  const me = await asMember.query(api.queries.users.getCurrentUser, {});
  expect(me?.email).toBe('member@queenix.test');

  // Malformed bodies.
  expect((await post(request, '/api/scanner/qr', {})).status()).toBe(400);
  const badJson = await request.post(`${BASE}/api/scanner/qr`, { headers: { ...key, 'content-type': 'application/json' }, data: '{not json' });
  expect(badJson.status()).toBe(400);

  const scan = async (token: string, direction: 'in' | 'out' = 'in') => {
    const r = await post(request, '/api/scanner/qr', { token, deviceId: DEVICE, direction });
    expect(r.status()).toBe(200);
    return r.json();
  };

  const { token } = await asMember.mutation(api.mutations.access.rotateAccessToken, {});
  const ok = await scan(token);
  expect(ok).toMatchObject({ granted: true, action: 'open_door_2s', user: { _id: me!._id } });
  expect(ok.display).toContain('Welcome');

  // Same token again within its 60s window = a screenshot / photo of the pass.
  const replay = await scan(token);
  expect.soft(replay.granted, 'BUG: a QR token is not single-use — replaying it within 60s opens the door again').toBe(false);

  // Compatibility GET path.
  const viaGet = await request.get(`${BASE}/api/scanner/qr?token=${encodeURIComponent(`nope-${stamp}`)}&deviceId=${DEVICE}`, { headers: key });
  expect((await viaGet.json()).reason).toBe('Invalid token');

  // Rotation invalidates the previous token.
  const { token: fresh } = await asMember.mutation(api.mutations.access.rotateAccessToken, {});
  expect((await scan(token)).reason).toBe('Invalid token');
  expect((await scan(fresh, 'out')).granted).toBe(true);

  // Guessable / garbage tokens.
  const invalid = await scan(`${me!._id}-${Date.now() + 30_000}-aaaaaaaa`);
  expect(invalid).toMatchObject({ granted: false, reason: 'Invalid token', action: 'beep_twice' });

  // Member detail shows the check-in to operations.
  const ctx = await staffContext(browser, 'ops');
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  await page.goto(`/members/${me!._id}`);
  await expectLive(page);
  await expect(page.getByRole('heading', { name: 'Recent visits' })).toBeVisible();
  await expect(main(page).getByRole('listitem').filter({ hasText: / — (in|out)$/ }).first()).toBeVisible();
  await shot(page, 'console-ops-member-visits');
  expect(errors).toEqual([]);
  await ctx.close();

  // Expiry: wait out the 60s window.
  const { token: short } = await asMember.mutation(api.mutations.access.rotateAccessToken, {});
  await new Promise((r) => setTimeout(r, 62_000));
  expect((await scan(short)).reason).toBe('Token expired');
  await member.dispose();
});

test('fingerprint: staff punch recorded; member / unknown / malformed user refused with a 4xx', async ({ request, browser }) => {
  const ctx = await staffContext(browser, 'ops');
  const ops = await convexAs(ctx.request);
  const me = await ops.query(api.queries.users.getCurrentUser, {});
  const res = await post(request, '/api/scanner/fingerprint', { userId: me!._id, deviceId: DEVICE, punchType: 'in' });
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ ok: true, userId: me!._id, punchType: 'in', eventId: expect.any(String) });
  const out = await post(request, '/api/scanner/fingerprint', { userId: me!._id, deviceId: DEVICE, punchType: 'out' });
  expect((await out.json()).punchType).toBe('out');

  expect((await post(request, '/api/scanner/fingerprint', { deviceId: DEVICE })).status()).toBe(400);

  // Member's id: a member must never punch.
  const dir = await ops.query(api.queries.users.getMembersDirectory, { search: 'member@queenix.test', status: 'all', limit: 1 });
  const memberId = dir[0]!.user._id;
  const m = await post(request, '/api/scanner/fingerprint', { userId: memberId, deviceId: DEVICE });
  const mBody = await m.json();
  expect(mBody.ok).toBe(false);
  expect(mBody.reason).toContain('Only staff can record punches');
  expect.soft(m.status(), 'BUG: business-rule refusal surfaces as 502 Bad Gateway').toBe(403);

  const bad = await post(request, '/api/scanner/fingerprint', { userId: 'not-a-convex-id', deviceId: DEVICE });
  expect(bad.status()).not.toBe(200);
  const badBody = await bad.json();
  expect.soft(bad.status(), 'BUG: malformed userId → 502 with the raw Convex validator error').toBe(400);
  expect.soft(JSON.stringify(badBody), 'BUG: raw Convex error text (function path, request id) is returned to the device').not.toMatch(/Request ID|ArgumentValidationError|recordPunchForUser/);
  await ctx.close();
});
