/**
 * Public website — real browser against the running stack.
 *
 *   E2E_BASE_URL=http://10.12.19.174:3001 npx playwright test e2e/site.spec.ts
 *
 * Needs the seed (scripts/seed-demo-users.mjs → siteSeed:seedSiteContent):
 * gallery photos, 3 published posts and a rolling week of classes.
 * Live data is checked against the same public Convex queries the pages use.
 */
import { test, expect, type APIRequestContext } from '@playwright/test';
import { login } from './login';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3300';
const CONVEX = process.env.E2E_CONVEX_URL ?? BASE.replace(/:\d+$/, ':3210');
const stamp = Date.now().toString(36);

async function convexQuery<T>(request: APIRequestContext, path: string, args: Record<string, unknown>): Promise<T> {
  const res = await request.post(`${CONVEX}/api/query`, { data: { path, args, format: 'json' } });
  const body = await res.json();
  expect(body.status, JSON.stringify(body).slice(0, 300)).toBe('success');
  return body.value as T;
}

test('home renders hero, live plans and live classes', async ({ page, request }) => {
  const plans = await convexQuery<{ name: string }[]>(request, 'queries/site:listPlans', {});
  const classes = await convexQuery<{ name: string }[]>(request, 'queries/site:listSchedule', { now: Date.now(), days: 7, limit: 5 });
  expect(plans.length, 'seeded plans').toBeGreaterThan(0);
  expect(classes.length, 'seeded upcoming classes').toBeGreaterThan(0);

  await page.goto('/');
  await expect(page.locator('h1#hero-title')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Book a free trial' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Staff login' }).first()).toHaveAttribute('href', '/login');
  for (const p of plans) await expect(page.locator('.plan-name', { hasText: p.name }).first()).toBeVisible();
  await expect(page.locator('.class-row').first()).toBeVisible();
  await expect(page.locator('.class-name').first()).toHaveText(classes[0]!.name);
  // Every image on the page carries alt text.
  const missingAlt = await page.locator('main img:not([alt]), main img[alt=""]').count();
  expect(missingAlt).toBe(0);
});

test('schedule lists the week by day', async ({ page }) => {
  await page.goto('/schedule');
  await expect(page.getByRole('heading', { level: 1, name: 'Timetable' })).toBeVisible();
  await expect(page.locator('.day').first()).toBeVisible();
  await expect(page.locator('.class-row').first()).toBeVisible();
});

test('gallery shows the seeded photos', async ({ page, request }) => {
  const media = await convexQuery<{ url: string; alt: string }[]>(request, 'queries/site:listMedia', { album: 'gallery' });
  expect(media.length).toBeGreaterThan(0);
  await page.goto('/gallery');
  const imgs = page.locator('.masonry img');
  await expect(imgs).toHaveCount(media.length);
  await expect(imgs.first()).toHaveAttribute('src', media[0]!.url);
  await expect(imgs.first()).toHaveAttribute('alt', media[0]!.alt);
});

test('blog list opens a post with rendered markdown', async ({ page }) => {
  await page.goto('/blog');
  const first = page.locator('.post-title').first();
  const title = (await first.textContent())!.trim();
  await first.click();
  await expect(page).toHaveURL(/\/blog\/[a-z0-9-]+$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  await expect(page.locator('.prose h2, .prose p').first()).toBeVisible();
  await expect(page.locator('.prose script')).toHaveCount(0);
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
});

test('unknown post slug is a 404', async ({ page }) => {
  const res = await page.goto(`/blog/no-such-post-${stamp}`);
  expect(res?.status()).toBe(404);
  await expect(page.getByText('We couldn’t find that page')).toBeVisible();
});

test('trial form validates, ignores bots, and creates a CRM lead', async ({ page, browser }) => {
  const name = `E2E Trial ${stamp}`;
  const botName = `E2E Bot ${stamp}`;

  // Server-side validation surfaces a readable error.
  await page.goto('/contact');
  await page.getByLabel('Full name').fill('Test Person');
  await page.getByLabel('Mobile number').fill('call me');
  await page.getByRole('button', { name: 'Book my free trial' }).click();
  await expect(page.locator('.form-error')).toContainText('valid phone number');

  // Real submission.
  await page.goto('/contact?plan=Premium');
  await expect(page.getByLabel(/Anything we should know/)).toHaveValue(/Premium/);
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Mobile number').fill(`+971 50 ${Date.now().toString().slice(-7)}`);
  await page.getByLabel(/Email/).fill(`trial-${stamp}@example.com`);
  await page.getByRole('button', { name: 'Book my free trial' }).click();
  await expect(page.getByRole('status')).toContainText('Thank you, E2E');

  // Honeypot filled → looks successful, stores nothing.
  await page.goto('/contact');
  await page.getByLabel('Full name').fill(botName);
  await page.getByLabel('Mobile number').fill(`+971 55 ${Date.now().toString().slice(-7)}`);
  await page.locator('input[name=website]').fill('https://spam.example', { force: true });
  await page.getByRole('button', { name: 'Book my free trial' }).click();
  await expect(page.getByRole('status')).toContainText('Thank you');

  // Staff see the website lead on /crm.
  const ctx = await browser.newContext();
  const ops = await ctx.newPage();
  await login(ops, 'ops');
  await ops.goto('/crm');
  await expect(ops.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  await expect(ops.getByText(botName, { exact: true })).toHaveCount(0);
  await ctx.close();
});

test('console routes still require login; robots and sitemap', async ({ page, request }) => {
  for (const path of ['/dashboard', '/crm', '/website']) {
    await page.goto(path);
    await page.waitForURL(/\/login/, { timeout: 30_000 });
  }
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /dashboard');
  expect(robots).toContain('Disallow: /login');
  expect(robots).toContain('Disallow: /api/');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('/blog/strength-training-for-women-where-to-start');
});
