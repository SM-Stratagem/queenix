/**
 * OCR flows end to end: real browser → /api/ocr → services/ocr → review form
 * → confirm → Convex. Images are synthetic and fictional, drawn as HTML and
 * screenshotted (same content as services/ocr/tests/samples.py).
 *
 * Needs: the stack (web with OCR_URL/OCR_API_KEY, OCR service, Convex) and the
 * demo seed (it gives "Amna Member" the car "A 12345").
 *
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/ocr.spec.ts
 */
import { test, expect, type Browser, type Page } from '@playwright/test';
import { login, PASSWORD } from './login';

const MEMBER = 'Amna Member';
test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

const SAMPLES: Record<string, string> = {
  emirates_id: `<div style="width:1012px;height:638px;background:#ecf2ee;font-family:DejaVu Sans,Arial;position:relative">
    <div style="position:absolute;left:40px;top:30px;font:bold 34px Arial">UNITED ARAB EMIRATES</div>
    <div style="position:absolute;left:40px;top:75px;font:26px Arial">RESIDENT IDENTITY CARD</div>
    <div style="position:absolute;left:40px;top:150px;width:230px;height:280px;background:#c8cdd2"></div>
    ${[['ID Number', '784-1985-1122334-3'], ['Name:', 'Sample Person Test'], ['Date of Birth:', '12/06/1985'], ['Nationality:', 'Utopia']]
      .map(([l, v], i) => `<div style="position:absolute;left:310px;top:${160 + i * 62}px;font:24px Arial;color:#464646">${l}</div>
        <div style="position:absolute;left:540px;top:${158 + i * 62}px;font:bold 28px Arial">${v}</div>`).join('')}
    <div style="position:absolute;left:310px;top:470px;font:24px Arial;color:#464646">Issuing Date:</div>
    <div style="position:absolute;left:480px;top:468px;font:bold 28px Arial">21/11/2024</div>
    <div style="position:absolute;left:660px;top:470px;font:24px Arial;color:#464646">Expiry Date:</div>
    <div style="position:absolute;left:812px;top:468px;font:bold 28px Arial">20/11/2029</div>
    <div style="position:absolute;left:310px;top:532px;font:24px Arial;color:#464646">Sex:</div>
    <div style="position:absolute;left:380px;top:530px;font:bold 28px Arial">F</div></div>`,
  plate: `<div style="width:620px;height:180px;background:#787878;padding:20px;box-sizing:border-box">
    <div style="height:140px;background:#fff;border:5px solid #000;border-radius:14px;display:flex;align-items:center;gap:40px;padding-left:25px;box-sizing:border-box">
    <span style="font:bold 30px Arial">DUBAI</span><span style="font:bold 88px Arial">A</span><span style="font:bold 88px Arial">12345</span></div></div>`,
  receipt: `<div style="width:560px;padding:30px 40px;background:#fff;font:24px 'Courier New',monospace;box-sizing:border-box">
    <div style="font:bold 34px Arial;margin-bottom:30px">FAKE FITNESS SUPPLIES</div>
    ${[['Tax Invoice', ''], ['TRN: 100123456700003', ''], ['Date: 14/07/2026 18:42', ''], ['', ''], ['Protein Bar x2', '20.00'], ['Shaker Bottle', '80.00'], ['', ''], ['Subtotal', '100.00'], ['VAT 5%', '5.00'], ['TOTAL AED', '105.00'], ['', ''], ['Paid by card', '']]
      .map(([l, r]) => `<div style="display:flex;justify-content:space-between;height:44px"><span>${l}</span><span>${r}</span></div>`).join('')}</div>`,
  document: `<div style="width:900px;height:700px;background:#fff;padding:40px 60px;box-sizing:border-box;font:24px Arial">
    <div style="font:bold 36px Arial;margin-bottom:50px">MEMBER WAIVER FORM</div>
    <p>I confirm that I am fit to exercise and</p><p>agree to follow all gym safety rules.</p><p>Member name: Sample Person</p>
    <p style="margin-top:180px">Signature: ______________________</p><p>Date: 01/09/2026</p></div>`,
};

async function sample(browser: Browser, kind: string) {
  const p = await browser.newPage();
  await p.setContent(`<body style="margin:0">${SAMPLES[kind]}</body>`);
  const buffer = await p.locator('body > div').first().screenshot({ type: 'png' });
  await p.close();
  return { name: `${kind}.png`, mimeType: 'image/png', buffer };
}


async function openMember(page: Page) {
  await page.goto('/members');
  await page.getByPlaceholder('Search name, email, phone…').fill('Amna');
  await page.getByRole('row', { name: new RegExp(MEMBER) }).getByRole('link', { name: 'Open' }).first().click();
  await expect(page.getByRole('heading', { name: MEMBER })).toBeVisible();
}

