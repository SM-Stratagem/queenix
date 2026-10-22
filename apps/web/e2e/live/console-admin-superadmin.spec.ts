/**
 * console-admin: superadmin console flows end to end through the UI,
 * each verified after a reload or on another page / via Convex.
 */
import { test, expect, type Page } from '@playwright/test';
import {
  api, contextAs, convexAs, expectLive, freshApiUser, freshUser, main, navLinks, shoot, stamp, trackErrors,
} from './console-admin.helpers';

test.setTimeout(300_000);
const SA = 'superadmin@queenix.test';
let lastErrors: string[] = [];
test.afterEach(async ({}, info) => {
  if (info.status !== info.expectedStatus && lastErrors.length) console.log('page errors before failure:', JSON.stringify(lastErrors, null, 1));
  lastErrors = [];
});
const isTimeout = (e: string) => /Function execution timed out/.test(e);
const clean = (errors: string[]) => errors.filter((e) => !isTimeout(e));

async function open(browser: import('@playwright/test').Browser, route: string) {
  const ctx = await contextAs(browser, SA);
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  lastErrors = errors;
  await page.goto(route);
  await expectLive(page);
  return { ctx, page, errors };
}

test('dashboard KPIs + charts load live', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, '/dashboard');
  for (const label of ['Active members', "Today's revenue", "Today's check-ins", 'Live occupancy']) {
    const card = main(page).getByText(label, { exact: true }).locator('..');
    await expect(card).toContainText(/\d/, { timeout: 30_000 });
  }
  await expect(main(page)).toContainText('Revenue — last 14 days');
  await expect(main(page)).toContainText('Total members');
  await expect(main(page)).not.toContainText('unavailable');
  await shoot(page, 'dashboard');
  expect(clean(errors)).toEqual([]);
  await ctx.close();
});

test('members: search a fresh member, open detail; plans: create + deactivate (persisted)', async ({ browser }) => {
  const m = await freshApiUser('dir', ['member']);
  const { ctx, page, errors } = await open(browser, '/members');
  await page.getByPlaceholder('Search name, email, phone…').fill(m.email);
  const row = main(page).locator('tr', { hasText: m.email });
  await expect.soft(row, 'fresh member findable in the directory').toBeVisible({ timeout: 30_000 });
  if (await row.isVisible()) {
    await row.getByRole('link', { name: 'Open' }).click();
    await expect(page).toHaveURL(new RegExp(`/members/${m.userId}`));
    await expect(main(page).getByRole('heading', { level: 1 })).toHaveText(m.name);
    await expect(main(page)).toContainText('No memberships on record.');
    await expect(main(page)).toContainText('ID document');
    await expect(main(page)).toContainText('No signed documents.');
    await expect(main(page).getByLabel('Upload signed form')).toBeVisible();
    await shoot(page, 'member-detail');
  }
  // Status tabs filter.
  await page.goto('/members');
  await page.getByRole('button', { name: 'frozen', exact: true }).click();
  await expect(main(page).locator('tbody tr').first().or(main(page).getByText('No members match this filter.'))).toBeVisible({ timeout: 30_000 });

  // Plan catalogue.
  await page.getByRole('button', { name: 'plans' }).click();
  const name = `CA Plan ${stamp}`;
  await page.getByPlaceholder('Name', { exact: true }).fill(name);
  await page.getByPlaceholder('Description').fill('console-admin e2e plan');
  await page.getByPlaceholder('Price (AED)').fill('99.99');
  await page.getByPlaceholder('Duration (days)').fill('30');
  await page.getByRole('button', { name: 'Create plan' }).click();
  await expect(main(page).getByText('Plan created.')).toBeVisible({ timeout: 30_000 });
  const card = main(page).locator('div').filter({ has: page.getByText(name, { exact: true }) }).filter({ has: page.getByRole('button', { name: /activate/i }) }).last();
  const shown = await card.innerText();
  console.log('plan card:', shown.replace(/\n/g, ' | '));
  expect.soft(shown, 'a 99.99 AED plan must not display as 100 AED').toContain('99.99');
  await card.getByRole('button', { name: 'Deactivate' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'plans' }).click();
  const after = main(page).locator('div').filter({ has: page.getByText(name, { exact: true }) }).filter({ has: page.getByRole('button', { name: /activate/i }) }).last();
  await expect(after).toContainText('Inactive', { timeout: 30_000 });
  expect(clean(errors)).toEqual([]);
  await ctx.close();
});

