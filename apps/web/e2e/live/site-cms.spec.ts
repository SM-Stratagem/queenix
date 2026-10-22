/**
 * Website CMS (console /website) → public site, end to end, live.
 * Every section is edited through the console UI and checked on the public
 * pages + <head>; media upload/album/reorder/publish/delete is checked on
 * /gallery and the hero; blog draft → publish → edit → unpublish → delete is
 * checked on /blog, /blog/<slug> and /sitemap.xml, with markdown edge cases.
 * Original section content is snapshotted first and restored afterwards.
 *
 *   E2E_BASE_URL=http://10.12.19.174:4000 npx playwright test e2e/live/site-cms.spec.ts
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { api } from '@queenix/convex';
import { BASE, convexAs, drawImage, errorOf, expectLive, shot, staffContext, trackErrors } from './console-ops-lib';

test.describe.configure({ mode: 'serial' });
test.setTimeout(300_000);
const stamp = Date.now().toString(36);
const SNAPSHOT = path.join(os.tmpdir(), 'queenix-e2e-site-sections.json');

let ctx: BrowserContext;
let page: Page;
let errors: string[];
let original: { key: string; data: Record<string, unknown>; updatedAt: number | null }[] = [];

test.beforeAll(async ({ browser }) => {
  ctx = await staffContext(browser, 'ops');
  page = await ctx.newPage();
  errors = trackErrors(page);
  const ops = await convexAs(ctx.request);
  // A snapshot left by an aborted run is the real original — never overwrite it.
  if (fs.existsSync(SNAPSHOT)) original = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  else {
    original = await ops.query(api.queries.siteAdmin.sections, {});
    fs.writeFileSync(SNAPSHOT, JSON.stringify(original));
  }
});

test.afterAll(async () => {
  const ops = await convexAs(ctx.request);
  for (const s of original) {
    const data = { ...s.data };
    if (data.mediaId) {
      // Keep the hero image only if it still exists.
      const all = await ops.query(api.queries.siteAdmin.listMedia, {});
      if (!all.some((m: any) => m._id === data.mediaId)) delete data.mediaId;
    }
    await ops.mutation(api.mutations.site.saveSection, { key: s.key, data });
  }
  const now = await ops.query(api.queries.siteAdmin.sections, {});
  for (const s of original) expect(now.find((n: any) => n.key === s.key)?.data, `restored ${s.key}`).toEqual(s.data);
  fs.rmSync(SNAPSHOT, { force: true });
  await ctx.close();
});

const region = (name: string) => page.getByRole('region', { name, exact: true });
async function save(name: string) {
  const r = region(name);
  await r.getByRole('button', { name: `Save ${name.toLowerCase()}` }).click();
  await expect(r.getByRole('status')).toContainText(`${name} saved`, { timeout: 30_000 });
}
const head = async (p: Page, sel: string, attr = 'content') => p.locator(sel).first().getAttribute(attr);

test('every content section edited in the console renders on the public site and in <head>', async ({ browser }) => {
  const V = {
    eyebrow: `E2E eyebrow ${stamp}`,
    headline: `E2E headline ${stamp}`,
    sub: `E2E sub ${stamp}`,
    cta: `E2E CTA ${stamp}`,
    aboutHeading: `E2E about ${stamp}`,
    aboutBody: `E2E about body ${stamp}`,
    hl: `E2E highlight ${stamp}`,
    quote: `E2E quote ${stamp}`,
    qname: `E2E Quoter ${stamp}`,
    address: `E2E address ${stamp}`,
    phone: '+971 4 555 0101',
    whatsapp: '+971 50 555 0102',
    email: `e2e-${stamp}@example.com`,
    map: `https://maps.example.com/?q=${stamp}`,
    days: `E2E days ${stamp}`,
    insta: `https://instagram.com/e2e${stamp}`,
    appHeading: `E2E app ${stamp}`,
    ios: `https://apps.apple.com/e2e${stamp}`,
    seoTitle: `E2E SEO title ${stamp}`,
    seoDesc: `E2E SEO description ${stamp}`,
  };
  await page.goto('/website');
  await expectLive(page);
  await expect(region('Hero').getByLabel('Headline', { exact: true })).toBeVisible({ timeout: 30_000 });

  const hero = region('Hero');
  await hero.getByLabel('Eyebrow', { exact: true }).fill(V.eyebrow);
  await hero.getByLabel('Headline', { exact: true }).fill(V.headline);
  await hero.getByLabel('Subheadline', { exact: true }).fill(V.sub);
  await hero.getByRole('group', { name: 'Primary CTA' }).getByLabel('Label', { exact: true }).fill(V.cta);
  await hero.getByRole('group', { name: 'Primary CTA' }).getByLabel('Href', { exact: true }).fill('/schedule');
  await save('Hero');

  const about = region('About');
  await about.getByLabel('Heading', { exact: true }).fill(V.aboutHeading);
  await about.getByLabel('Body', { exact: true }).first().fill(V.aboutBody);
  await about.getByLabel('Title', { exact: true }).first().fill(V.hl);
  await save('About');

  const t = region('Testimonials');
  await t.getByLabel('Quote', { exact: true }).first().fill(V.quote);
  await t.getByLabel('Name', { exact: true }).first().fill(V.qname);
  await save('Testimonials');

  const c = region('Contact & hours');
  await c.getByLabel('Address', { exact: true }).fill(V.address);
  await c.getByLabel('Phone', { exact: true }).fill(V.phone);
  await c.getByLabel('WhatsApp', { exact: true }).fill(V.whatsapp);
  await c.getByLabel('Email', { exact: true }).fill(V.email);
  await c.getByLabel('Map URL', { exact: true }).fill(V.map);
  await c.getByLabel('Days', { exact: true }).first().fill(V.days);
  await save('Contact & hours');

  const s = region('Social links');
  await s.getByLabel('Instagram', { exact: true }).fill(V.insta);
  await save('Social links');

  const a = region('App promo');
  await a.getByLabel('Heading', { exact: true }).fill(V.appHeading);
  await a.getByLabel('iOS URL', { exact: true }).fill(V.ios);
  await save('App promo');

  const seo = region('SEO');
  await seo.getByLabel('Title', { exact: true }).fill(V.seoTitle);
  await seo.getByLabel('Description', { exact: true }).fill(V.seoDesc);
  await save('SEO');
  await shot(page, 'site-cms-console-sections');

  // Persisted (reload shows the saved values).
  await page.reload();
  await expect(region('Hero').getByLabel('Headline', { exact: true })).toHaveValue(V.headline, { timeout: 30_000 });
  await expect(region('SEO').getByLabel('Title', { exact: true })).toHaveValue(V.seoTitle);

  // Public site, as a visitor (fresh context, no cookies).
  const visitor = await browser.newContext();
  const pub = await visitor.newPage();
  const pubErrors = trackErrors(pub);
  await pub.goto('/');
  await expect(pub.locator('h1#hero-title')).toHaveText(V.headline);
  await expect(pub.locator('.hero-tag')).toContainText(V.eyebrow);
  await expect(pub.locator('.hero-sub')).toHaveText(V.sub);
  await expect(pub.locator('.hero-ctas a').first()).toContainText(V.cta);
  await expect(pub.locator('.hero-ctas a').first()).toHaveAttribute('href', '/schedule');
  await expect(pub.locator('#about-title')).toHaveText(V.aboutHeading);
  await expect(pub.locator('.about .lede')).toHaveText(V.aboutBody);
  await expect(pub.locator('.highlights h3').first()).toHaveText(V.hl);
  await expect(pub.locator('.voice--lead blockquote')).toContainText(V.quote);
  await expect(pub.locator('.voice--lead figcaption')).toContainText(V.qname);
  await expect(pub.locator('#app-title')).toHaveText(V.appHeading);
  await expect(pub.getByRole('link', { name: 'App Store' })).toHaveAttribute('href', V.ios);
  await expect(pub.locator('.site-footer')).toContainText(V.address);
  await expect(pub.locator('.site-footer')).toContainText(V.days);
  await expect(pub.locator('.site-footer').getByRole('link', { name: /Instagram/ })).toHaveAttribute('href', V.insta);
  await expect(pub).toHaveTitle(V.seoTitle);
  expect(await head(pub, 'meta[name="description"]')).toBe(V.seoDesc);
  expect(await head(pub, 'meta[property="og:title"]')).toBe(V.seoTitle);
  expect(await head(pub, 'meta[property="og:description"]')).toBe(V.seoDesc);
  await shot(pub, 'site-cms-public-home-edited');

  await pub.goto('/contact');
  const details = pub.locator('.visit');
  await expect(details).toContainText(V.address);
  await expect(details.getByRole('link', { name: V.phone })).toHaveAttribute('href', 'tel:+97145550101');
  await expect(details.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', 'https://wa.me/971505550102');
  await expect(details.getByRole('link', { name: V.email })).toHaveAttribute('href', `mailto:${V.email}`);
  await expect(details.getByRole('link', { name: /Open in Maps/ })).toHaveAttribute('href', V.map);
  await expect(details).toContainText(V.days);
  // Sub-pages keep their own title but must still carry a description.
  await expect(pub).toHaveTitle('Contact & free trial · Queenix Gym');
  expect(pubErrors).toEqual([]);
  await visitor.close();

  // Server-side validation of section writes (unknown key/field, wrong type, too long).
  const ops = await convexAs(ctx.request);
  const heroData = (await ops.query(api.queries.siteAdmin.sections, {})).find((x: any) => x.key === 'hero')!.data;
  expect(await errorOf(ops.mutation(api.mutations.site.saveSection, { key: 'nope', data: {} }))).toBe('INVALID');
  expect(await errorOf(ops.mutation(api.mutations.site.saveSection, { key: 'hero', data: { ...heroData, evil: 1 } }))).toBe('INVALID');
  expect(await errorOf(ops.mutation(api.mutations.site.saveSection, { key: 'hero', data: { ...heroData, headline: 5 } }))).toBe('INVALID');
  expect(await errorOf(ops.mutation(api.mutations.site.saveSection, { key: 'hero', data: { ...heroData, headline: 'x'.repeat(2001) } }))).toBe('INVALID');
  // Link fields accept any scheme today.
  const social = (await ops.query(api.queries.siteAdmin.sections, {})).find((x: any) => x.key === 'social')!.data;
  const js = await errorOf(ops.mutation(api.mutations.site.saveSection, { key: 'social', data: { ...social, facebook: 'javascript:alert(document.cookie)' } }));
  expect.soft(js, 'BUG: CMS link fields accept javascript: URLs (no scheme allow-list in saveSection)').toBe('INVALID');
  if (js === 'NO_ERROR') {
    const r = await (await browser.newContext()).request.get(`${BASE}/`);
    const href = (await r.text()).match(/href="([^"]*)"[^>]*>Facebook/)?.[1] ?? '';
    test.info().annotations.push({ type: 'facebook-href-rendered', description: href.slice(0, 120) });
    expect(href.startsWith('javascript:alert'), 'javascript: link must not render as-is').toBe(false);
    await ops.mutation(api.mutations.site.saveSection, { key: 'social', data: social });
  }
  expect(errors).toEqual([]);
});

async function upload(browser: Browser, file: { name: string; mimeType: string; buffer: Buffer }, alt: string, album: string) {
  const form = page.getByRole('form', { name: 'Upload image' });
  await form.getByLabel('Image file (max 8 MB)').setInputFiles(file);
  await form.getByLabel('Alt text (required)').fill(alt);
  await form.getByLabel('Album').selectOption(album);
  await form.getByRole('button', { name: /Upload/ }).click();
  await expect(form.getByRole('status')).toContainText('Uploaded', { timeout: 60_000 });
  void browser;
}

test('media: PNG + JPEG upload, rejects non-image and >8MB, album change, publish → /gallery, reorder, hero pick, unpublish, delete', async ({ browser }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/website/media');
  await expectLive(page);
  const form = page.getByRole('form', { name: 'Upload image' });

  // Client-side guards.
  await form.getByLabel('Image file (max 8 MB)').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await expect(form.getByRole('alert')).toContainText('Only image files can be uploaded.');
  await form.getByLabel('Image file (max 8 MB)').setInputFiles({ name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(8 * 1024 * 1024 + 1) });
  await expect(form.getByRole('alert')).toContainText('over 8 MB');

  // Server-side guards (bypassing the form): non-image and SVG.
  const ops = await convexAs(ctx.request);
  const direct = async (type: string, body: Buffer | string) => {
    const url = await ops.mutation(api.mutations.site.generateUploadUrl, {});
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': type }, body: typeof body === 'string' ? body : new Uint8Array(body) });
    const { storageId } = await r.json();
    return ops.mutation(api.mutations.site.createMedia, { storageId, alt: `E2E direct ${stamp}`, album: 'general' });
  };
  expect(await direct('text/plain', 'not an image')).toEqual({ ok: false, message: 'Images only, up to 8 MB.' });
  expect(await direct('image/png', Buffer.alloc(8 * 1024 * 1024 + 10))).toEqual({ ok: false, message: 'Images only, up to 8 MB.' });
  const svg = await direct('image/svg+xml', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  expect.soft(svg.ok, 'BUG: SVG (scriptable) accepted as a website image').toBe(false);
  if (svg.ok) await ops.mutation(api.mutations.site.deleteMedia, { id: (svg as any).id });

  const tile = (html: string) => `<div style="width:480px;height:320px;${html};color:#fff;font:bold 40px Arial;display:grid;place-items:center">E2E ${stamp}</div>`;
  const pngAlt = `E2E png ${stamp}`;
  const jpgAlt = `E2E jpg ${stamp}`;
  await upload(browser, { name: `a-${stamp}.png`, mimeType: 'image/png', buffer: await drawImage(browser, tile('background:#7c3aed')) }, pngAlt, 'gallery');
  await upload(browser, { name: `b-${stamp}.jpg`, mimeType: 'image/jpeg', buffer: await drawImage(browser, tile('background:#0081cc'), 'jpeg') }, jpgAlt, 'general');

  const card = (alt: string) => page.getByRole('article', { name: `Image: ${alt}` });
  await expect(card(pngAlt)).toContainText('Hidden');
  await expect(card(jpgAlt)).toContainText('Hidden');
  // Album: general → gallery.
  await card(jpgAlt).getByLabel('Album').selectOption('gallery');
  await expect(card(jpgAlt).getByRole('status')).toContainText('Moved album.');
  for (const alt of [pngAlt, jpgAlt]) {
    await card(alt).getByLabel('Published').click();
    await expect(card(alt)).toContainText('Published');
  }

  const galleryAlts = async () => {
    const v = await browser.newContext();
    const p = await v.newPage();
    await p.goto('/gallery');
    const alts = await p.locator('main img').evaluateAll((els) => els.map((e) => e.getAttribute('alt')));
    await v.close();
    return alts;
  };
  let alts = await galleryAlts();
  expect(alts).toContain(pngAlt);
  expect(alts).toContain(jpgAlt);
  expect(alts.indexOf(pngAlt)).toBeLessThan(alts.indexOf(jpgAlt));

  // Reorder: move the JPEG up past the PNG.
  await page.getByRole('button', { name: 'gallery', exact: true }).click();
  await card(jpgAlt).getByRole('button', { name: 'Move up' }).click();
  await expect.poll(async () => {
    alts = await galleryAlts();
    return alts.indexOf(jpgAlt) < alts.indexOf(pngAlt);
  }, { timeout: 30_000 }).toBe(true);

  // Hero image: move the PNG to the hero album and pick it on /website.
  await card(pngAlt).getByLabel('Album').selectOption('hero');
  await expect(card(pngAlt).getByRole('status')).toContainText('Moved album.');
  await page.getByRole('button', { name: 'all', exact: true }).click();
  await page.goto('/website');
  const hero = region('Hero');
  await hero.getByRole('group', { name: 'Hero image' }).getByRole('button', { name: `Use image: ${pngAlt}` }).click();
  await save('Hero');
  const v = await browser.newContext();
  const home = await v.newPage();
  await home.goto('/');
  await expect(home.locator('.hero-media img')).toHaveAttribute('alt', pngAlt);
  expect(await head(home, 'meta[property="og:image"]')).toBeTruthy();
  await v.close();

  // Unpublish the JPEG → gone from /gallery.
  await page.goto('/website/media');
  await card(jpgAlt).getByLabel('Published').click();
  await expect(card(jpgAlt)).toContainText('Hidden');
  expect(await galleryAlts()).not.toContain(jpgAlt);
  await shot(page, 'site-cms-media');

  // Delete both → gone from the library; hero falls back (reference cleared).
  for (const alt of [jpgAlt, pngAlt]) {
    await card(alt).getByRole('button', { name: 'Delete' }).click();
    await expect(card(alt)).toHaveCount(0);
  }
  const heroNow = (await ops.query(api.queries.siteAdmin.sections, {})).find((x: any) => x.key === 'hero')!.data;
  expect(heroNow.mediaId).toBeUndefined();
  expect(errors).toEqual([]);
});

test('blog: draft hidden (404, not in sitemap) → publish visible + sitemap → edit → unpublish 404 → delete; markdown is safe', async ({ browser }) => {
  page.on('dialog', (d) => d.accept());
  const title = `E2E Blog ${stamp}`;
  const slug = `e2e-blog-${stamp}`;
  const body = [
    '## Section heading',
    '### Sub heading',
    '',
    'Para with **bold**, _em_ and `inline code`.',
    '',
    '- bullet one',
    '- bullet two',
    '',
    '1. first',
    '2. second',
    '',
    '[safe link](https://example.com/ok) · [site link](/schedule) · [bad link](javascript:alert(1)) · [data link](data:text/html,<b>x</b>) · [VB](JAVASCRIPT:alert(2))',
    '',
    '![logo image](/queenix-logo.jpg) ![js image](javascript:alert(3))',
    '',
    '```',
    'const x = "<b>not html</b>";',
    '```',
    '',
    '<script>window.__pwned = 1</script>',
    '',
    '<img src=x onerror="window.__pwned=2">',
    '',
    'Inline <img src=y onerror="window.__pwned=3"> html and <a href="javascript:alert(4)">raw anchor</a>.',
  ].join('\n');

  const visitor = await browser.newContext();
  const pub = await visitor.newPage();
  const pubErrors = trackErrors(pub);
  const sitemap = async () => (await visitor.request.get(`${BASE}/sitemap.xml`)).text();

  await page.goto('/website/blog/new');
  const editor = page.getByRole('form', { name: 'Post editor' });
  await editor.getByLabel('Title').fill(title);
  await expect(editor.getByLabel(/^Slug/)).toHaveValue(slug);
  await editor.getByLabel('Excerpt').fill(`Excerpt ${stamp}`);
  await editor.getByLabel('Tags (comma separated)').fill('e2e, markdown');
  await editor.getByLabel('Body (Markdown)').fill(body);
  await editor.getByRole('button', { name: 'Save draft' }).click();
  await page.waitForURL(/\/website\/blog\/[a-z0-9]+$/, { timeout: 30_000 });
  const postUrl = page.url();

  // Draft: invisible to visitors.
  expect((await pub.goto(`/blog/${slug}`))?.status()).toBe(404);
  await pub.goto('/blog');
  await expect(pub.getByText(title)).toHaveCount(0);
  expect(await sitemap()).not.toContain(`/blog/${slug}`);

  // Publish.
  const edit = page.getByRole('form', { name: 'Post editor' });
  await edit.getByRole('button', { name: 'Publish' }).click();
  await expect(edit.getByRole('status')).toContainText('Published');
  const res = await pub.goto(`/blog/${slug}`);
  expect(res?.status()).toBe(200);
  await expect(pub.getByRole('heading', { level: 1 })).toHaveText(title);
  await expect(pub).toHaveTitle(`${title} · Queenix Gym`);
  expect(await head(pub, 'meta[name="description"]')).toBe(`Excerpt ${stamp}`);
  expect(await head(pub, 'meta[property="og:type"]')).toBe('article');
  expect(await head(pub, 'link[rel="canonical"]', 'href')).toContain(`/blog/${slug}`);
  const prose = pub.locator('.prose');
  await expect(prose.locator('h2', { hasText: 'Section heading' })).toBeVisible();
  await expect(prose.locator('h3', { hasText: 'Sub heading' })).toBeVisible();
  await expect(prose.locator('ul > li')).toHaveCount(2);
  await expect(prose.locator('ol > li')).toHaveCount(2);
  await expect(prose.locator('strong', { hasText: 'bold' })).toBeVisible();
  await expect(prose.locator('pre code')).toContainText('const x = "<b>not html</b>";');
  await expect(prose.locator('a[href="https://example.com/ok"]')).toHaveAttribute('rel', /noopener/);
  await expect(prose.locator('a[href="/schedule"]')).toHaveCount(1);
  await expect(prose.locator('img[src="/queenix-logo.jpg"]')).toHaveAttribute('alt', 'logo image');
  // Dangerous bits are inert.
  expect(await prose.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(['https://example.com/ok', '/schedule']);
  await expect(prose.locator('script')).toHaveCount(0);
  await expect(prose.locator('[onerror]')).toHaveCount(0);
  await expect(prose.locator('img')).toHaveCount(1);
  await expect(prose).toContainText('<script>window.__pwned = 1</script>');
  await pub.waitForTimeout(500);
  expect(await pub.evaluate(() => (window as any).__pwned)).toBeUndefined();
  await shot(pub, 'site-cms-blog-post');
  await pub.goto('/blog');
  await expect(pub.getByText(title).first()).toBeVisible();
  expect(await sitemap()).toContain(`/blog/${slug}`);

  // Edit while published.
  await page.goto(postUrl);
  const again = page.getByRole('form', { name: 'Post editor' });
  await again.getByLabel('Title').fill(`${title} edited`);
  await again.getByRole('button', { name: 'Save changes' }).click();
  await expect(again.getByRole('status')).toContainText('Changes saved.');
  await pub.goto(`/blog/${slug}`);
  await expect(pub.getByRole('heading', { level: 1 })).toHaveText(`${title} edited`);

  // Unpublish → 404 + out of sitemap.
  await again.getByRole('button', { name: 'Unpublish' }).click();
  await expect(again.getByRole('status')).toContainText('Unpublished');
  expect((await pub.goto(`/blog/${slug}`))?.status()).toBe(404);
  await expect(pub.getByText('We couldn’t find that page')).toBeVisible();
  expect(await sitemap()).not.toContain(`/blog/${slug}`);

  // Delete.
  await page.getByRole('button', { name: 'Delete post' }).click();
  await page.waitForURL(/\/website\/blog$/);
  await expect(page.getByRole('link', { name: new RegExp(title) })).toHaveCount(0);
  const ops = await convexAs(ctx.request);
  expect((await ops.query(api.queries.siteAdmin.listPosts, {})).some((p: any) => p.slug === slug)).toBe(false);
  expect(pubErrors).toEqual([]);
  expect(errors).toEqual([]);
  await visitor.close();
});

