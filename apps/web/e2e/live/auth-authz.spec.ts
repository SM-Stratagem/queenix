/**
 * Live backend authorization matrix: real per-role Convex tokens
 * (ConvexHttpClient.setAuth with /api/convex/token) against privileged
 * queries/mutations, anonymous public queries, the public trial-lead form,
 * capability grants and role-escalation paths. Fresh users per run.
 *
 * Mutations are called with arguments that fail validation AFTER the guard
 * (e.g. priceCents: -1), so an allowed role proves it got past auth without
 * writing anything; `deniedOnly` rows are never called for allowed roles.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { ConvexHttpClient } from 'convex/browser';
import {
  BASE, CONVEX, DEMO, convexAs, demo, freshUser, isDenied, outcome, piiIn, setRoles, stamp, type TestUser,
} from './auth-helpers';

test.describe.configure({ mode: 'default' });
test.setTimeout(240_000);

type Who = 'anon' | 'member' | 'trainer' | 'salon' | 'coffee' | 'operations' | 'finance';
const STAFF_ROLES: Exclude<Who, 'anon'>[] = ['member', 'trainer', 'salon', 'coffee', 'operations', 'finance'];
const WHO: Who[] = ['anon', ...STAFF_ROLES];

const users = {} as Record<Exclude<Who, 'anon'>, TestUser>;
let superApi: APIRequestContext;
const ids: { superUser?: string; branch?: string; coffeeOrder?: string; salonBooking?: string; selfFinance?: string; member?: string } = {};

/** Fresh client per call: tokens live 5 minutes and the suite runs longer. */
async function cx(who: Who | 'superadmin'): Promise<ConvexHttpClient> {
  if (who === 'anon') return new ConvexHttpClient(CONVEX);
  if (who === 'superadmin') return convexAs(superApi);
  return convexAs(users[who].api);
}

test.beforeAll(async () => {
  for (const r of STAFF_ROLES) users[r] = await freshUser(`mx-${r}`, r === 'member' ? undefined : [r]);
  superApi = await demo('superadmin');
  const sup = await cx('superadmin');
  const me = (await sup.query('queries/users:getCurrentUser' as any, {})) as any;
  ids.superUser = me._id;
  const branches = (await sup.query('queries/branches:branchesList' as any, {})) as any[];
  ids.branch = branches[0]?._id;
  const coffee = (await sup.query('queries/commerce:coffeeQueue' as any, {}).catch(() => [])) as any[];
  ids.coffeeOrder = coffee[0]?._id;
  const salon = (await sup.query('queries/commerce:salonQueue' as any, {}).catch(() => [])) as any[];
  ids.salonBooking = salon[0]?._id;
  ids.selfFinance = ((await (await cx('finance')).query('queries/users:getCurrentUser' as any, {})) as any)._id;
  ids.member = ((await (await cx('member')).query('queries/users:getCurrentUser' as any, {})) as any)._id;
});

test.afterAll(async () => {
  await Promise.all([superApi?.dispose(), ...Object.values(users).map((u) => u.api.dispose())]);
});

type Row = {
  fn: string;
  kind: 'query' | 'mutation';
  args: () => Record<string, unknown> | null; // null → skip (fixture missing)
  allow: Who[];
  deniedOnly?: boolean;
};

