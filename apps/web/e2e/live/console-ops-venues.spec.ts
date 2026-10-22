/**
 * Trainer, salon and coffee web consoles, live. Each role works only on
 * records this run creates (unique service / menu item / certification),
 * and every role is checked against the pages it must NOT open.
 *
 *   E2E_BASE_URL=http://10.12.19.174:4000 npx playwright test e2e/live/console-ops-venues.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';
import { api } from '@queenix/convex';
import { convexAs, errorOf, expectLive, expectStaffOnly, main, shot, staffContext, trackErrors } from './console-ops-lib';

test.setTimeout(300_000);
const stamp = Date.now().toString(36);

async function navLinks(page: Page) {
  const nav = page.getByRole('navigation', { name: 'Admin' });
  await expect(nav.getByRole('link').first()).toBeVisible({ timeout: 30_000 });
  return nav.getByRole('link').allTextContents();
}

/** Pick the <option> whose text contains `text` (labels carry price/duration suffixes). */
async function selectByText(page: Page, label: string, text: string) {
  const sel = page.getByLabel(label);
  const opt = sel.locator('option', { hasText: text });
  await expect(opt).toBeAttached({ timeout: 30_000 });
  await sel.selectOption((await opt.getAttribute('value'))!);
}

test('trainer: clients, earnings split, certification add/validate/persist, classes; denied pages', async ({ browser }) => {
  const ctx = await staffContext(browser, 'trainer');
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  await page.goto('/login');
  await page.waitForURL(/\/trainer$/, { timeout: 60_000 });
  expect(await navLinks(page)).toEqual(['Trainer home', 'Classes', 'Notifications', 'Sales push']);
  await expectLive(page);
  await expect(main(page).getByText(/^My clients \(\d+\)$/)).toBeVisible({ timeout: 30_000 });
  await expect(main(page).getByText(/ paid · .* pending · /)).toBeVisible();

  // Certification: validation, add, persistence.
  await page.getByRole('button', { name: 'Add certification' }).click();
  await expect(main(page).getByText('Name and issuer are required.')).toBeVisible();
  const cert = `E2E Pilates ${stamp}`;
  await page.getByPlaceholder('Certification name').fill(cert);
  await page.getByPlaceholder('Issuer').fill('BASI');
  await page.getByRole('button', { name: 'Add certification' }).click();
  await expect(main(page).getByText('Certification added.')).toBeVisible();
  await page.reload();
  await expect(main(page).getByText(`${cert} — BASI`)).toBeVisible({ timeout: 30_000 });
  await shot(page, 'console-ops-trainer');

  await page.goto('/classes');
  await expectLive(page);
  await expect(main(page)).toContainText("Today's roster");

  for (const route of ['/finance', '/audit', '/reports', '/members', '/team', '/crm', '/website', '/salon', '/coffee', '/settings', '/dashboard', '/approvals']) {
    await expectStaffOnly(page, route);
  }
  expect(errors).toEqual([]);
  await ctx.close();
});

test('trainer: /notifications + /sales-push are offered but the backend refuses trainers (known inconsistency)', async ({ browser }) => {
  const ctx = await staffContext(browser, 'trainer');
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  const trainer = await convexAs(ctx.request);
  const results: Record<string, string> = {};
  for (const route of ['/notifications', '/sales-push']) {
    await page.goto(route);
    await expect(main(page)).not.toContainText('Staff only');
    await expect(main(page).getByText(/Live data unavailable|Audience: /)).toBeVisible({ timeout: 30_000 });
    results[route] = (await main(page).textContent())!.includes('Live data unavailable') ? 'Live data unavailable' : 'composer';
    await shot(page, `console-ops-trainer-${route.slice(1)}`);
  }
  results.send = await errorOf(trainer.mutation((api as any).mutations.engagement.sendBroadcastNotification, { title: 'x', body: 'x', type: 'system', audience: 'members' }));
  results.promo = await errorOf(trainer.mutation((api as any).mutations.engagement.sendSalesPush, { title: 'x', body: 'x', audience: 'members' }));
  test.info().annotations.push({ type: 'trainer-outreach', description: JSON.stringify(results) });
  // Route access and backend must agree: either trainers get a working composer, or the nav hides it.
  expect.soft(results['/notifications'], 'BUG: trainer nav offers Notifications but every query/send is refused').toBe('composer');
  expect.soft(results['/sales-push'], 'BUG: trainer nav offers Sales push but every query/send is refused').toBe('composer');
  expect(results.send).toBe('FORBIDDEN');
  expect(results.promo).toBe('FORBIDDEN');
  expect(errors).toEqual([]);
  await ctx.close();
});

