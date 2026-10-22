/**
 * Public website as an anonymous visitor, live: every page at 390px and
 * 1440px (screenshots), header nav + mobile menu, a full internal-link crawl
 * from `/`, image alt text, head/meta basics, schedule vs the live query, and
 * the trial form → CRM lead (valid, invalid phone, honeypot, 24h duplicate).
 *
 *   E2E_BASE_URL=http://10.12.19.174:4000 npx playwright test e2e/live/site-visitor.spec.ts
 */
import { test, expect, type Page } from '@playwright/test';
import { api } from '@queenix/convex';
import { BASE, convexAs, publicQuery, shot, staffContext, trackErrors } from './console-ops-lib';

test.setTimeout(300_000);
const stamp = Date.now().toString(36);
const PAGES = ['/', '/schedule', '/gallery', '/blog', '/contact'];

async function firstPostPath(page: Page) {
  const posts = await publicQuery<{ slug: string }[]>(page.request, 'queries/site:listPosts', { limit: 1 });
  return posts[0] ? `/blog/${posts[0].slug}` : null;
}

/** Head/meta/structure basics for one rendered page; returns problems (empty = clean). */
async function audit(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const out: string[] = [];
    const meta = (sel: string) => document.querySelector(sel)?.getAttribute('content')?.trim() ?? '';
    if (!document.title.trim()) out.push('empty <title>');
    if (!meta('meta[name="description"]')) out.push('no meta description');
    for (const p of ['og:title', 'og:description', 'og:image', 'og:type']) if (!meta(`meta[property="${p}"]`)) out.push(`no ${p}`);
    const h1 = document.querySelectorAll('h1').length;
    if (h1 !== 1) out.push(`${h1} <h1> elements`);
    const noAlt = [...document.images].filter((i) => !i.hasAttribute('alt') && !i.closest('[aria-hidden="true"]')).map((i) => i.src.slice(-60));
    if (noAlt.length) out.push(`img without alt: ${noAlt.join(', ')}`);
    if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`horizontal overflow ${document.documentElement.scrollWidth}px > ${window.innerWidth}px`);
    if (document.documentElement.lang !== 'en') out.push(`html lang="${document.documentElement.lang}"`);
    return out;
  });
}

for (const width of [390, 1440]) {
  test(`every public page at ${width}px: renders, no page errors, head/meta + a11y basics, screenshot`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const errors = trackErrors(page);
    const post = await firstPostPath(page);
    const problems: Record<string, string[]> = {};
    for (const path of [...PAGES, ...(post ? [post] : [])]) {
      const res = await page.goto(path);
      expect(res?.status(), path).toBe(200);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('h1').first()).toBeVisible();
      const p = await audit(page);
      if (p.length) problems[path] = p;
      await shot(page, `site-${width}-${path === '/' ? 'home' : path.slice(1).replace(/\//g, '_')}`);
    }
    // 404 page.
    const nf = await page.goto(`/blog/nope-${stamp}`);
    expect(nf?.status()).toBe(404);
    await shot(page, `site-${width}-404`);
    const nfProblems = await audit(page);
    if (nfProblems.length) problems['404'] = nfProblems;
    test.info().annotations.push({ type: 'audit', description: JSON.stringify(problems) });
    console.log(`audit ${width}px`, JSON.stringify(problems, null, 1));
    expect.soft(problems, 'SEO/a11y basics on every public page').toEqual({});
    expect(errors).toEqual([]);
  });
}

test('header nav (desktop) and mobile menu open, navigate and close', async ({ page }) => {
  const errors = trackErrors(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const [label, path] of [['Schedule', '/schedule'], ['Gallery', '/gallery'], ['Blog', '/blog'], ['Contact', '/contact'], ['Home', '/']]) {
    await nav.getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(`${BASE}${path}`);
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
  }
  await expect(page.locator('.site-header').getByRole('link', { name: 'Staff login' })).toHaveAttribute('href', '/login');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(nav).toBeHidden();
  const toggle = page.getByLabel('Menu');
  await toggle.click();
  const mobile = page.getByRole('navigation', { name: 'Mobile' });
  await expect(mobile).toBeVisible();
  await shot(page, 'site-390-menu-open', false);
  await mobile.getByRole('link', { name: 'Gallery' }).click();
  await expect(page).toHaveURL(`${BASE}/gallery`);
  await expect(mobile).toBeHidden(); // closes on navigation
  await toggle.click();
  await page.locator('.site-menu-panel').getByRole('link', { name: 'Book a free trial' }).click();
  await expect(page).toHaveURL(`${BASE}/contact#trial`);
  expect(errors).toEqual([]);
});