const MATRIX: Row[] = [
  // Finance
  { fn: 'queries/finance:getLedger', kind: 'query', args: () => ({}), allow: ['finance'] },
  { fn: 'queries/finance:listRefunds', kind: 'query', args: () => ({}), allow: ['finance'] },
  { fn: 'queries/financeReports:getProfitAndLoss', kind: 'query', args: () => ({}), allow: ['finance'] },
  { fn: 'queries/membershipAdmin:membershipStats', kind: 'query', args: () => ({}), allow: ['finance'] },
  { fn: 'mutations/finance:recordJournalEntry', kind: 'mutation', args: () => ({ kind: 'income', category: 'x', amountCents: 0 }), allow: ['finance'] },
  { fn: 'mutations/membershipAdmin:createPlan', kind: 'mutation', args: () => ({ name: 'x', description: 'x', durationDays: 0, priceCents: -1, currency: 'AED', features: [], maxClassesPerMonth: 0, maxPTSessions: 0 }), allow: ['finance'] },
  { fn: 'mutations/branches:createBranch', kind: 'mutation', args: () => ({ name: ' ', city: ' ' }), allow: ['finance'] },
  // Staff / team
  { fn: 'queries/org:staffDirectory', kind: 'query', args: () => ({}), allow: ['finance', 'operations'] },
  { fn: 'queries/teamOrg:userByEmail', kind: 'query', args: () => ({ email: DEMO.superadmin }), allow: ['finance'] },
  { fn: 'mutations/teamOrg:setStaffRoles', kind: 'mutation', args: () => ({ userId: ids.member, roles: [], activeRole: 'member' }), allow: ['finance'] },
  { fn: 'mutations/grants:grantCapability', kind: 'mutation', args: () => ({ userId: ids.member, capability: 'content.manage' }), allow: ['finance'], deniedOnly: true },
  { fn: 'mutations/grants:listGrantsForUser', kind: 'query', args: () => ({ userId: ids.superUser }), allow: ['finance', 'operations'] },
  // Members / approvals / dashboards
  { fn: 'queries/users:getMembersDirectory', kind: 'query', args: () => ({}), allow: ['finance', 'operations', 'trainer'] },
  { fn: 'queries/memberships:getOwnerKPIs', kind: 'query', args: () => ({}), allow: ['finance', 'operations'] },
  { fn: 'queries/memberships:getApprovals', kind: 'query', args: () => ({}), allow: ['finance', 'operations'] },
  { fn: 'queries/memberships:getPendingApprovalsCount', kind: 'query', args: () => ({}), allow: ['finance', 'operations'] },
  { fn: 'queries/users:getClientDetail', kind: 'query', args: () => ({ memberId: ids.superUser }), allow: ['finance', 'operations'] },
  { fn: 'queries/branches:branchDetail', kind: 'query', args: () => (ids.branch ? { branchId: ids.branch } : null), allow: ['finance', 'operations'] },
  { fn: 'queries/teamOrg:staffPunches', kind: 'query', args: () => ({ userId: ids.superUser }), allow: ['finance', 'operations'] },
  { fn: 'queries/users:getIncidents', kind: 'query', args: () => ({}), allow: ['finance', 'operations'] },
  // CRM
  { fn: 'queries/crm:listLeadsByStage', kind: 'query', args: () => ({}), allow: ['finance', 'operations'] },
  { fn: 'mutations/crm:createLead', kind: 'mutation', args: () => ({ name: 'x', phone: '+971500000000' }), allow: ['finance', 'operations'], deniedOnly: true },
  // CMS + push
  { fn: 'queries/siteAdmin:sections', kind: 'query', args: () => ({}), allow: ['operations'] },
  { fn: 'mutations/site:saveSection', kind: 'mutation', args: () => ({ key: '__not_a_section__', data: {} }), allow: ['operations'] },
  { fn: 'queries/engagement:listBroadcasts', kind: 'query', args: () => ({}), allow: ['finance', 'operations'] },
  { fn: 'mutations/engagement:sendBroadcastNotification', kind: 'mutation', args: () => ({ title: ' ', body: ' ', push: true }), allow: ['operations'] },
  { fn: 'mutations/engagement:sendBroadcastNotification', kind: 'mutation', args: () => ({ title: ' ', body: ' ' }), allow: ['finance', 'operations'] },
  { fn: 'mutations/engagement:sendSalesPush', kind: 'mutation', args: () => ({ title: ' ', body: ' ' }), allow: ['finance', 'operations'] },
  // Venues: salon ↔ coffee isolation
  { fn: 'queries/commerce:salonQueue', kind: 'query', args: () => ({}), allow: ['finance', 'operations', 'salon'] },
  { fn: 'queries/commerce:coffeeQueue', kind: 'query', args: () => ({}), allow: ['finance', 'operations', 'coffee'] },
  { fn: 'queries/commerceOps:getSalonRevenue', kind: 'query', args: () => ({}), allow: ['finance', 'operations', 'salon'] },
  { fn: 'queries/commerceOps:getCoffeeRevenue', kind: 'query', args: () => ({}), allow: ['finance', 'operations', 'coffee'] },
  { fn: 'mutations/commerce:createSalonService', kind: 'mutation', args: () => ({ name: 'x', priceCents: -1, durationMin: 30 }), allow: ['finance', 'operations'] },
  { fn: 'mutations/commerce:createCoffeeItem', kind: 'mutation', args: () => ({ name: 'x', priceCents: -1 }), allow: ['finance', 'operations'] },
  { fn: 'mutations/commerce:updateCoffeeOrderStatus', kind: 'mutation', args: () => (ids.coffeeOrder ? { orderId: ids.coffeeOrder, status: 'preparing' } : null), allow: ['finance', 'operations', 'coffee'], deniedOnly: true },
  { fn: 'mutations/commerce:markSalonBookingCashPaid', kind: 'mutation', args: () => (ids.salonBooking ? { bookingId: ids.salonBooking } : null), allow: ['finance', 'operations', 'salon'], deniedOnly: true },
  // Floor
  { fn: 'queries/valet:opsQueue', kind: 'query', args: () => ({}), allow: ['finance', 'operations'] },
  { fn: 'queries/access:getScannerHealth', kind: 'query', args: () => ({}), allow: ['finance', 'operations', 'trainer', 'salon', 'coffee'] },
  { fn: 'queries/classes:getTodayRoster', kind: 'query', args: () => ({}), allow: ['finance', 'operations', 'trainer'] },
];

