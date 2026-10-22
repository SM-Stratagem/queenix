/**
 * Mobile web build: every screen of every role renders at 390px with no uncaught
 * errors and no endless spinner, and each role lands on its MOBILE_HOME.
 * Run: MOBILE_WEB_URL=http://10.12.19.174:8090 E2E_BASE_URL=http://10.12.19.174:4000 \
 *      npx playwright test e2e/live/mobile-crawl.spec.ts
 */
import { test, expect } from '@playwright/test';
import { MOBILE_URL, roleContext, watch, shot, settled, textStable } from './mobile-harness';

const ROLES = {
  member: { email: 'member@queenix.test', home: '/home', group: '(member)', routes: ['home', 'book', 'gym', 'rewards', 'profile', 'plans', 'payments', 'notifications', 'security', 'trainers', 'documents', 'support', 'tiers', 'health', 'coffee', 'salon', 'valet', 'vehicles'] },
  trainer: { email: 'trainer@queenix.test', home: '/today', group: '(trainer)', routes: ['today', 'schedule', 'clients', 'earnings', 'profile', 'documents', 'time-off', 'sessions/new'] },
  ops: { email: 'ops@queenix.test', home: '/scanner', group: '(ops)', routes: ['scanner', 'classes', 'support', 'incidents', 'profile', 'punch', 'valet', 'coffee-queue', 'salon-queue'] },
  owner: { email: 'owner@queenix.test', home: '/overview', group: '(owner)', routes: ['overview', 'operations', 'members', 'approvals', 'profile', 'staff', 'branch', 'announce', 'support'] },
} as const;

test.describe.configure({ timeout: 900_000 });

for (const [role, cfg] of Object.entries(ROLES)) {
  test(`${role}: lands on ${cfg.home} and every screen renders`, async ({ browser }) => {
    const ctx = await roleContext(browser, cfg.email);
    const page = await ctx.newPage();
    const errors = watch(page);
    // Opening the app (no deep link) must land on the role home.
    await page.goto(`${MOBILE_URL}/login`);
    await page.waitForURL((u) => u.pathname === cfg.home, { timeout: 30_000 });
    const problems: string[] = [];
    for (const r of cfg.routes) {
      const before = errors.length;
      await page.goto(`${MOBILE_URL}/${cfg.group}/${r}`);
      try {
        await settled(page, 25_000);
      } catch {
        problems.push(`${r}: spinner never settled`);
      }
      if (!(await textStable(page, 3000, 30_000))) problems.push(`${r}: content still changing after 30s`);
      const body = await page.locator('body').innerText();
      if (/Unmatched Route|Something went wrong|Could not load|Not signed in|Unauthorized/i.test(body)) {
        problems.push(`${r}: error text on screen: ${body.match(/(Unmatched Route|Something went wrong|Could not load[^\n]*|Not signed in|Unauthorized)/i)?.[0]}`);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (overflow > 2) problems.push(`${r}: horizontal overflow ${overflow}px`);
      await shot(page, `${role}-${r.replace('/', '-')}`);
      for (const e of errors.slice(before)) problems.push(`${r}: ${e}`);
    }
    console.log(`[${role}]\n  ${problems.join('\n  ') || 'clean'}`);
    expect.soft(problems, problems.join('\n')).toEqual([]);
    await ctx.close();
  });
}
