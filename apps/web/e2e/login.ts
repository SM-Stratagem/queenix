import type { Page } from '@playwright/test';

export const PASSWORD = 'QueenixDemo123!';

/**
 * Fill + submit the web login form. Production rate-limits sign-in per IP
 * (10/min) and the suite signs in faster than people do, so a 429 waits
 * out Retry-After and resubmits — same as scripts/seed-demo-users.mjs.
 */
export async function submitLogin(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login');
  await page.locator('input[type=email]').fill(email);
  await page.locator('input[type=password]').fill(password);
  for (let attempt = 0; attempt < 4; attempt++) {
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/sign-in/email')),
      page.locator('button[type=submit]').click(),
    ]);
    if (res.status() !== 429) return;
    const wait = Number(res.headers()['x-retry-after'] ?? res.headers()['retry-after'] ?? 10);
    await page.waitForTimeout((wait + 1) * 1000);
  }
}

/** Sign in as a demo staff user and wait to leave /login. */
export async function login(page: Page, user: string) {
  await submitLogin(page, `${user}@queenix.test`);
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 });
}