for (const row of MATRIX) {
  test(`authz ${row.fn}${row.fn.endsWith('sendBroadcastNotification') ? ` (push=${row.allow.length === 1})` : ''}`, async () => {
    const args = row.args();
    test.skip(args === null, 'fixture not present on this stack');
    const table: string[] = [];
    for (const who of WHO) {
      const allowed = row.allow.includes(who);
      if (allowed && row.deniedOnly) {
        table.push(`${who}: (allowed, not called)`);
        continue;
      }
      const client = await cx(who);
      const res = await outcome(() => (row.kind === 'query' ? client.query(row.fn as any, args!) : client.mutation(row.fn as any, args!)));
      table.push(`${who}: ${res}`);
      expect.soft(isDenied(res), `${who} on ${row.fn} → ${res} (expected ${allowed ? 'allowed' : 'denied'})`).toBe(!allowed);
    }
    test.info().annotations.push({ type: 'matrix', description: `${row.fn} | ${table.join(' | ')}` });
  });
}

test('member cannot read another user\'s private row through getClientDetail / branchDetail / getApprovals', async () => {
  const m = await cx('member');
  const leaks: string[] = [];
  const detail = (await m.query('queries/users:getClientDetail' as any, { memberId: ids.superUser }).catch(() => null)) as any;
  if (detail?.member?.email) leaks.push(`getClientDetail → ${detail.member.email} roles=${detail.member.roles}`);
  if (ids.branch) {
    const b = (await m.query('queries/branches:branchDetail' as any, { branchId: ids.branch }).catch(() => null)) as any;
    const pii = piiIn(b?.staff);
    if (pii.length) leaks.push(`branchDetail staff → ${pii.length} emails/phones`);
  }
  const ap = (await m.query('queries/memberships:getApprovals' as any, {}).catch(() => null)) as any[] | null;
  if (ap && piiIn(ap).length) leaks.push(`getApprovals → ${piiIn(ap).length} emails/phones of requestors`);
  test.info().annotations.push({ type: 'leaks', description: leaks.join(' ; ') || 'none' });
  expect(leaks).toEqual([]);
});

test('member cannot approve/deny a pending approval (trainer early-payout request)', async () => {
  const trainer = await cx('trainer');
  const approvalId = await trainer.mutation('mutations/users:requestEarlyPayout' as any, { amountCents: 100, note: `t-auth ${stamp()}` });
  const m = await cx('member');
  const res = await outcome(() => m.mutation('mutations/users:decideApproval' as any, { approvalId, decision: 'cancelled', note: 't-auth authz probe' }));
  test.info().annotations.push({ type: 'decideApproval as member', description: res });
  expect(isDenied(res), `member decideApproval → ${res}`).toBe(true);
  // Leave nothing pending in the shared inbox.
  if (res !== 'ok') await (await cx('superadmin')).mutation('mutations/users:decideApproval' as any, { approvalId, decision: 'cancelled', note: 't-auth cleanup' });
});

test('finance cannot promote itself (or anyone) to superadmin', async () => {
  const f = users.finance;
  const res = await outcome(async () => (await cx('finance')).mutation('mutations/teamOrg:setStaffRoles' as any, { userId: ids.selfFinance, roles: ['superadmin'], activeRole: 'superadmin' }));
  let chain = `setStaffRoles(self → superadmin) = ${res}`;
  if (res === 'ok') {
    // Copy the Convex roles into BetterAuth (any signed-in caller may do this).
    const sync = await f.api.post('/api/team/roles', { data: { userId: ids.selfFinance } });
    const s = await (await f.api.get('/api/auth/get-session?disableCookieCache=true')).json();
    chain += ` ; /api/team/roles=${sync.status()} ; BetterAuth roles now ${s?.user?.roles}`;
    const asSuper = await outcome(async () => (await cx('finance')).query('queries/siteAdmin:sections' as any, {}));
    chain += ` ; CMS (superadmin-only for finance) = ${asSuper}`;
    await setRoles(f.id, ['finance']); // restore
  }
  test.info().annotations.push({ type: 'escalation', description: chain });
  expect(isDenied(res), chain).toBe(true);
});

