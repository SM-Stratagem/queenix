/**
 * Demo walkthrough — every staff role, end to end in a real browser against
 * the running stack (./scripts/dev-up.sh). Mirrors the manual demo script:
 * landing + nav per role, one real action per role, and the negative checks.
 *
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/walkthrough.spec.ts
 * Replaying consumes demo states (pending Priya payment, queued coffee order,
 * pending salon booking) — rerun the seed first; it tops them back up.
 */
import { test, expect, type Page } from '@playwright/test';
import { login, submitLogin, PASSWORD } from './login';

const stamp = Date.now().toString(36);

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

/** Collects uncaught page errors; a route that crashes fails the test. */
function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`${page.url()} ${e.message.slice(0, 200)}`));
  return errors;
}


async function navLinks(page: Page): Promise<string[]> {
  const nav = page.getByRole('navigation', { name: 'Admin' });
  await expect(nav.getByRole('link').first()).toBeVisible();
  return nav.getByRole('link').allTextContents();
}

const main = (page: Page) => page.locator('main');

/** Every link a role's nav offers must open and render without a gate or error. */
async function visitNav(page: Page) {
  const hrefs = await page.getByRole('navigation', { name: 'Admin' }).getByRole('link').evaluateAll((as) =>
    as.map((a) => a.getAttribute('href')!)
  );
  for (const href of hrefs) {
    await page.goto(href);
    await expect(main(page)).not.toBeEmpty();
    await expect(main(page)).not.toContainText('Staff only');
    await expect(main(page)).not.toContainText('Live data unavailable');
  }
}

async function expectStaffOnly(page: Page, path: string) {
  await page.goto(path);
  await expect(main(page).getByRole('alert')).toContainText('Staff only');
}

test('superadmin: full nav, every route renders live data', async ({ page }) => {
  const errors = trackErrors(page);
  await login(page, 'superadmin');
  expect(new URL(page.url()).pathname).toBe('/dashboard');
  const links = await navLinks(page);
  expect(links).toHaveLength(25);
  expect(links).toEqual(expect.arrayContaining(['Content', 'Media', 'Blog']));
  await visitNav(page);

  await page.goto('/team');
  await expect(main(page)).toContainText('Layla Trainer');
  await page.goto('/audit');
  await expect(main(page)).toContainText(/payment\.|payout\.|finance\./);
  expect(errors).toEqual([]);
});

test('finance: lands /finance, 3 nav sections, payout → paid, journal → P&L, void Priya, reports', async ({ page }) => {
  const errors = trackErrors(page);
  await login(page, 'owner');
  await expect(page).toHaveURL(/\/finance$/);
  expect(await navLinks(page)).toEqual(['Finance', 'Coffee', 'Salon', 'CRM', 'Promotions', 'Partners', 'Documents']);

  // Payout: record → pending → mark paid.
  const recipient = `E2E Coach ${stamp}`;
  await page.getByLabel('Recipient name').fill(recipient);
  await page.getByLabel('Payout amount (AED)').fill('150');
  await page.getByRole('button', { name: 'Record payout' }).click();
  await expect(page.getByRole('status')).toHaveText('Payout recorded as pending.');
  const payoutRow = main(page).locator('div').filter({ hasText: recipient }).filter({ has: page.getByRole('button', { name: 'Mark paid' }) }).last();
  await payoutRow.getByRole('button', { name: 'Mark paid' }).click();
  await expect(page.getByRole('status')).toHaveText('Payout marked as paid.');
  await expect(main(page).getByText(new RegExp(`${recipient}`))).toBeVisible();
  await expect(main(page).locator('div').filter({ hasText: recipient }).getByText(/· paid ·/).first()).toBeVisible();

  // Journal entry lands in the month's P&L.
  const pl = main(page).getByText(/^Expenses /);
  const before = await pl.textContent();
  await page.getByLabel('Category').fill(`Supplies ${stamp}`);
  await page.getByLabel('Entry amount (AED)').fill('42.50');
  await page.getByRole('button', { name: 'Record entry' }).click();
  await expect(page.getByRole('status')).toContainText('recorded in the books');
  await expect(pl).not.toHaveText(before!);
  await expect(main(page).getByRole('cell', { name: `Supplies ${stamp}` })).toBeVisible();

  // Void the pending Priya payment straight from the ledger row.
  const priya = main(page).getByRole('button', { name: /^Void .* for Priya/ }).first();
  await expect(priya).toBeVisible();
  page.once('dialog', (d) => d.accept('Duplicate charge — e2e'));
  await priya.click();
  await expect(page.getByRole('status')).toHaveText(/Payment voided for Priya/);

  // Reports: P&L + projections.
  await page.getByRole('link', { name: 'Reports center →' }).click();
  await expect(main(page)).toContainText('Revenue analytics');
  await expect(main(page)).toContainText(/profit/i);
  await expect(main(page)).toContainText(/projection/i);
  await visitNav(page);
  expect(errors).toEqual([]);
});

