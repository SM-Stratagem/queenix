/**
 * Email + SMS one-time codes, end to end, against the running stack.
 * Codes are read from Mailpit (local inbox for email AND, in dev, SMS).
 *
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test e2e/otp.spec.ts
 *   (prod-mode stack: E2E_BASE_URL=http://localhost:4000 MAILPIT_URL=http://localhost:8026)
 */
import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test';
import { submitLogin } from './login';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const MAILPIT = process.env.MAILPIT_URL ?? 'http://localhost:8025';
const ADMIN_TOKEN = process.env.QUEENIX_ADMIN_TOKEN ?? 'queenix-dev-admin-token';
const DEMO_PASSWORD = 'QueenixDemo123!';
const stamp = Date.now();

test.describe.configure({ mode: 'serial' });

/** Newest 6-digit code sent to `to` after `since` (polls the inbox). */
async function codeFor(to: string, since: number): Promise<string> {
  const api = await pwRequest.newContext();
  try {
    for (let i = 0; i < 40; i++) {
      const res = await api.get(`${MAILPIT}/api/v1/search`, { params: { query: `to:"${to}"`, limit: '5' } });
      const { messages = [] } = (await res.json()) as { messages?: Array<{ ID: string; Created: string }> };
      const fresh = messages.find((m) => Date.parse(m.Created) >= since - 1000);
      if (fresh) {
        const msg = (await (await api.get(`${MAILPIT}/api/v1/message/${fresh.ID}`)).json()) as { Text: string };
        const code = msg.Text.match(/\b(\d{6})\b/)?.[1];
        if (code) return code;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error(`no code arrived for ${to}`);
  } finally {
    await api.dispose();
  }
}

async function authApi(): Promise<APIRequestContext> {
  // BetterAuth checks Origin on state-changing requests.
  return pwRequest.newContext({ baseURL: BASE, extraHTTPHeaders: { origin: BASE } });
}

/** Put a demo account back on the shared demo password (email-code reset via the API). */
async function restoreDemoPassword(email: string) {
  const api = await authApi();
  try {
    const since = Date.now();
    expect((await api.post('/api/auth/email-otp/request-password-reset', { data: { email } })).ok()).toBe(true);
    const code = await codeFor(email, since);
    const reset = await api.post('/api/auth/email-otp/reset-password', { data: { email, otp: code, password: DEMO_PASSWORD } });
    expect(reset.ok()).toBe(true);
  } finally {
    await api.dispose();
  }
}

test('staff password reset by email code (web UI)', async ({ page }) => {
  const email = 'ops@queenix.test';
  const newPassword = `Reset-${stamp}!`;
  try {
    await page.goto(`${BASE}/login`);
    await page.locator('input[type=email]').fill(email);
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    const since = Date.now();
    await page.getByRole('button', { name: 'Email me a code' }).click();
    const code = await codeFor(email, since);
    await page.getByLabel('Code').fill(code);
    await page.getByLabel('New password').fill(newPassword);
    await page.getByRole('button', { name: 'Set new password' }).click();
    await expect(page.getByRole('status')).toContainText('Password updated');

    // New password works.
    await submitLogin(page, email, newPassword);
    await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 60_000 });
  } finally {
    // Always restore the demo password — even if an assertion above failed.
    await restoreDemoPassword(email);
  }
});

test('sign-up sends an email verification code that verifies the address', async () => {
  const api = await authApi();
  const email = `verify-${stamp}@queenix.test`;
  const since = Date.now();
  const signup = await api.post('/api/auth/sign-up/email', {
    data: { email, password: 'VerifyMe123!', name: 'Verify Me', fullName: 'Verify Me' },
  });
  expect(signup.ok()).toBe(true);
  const code = await codeFor(email, since);

  const bad = await api.post('/api/auth/email-otp/verify-email', { data: { email, otp: '000000' } });
  expect(bad.ok()).toBe(false);

  const ok = await api.post('/api/auth/email-otp/verify-email', { data: { email, otp: code } });
  expect(ok.ok()).toBe(true);
  const session = await (await api.get('/api/auth/get-session')).json();
  expect(session.user.email).toBe(email);
  expect(session.user.emailVerified).toBe(true);
  await api.dispose();
});

test('member signs in with an SMS code', async () => {
  const phone = `+9715${String(stamp).slice(-8)}`;
  const admin = await authApi();
  // Find the demo member and give them a verified phone (what Profile → Phone does).
  const login = await admin.post('/api/auth/sign-in/email', { data: { email: 'member@queenix.test', password: DEMO_PASSWORD } });
  expect(login.ok()).toBe(true);
  const memberId = (await login.json()).user.id as string;
  const set = await admin.post(`/api/admin/users/${memberId}/role`, {
    headers: { 'x-queenix-admin-token': ADMIN_TOKEN },
    data: { activeRole: 'member', roles: ['member'], phoneNumber: phone },
  });
  expect(set.ok()).toBe(true);
  await admin.dispose();

  const api = await authApi();
  const since = Date.now();
  expect((await api.post('/api/auth/phone-number/send-otp', { data: { phoneNumber: phone } })).ok()).toBe(true);
  const smsInbox = `sms+${phone.replace(/\D/g, '')}@sms.queenix.local`;
  const code = await codeFor(smsInbox, since);

  const wrong = await api.post('/api/auth/phone-number/verify', { data: { phoneNumber: phone, code: '000000' } });
  expect(wrong.ok()).toBe(false);

  const verify = await api.post('/api/auth/phone-number/verify', { data: { phoneNumber: phone, code } });
  expect(verify.ok()).toBe(true);
  const session = await (await api.get('/api/auth/get-session')).json();
  expect(session.user.email).toBe('member@queenix.test');
  await api.dispose();
});