test('finance cannot self-grant capabilities its role lacks', async () => {
  const fin = await cx('finance');
  const res = await outcome(() => fin.mutation('mutations/grants:grantCapability' as any, { userId: ids.selfFinance, capability: 'notifications.push', note: 't-auth self-grant probe' }));
  test.info().annotations.push({ type: 'self-grant', description: res });
  if (res === 'ok') {
    const grants = (await (await cx('superadmin')).query('mutations/grants:listGrantsForUser' as any, { userId: ids.selfFinance })) as any[];
    for (const g of grants) await (await cx('superadmin')).mutation('mutations/grants:revokeCapability' as any, { grantId: g._id });
  }
  expect(isDenied(res), `finance self-grant notifications.push → ${res}`).toBe(true);
});

test('capability grant: content.manage on a trainer opens the CMS backend; revoking closes it again', async () => {
  const sup = await cx('superadmin');
  const trainerId = ((await (await cx('trainer')).query('queries/users:getCurrentUser' as any, {})) as any)._id;
  const before = await outcome(async () => (await cx('trainer')).query('queries/siteAdmin:sections' as any, {}));
  expect(isDenied(before)).toBe(true);
  const g = (await sup.mutation('mutations/grants:grantCapability' as any, { userId: trainerId, capability: 'content.manage', note: 't-auth grant test' })) as any;
  expect(g.ok).toBe(true);
  try {
    expect(await outcome(async () => (await cx('trainer')).query('queries/siteAdmin:sections' as any, {}))).toBe('ok');
    const save = await outcome(async () => (await cx('trainer')).mutation('mutations/site:saveSection' as any, { key: '__not_a_section__', data: {} }));
    expect(isDenied(save), `saveSection with grant → ${save}`).toBe(false);
    // Grants are additive and capability-specific: no push rights came with it.
    expect(isDenied(await outcome(async () => (await cx('trainer')).mutation('mutations/engagement:sendBroadcastNotification' as any, { title: ' ', body: ' ', push: true })))).toBe(true);
  } finally {
    await sup.mutation('mutations/grants:revokeCapability' as any, { grantId: g.grantId });
  }
  expect(isDenied(await outcome(async () => (await cx('trainer')).query('queries/siteAdmin:sections' as any, {})))).toBe(true);
});

test('expired capability grant is ignored', async () => {
  const sup = await cx('superadmin');
  const coffeeId = ((await (await cx('coffee')).query('queries/users:getCurrentUser' as any, {})) as any)._id;
  const g = (await sup.mutation('mutations/grants:grantCapability' as any, { userId: coffeeId, capability: 'content.manage', expiresAt: Date.now() - 1000, note: 't-auth expired' })) as any;
  try {
    expect(isDenied(await outcome(async () => (await cx('coffee')).query('queries/siteAdmin:sections' as any, {})))).toBe(true);
  } finally {
    await sup.mutation('mutations/grants:revokeCapability' as any, { grantId: g.grantId });
  }
});

