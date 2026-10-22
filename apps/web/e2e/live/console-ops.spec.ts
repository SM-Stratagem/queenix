/**
 * Operations web console, live: every ops page + action through the UI, with
 * persistence checked by reload and/or the same Convex queries the console uses.
 *
 *   E2E_BASE_URL=http://10.12.19.174:4000 npx playwright test e2e/live/console-ops.spec.ts
 *
 * Creates its own records (unique names per run). expect.soft = correct
 * behaviour for a bug that exists today (see the console-ops report).
 */
import { test, expect, type Browser } from '@playwright/test';
import { api } from '@queenix/convex';
import {
  apiSession,
  convexAs,
  cxTable,
  drawImage,
  errorOf,
  expectLive,
  expectStaffOnly,
  freshStaff,
  main,
  shot,
  staffContext,
  trackErrors,
  BASE,
  PASSWORD,
} from './console-ops-lib';

test.setTimeout(300_000);
const stamp = Date.now().toString(36);

const OPS_NAV = [
  'Dashboard', 'Members', 'Trainers', 'Team & roles', 'Approvals', 'Classes', 'Branches', 'Events', 'Valet',
  'Coffee', 'Salon', 'CRM', 'Notifications', 'Sales push', 'Content', 'Media', 'Blog', 'Settings',
];

async function opsPage(browser: Browser, user = 'ops') {
  const ctx = await staffContext(browser, user);
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  return { ctx, page, errors };
}

/** Fresh member account (sign-up default role = member). */
async function freshMember(request: import('@playwright/test').APIRequestContext, tag: string) {
  const email = `t-console-ops-${tag}-${Date.now().toString(36)}@queenix.test`;
  const fullName = `E2E Member ${tag} ${stamp}`;
  let res = await request.post(`${BASE}/api/auth/sign-up/email`, { headers: { origin: BASE }, data: { email, password: PASSWORD, name: fullName, fullName } });
  for (let i = 0; i < 5 && res.status() === 429; i++) {
    await new Promise((r) => setTimeout(r, 15_000));
    res = await request.post(`${BASE}/api/auth/sign-up/email`, { headers: { origin: BASE }, data: { email, password: PASSWORD, name: fullName, fullName } });
  }
  expect(res.ok(), await res.text()).toBe(true);
  return { email, fullName };
}

test('fresh ops user: role API promotion → lands on /dashboard, exact nav, every page live, finance pages gated', async ({ browser, request }) => {
  const email = await freshStaff(request, 'console-ops', 'operations');
  const ctx = await staffContext(browser, email);
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  await page.goto('/login');
  await page.waitForURL(/\/dashboard$/, { timeout: 60_000 });
  const nav = page.getByRole('navigation', { name: 'Admin' });
  await expect(nav.getByRole('link').first()).toBeVisible();
  expect(await nav.getByRole('link').allTextContents()).toEqual(OPS_NAV);

  const hrefs = await nav.getByRole('link').evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
  for (const href of hrefs) {
    await page.goto(href);
    await expectLive(page);
    await expect(main(page)).not.toContainText(/unavailable/i, { timeout: 20_000 });
  }
  for (const route of ['/finance', '/promotions', '/partners', '/documents', '/reports', '/audit', '/trainer']) {
    await expectStaffOnly(page, route);
  }
  expect(errors).toEqual([]);
  await ctx.close();
});

test('dashboard: KPIs, membership mix, floor widgets and scanner panel load for ops (no finance revenue)', async ({ browser }) => {
  const { ctx, page, errors } = await opsPage(browser);
  await page.goto('/dashboard');
  await expect(main(page).getByText(/Active members|KPIs unavailable/)).toBeVisible({ timeout: 60_000 });
  await expect(main(page).getByText('Recent check-ins').or(main(page).getByText('Recent check-ins unavailable.'))).toBeVisible({ timeout: 60_000 });
  await shot(page, 'console-ops-dashboard');
  await expect(main(page)).not.toContainText(/unavailable/i);
  await expect(main(page).getByText(/Revenue — last 14 days/)).toHaveCount(0);
  await expect(main(page).getByRole('heading', { name: 'Scanner health' })).toBeVisible();
  expect(errors).toEqual([]);
  await ctx.close();
});