test('members: freeze → unfreeze an active membership; audit records both', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, '/members');
  const convex = await convexAs(ctx);
  const active = await convex.query(api.queries.users.getMembersDirectory, { status: 'active', limit: 50 });
  // Prefer a non-core demo member so other testers' flows are untouched.
  const target = active.find((r: any) => !/^(member|priya)/i.test(r.user.email)) ?? active[0];
  expect(target, 'an active membership exists').toBeTruthy();
  await page.goto(`/members/${target.user._id}`);
  const card = main(page).locator('div').filter({ hasText: /^active · ends/ }).filter({ has: page.getByRole('button', { name: 'Freeze' }) }).first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  const endBefore = (await card.innerText()).match(/ends ([^\n]+)/)![1];
  await card.getByPlaceholder('days').fill('1');
  await card.getByPlaceholder('reason (optional)').fill(`console-admin ${stamp}`);
  await card.getByRole('button', { name: 'Freeze' }).click();
  await expect(main(page).getByText('Freeze done.')).toBeVisible({ timeout: 30_000 });
  await page.reload();
  const frozen = main(page).locator('div').filter({ hasText: /^frozen · ends/ }).filter({ has: page.getByRole('button', { name: 'Unfreeze' }) }).first();
  await expect(frozen).toBeVisible({ timeout: 30_000 });
  await frozen.getByRole('button', { name: 'Unfreeze' }).click();
  await expect(main(page).getByText('Unfreeze done.')).toBeVisible({ timeout: 30_000 });
  await page.reload();
  const back = main(page).locator('div').filter({ hasText: /^active · ends/ }).first();
  await expect(back).toBeVisible({ timeout: 30_000 });
  const endAfter = (await back.innerText()).match(/ends ([^\n]+)/)![1];
  console.log(`freeze 1d then immediate unfreeze: end ${endBefore} → ${endAfter}`);
  const audit = await convex.query(api.queries.financeAuditLog.listAuditEvents, { limit: 200, entityType: 'membership' });
  const actions = audit.filter((a: any) => Date.now() - a.timestamp < 10 * 60_000).map((a: any) => a.action);
  expect(actions).toEqual(expect.arrayContaining(['membership.frozen', 'membership.unfrozen']));
  expect(clean(errors)).toEqual([]);
  await ctx.close();
});

test('trainers directory + detail', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, '/trainers');
  const first = main(page).locator('div[style*="cursor: pointer"]').first();
  await expect(first).toBeVisible({ timeout: 30_000 });
  await first.click();
  await expect(main(page)).toContainText('Inflows', { timeout: 30_000 });
  await expect(main(page)).toContainText(/Clients \(\d+\)/);
  await shoot(page, 'trainers');
  expect(clean(errors)).toEqual([]);
  await ctx.close();
});