test('anonymous public site queries return no emails, phones or internal fields', async () => {
  const anon = await cx('anon');
  const now = Date.now();
  const results: Record<string, unknown> = {
    getSections: await anon.query('queries/site:getSections' as any, {}),
    listMediaGallery: await anon.query('queries/site:listMedia' as any, { album: 'gallery' }),
    listMediaHero: await anon.query('queries/site:listMedia' as any, { album: 'hero' }),
    listPosts: await anon.query('queries/site:listPosts' as any, {}),
    listSchedule: await anon.query('queries/site:listSchedule' as any, { now }),
    listTrainers: await anon.query('queries/site:listTrainers' as any, {}),
    listPlans: await anon.query('queries/site:listPlans' as any, {}),
    getUpcomingClasses: await anon.query('queries/classes:getUpcomingClasses' as any, {}),
    getAvailablePlans: await anon.query('queries/memberships:getAvailablePlans' as any, {}),
    getAvailableTrainers: await anon.query('queries/users:getAvailableTrainers' as any, {}),
  };
  const posts = results.listPosts as any[];
  if (posts[0]) results.getPostBySlug = await anon.query('queries/site:getPostBySlug' as any, { slug: posts[0].slug });
  const up = results.getUpcomingClasses as any[];
  if (up[0]) results.getClassById = await anon.query('queries/classes:getClassById' as any, { id: up[0]._id });

  // Drafts are never visible anonymously.
  const draftSlug = `t-auth-draft-${stamp()}`;
  expect(await anon.query('queries/site:getPostBySlug' as any, { slug: draftSlug })).toBeNull();

  const INTERNAL = /"(betterAuthUserId|roles|activeRole|passwordHash|createdBy|updatedBy|storageId|phoneVerified|emailVerified|email|phone)"\s*:/;
  const problems: string[] = [];
  for (const [name, value] of Object.entries(results)) {
    // The public contact section intentionally shows the gym's own phone/email.
    const scrub = name === 'getSections' ? { ...(value as any), contact: undefined, footer: undefined } : value;
    const pii = piiIn(scrub);
    if (pii.length) problems.push(`${name}: pii ${pii.slice(0, 3).join(',')}`);
    const m = JSON.stringify(scrub ?? null).match(INTERNAL);
    if (m) problems.push(`${name}: internal field "${m[1]}"`);
  }
  test.info().annotations.push({ type: 'public-queries', description: problems.join(' ; ') || 'clean' });
  expect(problems).toEqual([]);
});

test('anonymous calls to staff queries are refused', async () => {
  const anon = await cx('anon');
  for (const fn of ['queries/users:getCurrentUser']) expect(await anon.query(fn as any, {})).toBeNull();
  for (const fn of ['queries/memberships:getOwnerKPIs', 'queries/memberships:getApprovals', 'queries/siteAdmin:sections', 'queries/commerce:coffeeQueue']) {
    expect(isDenied(await outcome(() => anon.query(fn as any, {}))), fn).toBe(true);
  }
});

test('public trial-request form: validation, honeypot and duplicate suppression', async () => {
  const anon = await cx('anon');
  const call = (a: Record<string, unknown>) => outcome(() => anon.mutation('mutations/publicLeads:submitTrialRequest' as any, a));
  expect(await call({ name: 'A', phone: '+971501234567' })).toMatch(/name/i);
  expect(await call({ name: 'Valid Name', phone: 'call me' })).toMatch(/phone/i);
  expect(await call({ name: 'Valid Name', phone: '+971501234567', email: 'not-an-email' })).toMatch(/email/i);
  expect(await call({ name: 'Valid Name', phone: '+971501234567', message: 'x'.repeat(1001) })).toMatch(/1000/);
  expect(await call({ name: 'x'.repeat(81), phone: '+971501234567' })).toMatch(/name/i);

  const tag = stamp();
  const phone = `+97155${tag.slice(-7)}`;
  const name = `t-auth lead ${tag}`;
  const bot = `t-auth bot ${tag}`;
  expect(await call({ name: bot, phone: `+97156${tag.slice(-7)}`, website: 'http://spam.example' })).toBe('ok');
  expect(await call({ name, phone, email: `lead-${tag}@queenix.test`, message: 'trial please' })).toBe('ok');
  expect(await call({ name, phone: phone.replace('+971', '+971 '), message: 'again' })).toBe('ok');

  const sup = await cx('superadmin');
  const leads = (await sup.query('queries/crm:listLeadsByStage' as any, { stage: 'new' })) as any[];
  const flat = JSON.stringify(leads);
  const mine = (Array.isArray(leads) ? leads : Object.values(leads).flat()).filter((l: any) => l?.name === name);
  test.info().annotations.push({ type: 'leads', description: `stored=${mine.length} bot=${flat.includes(bot)}` });
  expect(flat.includes(bot), 'honeypot submission must not be stored').toBe(false);
  expect(mine.length, 'one lead per phone per 24h').toBe(1);
  expect(mine[0].source).toBe('website');
});

test('push token registration is scoped to the caller', async () => {
  // Any signed-in user may register their own device; anonymous may not.
  const anon = await cx('anon');
  const res = await outcome(() => anon.mutation('mutations/push:registerPushToken' as any, { token: `ExponentPushToken[t-auth-${stamp()}]`, platform: 'ios' }));
  expect(isDenied(res) || /validator|ArgumentValidationError/i.test(res), res).toBe(true);
});

// Keep the base URL visible in the report when someone reruns this file.
test.afterAll(() => console.log(`[auth-authz] ran against ${BASE} / ${CONVEX}`));