test('operations: CRM lead new → contacted → trial, follow-up task, floor pages, scanner health', async ({ page, request }) => {
  const errors = trackErrors(page);
  await login(page, 'ops');
  await expect(page).toHaveURL(/\/dashboard$/);
  const links = await navLinks(page);
  expect(links).toContain('CRM');
  expect(links).not.toContain('Finance');
  expect(links).not.toContain('Audit log');

  await page.goto('/crm');
  const lead = `E2E Lead ${stamp}`;
  await page.getByPlaceholder('Lead name').fill(lead);
  await page.getByPlaceholder('Phone').first().fill('+971500000000');
  await page.getByRole('button', { name: 'Add lead' }).click();
  const card = () => main(page).locator('div[style*="cursor: pointer"]').filter({ hasText: lead });
  await expect(card()).toBeVisible();
  await card().getByRole('button', { name: '→ contacted' }).click();
  await expect(main(page).getByText(/^contacted \(/).locator('..')).toContainText(lead);
  await card().getByRole('button', { name: '→ trial' }).click();
  await expect(main(page).getByText(/^trial \(/).locator('..')).toContainText(lead);

  await card().click();
  await page.getByPlaceholder('New task…').fill(`Call ${lead}`);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(main(page).getByText(`Call ${lead}`)).toBeVisible();

  await page.goto('/classes');
  await expect(main(page)).toContainText("Today's roster");
  await page.goto('/valet');
  await expect(main(page)).toContainText('Valet queue');
  await page.goto('/branches');
  await expect(main(page)).toContainText('Queenix JBR');
  const health = await request.get('/api/scanner/health');
  expect(health.ok()).toBe(true);

  await visitNav(page);
  await expectStaffOnly(page, '/finance');
  expect(errors).toEqual([]);
});

test('trainer: /trainer clients, earnings split, certification, outreach; finance is staff-only', async ({ page }) => {
  const errors = trackErrors(page);
  await login(page, 'trainer');
  await expect(page).toHaveURL(/\/trainer$/);
  await expect(main(page).getByText(/^My clients \(5\)$/)).toBeVisible();
  await expect(main(page).getByText(/Next: /).first()).toBeVisible();
  await expect(main(page).getByText(/ paid · .* pending · /)).toBeVisible();

  const cert = `E2E Kettlebell ${stamp}`;
  await page.getByPlaceholder('Certification name').fill(cert);
  await page.getByPlaceholder('Issuer').fill('StrongFirst');
  await page.getByRole('button', { name: 'Add certification' }).click();
  await expect(main(page).getByText(`${cert} — StrongFirst`)).toBeVisible();

  await page.getByRole('link', { name: 'Notifications →' }).click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(main(page)).not.toContainText('Staff only');
  await page.goto('/sales-push');
  await expect(main(page)).not.toContainText('Staff only');

  await visitNav(page);
  expect(await navLinks(page)).not.toContain('Finance');
  await expectStaffOnly(page, '/finance');
  expect(errors).toEqual([]);
});

test('salon: confirm a pending booking → complete it; gateway editor saves', async ({ page }) => {
  const errors = trackErrors(page);
  await login(page, 'salon');
  await expect(page).toHaveURL(/\/salon$/);
  // Guarantee a pending booking: counter walk-ins start pending.
  const service = page.getByLabel('Walk-in service');
  await expect(service.locator('option').nth(1)).toBeAttached({ timeout: 30_000 });
  await service.selectOption({ index: 1 });
  // Unique slot per run: walk-ins reject an already-booked slot.
  const n = Date.now();
  await page.getByLabel('Date').fill(new Date(n + (2 + (n % 50)) * 86_400_000).toISOString().slice(0, 10));
  await page.getByLabel('Time').fill(`${String(9 + (n % 10)).padStart(2, '0')}:${String((n % 4) * 15).padStart(2, '0')}`);
  await page.getByRole('button', { name: 'Book & take cash' }).click();
  await expect(main(page).getByText('Walk-in booked (cash).')).toBeVisible();

  const pending = main(page).locator('div').filter({ hasText: /· pending ·/ }).filter({ has: page.getByRole('button', { name: 'Confirm' }) }).last();
  const who = (await pending.locator('span').first().textContent())!.split(' · pending')[0]!;
  await pending.getByRole('button', { name: 'Confirm' }).click();
  const confirmed = main(page).locator('div').filter({ hasText: `${who} · confirmed` }).filter({ has: page.getByRole('button', { name: 'Complete' }) }).last();
  await confirmed.getByRole('button', { name: 'Complete' }).click();
  await expect(main(page).getByText(`${who} · confirmed`)).toHaveCount(0);

  await page.goto('/settings');
  await page.getByLabel('Provider').first().selectOption('stripe');
  await page.getByLabel('Currency').first().selectOption('USD');
  await page.getByRole('button', { name: 'Save gateway' }).first().click();
  await expect(main(page).getByText('Saved.').first()).toBeVisible();
  await page.getByLabel('Provider').first().selectOption('tap');
  await page.getByLabel('Currency').first().selectOption('AED');
  await page.getByRole('button', { name: 'Save gateway' }).first().click();
  await visitNav(page);
  await expectStaffOnly(page, '/coffee');
  expect(errors).toEqual([]);
});

test('coffee: order advances queued → preparing → ready → served', async ({ page }) => {
  const errors = trackErrors(page);
  await login(page, 'coffee');
  await expect(page).toHaveURL(/\/coffee$/);
  const item = page.getByLabel('Counter item');
  await expect(item.locator('option').nth(1)).toBeAttached({ timeout: 30_000 });
  await item.selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Record cash sale' }).click();

  const row = (status: string, action: string) =>
    main(page).locator('div').filter({ hasText: `· ${status} ·` }).filter({ has: page.getByRole('button', { name: action }) }).last();
  // Count only after the queue has rendered (the new cash sale is queued).
  await expect(row('queued', 'Start preparing')).toBeVisible();
  const count = await main(page).getByRole('button', { name: 'Mark served' }).count();
  await row('queued', 'Start preparing').getByRole('button', { name: 'Start preparing' }).click();
  await row('preparing', 'Mark ready').getByRole('button', { name: 'Mark ready' }).click();
  await expect(main(page).getByRole('button', { name: 'Mark served' })).toHaveCount(count + 1);
  await row('ready', 'Mark served').getByRole('button', { name: 'Mark served' }).click();
  await expect(main(page).getByRole('button', { name: 'Mark served' })).toHaveCount(count);
  await visitNav(page);
  expect(errors).toEqual([]);
});

test('member: web login is bounced with the mobile-only note', async ({ page }) => {
  await submitLogin(page, 'member@queenix.test');
  await expect(page.getByText(/Member accounts work in the mobile app/)).toBeVisible();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});

test('superadmin: promote a new sign-up to coffee in Team → Permissions; they land on /coffee', async ({ page, browser, request, baseURL }) => {
  const email = `hire-${stamp}@queenix.test`;
  const signup = await request.post('/api/auth/sign-up/email', {
    headers: { origin: baseURL! },
    data: { email, password: PASSWORD, name: 'New Hire', fullName: 'New Hire' },
  });
  expect(signup.ok()).toBe(true);

  await login(page, 'superadmin');
  await page.goto('/team');
  await page.getByText('Roles & permissions').click();
  await page.getByLabel('Add staff by email').fill(email);
  await page.getByRole('button', { name: 'Find' }).click();
  await page.getByRole('checkbox', { name: 'coffee' }).check();
  await main(page).locator('select').first().selectOption('coffee');
  await page.getByRole('button', { name: 'Save roles' }).click();
  await expect(main(page)).toContainText('Roles saved.');

  const hire = await browser.newPage();
  await submitLogin(hire, email);
  await hire.waitForURL(/\/coffee/, { timeout: 60_000 });
  await expect(hire.locator('main')).not.toContainText('Staff only');
  await hire.close();
});