test('team: assign roles to a new user via Roles & permissions → they sign in with that access; profile → org chart; time off approve', async ({ browser }) => {
  const hire = await freshUser('hire', ['member']);
  const { ctx, page, errors } = await open(browser, '/team');
  await expect(main(page)).not.toContainText('Loading org chart…', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Roles & permissions' }).click();
  await page.getByLabel('Add staff by email').fill(hire.email);
  await page.getByRole('button', { name: 'Find' }).click();
  await expect(main(page).getByText(hire.name).first()).toBeVisible({ timeout: 30_000 });
  await page.getByRole('checkbox', { name: 'operations' }).check();
  await main(page).locator('select').first().selectOption('operations');
  await page.getByRole('button', { name: 'Save roles' }).click();
  await expect(main(page)).toContainText('Roles saved.', { timeout: 30_000 });
  // Staff profile → org chart.
  await page.getByPlaceholder('Title').fill('E2E Desk Lead');
  await page.getByPlaceholder('Department').fill(`CA Dept ${stamp}`);
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(main(page)).toContainText('Profile saved.', { timeout: 30_000 });
  await page.reload();
  await page.getByRole('button', { name: 'Org chart' }).click();
  await page.getByPlaceholder('Search staff…').fill(hire.name);
  await expect(main(page)).toContainText('E2E Desk Lead', { timeout: 30_000 });

  // Time off: record → approve.
  await page.getByRole('button', { name: 'Timings & time off' }).click();
  const form = main(page).locator('form');
  await form.locator('select').first().selectOption({ label: hire.name });
  await form.locator('input[type=date]').fill('2031-01-15');
  await form.getByPlaceholder('Note (optional)').fill(`CA sick ${stamp}`);
  await form.getByRole('button', { name: 'Record' }).click();
  await expect(main(page).getByText('Recorded.')).toBeVisible({ timeout: 30_000 });
  const pending = main(page).locator('div').filter({ hasText: `CA sick ${stamp}` }).filter({ has: page.getByRole('button', { name: 'Approve' }) }).last();
  await pending.getByRole('button', { name: 'Approve' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Timings & time off' }).click();
  await expect(main(page).locator('tr', { hasText: hire.name })).toContainText('2031-01-15 (sick, approved)', { timeout: 30_000 });
  await shoot(page, 'team-timings');

  // The promoted user signs in with operations access.
  const hctx = await contextAs(browser, hire.email);
  const hp = await hctx.newPage();
  await hp.goto('/login');
  await hp.waitForURL(/\/dashboard/, { timeout: 60_000 });
  const links = await navLinks(hp);
  expect(links).toContain('CRM');
  expect(links).not.toContain('Finance');
  await hctx.close();
  expect(clean(errors)).toEqual([]);
  await ctx.close();
});

test('approvals: approve one + deny one request; tabs + audit reflect decisions', async ({ browser }) => {
  const m = await freshApiUser('appr', ['member']);
  const a1 = await m.convex.mutation(api.mutations.users.requestEarlyPayout, { amountCents: 12_345, note: `CA approve ${stamp}` });
  const a2 = await m.convex.mutation(api.mutations.users.requestEarlyPayout, { amountCents: 6_789, note: `CA deny ${stamp}` });
  const { ctx, page, errors } = await open(browser, '/approvals');
  await page.getByRole('button', { name: 'payout', exact: true }).click();
  const card = (note: string) => main(page).locator('div').filter({ hasText: note }).filter({ has: page.getByRole('button', { name: 'Approve' }) }).last();
  await expect(card(`CA approve ${stamp}`)).toContainText('123.45 AED', { timeout: 30_000 });
  await card(`CA approve ${stamp}`).getByPlaceholder('Decision note (optional)').fill('ok by e2e');
  await card(`CA approve ${stamp}`).getByRole('button', { name: 'Approve' }).click();
  await expect(main(page).getByText('Request approved.')).toBeVisible({ timeout: 30_000 });
  await card(`CA deny ${stamp}`).getByRole('button', { name: 'Deny' }).click();
  await expect(main(page).getByText('Request denied.')).toBeVisible({ timeout: 30_000 });
  await page.reload();
  await page.getByRole('button', { name: 'approved', exact: true }).click();
  await expect(main(page)).toContainText(`CA approve ${stamp}`, { timeout: 30_000 });
  await page.getByRole('button', { name: 'denied', exact: true }).click();
  await expect(main(page)).toContainText(`CA deny ${stamp}`, { timeout: 30_000 });
  // Requestor notified; audit row written.
  const convex = await convexAs(ctx);
  const audit = await convex.query(api.queries.financeAuditLog.listAuditEvents, { limit: 300, entityType: 'approval' });
  expect(audit.find((e: any) => e.entityId === a1)?.action).toBe('approval.approved');
  expect(audit.find((e: any) => e.entityId === a2)?.action).toBe('approval.denied');
  const notes = await m.convex.query(api.queries.operations.getMyNotifications, {});
  console.log('requestor notifications:', JSON.stringify((notes?.notifications ?? notes ?? []).slice?.(0, 2)?.map((n: any) => n.title)));
  await shoot(page, 'approvals');
  expect(clean(errors)).toEqual([]);
  await ctx.close();
});

test('classes overview renders roster + upcoming (read-only page)', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, '/classes');
  await expect(main(page)).toContainText("Today's roster");
  await expect(main(page)).toContainText('Upcoming classes');
  await expect(main(page).getByText('Loading…')).toHaveCount(0, { timeout: 30_000 });
  // Inventory: the web console has no create/edit/cancel/capacity controls for class instances.
  const controls = await main(page).getByRole('button').allTextContents();
  console.log('classes page buttons:', JSON.stringify(controls));
  await shoot(page, 'classes');
  expect(clean(errors)).toEqual([]);
  await ctx.close();
});

test('branches: create → edit → staff assign/remove → deactivate/activate; events: create → edit → cancel', async ({ browser }) => {
  const staffUser = await freshUser('bstaff', ['operations']);
  const { ctx, page, errors } = await open(browser, '/branches');
  const bname = `CA Branch ${stamp}`;
  await page.getByRole('button', { name: '+ New branch' }).click();
  await page.getByPlaceholder('Name').fill(bname);
  await page.getByPlaceholder('City').fill('Sharjah');
  await page.getByPlaceholder('Address').fill('Al Majaz 1');
  await page.getByPlaceholder('Phone').fill('+97165550000');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(main(page).getByText('Branch created.')).toBeVisible({ timeout: 30_000 });
  const detail = main(page).locator('div').filter({ has: page.getByText(bname, { exact: true }) }).filter({ has: page.getByRole('button', { name: 'Edit' }) }).last();
  await detail.getByRole('button', { name: 'Edit' }).click();
  await page.getByPlaceholder('City').fill('Ajman');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(main(page).getByText('Branch updated.')).toBeVisible({ timeout: 30_000 });

  // Assign staff.
  await main(page).locator('select').filter({ hasText: 'Select staff…' }).selectOption({ label: `${staffUser.name} (operations)` });
  await page.getByPlaceholder('Role at branch').fill('desk');
  await page.getByRole('button', { name: 'Assign' }).click();
  await expect(main(page).getByText('Staff assigned.')).toBeVisible({ timeout: 30_000 });
  await page.reload();
  await main(page).getByText(bname, { exact: true }).click();
  await expect(main(page)).toContainText(`${staffUser.name} · desk`, { timeout: 30_000 });
  await expect(main(page).getByText(bname, { exact: true }).locator('../..')).toContainText('Ajman');

  // Events at the branch.
  await page.goto('/events');
  await expectLive(page);
  const title = `CA Event ${stamp}`;
  await page.getByRole('button', { name: '+ New event' }).click();
  await page.getByPlaceholder('Title').fill(title);
  await main(page).locator('form select').selectOption({ label: bname });
  await page.getByPlaceholder('Capacity (optional)').fill('25');
  await page.getByPlaceholder('Description (optional)').fill('console-admin e2e');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(main(page).getByText('Event created.')).toBeVisible({ timeout: 30_000 });
  const ev = () => main(page).locator('div').filter({ hasText: title }).filter({ has: page.getByRole('button', { name: 'Edit' }) }).last();
  await expect(ev()).toContainText(`· ${bname} · scheduled`);
  await expect(ev()).toContainText('cap 25');
  await ev().getByRole('button', { name: 'Edit' }).click();
  await page.getByPlaceholder('Title').fill(`${title} v2`);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(main(page).getByText('Event updated.')).toBeVisible({ timeout: 30_000 });
  await main(page).locator('div').filter({ hasText: `${title} v2` }).filter({ has: page.getByRole('button', { name: 'Cancel' }) }).last().getByRole('button', { name: 'Cancel' }).click();
  await page.reload();
  await page.getByLabel('Upcoming only').uncheck().catch(() => main(page).locator('input[type=checkbox]').first().uncheck());
  await expect(main(page).getByText(`${title} v2`).locator('..')).toContainText('cancelled', { timeout: 30_000 });

  // Branch detail shows the event; remove staff; deactivate → activate.
  await page.goto('/branches');
  await main(page).getByText(bname, { exact: true }).click();
  await expect(main(page)).toContainText(`${title} v2`, { timeout: 30_000 });
  await main(page).locator('div').filter({ hasText: `${staffUser.name} · desk` }).getByRole('button', { name: 'Remove' }).last().click();
  await expect(main(page)).toContainText('Nobody assigned yet.', { timeout: 30_000 });
  await main(page).getByRole('button', { name: 'Deactivate' }).click();
  await expect(main(page).getByText(bname, { exact: true }).locator('../..')).toContainText('inactive', { timeout: 30_000 });
  await main(page).getByRole('button', { name: 'Activate' }).click();
  await expect(main(page).getByRole('button', { name: 'Deactivate' })).toBeVisible({ timeout: 30_000 });
  await shoot(page, 'branches');
  expect(clean(errors)).toEqual([]);
  await ctx.close();
});

test('branch switcher: options are departments, and switching does not filter data', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, '/dashboard');
  const sw = page.getByLabel('Branch scope');
  await expect(sw).toBeVisible({ timeout: 30_000 });
  const opts = await sw.locator('option').allTextContents();
  console.log('branch switcher options:', JSON.stringify(opts));
  const convex = await convexAs(ctx);
  const branches = await convex.query(api.queries.branches.branchesList, {});
  const names = branches.map((b: any) => b.branch.name);
  console.log('real branches:', JSON.stringify(names));
  const kpi = async () => main(page).getByText('Active members', { exact: true }).locator('..').innerText();
  const before = await kpi();
  const dept = opts.find((o) => / staff$/.test(o));
  if (dept) {
    await sw.selectOption({ label: dept });
    await expect(main(page)).toContainText('labels this view only');
    expect(await kpi()).toBe(before);
    await sw.selectOption({ index: 0 });
  }
  expect.soft(opts.some((o) => names.includes(o)), 'switcher should offer the real branches').toBe(true);
  expect(clean(errors)).toEqual([]);
  await ctx.close();
});

