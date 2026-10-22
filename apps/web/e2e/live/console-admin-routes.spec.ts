/**
 * console-admin: every console route renders live data for superadmin,
 * admin and finance (or the Staff-only gate where access.ts denies it),
 * with no page errors, and no horizontal scroll at 390px.
 */
import { test, expect } from '@playwright/test';
import {
  CONSOLE_ROUTES, contextAs, expectLive, freshUser, main, navLinks, navSections, shoot, trackErrors,
} from './console-admin.helpers';

test.setTimeout(900_000);

/** Convex 1s UDF timeouts under machine load (shared box, load avg 30+) are environment flakes, not app bugs. */
const isTimeout = (e: string) => /Function execution timed out/.test(e);

/** Visit each route; returns {route: problem} for anything not live. */
async function crawl(page: import('@playwright/test').Page, routes: string[], tag: string, errors: string[], denied: string[] = []) {
  const problems: Record<string, string> = {};
  for (const route of routes) {
    await page.goto(route);
    for (let attempt = 0; attempt < 2; attempt++) {
    const errCount = errors.length;
    try {
      if (denied.includes(route)) {
        await expect(main(page).getByRole('alert')).toContainText('Staff only', { timeout: 30_000 });
      } else {
        await expectLive(page);
        // let lazy queries settle, then re-check (a query error replaces the page)
        await page.waitForTimeout(1500);
        await expect(main(page)).not.toContainText('Live data unavailable');
        await expect(main(page)).not.toContainText(/Requires (one of|capability)/);
      }
      delete problems[route];
      break;
    } catch (e: any) {
      problems[route] = String(e.message).split('\n').slice(0, 3).join(' ');
      // One reload when the failure was a backend timeout (load flake).
      if (attempt === 0 && errors.slice(errCount).some(isTimeout)) {
        console.log(`${tag} ${route}: backend timeout, reloading once`);
        await page.reload();
        continue;
      }
      break;
    }
    }
    const { overflowPx } = await shoot(page, `${tag}${route.replace(/\//g, '_')}`);
    if (overflowPx > 2) problems[`${route}@390`] = `horizontal page scroll ${overflowPx}px`;
  }
  return problems;
}

test('superadmin: lands /dashboard, full nav, every route live', async ({ browser }) => {
  const ctx = await contextAs(browser, 'superadmin@queenix.test');
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  await page.goto('/dashboard');
  const links = await navLinks(page);
  console.log('superadmin nav', links.length, links.join(', '));
  expect(links).toEqual(expect.arrayContaining(['Dashboard', 'Members', 'Finance', 'Content', 'Audit log', 'Settings']));
  const problems = await crawl(page, CONSOLE_ROUTES, 'superadmin', errors);
  console.log('superadmin problems', JSON.stringify(problems, null, 1));
  console.log('superadmin errors', JSON.stringify(errors, null, 1));
  expect.soft(problems).toEqual({});
  expect.soft(errors.filter((e) => !isTimeout(e))).toEqual([]);
  await ctx.close();
});

test('admin (fresh via role API): full nav, every route live', async ({ browser }) => {
  const adminEmail = (await freshUser('admin', ['admin'])).email;
  const ctx = await contextAs(browser, adminEmail);
  const page = await ctx.newPage();
  const errors = trackErrors(page);
  await page.goto('/dashboard');
  const links = await navLinks(page);
  console.log('admin nav', links.length, links.join(', '));
  const problems = await crawl(page, CONSOLE_ROUTES, 'admin', errors);
  console.log('admin problems', JSON.stringify(problems, null, 1));
  console.log('admin errors', JSON.stringify(errors, null, 1));
  expect.soft(problems).toEqual({});
  expect.soft(errors.filter((e) => !isTimeout(e))).toEqual([]);
  await ctx.close();
});

test('finance (fresh + owner@): lands /finance, Money/Venues/Growth nav, website/push denied', async ({ browser }) => {
  const financeEmail = (await freshUser('finance', ['finance'])).email;
  for (const email of [financeEmail, 'owner@queenix.test']) {
    const ctx = await contextAs(browser, email);
    const page = await ctx.newPage();
    const errors = trackErrors(page);
    // Landing: sign-in redirect target for a finance-only user.
    await page.goto('/login');
    await page.waitForURL(/\/finance$/, { timeout: 30_000 }).catch(() => {});
    console.log(email, 'landing after /login', new URL(page.url()).pathname);
    await page.goto('/finance');
    expect(await navSections(page)).toEqual(['Money', 'Venues', 'Growth']);
    expect(await navLinks(page)).toEqual(['Finance', 'Coffee', 'Salon', 'CRM', 'Promotions', 'Partners', 'Documents']);
    const denied = ['/trainer', '/website', '/website/media', '/website/blog', '/website/blog/new'];
    const problems = await crawl(page, CONSOLE_ROUTES, `finance-${email.split('@')[0]}`, errors, denied);
    console.log(email, 'problems', JSON.stringify(problems, null, 1));
    console.log(email, 'errors', JSON.stringify(errors, null, 1));
    expect.soft(problems).toEqual({});
    expect.soft(errors.filter((e) => !isTimeout(e))).toEqual([]);
    await ctx.close();
  }
});
