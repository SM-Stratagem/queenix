/**
 * console-admin: finance console end to end (fresh finance user, real UI)
 * — books maths, payouts, void, receipts (UAE VAT), reports, exports,
 * payment links, and the finance denials.
 */
import fs from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import {
  api, cents, contextAs, convexAs, expectLive, expectStaffOnly, freshApiUser, freshUser, main, shoot, stamp, trackErrors, BASE,
} from './console-admin.helpers';

test.describe.configure({ mode: 'serial' });
test.setTimeout(300_000);

let financeEmail = '';
let lastErrors: string[] = [];
test.afterEach(async ({}, info) => {
  if (info.status !== info.expectedStatus && lastErrors.length) console.log('page errors before failure:', JSON.stringify(lastErrors, null, 1));
  lastErrors = [];
});
const isTimeout = (e: string) => /Function execution timed out/.test(e);

test.beforeAll(async () => {
  financeEmail = (await freshUser('fin', ['finance'])).email;
});

/** Books P&L card numbers as rendered (cents). */
async function books(page: Page) {
  const card = main(page).getByText('Books — profit & loss', { exact: true }).locator('..');
  await expect(card).toContainText('Net profit', { timeout: 30_000 });
  const t = await card.innerText();
  const grab = (re: RegExp) => {
    const m = t.match(re);
    if (!m) throw new Error(`no ${re} in ${t}`);
    return cents(m[1]!);
  };
  return {
    income: grab(/Income ([-\d,.]+) AED/),
    expenses: grab(/Expenses ([-\d,.]+) AED/),
    manualIncome: grab(/Manual income\s+journal entries\s+\+?([-\d,.]+) AED/),
    manualExpenses: grab(/Manual expenses\s+journal entries\s+\+?([-\d,.−]+) AED/),
    payouts: grab(/Payouts\s+\d+ payouts\s+\+?([-\d,.−]+) AED/),
    net: grab(/Net profit\s+([-\d,.]+) AED/),
    text: t,
  };
}

test('books: backdated journal entries move that month’s P&L by the exact amounts', async ({ browser }) => {
  const ctx = await contextAs(browser, financeEmail);
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  lastErrors = errors;
  await page.goto('/finance');
  await expectLive(page);
  // A quiet backdated month nobody else books into, so deltas are exact.
  const month = `2003-${String((Date.now() % 12) + 1).padStart(2, '0')}`;
  await page.locator('input[type=month]').fill(month);
  await expect(main(page).getByText('Loading P&L…')).toHaveCount(0, { timeout: 30_000 });
  const before = await books(page);

  const record = async (kind: 'income' | 'expense', category: string, amount: string) => {
    await page.getByLabel('Entry kind').selectOption(kind);
    await page.getByLabel('Category').fill(category);
    await page.getByLabel('Entry amount (AED)').fill(amount);
    await page.getByLabel('Entry date').fill(`${month}-15`);
    await page.getByLabel('Note').fill(`console-admin ${stamp}`);
    await page.getByRole('button', { name: 'Record entry' }).click();
    await expect(page.getByRole('status')).toContainText('recorded in the books', { timeout: 30_000 });
  };
  await record('expense', `CA Supplies ${stamp}`, '42.50');
  await record('income', `CA Cafe cash ${stamp}`, '100.10');
  await record('expense', `CA Rounding ${stamp}`, '19.99');

  await expect.poll(async () => (await books(page)).manualIncome, { timeout: 30_000 }).toBe(before.manualIncome + 10010);
  const after = await books(page);
  console.log('books before', JSON.stringify({ ...before, text: undefined }), 'after', JSON.stringify({ ...after, text: undefined }));
  expect(after.manualExpenses).toBe(before.manualExpenses - (4250 + 1999)); // shown negative
  expect(after.income).toBe(before.income + 10010);
  expect(after.expenses).toBe(before.expenses + 4250 + 1999);
  expect(after.net).toBe(before.net + 10010 - 4250 - 1999);
  // Statement integrity: Income − Expenses = Net.
  expect(after.income - after.expenses).toBe(after.net);
  // Journal table lists the entries with signed amounts.
  await expect(main(page).getByRole('cell', { name: `CA Supplies ${stamp}` })).toBeVisible();
  await expect(main(page).locator('tr', { hasText: `CA Supplies ${stamp}` })).toContainText('−42.50 AED');
  // Reload: persisted.
  await page.reload();
  await page.locator('input[type=month]').fill(month);
  await expect.poll(async () => (await books(page)).net, { timeout: 30_000 }).toBe(after.net);
  await shoot(page, 'finance-books');
  expect(errors.filter((e) => !isTimeout(e))).toEqual([]);
  await ctx.close();
});