test('(a) ops scans an Emirates ID on the member page → review → verified ID saved', async ({ page, browser }) => {
  await login(page, 'ops');
  await openMember(page);
  await page.getByLabel('Scan ID').setInputFiles(await sample(browser, 'emirates_id'));
  const review = page.getByLabel('Review ID');
  await expect(review.getByLabel('ID number')).toHaveValue('784-1985-1122334-3', { timeout: 60_000 });
  await expect(review).toContainText('OCR confidence');
  await review.getByLabel('Full name').fill('Sample Person Test');
  await review.getByRole('button', { name: 'Confirm & save ID' }).click();
  const shown = page.getByTestId('member-identity');
  await expect(shown).toContainText('Emirates ID 784-1985-1122334-3');
  await expect(shown).toContainText('Verified by staff');
  await expect(shown.getByRole('link', { name: 'view scan' })).toBeVisible();
});

test('(b) valet scans a plate → matched member prefilled → checked in', async ({ page, browser }) => {
  await login(page, 'ops');
  await page.goto('/valet');
  const complete = async () => {
    await page.getByRole('button', { name: 'checked_in' }).click();
    const row = page.getByRole('row').filter({ hasText: /A ?12345/ }).first();
    if (await row.count()) await row.getByRole('button', { name: 'Complete' }).click();
    await page.getByRole('button', { name: 'all', exact: true }).click();
  };
  await complete(); // leftovers from a previous run
  const desk = page.getByLabel('Valet check-in');
  await desk.getByLabel('Scan plate').setInputFiles(await sample(browser, 'plate'));
  await expect(desk.getByLabel('Plate', { exact: true })).toHaveValue(/A 12345/, { timeout: 60_000 });
  const member = desk.getByLabel('Member', { exact: true });
  await expect(member.locator('option:checked')).toContainText(`${MEMBER} · A 12345 (plate match)`);
  await desk.getByRole('button', { name: 'Check in' }).click();
  await expect(desk).toContainText(/Checked in .*A 12345/);
  await page.getByRole('button', { name: 'checked_in' }).click();
  await expect(page.getByRole('row').filter({ hasText: /A 12345/ }).first()).toBeVisible();
  await complete();
});

test('(c) finance scans a receipt → prefilled expense → journal row with receipt link', async ({ page, browser }) => {
  await login(page, 'owner');
  await page.goto('/finance');
  await page.getByLabel('Scan receipt').setInputFiles(await sample(browser, 'receipt'));
  await expect(page.getByLabel('Entry amount (AED)')).toHaveValue('105.00', { timeout: 60_000 });
  await expect(page.getByLabel('Entry date')).toHaveValue('2026-07-14');
  await expect(page.getByLabel('Note')).toHaveValue(/FAKE FITNESS SUPPLIES · TRN 100123456700003/);
  await expect(page.getByLabel('Category')).toHaveValue('Supplies');
  await page.getByRole('button', { name: 'Record entry' }).click();
  await expect(page.getByRole('status')).toContainText('recorded in the books');
  const row = page.getByRole('row').filter({ hasText: 'TRN 100123456700003' }).first();
  await expect(row).toContainText('105');
  await expect(row).toContainText('14 Jul 2026');
  await expect(row.getByRole('link', { name: 'receipt' })).toHaveAttribute('href', /^http/);
});

test('(d) signed paper form → attached to the member as a paper copy', async ({ page, browser }) => {
  await login(page, 'ops');
  await openMember(page);
  const upload = page.getByLabel('Upload signed form');
  await upload.getByLabel('Document').selectOption({ index: 1 });
  const title = (await upload.getByLabel('Document').locator('option:checked').textContent())!.replace(/ v\S+$/, '');
  await upload.getByLabel('Scan signed form').setInputFiles(await sample(browser, 'document'));
  await expect(upload.getByLabel('Extracted text')).toHaveValue(/MEMBER WAIVER FORM/, { timeout: 60_000 });
  await upload.getByRole('button', { name: 'Confirm & attach' }).click();
  await expect(upload).toContainText('Signed form attached.');
  const item = page.getByTestId('member-documents').getByRole('listitem').filter({ hasText: title }).first();
  await expect(item.getByRole('link', { name: 'paper copy' })).toBeVisible();
});

test('(e) /api/ocr: anonymous → 401, member scanning a receipt → 403', async ({ playwright, baseURL }) => {
  const anon = await playwright.request.newContext({ baseURL });
  const img = { name: 'r.png', mimeType: 'image/png', buffer: Buffer.from('x') };
  expect((await anon.post('/api/ocr', { multipart: { kind: 'receipt', file: img } })).status()).toBe(401);
  const member = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL! } });
  const signIn = await member.post('/api/auth/sign-in/email', { data: { email: 'member@queenix.test', password: PASSWORD } });
  expect(signIn.ok()).toBe(true);
  const res = await member.post('/api/ocr', { multipart: { kind: 'receipt', file: img } });
  expect(res.status()).toBe(403);
  expect(await res.json()).toEqual({ error: 'Your role cannot scan receipt' });
});
