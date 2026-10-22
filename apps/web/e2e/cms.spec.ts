/**
 * Website CMS (console /website) end to end: section content, media library,
 * blog, and the content.manage capability boundary (UI + raw Convex writes).
 *
 *   E2E_BASE_URL=http://10.12.19.174:3001 npx playwright test e2e/cms.spec.ts
 *
 * Convex is reached at E2E_CONVEX_URL (default: same host as the web, :3210).
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@queenix/convex';
import { login } from './login';

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

const stamp = Date.now();

function convexUrl() {
  if (process.env.E2E_CONVEX_URL) return process.env.E2E_CONVEX_URL;
  const u = new URL(String(test.info().project.use.baseURL));
  u.port = '3210';
  return u.origin;
}

/** A Convex client authed as the page's signed-in user (same token the console uses). */
async function convexAs(page: Page) {
  const res = await page.request.get('/api/convex/token');
  expect(res.ok()).toBeTruthy();
  const { token } = await res.json();
  const client = new ConvexHttpClient(convexUrl());
  client.setAuth(token);
  return client;
}

async function errorCode(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return 'NO_ERROR';
  } catch (e) {
    return (e as { data?: { code?: string } }).data?.code ?? String(e);
  }
}

/** Small real PNG (a coloured tile with text) for upload. */
async function png(browser: Browser) {
  const p = await browser.newPage();
  await p.setContent('<div style="width:320px;height:240px;background:linear-gradient(135deg,#0081cc,#7c3aed);color:#fff;font:bold 28px Arial;display:grid;place-items:center">E2E</div>');
  const buffer = await p.locator('div').screenshot({ type: 'png' });
  await p.close();
  return { name: `e2e-${stamp}.png`, mimeType: 'image/png', buffer };
}

test('ops edits the hero headline and it persists after reload', async ({ page }) => {
  await login(page, 'ops');
  await page.goto('/website');
  const hero = page.getByRole('region', { name: 'Hero' });
  const headline = hero.getByLabel('Headline', { exact: true });
  await expect(headline).toBeVisible();
  const original = await headline.inputValue();
  const next = `E2E headline ${stamp}`;

  await headline.fill(next);
  await hero.getByRole('button', { name: 'Save hero' }).click();
  await expect(hero.getByRole('status')).toContainText('Hero saved');
  await page.reload();
  await expect(page.getByRole('region', { name: 'Hero' }).getByLabel('Headline', { exact: true })).toHaveValue(next);

  // The staff query (what the public site merges from) has it too.
  const ops = await convexAs(page);
  const sections = await ops.query(api.queries.siteAdmin.sections, {});
  const heroData = sections.find((s) => s.key === 'hero')!.data;
  expect(heroData.headline).toBe(next);

  // Public home, if it is rendering the hero already (built by another workstream).
  const home = await page.request.get('/');
  const html = home.ok() ? await home.text() : '';
  test.info().annotations.push({ type: 'public-home', description: html.includes(next) ? 'headline visible on /' : 'headline not on / (site not rendering it yet)' });

  // List fields: add + remove a highlight round-trips.
  const about = page.getByRole('region', { name: 'About' });
  const before = await about.getByRole('button', { name: /^Remove highlight/ }).count();
  await about.getByRole('button', { name: 'Add highlight' }).click();
  await expect(about.getByRole('button', { name: /^Remove highlight/ })).toHaveCount(before + 1);
  await about.getByRole('button', { name: `Remove highlight ${before + 1}` }).click();
  await expect(about.getByRole('button', { name: 'Save about' })).toBeDisabled();

  // Server-side validation: unknown section, unknown field, oversized string.
  expect(await errorCode(ops.mutation(api.mutations.site.saveSection, { key: 'nope', data: {} }))).toBe('INVALID');
  expect(await errorCode(ops.mutation(api.mutations.site.saveSection, { key: 'hero', data: { ...heroData, evil: 'x' } }))).toBe('INVALID');
  expect(await errorCode(ops.mutation(api.mutations.site.saveSection, { key: 'hero', data: { ...heroData, headline: 'x'.repeat(5000) } }))).toBe('INVALID');

  // Restore.
  const hero2 = page.getByRole('region', { name: 'Hero' });
  await hero2.getByLabel('Headline', { exact: true }).fill(original);
  await hero2.getByRole('button', { name: 'Save hero' }).click();
  await expect(hero2.getByRole('status')).toContainText('Hero saved');
});

