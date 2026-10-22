/**
 * Live web console gating + login UI: unauthenticated redirects, member
 * bounce, per-role route access (vs apps/web/src/lib/access.ts), open
 * redirects on /login?next=, password reset UI, UI sign-out and the CMS
 * with a capability grant.
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import path from 'node:path';
import {
  BASE, codeFor, convexAs, demo, freshUser, postRetry, authApi, useSessionIn, type TestUser,
} from './auth-helpers';

test.describe.configure({ mode: 'default' });
test.setTimeout(300_000);
test.use({ baseURL: BASE });

const SHOTS = process.env.E2E_SHOTS_DIR ?? path.join(process.cwd(), 'test-results', 'auth-shots');
const shot = (page: Page, name: string) => page.screenshot({ path: path.join(SHOTS, `auth-${name}.png`), fullPage: false });

/** Copy of ROUTE_ROLES in apps/web/src/lib/access.ts — the contract under test. */
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
  '/notifications': ['finance', 'operations', 'trainer'],
  '/sales-push': ['finance', 'operations', 'trainer'],
  '/reports': ['finance'],
  '/audit': ['finance'],
  '/settings': ['finance', 'operations', 'salon', 'coffee'],
  '/website': ['operations'],
};
const ROUTES = Object.keys(ROUTE_ROLES);

/** Wait until the console decided: either the shell (sign-out button) or a redirect to /login. */
async function settle(page: Page) {
  await expect(page.locator('[aria-label="Sign out"]').or(page.locator('input[type=password]'))).toBeVisible({ timeout: 60_000 });
}

const staffOnly = (page: Page) => page.getByRole('heading', { name: 'Staff only' });

test('unauthenticated console routes redirect to /login?next=<route>', async ({ page }) => {
  const misses: string[] = [];
  for (const route of ROUTES) {
    await page.goto(route);
    await page.waitForURL((u) => u.pathname === '/login', { timeout: 60_000 }).catch(() => misses.push(`${route} stayed on ${page.url()}`));
    const next = new URL(page.url()).searchParams.get('next');
    if (next !== route) misses.push(`${route} → next=${next}`);
  }
  expect(misses).toEqual([]);
  // Public site stays public.
  await page.goto('/');
  await expect(page).toHaveURL(`${BASE}/`);
  await page.goto('/schedule');
  await expect(page).toHaveURL(`${BASE}/schedule`);
});

test('member signing in on the web is signed straight back out', async ({ page }) => {
  const m = await freshUser('ui-member');
  await page.goto('/login');
  await page.locator('input[type=email]').fill(m.email);
  await page.locator('input[type=password]').fill(m.password);
  await page.locator('button[type=submit]').click();
  await expect(page.getByRole('alert')).toContainText('Member accounts work in the mobile app', { timeout: 60_000 });
  await shot(page, 'member-bounced');
  await expect(page).toHaveURL(/\/login/);
  expect(await (await page.request.get('/api/auth/get-session')).json()).toBeNull();

  // A member who already holds a session cookie and opens a console page is also bounced + signed out.
  await useSessionIn(page.context(), m.api);
  await page.goto('/dashboard');
  await page.waitForURL(/\/login\?error=members-mobile-only/, { timeout: 60_000 });
  expect(await (await page.request.get('/api/auth/get-session')).json()).toBeNull();
  await m.api.dispose();
});

const ROLES = ['finance', 'operations', 'trainer', 'salon', 'coffee'] as const;
for (const role of ROLES) {
  test(`${role}: console opens exactly the routes access.ts allows`, async ({ browser }) => {
    const u = await freshUser(`ui-${role}`, [role]);
    const context = await browser.newContext({ baseURL: BASE });
    await useSessionIn(context, u.api);
    const page = await context.newPage();
    const wrong: string[] = [];
    for (const route of ROUTES) {
      await page.goto(route);
      await settle(page);
      const blocked = (await staffOnly(page).count()) > 0;
      const allowed = ROUTE_ROLES[route]!.includes(role);
      if (blocked === allowed) wrong.push(`${route}: ${blocked ? 'blocked' : 'open'} (expected ${allowed ? 'open' : 'blocked'})`);
    }
    // Landing after login for single-role staff (WEB_LANDING).
    await page.goto('/login');
    await page.waitForURL((url) => url.pathname !== '/login', { timeout: 60_000 });
    test.info().annotations.push({ type: 'landing', description: `${role} → ${new URL(page.url()).pathname}` });
    expect(wrong).toEqual([]);
    await context.close();
    await u.api.dispose();
  });
}

test('superadmin opens every console route', async ({ browser }) => {
  const api = await demo('superadmin');
  const context = await browser.newContext({ baseURL: BASE });
  await useSessionIn(context, api);
  const page = await context.newPage();
  const blocked: string[] = [];
  for (const route of ROUTES) {
    await page.goto(route);
    await settle(page);
    if (await staffOnly(page).count()) blocked.push(route);
  }
  expect(blocked).toEqual([]);
  await context.close();
  await api.dispose();
});

