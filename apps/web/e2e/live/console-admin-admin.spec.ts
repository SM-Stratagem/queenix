/**
 * console-admin: a fresh `admin` (role API) spot-checks writes across the
 * console, and the superadmin-only boundary (platform.manage).
 */
import { test, expect } from '@playwright/test';
import { api, contextAs, convexAs, expectLive, freshUser, main, stamp, trackErrors } from './console-admin.helpers';

test.setTimeout(300_000);
let lastErrors: string[] = [];
test.afterEach(async ({}, info) => {
  if (info.status !== info.expectedStatus && lastErrors.length) console.log('page errors before failure:', JSON.stringify(lastErrors, null, 1));
  lastErrors = [];
});
const isTimeout = (e: string) => /Function execution timed out/.test(e);

test('admin: lands /dashboard; CRM lead, journal entry, event, broadcast all work', async ({ browser }) => {
  const admin = await freshUser('adm', ['admin']);
  const ctx = await contextAs(browser, admin.email);
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  lastErrors = errors;
  await page.goto('/login');
  await page.waitForURL(/\/dashboard$/, { timeout: 60_000 });
  await expectLive(page);

  await page.goto('/crm');
  await expectLive(page);
  await page.getByPlaceholder('Lead name').fill(`CA Admin Lead ${stamp}`);
  await page.getByRole('button', { name: 'Add lead' }).click();
  await expect(main(page).getByText('Lead created.')).toBeVisible({ timeout: 30_000 });

  await page.goto('/finance');
  await expectLive(page);
  await page.getByLabel('Category').fill(`CA Admin Petty ${stamp}`);
  await page.getByLabel('Entry amount (AED)').fill('5.05');
  await page.getByLabel('Entry date').fill('2002-02-02');
  await page.getByRole('button', { name: 'Record entry' }).click();
  await expect(page.getByRole('status')).toContainText('5.05 AED recorded in the books', { timeout: 30_000 });

  await page.goto('/events');
  await expectLive(page);
  await page.getByRole('button', { name: '+ New event' }).click();
  await page.getByPlaceholder('Title').fill(`CA Admin Event ${stamp}`);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(main(page).getByText('Event created.')).toBeVisible({ timeout: 30_000 });

  await page.goto('/website');
  await expectLive(page);
  await page.goto('/notifications');
  await expectLive(page);
  await expect(page.getByLabel('Also send to phones'), 'admin holds notifications.push').toBeVisible();
  expect(errors.filter((e) => !isTimeout(e))).toEqual([]);
  await ctx.close();
});

test('admin: superadmin-only surface (platform.manage) — what is actually enforced', async ({ browser }) => {
  const admin = await freshUser('adm2', ['admin']);
  const ctx = await contextAs(browser, admin.email);
  const page = await ctx.newPage();
  await page.goto('/team');
  await expectLive(page);
  await page.getByRole('button', { name: 'Roles & permissions' }).click();
  await page.getByLabel('Add staff by email').fill(admin.email);
  await page.getByRole('button', { name: 'Find' }).click();
  const offered = await main(page).getByRole('checkbox', { name: 'superadmin' }).count();
  console.log('Team → Permissions offers the superadmin checkbox to an admin:', offered > 0);
  // The UI must not let an admin hand out superadmin.
  expect.soft(offered, 'admin should not be offered the superadmin role').toBe(0);
  const convex = await convexAs(ctx);
  const grantErr = await convex
    .mutation(api.mutations.grants.grantCapability, { userId: (await convex.query(api.queries.users.getCurrentUser, {}))._id, capability: 'platform.manage' })
    .then(() => null, (e: any) => String(e?.message ?? e));
  console.log('admin self-grant platform.manage →', grantErr ?? 'ALLOWED');
  expect.soft(grantErr, 'admin must not self-grant platform.manage').not.toBeNull();
  await ctx.close();
});