test('members: search + status tabs, fresh member detail, Emirates ID scan via real OCR → verified ID persisted', async ({ browser, request }) => {
  const m = await freshMember(request, 'id');
  const { ctx, page, errors } = await opsPage(browser);
  await page.goto('/members');
  await expectLive(page);
  for (const tab of ['active', 'trial', 'frozen', 'all']) {
    await main(page).getByRole('button', { name: tab, exact: true }).click();
    await expect(main(page).getByText(/Loading members…/)).toHaveCount(0, { timeout: 30_000 });
  }
  await page.getByPlaceholder('Search name, email, phone…').fill(m.email);
  const row = page.getByRole('row', { name: new RegExp(m.fullName) });
  // getMembersDirectory scans only the first 500 member rows (take(500) before search).
  await expect.soft(row, 'BUG: fresh member not found by search (directory scans only the first 500 members)').toBeVisible({ timeout: 30_000 });

  const ops = await convexAs(ctx.request);
  const user = (await ops.query(api.queries.users.getMembersDirectory, { search: m.email, status: 'all', limit: 5 }))[0]?.user;
  test.skip(!user, 'fresh member not reachable through the directory (bug above) — cannot open detail');
  await page.goto(`/members/${user!._id}`);
  await expect(page.getByRole('heading', { name: m.fullName })).toBeVisible({ timeout: 30_000 });
  await expect(main(page)).toContainText('No memberships on record.');

  const id = await drawImage(browser, `<div style="width:1012px;height:638px;background:#ecf2ee;font-family:Arial;position:relative">
    <div style="position:absolute;left:40px;top:30px;font:bold 34px Arial">UNITED ARAB EMIRATES</div>
    <div style="position:absolute;left:40px;top:75px;font:26px Arial">RESIDENT IDENTITY CARD</div>
    <div style="position:absolute;left:40px;top:150px;width:230px;height:280px;background:#c8cdd2"></div>
    ${[['ID Number', '784-1990-7654321-2'], ['Name:', 'Test Person Example'], ['Date of Birth:', '03/04/1990'], ['Nationality:', 'Utopia']]
      .map(([l, v], i) => `<div style="position:absolute;left:310px;top:${160 + i * 62}px;font:24px Arial;color:#464646">${l}</div>
        <div style="position:absolute;left:540px;top:${158 + i * 62}px;font:bold 28px Arial">${v}</div>`).join('')}
    <div style="position:absolute;left:660px;top:470px;font:24px Arial;color:#464646">Expiry Date:</div>
    <div style="position:absolute;left:812px;top:468px;font:bold 28px Arial">20/11/2029</div></div>`);
  await page.getByLabel('Scan ID').setInputFiles({ name: 'eid.png', mimeType: 'image/png', buffer: id });
  const review = page.getByLabel('Review ID');
  await expect(review.getByLabel('ID number')).toHaveValue('784-1990-7654321-2', { timeout: 90_000 });
  await review.getByLabel('Full name').fill('Test Person Example');
  await review.getByRole('button', { name: 'Confirm & save ID' }).click();
  const shown = page.getByTestId('member-identity');
  await expect(shown).toContainText('Emirates ID 784-1990-7654321-2', { timeout: 30_000 });
  await expect(shown).toContainText('Verified by staff');
  await page.reload();
  await expect(page.getByTestId('member-identity')).toContainText('784-1990-7654321-2', { timeout: 30_000 });
  await shot(page, 'console-ops-member-id');
  expect(errors).toEqual([]);
  await ctx.close();
});