test('payouts: record → mark paid, record → cancel; P&L counts only money actually paid out', async ({ browser }) => {
  const ctx = await contextAs(browser, financeEmail);
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  lastErrors = errors;
  await page.goto('/finance');
  await expectLive(page);

  const pay = async (name: string, amount: string, decision: 'Mark paid' | 'Cancel') => {
    await page.getByLabel('Recipient name').fill(name);
    await page.getByLabel('Payout amount (AED)').fill(amount);
    await page.getByLabel('Payout method').selectOption('cash');
    await page.getByRole('button', { name: 'Record payout' }).click();
    await expect(page.getByRole('status')).toHaveText('Payout recorded as pending.', { timeout: 30_000 });
    const row = main(page).locator('div').filter({ hasText: name }).filter({ has: page.getByRole('button', { name: 'Mark paid' }) }).last();
    await expect(row).toContainText('cash · pending');
    await row.getByRole('button', { name: decision, exact: true }).click();
    await expect(page.getByRole('status')).toHaveText(decision === 'Mark paid' ? 'Payout marked as paid.' : 'Payout cancelled.');
  };
  const paid = `CA Paid Coach ${stamp}`;
  const cancelled = `CA Cancelled Coach ${stamp}`;
  await pay(paid, '150.25', 'Mark paid');
  await pay(cancelled, '77.70', 'Cancel');
  await page.reload();
  await expect(main(page).getByText(paid).locator('..')).toContainText('cash · paid');
  await expect(main(page).getByText(cancelled).locator('..')).toContainText('cash · cancelled');

  // Partners page lists the same payouts by status.
  await page.goto('/partners');
  await page.getByRole('button', { name: 'paid', exact: true }).click();
  await expect(main(page).locator('tr', { hasText: paid })).toContainText('150.25 AED');

  // Server maths: the month's P&L payouts vs the payouts that were really paid/pending.
  const convex = await convexAs(ctx);
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - 1;
  const [pl, payouts] = await Promise.all([
    convex.query(api.queries.financeReports.getProfitAndLoss, { from, to }),
    convex.query(api.queries.finance.listPayouts, { limit: 1000 }),
  ]);
  const inMonth = payouts.filter((p: any) => p.createdAt >= from && p.createdAt <= to);
  const live = inMonth.filter((p: any) => p.status !== 'cancelled').reduce((s: number, p: any) => s + p.amountCents, 0);
  const all = inMonth.reduce((s: number, p: any) => s + p.amountCents, 0);
  console.log(`P&L payouts ${pl.payoutsCents} · non-cancelled ${live} · incl. cancelled ${all}`);
  expect.soft(pl.payoutsCents, 'cancelled payouts must not reduce profit').toBe(live);
  expect(errors.filter((e) => !isTimeout(e))).toEqual([]);
  await ctx.close();
});

test('void: a member’s pending checkout is voided with a reason, ledger + audit reflect it', async ({ browser }) => {
  const member = await freshApiUser('void', ['member']);
  const plans = await member.convex.query(api.queries.memberships.getAvailablePlans, {});
  const ctx = await contextAs(browser, financeEmail);
  const convex = await convexAs(ctx);
  const plan = plans.find((p: any) => p.isActive !== false && p.priceCents > 0);
  expect(plan, 'an active paid plan').toBeTruthy();
  const { paymentId } = await member.convex.mutation(api.mutations.payments.createMembershipCheckout, { planId: plan._id });

  const page = await ctx.newPage();
  const errors = trackErrors(page);
  lastErrors = errors;
  await page.goto('/finance');
  await page.getByText('Status:').locator('select').selectOption('pending');
  const btn = main(page).getByRole('button', { name: new RegExp(`^Void .* for ${member.name}`) });
  await expect(btn).toBeVisible({ timeout: 30_000 });
  page.once('dialog', (d) => d.accept(`console-admin duplicate ${stamp}`));
  await btn.click();
  await expect(page.getByRole('status')).toHaveText(`Payment voided for ${member.name}.`, { timeout: 30_000 });
  await expect(btn).toHaveCount(0);

  const ledger = await convex.query(api.queries.finance.getLedger, { limit: 300 });
  expect(ledger.find((r: any) => r._id === paymentId)?.status).toBe('cancelled');
  await page.goto('/audit');
  await page.getByPlaceholder('Entity ID').fill(paymentId);
  await expect(main(page)).toContainText('finance.voided', { timeout: 30_000 });
  await expect(main(page)).toContainText(`console-admin duplicate ${stamp}`);

  // A voided (never paid) payment must not produce a receipt.
  const r = await ctx.request.get(`${BASE}/api/payments/${paymentId}/receipt`);
  console.log('receipt for voided payment →', r.status());
  expect.soft(r.status(), 'receipt for a cancelled payment').not.toBe(200);
  expect(errors.filter((e) => !isTimeout(e))).toEqual([]);
  await ctx.close();
});