test('valet: plate check-in for a member → queue → complete', async ({ browser }) => {
  const m = await freshApiUser('valet', ['member']);
  const { ctx, page, errors } = await open(browser, '/valet');
  const plate = `CA${stamp.slice(-5).toUpperCase()}`;
  await page.getByLabel('Plate').fill(plate);
  await page.getByLabel('Find member').fill(m.email);
  const sel = page.getByLabel('Member');
  await expect(sel.locator('option', { hasText: m.email })).toBeAttached({ timeout: 30_000 });
  await sel.selectOption({ label: `${m.name} · ${m.email}` });
  await main(page).getByRole('button', { name: 'Check in', exact: true }).first().click();
  await expect(main(page).getByText(`Checked in ${plate}.`)).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'checked_in', exact: true }).click();
  const row = main(page).locator('tr', { hasText: plate });
  await expect(row).toContainText('checked_in', { timeout: 30_000 });
  await row.getByRole('button', { name: 'Complete' }).click();
  await page.getByRole('button', { name: 'completed', exact: true }).click();
  await expect(main(page).locator('tr', { hasText: plate })).toContainText('completed', { timeout: 30_000 });
  await shoot(page, 'valet');
  expect(clean(errors)).toEqual([]);
  await ctx.close();
});

test('coffee + salon admin: create item/service → deactivate → remove', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, '/coffee');
  const item = `CA Latte ${stamp}`;
  await page.getByPlaceholder('Name').fill(item);
  await page.getByPlaceholder('Price').fill('18.50');
  await page.getByRole('button', { name: 'Create item' }).click();
  const irow = () => main(page).locator('div').filter({ hasText: item }).filter({ has: page.getByRole('button', { name: 'Remove' }) }).last();
  await expect(irow()).toContainText('18.50', { timeout: 30_000 });
  await irow().getByRole('button', { name: 'Deactivate' }).click();
  await expect(irow()).toContainText('(inactive)');
  page.once('dialog', (d) => d.accept());
  await irow().getByRole('button', { name: 'Remove' }).click();
  await expect(main(page).getByText(item)).toHaveCount(0, { timeout: 30_000 });

  await page.goto('/salon');
  await expectLive(page);
  const svc = `CA Trim ${stamp}`;
  await page.getByPlaceholder('Name').fill(svc);
  await page.getByPlaceholder('Price').fill('75');
  await page.getByPlaceholder('Duration (min)').fill('45');
  await page.getByRole('button', { name: 'Create service' }).click();
  const srow = () => main(page).locator('div').filter({ hasText: svc }).filter({ has: page.getByRole('button', { name: 'Remove' }) }).last();
  await expect(srow()).toContainText('75.00 · 45 min', { timeout: 30_000 });
  await srow().getByRole('button', { name: 'Deactivate' }).click();
  await expect(srow().getByRole('button', { name: 'Activate' })).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await srow().getByRole('button', { name: 'Remove' }).click();
  await expect(main(page).getByText(svc)).toHaveCount(0, { timeout: 30_000 });
  await shoot(page, 'salon');
  expect(clean(errors)).toEqual([]);
  await ctx.close();
});