test('salon: own service → walk-in pending → confirmed → completed; second → cancelled; settings; denied other venues', async ({ browser }) => {
  const ctx = await staffContext(browser, 'salon');
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  page.on('dialog', (d) => d.accept());
  await page.goto('/login');
  await page.waitForURL(/\/salon$/, { timeout: 60_000 });
  expect(await navLinks(page)).toEqual(['Salon', 'Settings']);
  await expectLive(page);

  const svc = `E2E Blowdry ${stamp}`;
  await page.getByPlaceholder('Name').fill(svc);
  await page.getByPlaceholder('Price').fill('85');
  await page.getByPlaceholder('Duration (min)').fill('45');
  await page.getByRole('button', { name: 'Create service' }).click();
  await expect(main(page).getByText(`${svc} · `)).toBeVisible();

  const queueRow = (status: string) =>
    main(page).locator('div').filter({ hasText: svc }).filter({ hasText: `· ${status} ·` }).filter({ has: page.getByRole('button', { name: 'Cancel' }) }).last();
  const book = async (dayOffset: number) => {
    await selectByText(page, 'Walk-in service', svc);
    const n = Date.now();
    await page.getByLabel('Date').fill(new Date(n + dayOffset * 86_400_000).toISOString().slice(0, 10));
    await page.getByLabel('Time').fill(`${String(9 + (n % 9)).padStart(2, '0')}:${String((n % 4) * 15).padStart(2, '0')}`);
    await page.getByRole('button', { name: 'Book & take cash' }).click();
    await expect(main(page).getByText('Walk-in booked (cash).')).toBeVisible();
  };
  // Validation.
  await page.getByRole('button', { name: 'Book & take cash' }).click();
  await expect(main(page).getByText('Pick a service, date and time.')).toBeVisible();

  await book(3);
  await expect(queueRow('pending')).toBeVisible();
  await queueRow('pending').getByRole('button', { name: 'Confirm' }).click();
  await expect(queueRow('confirmed')).toBeVisible();
  await queueRow('confirmed').getByRole('button', { name: 'Complete' }).click();
  await expect(main(page).locator('div').filter({ hasText: svc }).filter({ hasText: /· (pending|confirmed) ·/ })).toHaveCount(0);

  await book(4);
  await queueRow('pending').getByRole('button', { name: 'Cancel' }).click();
  await expect(main(page).locator('div').filter({ hasText: svc }).filter({ hasText: /· (pending|confirmed) ·/ })).toHaveCount(0);

  // Backend agrees: both bookings left the queue with the right terminal status.
  const salon = await convexAs(ctx.request);
  const queue = await salon.query(api.queries.commerce.salonQueue, {});
  expect(queue.filter((b: any) => b.serviceName === svc)).toHaveLength(0);
  await shot(page, 'console-ops-salon');

  // Service lifecycle: deactivate hides it from walk-ins; remove.
  const svcRow = main(page).locator('div').filter({ hasText: `${svc} · ` }).filter({ has: page.getByRole('button', { name: 'Remove' }) }).last();
  await svcRow.getByRole('button', { name: 'Deactivate' }).click();
  await expect(svcRow.getByRole('button', { name: 'Activate' })).toBeVisible();
  await expect(page.getByLabel('Walk-in service').locator('option', { hasText: svc })).toHaveCount(0);
  await svcRow.getByRole('button', { name: 'Remove' }).click();
  await expect(main(page).getByText(/Remove failed|cannot|bookings/i).or(main(page).getByText(`${svc} · `))).toBeVisible();

  // Settings: only the salon gateway card.
  await page.goto('/settings');
  await expectLive(page);
  await expect(main(page).getByRole('button', { name: 'Save gateway' })).toHaveCount(1);
  await expect(main(page).getByText('salon', { exact: true })).toBeVisible();
  const card = main(page).getByText('salon', { exact: true }).locator('..');
  await expect(card.getByText(/^Current: /)).not.toContainText('loading', { timeout: 30_000 });
  await card.getByRole('button', { name: 'Save gateway' }).click();
  await expect(card.getByText('Saved.')).toBeVisible();

  for (const route of ['/coffee', '/dashboard', '/members', '/crm', '/finance', '/trainer', '/website', '/notifications']) {
    await expectStaffOnly(page, route);
  }
  expect(await errorOf(salon.query(api.queries.commerce.coffeeQueue, {}))).toBe('FORBIDDEN');
  expect(errors).toEqual([]);
  await ctx.close();
});