test('crawl: every internal link reachable from / resolves (no 404/5xx)', async ({ page, request }) => {
  const seen = new Map<string, number>();
  const queue = ['/'];
  const sources = new Map<string, string>();
  while (queue.length && seen.size < 150) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    const res = await request.get(`${BASE}${path}`, { maxRedirects: 0 });
    seen.set(path, res.status());
    const crawlable = res.status() === 200 && (res.headers()['content-type'] ?? '').includes('text/html') && !path.startsWith('/login');
    if (!crawlable) continue;
    await page.goto(path);
    const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
    const imgs = await page.locator('img[src]').evaluateAll((is) => is.map((i) => (i as HTMLImageElement).src));
    for (const h of [...hrefs, ...imgs]) {
      const u = new URL(h);
      if (u.origin !== new URL(BASE).origin) continue;
      const p = u.pathname + u.search;
      if (!seen.has(p) && !queue.includes(p)) {
        queue.push(p);
        sources.set(p, path);
      }
    }
  }
  const broken = [...seen].filter(([, s]) => s >= 400).map(([p, s]) => `${p} → ${s} (linked from ${sources.get(p)})`);
  test.info().annotations.push({ type: 'crawl', description: `${seen.size} URLs: ${JSON.stringify(Object.fromEntries(seen))}` });
  console.log('crawl', seen.size, 'urls; broken:', broken);
  expect(seen.size).toBeGreaterThan(8);
  expect(broken).toEqual([]);
  // Placeholder app-store links ("#") are not real destinations.
  await page.goto('/');
  const stores = await page.locator('.app-stores a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect.soft(stores.filter((h) => h === '#' || !h), 'App Store / Google Play buttons point to "#"').toEqual([]);
});

test('schedule shows the same upcoming classes as the live query, grouped by day', async ({ page }) => {
  const classes = await publicQuery<{ name: string; startsAt: number }[]>(page.request, 'queries/site:listSchedule', { now: Date.now(), days: 7, limit: 200 });
  await page.goto('/schedule');
  await expect(page.getByRole('heading', { level: 1, name: 'Timetable' })).toBeVisible();
  expect(classes.length, 'seeded upcoming classes').toBeGreaterThan(0);
  expect(classes.every((c) => c.startsAt >= Date.now() - 5 * 60_000)).toBe(true);
  await expect(page.locator('.class-row').first()).toBeVisible();
  await expect(page.locator('.class-name').first()).toHaveText(classes[0]!.name);
  expect(await page.locator('.class-row').count()).toBeGreaterThanOrEqual(Math.min(classes.length, 10));
  await expect(page.locator('h2.day-title').first()).toBeVisible();
});

test('trial form: invalid phone, valid → CRM lead for ops, honeypot stores nothing, duplicate within 24h deduped', async ({ page, browser }) => {
  const errors = trackErrors(page);
  const name = `E2E Visitor ${stamp}`;
  const bot = `E2E Bot ${stamp}`;
  const phone = `+971 52 ${Date.now().toString().slice(-7)}`;

  await page.goto('/contact');
  await page.getByLabel('Full name').fill('Test Person');
  await page.getByLabel('Mobile number').fill('call me maybe');
  await page.getByRole('button', { name: 'Book my free trial' }).click();
  await expect(page.locator('.form-error')).toContainText('valid phone number');
  await page.getByLabel('Mobile number').fill(phone);
  await page.getByLabel(/Email/).fill('not-an-email');
  await page.getByRole('button', { name: 'Book my free trial' }).click();
  // Native type=email validation blocks it client-side (no request).
  expect(await page.getByLabel(/Email/).evaluate((e: HTMLInputElement) => e.validity.valid)).toBe(false);

  await page.goto('/contact?plan=Premium');
  await expect(page.getByLabel(/Anything we should know/)).toHaveValue(/Premium/);
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Mobile number').fill(phone);
  await page.getByLabel(/Email/).fill(`visitor-${stamp}@example.com`);
  await page.getByRole('button', { name: 'Book my free trial' }).click();
  await expect(page.getByRole('status')).toContainText('Thank you, E2E');
  await shot(page, 'site-trial-thanks', false);

  // Same phone again within 24h (home page form this time).
  await page.goto('/#trial');
  const homeForm = page.getByRole('form', { name: 'Book a free trial' });
  await homeForm.getByLabel('Full name').fill(`${name} again`);
  await homeForm.getByLabel('Mobile number').fill(phone.replace(/ /g, ''));
  await homeForm.getByRole('button', { name: 'Book my free trial' }).click();
  await expect(page.getByRole('status')).toContainText('Thank you');

  // Honeypot.
  await page.goto('/contact');
  await page.getByLabel('Full name').fill(bot);
  await page.getByLabel('Mobile number').fill(`+971 55 ${Date.now().toString().slice(-7)}`);
  await page.locator('input[name=website]').fill('https://spam.example', { force: true });
  await page.getByRole('button', { name: 'Book my free trial' }).click();
  await expect(page.getByRole('status')).toContainText('Thank you');
  expect(errors).toEqual([]);

  // Operations sees exactly one website lead for this phone, none for the bot.
  const ctx = await staffContext(browser, 'ops');
  const ops = await convexAs(ctx.request);
  const leads = (await ops.query(api.queries.crm.listLeadsByStage, {})).columns.flatMap((c: any) => c.leads);
  const mine = leads.filter((l: any) => l.name.startsWith(name));
  expect(mine).toHaveLength(1);
  expect(mine[0]).toMatchObject({ source: 'website', stage: 'new', email: `visitor-${stamp}@example.com` });
  expect(leads.some((l: any) => l.name === bot)).toBe(false);
  const opsPage = await ctx.newPage();
  await opsPage.goto('/crm');
  await expect(opsPage.locator('main').getByText(name, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await opsPage.locator('main').getByText(name, { exact: true }).first().click();
  await expect(opsPage.locator('main')).toContainText('via website');
  await expect(opsPage.locator('main')).toContainText('Premium');
  await ctx.close();
});