test('CRM: lead add → edit → stage moves → note → task → convert to member', async ({ browser }) => {
  const m = await freshApiUser('crm', ['member']);
  const { ctx, page, errors } = await open(browser, '/crm');
  const lead = `CA Lead ${stamp}`;
  await page.getByPlaceholder('Lead name').fill(lead);
  await page.getByPlaceholder('Phone').first().fill('+971501112233');
  await page.getByRole('button', { name: 'Add lead' }).click();
  await expect(main(page).getByText('Lead created.')).toBeVisible({ timeout: 30_000 });
  const card = () => main(page).locator('div[style*="cursor: pointer"]').filter({ hasText: lead });
  await card().getByRole('button', { name: '→ contacted' }).click();
  await expect(main(page).getByText(/^contacted \(/).locator('..')).toContainText(lead, { timeout: 30_000 });
  await card().click();
  await main(page).getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByPlaceholder('Email').fill(m.email);
  await page.getByPlaceholder('Source').fill('walk-in');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(main(page).getByText('Lead updated.')).toBeVisible({ timeout: 30_000 });
  await page.getByPlaceholder('Log a note / call…').fill(`Called ${stamp}`);
  await page.getByRole('button', { name: 'Log', exact: true }).click();
  await expect(main(page)).toContainText(`[note] Called ${stamp}`, { timeout: 30_000 });
  await page.getByPlaceholder('New task…').fill(`Follow up ${lead}`);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const task = main(page).locator('li', { hasText: `Follow up ${lead}` });
  await expect(task).toBeVisible({ timeout: 30_000 });
  await task.getByRole('button', { name: 'Done' }).click();
  await expect(task).toHaveCount(0, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Convert to member' }).click();
  await page.getByPlaceholder('Search members by name or email…').fill(m.email);
  await main(page).getByRole('button', { name: 'Link' }).first().click({ timeout: 30_000 });
  await expect(main(page).getByText('Lead converted and linked to member.')).toBeVisible({ timeout: 30_000 });
  await page.reload();
  await expect(main(page).getByText(/^converted \(/).locator('..')).toContainText(lead, { timeout: 30_000 });
  await shoot(page, 'crm');
  expect(clean(errors)).toEqual([]);
  await ctx.close();
});

test('promotions, partners, documents render live data', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, '/promotions');
  await expect(main(page)).toContainText('Referral codes', { timeout: 30_000 });
  await page.goto('/partners');
  await expectLive(page);
  await expect(main(page).locator('table').or(main(page).getByText('No partner payouts in this view.'))).toBeVisible({ timeout: 30_000 });
  await page.goto('/documents');
  await expectLive(page);
  const sig = main(page).getByRole('button', { name: 'Signatures' }).first();
  await expect(sig).toBeVisible({ timeout: 30_000 });
  await sig.click();
  await expect(main(page).getByText(/signed|No signatures on this template yet/).first()).toBeVisible({ timeout: 30_000 });
  await shoot(page, 'documents');
  expect(clean(errors)).toEqual([]);
  await ctx.close();
});

test('notifications (in-app) + sales push: sent, listed, delivered to a member feed', async ({ browser }) => {
  const m = await freshApiUser('notif', ['member']);
  const { ctx, page, errors } = await open(browser, '/notifications');
  const title = `CA Notice ${stamp}`;
  await page.getByPlaceholder('Title').fill(title);
  await page.getByPlaceholder('Message body').fill('console-admin in-app broadcast');
  await page.getByRole('button', { name: 'Send to members' }).click();
  await expect(main(page).getByText(/^Sent to \d+ members?/)).toBeVisible({ timeout: 60_000 });
  console.log('broadcast status:', await main(page).getByText(/^Sent to/).innerText());
  await page.reload();
  await expect(main(page)).toContainText(title, { timeout: 30_000 });

  await page.goto('/sales-push');
  await expectLive(page);
  const promo = `CA Promo ${stamp}`;
  await page.getByPlaceholder('Promo title').fill(promo);
  await page.getByPlaceholder('Promo details').fill('20% off PT this week');
  await page.getByPlaceholder('CTA (e.g. Claim offer)').fill('Claim');
  await page.getByPlaceholder('Price (optional)').fill('199.99');
  await page.getByRole('button', { name: 'Push promo to members' }).click();
  await expect(main(page).getByText(/^Promo sent to \d+ members?/)).toBeVisible({ timeout: 60_000 });
  await page.reload();
  await expect(main(page)).toContainText(promo, { timeout: 30_000 });

  const feed = await m.convex.query(api.queries.operations.getMyNotifications, {});
  const titles = (Array.isArray(feed) ? feed : feed?.notifications ?? feed?.page ?? []).map((n: any) => n.title);
  console.log('fresh member feed:', JSON.stringify(titles.slice(0, 5)));
  expect.soft(titles, 'fresh member receives the broadcast').toContain(title);
  expect.soft(titles, 'fresh member receives the promo').toContain(promo);
  expect(clean(errors)).toEqual([]);
  await ctx.close();
});

test('settings: venue gateway form starts from the saved values; audit log shows this run’s actions', async ({ browser }) => {
  const { ctx, page, errors } = await open(browser, '/settings');
  const convex = await convexAs(ctx);
  const saved = await convex.query(api.queries.commerce.getVenuePaymentSettings, { venue: 'salon' });
  const salonCard = main(page).locator('form').nth(1);
  await expect(main(page)).toContainText(`Current: ${saved.provider}`, { timeout: 30_000 });
  const shownProvider = await salonCard.getByLabel('Provider').inputValue();
  const shownCurrency = await salonCard.getByLabel('Currency').inputValue();
  console.log(`salon saved ${saved.provider}/${saved.currency}/${saved.enabled} · form shows ${shownProvider}/${shownCurrency}`);
  expect.soft(shownProvider, 'gateway form must be primed with the saved provider').toBe(saved.provider);
  await expect(main(page)).toContainText(/Branches \(\d+\)/);
  await shoot(page, 'settings');

  await page.goto('/audit');
  await expectLive(page);
  await expect(main(page)).toContainText(/approval\.|staffRoles\.updated|membership\.|payout\.|journal\./, { timeout: 30_000 });
  const filter = main(page).locator('select').first();
  await filter.selectOption('payout.');
  await expect(main(page)).toContainText('payout.', { timeout: 30_000 });
  await shoot(page, 'audit');
  expect(clean(errors)).toEqual([]);
  await ctx.close();
});