test('receipt: finance opens a succeeded payment’s receipt; UAE VAT maths and total = amount charged', async ({ browser }) => {
  const ctx = await contextAs(browser, financeEmail);
  const convex = await convexAs(ctx);
  const ledger = await convex.query(api.queries.finance.getLedger, { limit: 300, status: 'succeeded' });
  const p = ledger.find((r: any) => r.currency === 'AED' && r.amountCents > 0);
  expect(p, 'a succeeded AED payment').toBeTruthy();
  const res = await ctx.request.get(`${BASE}/api/payments/${p._id}/receipt`);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('text/html');
  const html = await res.text();
  fs.writeFileSync(`${process.env.E2E_SHOTS_DIR ?? '/tmp'}/console-admin-receipt.html`, html);
  const page = await ctx.newPage();
  await page.setContent(html);
  if (process.env.E2E_SHOTS_DIR) await page.screenshot({ path: `${process.env.E2E_SHOTS_DIR}/console-admin-receipt.png`, fullPage: true });
  const text = await page.locator('body').innerText();
  const amt = (label: RegExp) => cents(text.match(label)![1]!);
  const subtotal = amt(/Subtotal\s+([A-Z]{3}\s?[\d,.]+|[\d,.]+\s?[A-Z]{3})/);
  const vat = amt(/VAT \(5%\)\s+([A-Z]{3}\s?[\d,.]+|[\d,.]+\s?[A-Z]{3})/);
  const total = amt(/Total\s+([A-Z]{3}\s?[\d,.]+|[\d,.]+\s?[A-Z]{3})/);
  console.log(`payment ${p._id} charged ${p.amountCents} · receipt subtotal ${subtotal} vat ${vat} total ${total}`);
  expect(text).toContain('VAT (5%)');
  expect(vat).toBe(Math.round(subtotal * 0.05));
  expect(total).toBe(subtotal + vat);
  expect.soft(total, 'receipt total must equal what the customer was charged').toBe(p.amountCents);

  // Signed-out → 401; another member → 403.
  const anon = await (await import('@playwright/test')).request.newContext();
  expect((await anon.get(`${BASE}/api/payments/${p._id}/receipt`)).status()).toBe(401);
  const other = await freshApiUser('rcpt', ['member']);
  expect((await other.http.get(`/api/payments/${p._id}/receipt`)).status()).toBe(403);
  await ctx.close();
});

test('reports: P&L lines add up to Net, revenue months render, CSV export downloads', async ({ browser }) => {
  const ctx = await contextAs(browser, financeEmail);
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  lastErrors = errors;
  await page.goto('/reports');
  await expectLive(page);
  await expect(main(page)).toContainText('Revenue analytics');
  await expect(main(page).getByText(/^Net: /)).toBeVisible({ timeout: 30_000 });
  const t = await main(page).innerText();
  const g = cents(t.match(/Gross collected: ([-\d,.]+) AED/)![1]!);
  const r = cents(t.match(/Refunded: −([-\d,.]+) AED/)![1]!);
  const po = cents(t.match(/Payouts issued: −([-\d,.]+) AED/)![1]!);
  const net = cents(t.match(/Net: ([-\d,.]+) AED/)![1]!);
  console.log(`reports 30d: gross ${g} refunded ${r} payouts ${po} net ${net} (lines sum ${g - r - po})`);
  expect.soft(g - r - po, 'Reports P&L: displayed lines must add up to the Net shown').toBe(net);

  for (const label of ['3 mo', '12 mo']) {
    await page.getByRole('button', { name: label }).click();
    await expect(main(page)).toContainText(/\d{4}-\d{2}/);
  }
  const [dl] = await Promise.all([page.waitForEvent('download'), main(page).getByText('Export CSV').first().click()]);
  const csv = fs.readFileSync((await dl.path())!, 'utf8');
  console.log('revenue csv head:', csv.split('\n').slice(0, 2).join(' | '));
  expect(csv.split('\n')[0]).toMatch(/month/);
  expect(csv.split('\n').length).toBeGreaterThan(12);
  await shoot(page, 'reports');
  expect(errors.filter((e) => !isTimeout(e))).toEqual([]);
  await ctx.close();
});

