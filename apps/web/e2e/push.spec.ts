/**
 * Phone push (Expo Push) from the notification composer, against the live
 * stack + the REAL Expo push API. A fake Expo token is registered for the
 * demo member; Expo answers DeviceNotRegistered, so a green run proves the
 * whole send path: composer → mutation → scheduled action → Expo → token
 * cleared → one `broadcast.push` audit row.
 *
 *   E2E_BASE_URL=http://<LAN-IP>:3001 npx playwright test e2e/push.spec.ts
 * Uses the Convex CLI (packages/convex/.env.local admin key) for setup/asserts.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { login } from './login';

const CONVEX_DIR = path.resolve(__dirname, '../../../packages/convex');
const FAKE_TOKEN = 'ExponentPushToken[queenixE2E000000000000]';
const SHOTS = process.env.E2E_SHOTS_DIR;

function convex(args: string[]): string {
  return execFileSync('npx', ['convex', ...args], { cwd: CONVEX_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function table(name: string, limit = 200): any[] {
  return convex(['data', name, '--limit', String(limit), '--order', 'desc', '--format', 'jsonLines'])
    .split('\n')
    .filter((l) => l.startsWith('{'))
    .map((l) => JSON.parse(l));
}

function identityOf(email: string): string {
  const u = table('users', 1000).find((x) => x.email === email);
  if (!u) throw new Error(`no user ${email}`);
  return JSON.stringify({ subject: u.betterAuthUserId, issuer: 'e2e', tokenIdentifier: `e2e|${u.betterAuthUserId}` });
}

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

test('ops: "Also send to phones" pushes via Expo, clears dead token, audits broadcast.push', async ({ page }) => {
  convex([
    'run',
    'mutations/push:registerPushToken',
    JSON.stringify({ token: FAKE_TOKEN, platform: 'ios' }),
    '--identity',
    identityOf('member@queenix.test'),
  ]);
  expect(table('devices').find((d) => d.deviceFingerprint === FAKE_TOKEN)?.pushToken).toBe(FAKE_TOKEN);

  await login(page, 'ops');
  await page.goto('/notifications');
  const toggle = page.getByLabel('Also send to phones');
  await expect(toggle).toBeVisible();

  const title = `E2E push ${Date.now().toString(36)}`;
  await page.getByPlaceholder('Title').fill(title);
  await page.getByPlaceholder('Message body').fill('Real Expo Push round trip from the e2e suite.');
  await toggle.check();
  if (SHOTS) {
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: `${SHOTS}/push-composer-${width}.png`, fullPage: true });
    }
  }
  await page.getByRole('button', { name: 'Send to members' }).click();
  const status = page.getByText(/Phone push queued for \d+ members?\./);
  await expect(status).toBeVisible();
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/push-sent.png`, fullPage: true });
  const batchId = (await status.textContent())!.match(/Batch (bcast_\S+)\./)![1];

  let audit: any;
  await expect
    .poll(() => (audit = table('auditEvents', 100).find((a) => a.action === 'broadcast.push' && a.entityId === batchId)), {
      timeout: 60_000,
      intervals: [2_000],
    })
    .toBeTruthy();
  console.log('broadcast.push audit:', JSON.stringify(audit.after));
  expect(audit.after.tokens).toBeGreaterThanOrEqual(1);
  expect(audit.after.clearedTokens).toBeGreaterThanOrEqual(1);
  expect(audit.after.failed).toBeGreaterThanOrEqual(1);
  expect(table('devices').find((d) => d.deviceFingerprint === FAKE_TOKEN)?.pushToken).toBeUndefined();
});

test('trainer: no phone toggle, and push: true is rejected server-side', async ({ page }) => {
  await login(page, 'trainer');
  await page.goto('/notifications');
  // Trainers can open the route, but queries/engagement's STAFF gate excludes
  // them today ("Live data unavailable") — either way there is no phone toggle.
  await expect(page.locator('main')).not.toBeEmpty();
  await page.waitForLoadState('networkidle');
  await expect(page.getByLabel('Also send to phones')).toHaveCount(0);

  let err = '';
  try {
    convex([
      'run',
      'mutations/engagement:sendBroadcastNotification',
      JSON.stringify({ title: 'nope', body: 'nope', push: true }),
      '--identity',
      identityOf('trainer@queenix.test'),
    ]);
  } catch (e: any) {
    err = String(e.stderr ?? e.message);
  }
  expect(err).toContain('Requires capability: notifications.push');
});