test('coffee: own item → counter sale queued → preparing → ready → served; second → cancelled; settings; denied salon', async ({ browser }) => {
  const ctx = await staffContext(browser, 'coffee');
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  page.on('dialog', (d) => d.accept());
  await page.goto('/login');
  await page.waitForURL(/\/coffee$/, { timeout: 60_000 });
  expect(await navLinks(page)).toEqual(['Coffee', 'Settings']);
  await expectLive(page);

  const item = `E2E Latte ${stamp}`;
  await page.getByPlaceholder('Name').fill(item);
  await page.getByPlaceholder('Price').fill('18');
  await page.getByRole('button', { name: 'Create item' }).click();
  await expect(main(page).getByText(`${item} · `)).toBeVisible();

  const row = (status: string) =>
    main(page).locator('div').filter({ hasText: item }).filter({ hasText: `· ${status} ·` }).filter({ has: page.getByRole('button') }).last();
  const sell = async (qty: string) => {
    await selectByText(page, 'Counter item', item);
    await page.getByLabel('Quantity').fill(qty);
    await page.getByRole('button', { name: 'Record cash sale' }).click();
  };
  await sell('0');
  await expect(main(page).getByText('Pick an item and a positive quantity.')).toBeVisible();
  await sell('2');
  await expect(main(page).getByText('Counter sale recorded (cash).')).toBeVisible();
  await expect(row('queued')).toBeVisible();
  await row('queued').getByRole('button', { name: 'Start preparing' }).click();
  await expect(row('preparing')).toBeVisible();
  await row('preparing').getByRole('button', { name: 'Mark ready' }).click();
  await expect(row('ready')).toBeVisible();
  await expect(row('ready').getByRole('button', { name: 'Cancel' })).toHaveCount(0);
  await row('ready').getByRole('button', { name: 'Mark served' }).click();
  await expect(main(page).locator('div').filter({ hasText: item }).filter({ hasText: /· (queued|preparing|ready) ·/ })).toHaveCount(0);

  await sell('1');
  await row('queued').getByRole('button', { name: 'Cancel' }).click();
  await expect(main(page).locator('div').filter({ hasText: item }).filter({ hasText: /· (queued|preparing|ready) ·/ })).toHaveCount(0);
  await shot(page, 'console-ops-coffee');

  const coffee = await convexAs(ctx.request);
  const queue = await coffee.query(api.queries.commerce.coffeeQueue, {});
  expect(queue.filter((o: any) => String(o.itemsLabel).includes(item))).toHaveLength(0);

  const itemRow = main(page).locator('div').filter({ hasText: `${item} · ` }).filter({ has: page.getByRole('button', { name: 'Remove' }) }).last();
  await itemRow.getByRole('button', { name: 'Deactivate' }).click();
  await expect(itemRow).toContainText('(inactive)');
  await itemRow.getByRole('button', { name: 'Remove' }).click();

  await page.goto('/settings');
  await expectLive(page);
  await expect(main(page).getByRole('button', { name: 'Save gateway' })).toHaveCount(1);
  await expect(main(page).getByText('coffee', { exact: true })).toBeVisible();

  for (const route of ['/salon', '/dashboard', '/members', '/crm', '/finance', '/website']) {
    await expectStaffOnly(page, route);
  }
  expect(await errorOf(coffee.query(api.queries.commerce.salonQueue, {}))).toBe('FORBIDDEN');
  expect(errors).toEqual([]);
  await ctx.close();
});