test('CRM: lead new → contacted → trial → converted (linked member); second lead → lost; edit, interactions, tasks', async ({ browser }) => {
  const { ctx, page, errors } = await opsPage(browser);
  const ops = await convexAs(ctx.request);
  await page.goto('/crm');
  await expectLive(page);
  const lead = `E2E CRM ${stamp}`;
  const lost = `E2E Lost ${stamp}`;
  const col = (stage: string) => main(page).getByText(new RegExp(`^${stage} \\(\\d+\\)$`)).locator('..');
  const card = (name: string) => main(page).locator('div[style*="cursor: pointer"]').filter({ hasText: name });

  for (const n of [lead, lost]) {
    await page.getByPlaceholder('Lead name').fill(n);
    await page.getByPlaceholder('Phone').first().fill(`+97150${Date.now().toString().slice(-7)}`);
    await page.getByRole('button', { name: 'Add lead' }).click();
    await expect(main(page).getByText('Lead created.')).toBeVisible();
    await expect(col('new')).toContainText(n);
  }
  // Empty lead: nothing should be created without a name/phone.
  await page.getByPlaceholder('Lead name').fill('');
  await page.getByRole('button', { name: 'Add lead' }).click();
  await expect.soft(main(page).getByText('Lead created.'), 'BUG: CRM accepts a lead with empty name and phone').toHaveCount(0);

  await card(lead).getByRole('button', { name: '→ contacted' }).click();
  await expect(col('contacted')).toContainText(lead);
  await card(lead).getByRole('button', { name: '→ trial' }).click();
  await expect(col('trial')).toContainText(lead);
  await card(lost).getByRole('button', { name: '→ lost' }).click();
  await expect(col('lost')).toContainText(lost);

  // Detail: edit + interaction + task tied to the lead.
  await card(lead).click();
  const detail = main(page).locator('div').filter({ has: page.getByRole('heading', { name: 'Lead detail' }) }).last();
  await expect(detail).toContainText(`${lead} · trial`);
  await detail.getByRole('button', { name: 'Edit' }).click();
  await detail.getByPlaceholder('Email').fill(`lead-${stamp}@example.com`);
  await detail.getByPlaceholder('Source').fill('instagram');
  await detail.getByPlaceholder('Notes').fill('Prefers evenings');
  await detail.getByRole('button', { name: 'Save' }).click();
  await expect(main(page).getByText('Lead updated.')).toBeVisible();
  await expect(detail).toContainText(`via instagram · Prefers evenings`);
  await detail.getByPlaceholder('Log a note / call…').fill(`Called ${stamp}`);
  await detail.getByRole('button', { name: 'Log' }).click();
  await expect(detail.getByRole('listitem').filter({ hasText: `[note] Called ${stamp}` })).toBeVisible();
  await expect(detail.getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/97150/);
  await expect(detail.getByRole('link', { name: 'Email' })).toHaveAttribute('href', new RegExp(`^mailto:lead-${stamp}`));

  await page.getByPlaceholder('New task…').fill(`Follow up ${stamp}`);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const task = main(page).getByRole('listitem').filter({ hasText: `Follow up ${stamp}` });
  await expect(task).toBeVisible();

  // Convert: link to an existing member.
  await detail.getByRole('button', { name: 'Convert to member' }).click();
  await detail.getByPlaceholder('Search members by name or email…').fill('Amna');
  await detail.getByRole('button', { name: 'Link' }).first().click();
  await expect(main(page).getByText('Lead converted and linked to member.')).toBeVisible();
  await expect(col('converted')).toContainText(lead);
  await expect(detail.getByRole('link', { name: /Amna/ })).toHaveAttribute('href', /^\/members\//);

  // Persistence after reload + server state.
  await page.reload();
  await expect(col('converted')).toContainText(lead, { timeout: 30_000 });
  await expect(col('lost')).toContainText(lost);
  const pipeline = await ops.query(api.queries.crm.listLeadsByStage, {});
  const row = pipeline.columns.flatMap((c: any) => c.leads).find((l: any) => l.name === lead);
  const full = (await ops.query(api.queries.crm.getLead, { leadId: row._id }))!;
  expect(full.lead).toMatchObject({ stage: 'converted', source: 'instagram', email: `lead-${stamp}@example.com`, notes: 'Prefers evenings' });
  expect(full.linkedUser?.fullName).toMatch(/Amna/);
  expect(full.interactions.map((i: any) => i.summary)).toContain(`Called ${stamp}`);
  const tasks = await ops.query(api.queries.crm.tasksDue, {});
  expect(tasks.find((t: any) => t.title === `Follow up ${stamp}`)?.leadId).toBe(row._id);

  // Assignment: backend supports assignedTo; the console has no control for it.
  const me = await ops.query(api.queries.users.getCurrentUser, {});
  await ops.mutation(api.mutations.crm.assignTask, { title: `Assigned ${stamp}`, assignedTo: me!._id, leadId: row._id });
  const mine = await ops.query(api.queries.crm.tasksDue, { assignedTo: me!._id });
  expect(mine.map((t: any) => t.title)).toContain(`Assigned ${stamp}`);
  await page.reload();
  await expect.soft(main(page).getByRole('combobox'), 'GAP: no lead/task assignee control in the CRM UI').not.toHaveCount(0);

  // Complete both tasks through the UI.
  for (const t of [`Follow up ${stamp}`, `Assigned ${stamp}`]) {
    const li = main(page).getByRole('listitem').filter({ hasText: t });
    await li.getByRole('button', { name: 'Done' }).click();
    await expect(li).toHaveCount(0);
  }
  await shot(page, 'console-ops-crm');
  expect(errors).toEqual([]);
  await ctx.close();
});

test('approvals: trainer payout request → ops denies one / approves one; members cannot list or decide', async ({ browser, playwright }) => {
  const trainerCtx = await staffContext(browser, 'trainer');
  const trainer = await convexAs(trainerCtx.request);
  const notes = [`E2E deny ${stamp}`, `E2E approve ${stamp}`];
  for (const note of notes) await trainer.mutation(api.mutations.users.requestEarlyPayout, { amountCents: 12_300, note });
  await trainerCtx.close();

  const { ctx, page, errors } = await opsPage(browser);
  await page.goto('/approvals');
  await expectLive(page);
  const item = (note: string) => main(page).locator('div').filter({ hasText: note }).filter({ has: page.getByRole('button', { name: 'Deny' }) }).last();
  await main(page).getByRole('button', { name: 'payout', exact: true }).click();
  await expect(item(notes[0]!)).toBeVisible({ timeout: 30_000 });
  await expect(item(notes[0]!)).toContainText('123');
  await item(notes[0]!).getByPlaceholder('Decision note (optional)').fill('Too early in the month');
  await item(notes[0]!).getByRole('button', { name: 'Deny' }).click();
  await expect(main(page).getByText('Request denied.')).toBeVisible();
  await item(notes[1]!).getByRole('button', { name: 'Approve' }).click();
  await expect(main(page).getByText('Request approved.')).toBeVisible();
  await main(page).getByRole('button', { name: 'denied', exact: true }).click();
  await expect(main(page).getByText(notes[0]!)).toBeVisible();
  await main(page).getByRole('button', { name: 'approved', exact: true }).click();
  await expect(main(page).getByText(notes[1]!)).toBeVisible();
  await shot(page, 'console-ops-approvals');
  expect(errors).toEqual([]);
  await ctx.close();

  // Members: the approvals inbox (with requestor PII) and the decision mutation are staff-only.
  const member = await convexAs(await apiSession(playwright, 'member@queenix.test'));
  const listed = await errorOf(member.query(api.queries.memberships.getApprovals, { status: 'approved', limit: 5 }));
  expect.soft(listed, 'BUG: any signed-in member can list every approval incl. requestor user docs').toBe('FORBIDDEN');
  const t2 = await convexAs((await staffContext(browser, 'trainer')).request);
  const victim = await t2.mutation(api.mutations.users.requestEarlyPayout, { amountCents: 100, note: `E2E member-decides ${stamp}` });
  const decided = await errorOf(member.mutation(api.mutations.users.decideApproval, { approvalId: victim, decision: 'approved' }));
  expect.soft(decided, 'BUG: a member can approve/deny any approval request').toBe('FORBIDDEN');
  const asMemberRequest = await errorOf(member.mutation(api.mutations.users.requestEarlyPayout, { amountCents: 999_999 }));
  expect.soft(asMemberRequest, 'BUG: members can file trainer payout requests').toBe('FORBIDDEN');
});

test('classes + branches render; events: create → edit → cancel persists', async ({ browser }) => {
  const { ctx, page, errors } = await opsPage(browser);
  await page.goto('/classes');
  await expectLive(page);
  await expect(main(page)).toContainText("Today's roster");
  await expect(main(page).getByRole('heading', { name: 'Upcoming classes' })).toBeVisible();
  await page.goto('/branches');
  await expectLive(page);

  await page.goto('/events');
  await expectLive(page);
  const title = `E2E Event ${stamp}`;
  await main(page).getByRole('button', { name: '+ New event' }).click();
  await main(page).getByPlaceholder('Title').fill(title);
  await main(page).getByPlaceholder('Capacity (optional)').fill('12');
  await main(page).getByPlaceholder('Description (optional)').fill('Created by console-ops e2e');
  await main(page).getByRole('button', { name: 'Save' }).click();
  await expect(main(page).getByText('Event created.')).toBeVisible();
  const row = () => main(page).locator('div').filter({ hasText: title }).filter({ has: page.getByRole('button', { name: 'Edit' }) }).last();
  await expect(row()).toContainText('scheduled');
  await expect(row()).toContainText('cap 12');

  await row().getByRole('button', { name: 'Edit' }).click();
  await main(page).getByPlaceholder('Title').fill(`${title} v2`);
  await main(page).getByRole('button', { name: 'Save' }).click();
  await expect(main(page).getByText('Event updated.')).toBeVisible();
  await page.reload();
  await expect(main(page).getByText(`${title} v2`)).toBeVisible({ timeout: 30_000 });

  // End before start must be refused.
  await main(page).getByRole('button', { name: '+ New event' }).click();
  await main(page).getByPlaceholder('Title').fill(`${title} bad`);
  const [starts, ends] = [main(page).locator('input[type=datetime-local]').first(), main(page).locator('input[type=datetime-local]').last()];
  const s = await starts.inputValue();
  await ends.fill(s.replace(/T\d\d/, 'T00'));
  await main(page).getByRole('button', { name: 'Save' }).click();
  await expect.soft(main(page).getByText('Event created.'), 'BUG: event with end before start accepted').toHaveCount(0);

  const v2 = main(page).locator('div').filter({ hasText: `${title} v2` }).filter({ has: page.getByRole('button', { name: 'Cancel' }) }).last();
  await v2.getByRole('button', { name: 'Cancel' }).click();
  // Cancelled events leave the default "Upcoming only" view; show all to see the status.
  await expect(main(page).getByRole('button', { name: 'Edit' }).locator('xpath=ancestor::div[1]').filter({ hasText: `${title} v2` })).toHaveCount(0);
  const upcoming = main(page).getByLabel('Upcoming only');
  if (await upcoming.isChecked()) await upcoming.uncheck();
  await expect(main(page).getByText(new RegExp(`${title} v2.*cancelled`))).toBeVisible();
  const ops = await convexAs(ctx.request);
  const events = await ops.query(api.queries.branches.eventsList, {});
  expect(events.find((e: any) => e.event.title === `${title} v2`)?.event.status).toBe('cancelled');
  // Clean the bad one if it was created.
  for (const e of events.filter((x: any) => x.event.title === `${title} bad` && x.event.status === 'scheduled')) {
    await ops.mutation(api.mutations.branches.cancelEvent, { eventId: e.event._id });
  }
  await shot(page, 'console-ops-events');
  expect(errors).toEqual([]);
  await ctx.close();
});

test('valet: plate OCR → member chosen → checked in → completed (check-out)', async ({ browser, request }) => {
  const m = await freshMember(request, 'valet');
  const digits = String(10000 + (Date.now() % 89999));
  const plate = `A ${digits}`;
  const img = await drawImage(browser, `<div style="width:620px;height:180px;background:#787878;padding:20px;box-sizing:border-box">
    <div style="height:140px;background:#fff;border:5px solid #000;border-radius:14px;display:flex;align-items:center;gap:40px;padding-left:25px;box-sizing:border-box">
    <span style="font:bold 30px Arial">DUBAI</span><span style="font:bold 88px Arial">A</span><span style="font:bold 88px Arial">${digits}</span></div></div>`);
  const { ctx, page, errors } = await opsPage(browser);
  await page.goto('/valet');
  await expectLive(page);
  const desk = page.getByLabel('Valet check-in');
  await desk.getByLabel('Scan plate').setInputFiles({ name: 'plate.png', mimeType: 'image/png', buffer: img });
  await expect(desk.getByLabel('Plate', { exact: true })).toHaveValue(new RegExp(`A ?${digits}`), { timeout: 90_000 });
  await desk.getByLabel('Plate', { exact: true }).fill(plate);
  await desk.getByLabel('Find member').fill(m.email);
  const member = desk.getByLabel('Member', { exact: true });
  await expect(member.locator('option', { hasText: m.email })).toBeAttached({ timeout: 30_000 });
  await member.selectOption({ label: `${m.fullName} · ${m.email}` });
  await desk.getByRole('button', { name: 'Check in' }).click();
  await expect(desk).toContainText(`Checked in ${plate}.`);
  // Same member twice: refused.
  await desk.getByLabel('Plate', { exact: true }).fill(plate);
  await desk.getByLabel('Find member').fill(m.email);
  await member.selectOption({ label: `${m.fullName} · ${m.email}` });
  await desk.getByRole('button', { name: 'Check in' }).click();
  await expect(desk).not.toContainText(`Checked in ${plate}.`);

  await main(page).getByRole('button', { name: 'checked_in' }).click();
  const row = page.getByRole('row').filter({ hasText: plate });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Complete' }).click();
  await expect(row).toHaveCount(0);
  await main(page).getByRole('button', { name: 'completed' }).click();
  await expect(page.getByRole('row').filter({ hasText: plate })).toBeVisible();
  await shot(page, 'console-ops-valet');
  expect(errors).toEqual([]);
  await ctx.close();
});

test('coffee + salon views for ops; settings: venue gateway edit persists and is restored', async ({ browser }) => {
  const { ctx, page, errors } = await opsPage(browser);
  for (const route of ['/coffee', '/salon']) {
    await page.goto(route);
    await expectLive(page);
    await expect(main(page).getByRole('heading', { level: 2, name: /queue/i })).toBeVisible();
  }
  await page.goto('/settings');
  await expectLive(page);
  const venueCard = () => main(page).getByText('salon', { exact: true }).locator('..');
  const salon = venueCard();
  await expect(salon.getByText(/^Current: /)).not.toContainText('loading', { timeout: 30_000 });
  const before = (await salon.getByText(/^Current: /).textContent())!;
  const [prov, cur] = before.replace('Current: ', '').split(' · ');
  await salon.getByLabel('Provider').selectOption('stripe');
  await salon.getByLabel('Currency').selectOption('SAR');
  await salon.getByRole('button', { name: 'Save gateway' }).click();
  await expect(salon.getByText('Saved.')).toBeVisible();
  await page.reload();
  const again = venueCard();
  await expect(again.getByText(/^Current: /)).toContainText('stripe · SAR', { timeout: 30_000 });
  await again.getByLabel('Provider').selectOption(prov!);
  await again.getByLabel('Currency').selectOption(cur!);
  await again.getByRole('button', { name: 'Save gateway' }).click();
  await expect(again.getByText(/^Current: /)).toContainText(`${prov} · ${cur}`);
  await expect(main(page).getByRole('link', { name: 'Team & roles →' })).toBeVisible();
  await expect(main(page).getByRole('link', { name: 'Audit log →' })).toHaveCount(0);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('notifications: "Also send to phones" → Expo push round trip → broadcast.push audit row', async ({ browser, playwright }) => {
  // A fake Expo token on the demo member: Expo answers DeviceNotRegistered → token cleared.
  const FAKE = `ExponentPushToken[queenixE2E${stamp}]`;
  const member = await convexAs(await apiSession(playwright, 'member@queenix.test'));
  await member.mutation(api.mutations.push.registerPushToken, { token: FAKE, platform: 'ios' });

  const { ctx, page, errors } = await opsPage(browser);
  await page.goto('/notifications');
  await expectLive(page);
  await expect(main(page)).toContainText(/Audience: \d+ members?/);
  // Validation.
  await page.getByRole('button', { name: 'Send to members' }).click();
  await expect(main(page).getByText('Title and body are required.')).toBeVisible();

  const title = `E2E push ${stamp}`;
  await page.getByPlaceholder('Title').fill(title);
  await page.getByPlaceholder('Message body').fill('Live push round trip from console-ops e2e.');
  await main(page).locator('select').selectOption('class_reminder');
  await page.getByLabel('Also send to phones').check();
  await page.getByRole('button', { name: 'Send to members' }).click();
  const status = main(page).getByText(/Phone push queued for \d+ members?\./);
  await expect(status).toBeVisible({ timeout: 60_000 });
  const batchId = (await status.textContent())!.match(/Batch (bcast_\S+)\./)![1];
  await expect(main(page).getByText(title)).toBeVisible();
  await shot(page, 'console-ops-notifications');

  let audit: any;
  await expect
    .poll(() => (audit = cxTable('auditEvents', 60).find((a) => a.action === 'broadcast.push' && a.entityId === batchId)), { timeout: 180_000, intervals: [5_000] })
    .toBeTruthy();
  test.info().annotations.push({ type: 'broadcast.push', description: JSON.stringify(audit.after) });
  expect(audit.after.tokens).toBeGreaterThanOrEqual(1);
  expect(audit.after.clearedTokens).toBeGreaterThanOrEqual(1);
  expect(errors).toEqual([]);
  await ctx.close();
});

test('sales push: promo with CTA + price lands in history; non-numeric price rejected', async ({ browser }) => {
  const { ctx, page, errors } = await opsPage(browser);
  await page.goto('/sales-push');
  await expectLive(page);
  const title = `E2E promo ${stamp}`;
  await page.getByPlaceholder('Promo title').fill(title);
  await page.getByPlaceholder('Promo details').fill('Two PT sessions for the price of one.');
  await page.getByPlaceholder('CTA (e.g. Claim offer)').fill('Claim offer');
  await page.getByPlaceholder('Price (optional)').fill('199.5');
  await page.getByRole('button', { name: 'Push promo to members' }).click();
  await expect(main(page).getByText(/Promo sent to \d+ members?\. Batch bcast_/)).toBeVisible({ timeout: 60_000 });
  await expect(main(page).getByText(title)).toBeVisible();

  const ops = await convexAs(ctx.request);
  const history = await ops.query((api as any).queries.engagement.listBroadcasts, { limit: 20 });
  const sent = history.broadcasts.find((b: any) => b.title === title);
  expect(sent?.type).toBe('promotion');

  await page.getByPlaceholder('Promo title').fill(`${title} NaN`);
  await page.getByPlaceholder('Promo details').fill('Bad price');
  await page.getByPlaceholder('Price (optional)').fill('abc');
  await page.getByRole('button', { name: 'Push promo to members' }).click();
  await page.waitForTimeout(3000);
  await expect.soft(main(page).getByText(/Promo sent to/), 'BUG: price "abc" is sent as NaN to every member').toHaveCount(0);
  await shot(page, 'console-ops-sales-push');
  expect(errors).toEqual([]);
  await ctx.close();
});