test('trainer pages that access.ts opens actually load their data (notifications, sales-push)', async ({ browser }) => {
  const u = await freshUser('ui-trainer-push', ['trainer']);
  const context = await browser.newContext({ baseURL: BASE });
  await useSessionIn(context, u.api);
  const page = await context.newPage();
  const problems: string[] = [];
  for (const route of ['/notifications', '/sales-push']) {
    await page.goto(route);
    await settle(page);
    await page.waitForTimeout(4000); // let the Convex queries resolve
    await shot(page, `trainer${route.replace('/', '-')}`);
    const body = await page.locator('main').innerText();
    if (/don.t have access|not allowed|forbidden|requires one of|something went wrong/i.test(body)) problems.push(`${route}: ${body.slice(0, 160).replace(/\s+/g, ' ')}`);
  }
  // Backend view of the same calls.
  const c = await convexAs(u.api);
  for (const fn of ['queries/engagement:listBroadcasts', 'queries/engagement:audienceCount']) {
    const r = await c.query(fn as any, {}).then(() => 'ok', (e: any) => e?.data?.code ?? String(e?.message).slice(0, 80));
    if (r !== 'ok') problems.push(`${fn} as trainer → ${r}`);
  }
  test.info().annotations.push({ type: 'trainer-push-pages', description: problems.join(' ; ') || 'ok' });
  expect(problems).toEqual([]);
  await context.close();
  await u.api.dispose();
});

test('/login?next= never leaves the site (open-redirect payloads)', async ({ browser }) => {
  const api = await demo('operations'); // operations honors ?next
  const payloads = [
    '//evil.example/x',
    'https://evil.example/x',
    'javascript:alert(document.domain)',
    '/\\evil.example/x',
    '/\t/evil.example/x',
    '/\n/evil.example/x',
    '\\/evil.example/x',
    '/%2F%2Fevil.example/x',
    'http:evil.example',
  ];
  const escaped: string[] = [];
  for (const p of payloads) {
    const context = await browser.newContext({ baseURL: BASE });
    await useSessionIn(context, api);
    const page = await context.newPage();
    let dialog = false;
    page.on('dialog', async (d) => {
      dialog = true;
      await d.dismiss();
    });
    const leftSite: string[] = [];
    page.on('framenavigated', (f) => {
      if (f === page.mainFrame() && !f.url().startsWith(BASE) && !f.url().startsWith('about:')) leftSite.push(f.url());
    });
    await context.route(/evil\.example/, (r) => r.fulfill({ status: 200, body: 'EVIL' }));
    await page.goto(`/login?next=${encodeURIComponent(p)}`);
    await page.waitForTimeout(6000);
    const final = page.url();
    if (dialog || leftSite.length || !final.startsWith(BASE)) escaped.push(`${JSON.stringify(p)} → ${leftSite[0] ?? final}${dialog ? ' (dialog fired)' : ''}`);
    await context.close();
  }
  test.info().annotations.push({ type: 'open-redirect', description: escaped.join(' ; ') || 'none escaped' });
  expect(escaped).toEqual([]);
  await api.dispose();
});

test('password reset by email code in the web UI; old password stops working', async ({ page }) => {
  const u = await freshUser('ui-reset', ['operations']);
  const newPassword = `UiReset-${Date.now()}!`;
  await page.goto('/login');
  await page.locator('input[type=email]').fill(u.email);
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  const since = Date.now();
  await page.getByRole('button', { name: 'Email me a code' }).click();
  const code = await codeFor(u.email, since);
  await page.getByLabel('Code').fill(code);
  await page.getByLabel('New password').fill(newPassword);
  await page.getByRole('button', { name: 'Set new password' }).click();
  await expect(page.getByRole('status')).toContainText('Password updated', { timeout: 60_000 });
  await shot(page, 'reset-done');

  const api = await authApi();
  expect((await postRetry(api, '/api/auth/sign-in/email', { email: u.email, password: u.password })).status()).toBe(401);
  await api.dispose();

  await page.locator('input[type=email]').fill(u.email);
  await page.locator('input[type=password]').fill(newPassword);
  await page.locator('button[type=submit]').click();
  await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 90_000 });
  await settle(page);

  // UI sign-out kills the session and console pages bounce back to login.
  await page.locator('[aria-label="Sign out"]').click();
  await page.waitForURL(/\/login/, { timeout: 60_000 });
  expect(await (await page.request.get('/api/auth/get-session')).json()).toBeNull();
  await page.goto('/members');
  await page.waitForURL(/\/login\?next=%2Fmembers/, { timeout: 60_000 });
  await u.api.dispose();
});

test('capability grant: trainer with content.manage can open the Website CMS in the console', async ({ browser }) => {
  const u: TestUser = await freshUser('ui-cms-grant', ['trainer']);
  const sup = await convexAs(await demo('superadmin'));
  const trainerId = ((await (await convexAs(u.api)).query('queries/users:getCurrentUser' as any, {})) as any)._id;
  const g = (await sup.mutation('mutations/grants:grantCapability' as any, { userId: trainerId, capability: 'content.manage', note: 't-auth ui grant' })) as any;
  const context: BrowserContext = await browser.newContext({ baseURL: BASE });
  await useSessionIn(context, u.api);
  const page = await context.newPage();
  try {
    await page.goto('/website');
    await settle(page);
    await page.waitForTimeout(3000);
    await shot(page, 'trainer-website-with-grant');
    const navHasWebsite = await page.locator('aside a[href="/website"]').count();
    const blocked = await staffOnly(page).count();
    test.info().annotations.push({ type: 'cms-grant-ui', description: `staffOnly=${blocked} navLink=${navHasWebsite}` });
    expect(blocked, 'grant holder is shown "Staff only" on /website').toBe(0);
  } finally {
    await sup.mutation('mutations/grants:revokeCapability' as any, { grantId: g.grantId });
    await context.close();
    await u.api.dispose();
  }
});