test('finance ledger export + daily close + overview cards consistency', async ({ browser }) => {
  const ctx = await contextAs(browser, financeEmail);
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  lastErrors = errors;
  await page.goto('/finance');
  await expectLive(page);
  await expect(main(page).getByText('Gross collected')).toBeVisible({ timeout: 30_000 });
  const gross = async () => cents((await main(page).getByText('Gross collected').locator('..').innerText()).split('\n')[1]!);
  const all = await gross();
  // The overview cards are labelled as totals; they must not change when the table filter changes.
  await page.getByText('Status:').locator('select').selectOption('pending');
  await expect(main(page).getByText('Loading live ledger…')).toHaveCount(0);
  await page.waitForTimeout(1500);
  const filtered = await gross();
  console.log(`overview gross: all ${all} · with status=pending filter ${filtered}`);
  expect.soft(filtered, 'Gross collected card must not depend on the transactions filter').toBe(all);
  await page.getByText('Status:').locator('select').selectOption('all');

  const [dl] = await Promise.all([page.waitForEvent('download'), main(page).getByText('Export CSV').last().click()]);
  const csv = fs.readFileSync((await dl.path())!, 'utf8');
  console.log('ledger/journal csv head:', csv.split('\n')[0]);
  expect(csv.length).toBeGreaterThan(20);
  await expect(main(page).getByText(/^Gross .* · refunded .* · net .* succeeded/)).toBeVisible();
  await shoot(page, 'finance');
  expect(errors.filter((e) => !isTimeout(e))).toEqual([]);
  await ctx.close();
});

test('venue payment link (mock mode) + cash paid on a coffee counter order', async ({ browser }) => {
  const ctx = await contextAs(browser, financeEmail);
  const convex = await convexAs(ctx);
  const original = await convex.query(api.queries.commerce.getVenuePaymentSettings, { venue: 'coffee' });
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  lastErrors = errors;
  try {
    await page.goto('/coffee');
    await expectLive(page);
    if (original.provider === 'cash' || !original.enabled) {
      await page.getByLabel('Gateway provider').selectOption('tap');
      await page.getByLabel('Currency').fill('AED');
      await page.getByRole('button', { name: 'Save gateway' }).click();
      await expect(main(page).getByText('Gateway saved.')).toBeVisible({ timeout: 30_000 });
    }
    const item = page.getByLabel('Counter item');
    await expect(item.locator('option').nth(1)).toBeAttached({ timeout: 30_000 });
    await item.selectOption({ index: 1 });
    await page.getByLabel('Quantity').fill('2');
    await page.getByRole('button', { name: 'Record cash sale' }).click();
    await expect(main(page).getByText('Counter sale recorded (cash).')).toBeVisible({ timeout: 30_000 });
    const queue = await convex.query(api.queries.commerce.coffeeQueue, {});
    const mine = queue.filter((o: any) => !o.paidAt && /CA fin/.test(o.customerName ?? '')).sort((a: any, b: any) => b._creationTime - a._creationTime)[0];
    expect(mine, 'my counter order in the queue').toBeTruthy();

    const res = await ctx.request.post(`${BASE}/api/commerce/payment-link`, { data: { venue: 'coffee', orderId: mine._id } });
    const body = await res.json();
    console.log('payment-link →', res.status(), JSON.stringify(body).slice(0, 200));
    expect.soft(res.status(), 'mock-mode payment link').toBe(200);
    if (res.ok()) {
      expect(body.paymentLink).toBeTruthy();
      const again = await ctx.request.post(`${BASE}/api/commerce/payment-link`, { data: { venue: 'coffee', orderId: mine._id } });
      expect((await again.json()).reused).toBe(true);
    }
    // Cash paid from the queue row.
    await page.reload();
    const row = main(page).locator('div').filter({ hasText: mine.customerName }).filter({ has: page.getByRole('button', { name: 'Cash paid' }) }).last();
    await row.getByRole('button', { name: 'Cash paid' }).click();
    await expect.poll(async () => (await convex.query(api.queries.commerce.coffeeQueue, {})).find((o: any) => o._id === mine._id)?.paidAt ?? null, { timeout: 30_000 }).not.toBeNull();
    await convex.mutation(api.mutations.commerce.updateCoffeeOrderStatus, { orderId: mine._id, status: 'cancelled' });
  } finally {
    await convex.mutation(api.mutations.commerce.saveVenuePaymentSettings, { venue: 'coffee', provider: original.provider, currency: original.currency, enabled: original.enabled });
  }
  expect(errors.filter((e) => !isTimeout(e))).toEqual([]);
  await ctx.close();
});

test('finance denials: website CMS + trainer staff-only, no phone push toggle', async ({ browser }) => {
  const ctx = await contextAs(browser, financeEmail);
  const page = await ctx.newPage();
  for (const r of ['/website', '/website/media', '/website/blog', '/website/blog/new', '/trainer']) await expectStaffOnly(page, r);
  await page.goto('/notifications');
  await expectLive(page);
  await expect(main(page).getByRole('button', { name: 'Send to members' })).toBeVisible();
  await expect(page.getByLabel('Also send to phones')).toHaveCount(0);
  await ctx.close();
});