test('ops uploads an image, it shows in the library, publish toggle works, delete removes it', async ({ page, browser }) => {
  await login(page, 'ops');
  await page.goto('/website/media');
  // Leftovers from an aborted earlier run.
  page.on('dialog', (d) => d.accept());
  const stale = page.getByRole('article', { name: /^Image: E2E image/ });
  await expect(page.getByRole('region', { name: 'Library' })).toBeVisible();
  await page.waitForTimeout(1000);
  while ((await stale.count()) > 0) {
    const n = await stale.count();
    await stale.first().getByRole('button', { name: 'Delete' }).click();
    await expect(stale).toHaveCount(n - 1);
  }
  const form = page.getByRole('form', { name: 'Upload image' });
  const alt = `E2E image ${stamp}`;

  // Alt text is required.
  await form.getByLabel('Image file (max 8 MB)').setInputFiles(await png(browser));
  await form.getByRole('button', { name: 'Upload' }).click();
  await expect(form.getByRole('alert')).toContainText('Alt text is required');

  await form.getByLabel('Alt text (required)').fill(alt);
  await form.getByLabel('Album').selectOption('general');
  await form.getByRole('button', { name: 'Upload' }).click();
  await expect(form.getByRole('status')).toContainText('Uploaded');

  const tile = page.getByRole('article', { name: `Image: ${alt}` });
  await expect(tile).toBeVisible();
  await expect(tile).toContainText('Hidden');
  const img = tile.getByRole('img', { name: alt });
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);

  // Server-controlled checkbox: it flips once the mutation lands, so click (not check()).
  await tile.getByLabel('Published').click();
  await expect(tile).toContainText('Published');
  await expect(tile.getByLabel('Published')).toBeChecked();
  await page.reload();
  await expect(page.getByRole('article', { name: `Image: ${alt}` }).getByLabel('Published')).toBeChecked();
  await page.getByRole('article', { name: `Image: ${alt}` }).getByLabel('Published').click();
  await expect(page.getByRole('article', { name: `Image: ${alt}` })).toContainText('Hidden');

  await page.getByRole('article', { name: `Image: ${alt}` }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('article', { name: `Image: ${alt}` })).toHaveCount(0);
});

test('ops creates a draft post, publishes it, unpublishes it (slug unique, HTML escaped)', async ({ page }) => {
  await login(page, 'ops');
  // Leftovers from an aborted earlier run.
  const ops = await convexAs(page);
  for (const p of await ops.query(api.queries.siteAdmin.listPosts, {})) {
    if (p.title.startsWith('E2E post ')) await ops.mutation(api.mutations.site.deletePost, { id: p._id });
  }
  await page.goto('/website/blog/new');
  const editor = page.getByRole('form', { name: 'Post editor' });
  const title = `E2E post ${stamp}`;
  await editor.getByLabel('Title').fill(title);
  await expect(editor.getByLabel(/^Slug/)).toHaveValue(`e2e-post-${stamp}`);
  await editor.getByLabel('Excerpt').fill('Written by the CMS e2e suite.');
  await editor.getByLabel('Tags (comma separated)').fill('e2e, test');
  await editor.getByLabel('Body (Markdown)').fill('## Hello\n\nSome **bold** text.\n\n<script>window.__pwned = 1</script>');
  const preview = editor.getByRole('region', { name: 'Preview' });
  await expect(preview.getByRole('heading', { name: 'Hello' })).toBeVisible();
  await expect(preview).toContainText('<script>window.__pwned = 1</script>');
  await expect(preview.locator('script')).toHaveCount(0);

  await editor.getByRole('button', { name: 'Save draft' }).click();
  await page.waitForURL(/\/website\/blog\/[a-z0-9]+$/);
  await expect(page.getByRole('heading', { name: 'Edit post' })).toBeVisible();
  const postUrl = page.url();
  const edit = page.getByRole('form', { name: 'Post editor' });
  await expect(edit.getByText('draft', { exact: true })).toBeVisible();

  await edit.getByRole('button', { name: 'Publish' }).click();
  await expect(edit.getByRole('status')).toContainText('Published');
  await expect(edit.getByText('published', { exact: true })).toBeVisible();
  await expect(edit).toContainText('first published');

  await page.goto('/website/blog');
  await page.getByLabel('Status').selectOption('published');
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();

  // Slug uniqueness is server-enforced.
  await page.goto('/website/blog/new');
  const dup = page.getByRole('form', { name: 'Post editor' });
  await dup.getByLabel('Title').fill(title);
  await dup.getByRole('button', { name: 'Save draft' }).click();
  await expect(dup.getByRole('alert')).toContainText('already used');

  await page.goto(postUrl);
  const again = page.getByRole('form', { name: 'Post editor' });
  await again.getByRole('button', { name: 'Unpublish' }).click();
  await expect(again.getByRole('status')).toContainText('Unpublished');
  await expect(again.getByText('draft', { exact: true })).toBeVisible();
  await page.goto('/website/blog');
  await page.getByLabel('Status').selectOption('draft');
  await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();

  await page.goto(postUrl);
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete post' }).click();
  await page.waitForURL(/\/website\/blog$/);
  await expect(page.getByRole('link', { name: new RegExp(title) })).toHaveCount(0);
});

test('finance cannot see or open the Website CMS, and Convex writes are FORBIDDEN', async ({ page }) => {
  await login(page, 'owner');
  await page.goto('/finance');
  const nav = page.getByRole('navigation', { name: 'Admin' });
  await expect(nav.getByRole('link').first()).toBeVisible();
  await expect(nav.getByText('Website', { exact: true })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Blog' })).toHaveCount(0);

  await page.goto('/website');
  await expect(page.getByRole('alert').filter({ hasText: 'Staff only' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Hero' })).toHaveCount(0);

  const finance = await convexAs(page);
  expect(await errorCode(finance.mutation(api.mutations.site.saveSection, { key: 'hero', data: {} }))).toBe('FORBIDDEN');
  expect(await errorCode(finance.mutation(api.mutations.site.generateUploadUrl, {}))).toBe('FORBIDDEN');
  expect(await errorCode(finance.query(api.queries.siteAdmin.listPosts, {}))).toBe('FORBIDDEN');
});
