/**
 * Mobile (Expo web build) auth journeys against the live stack, with a fresh member:
 * entry redirect, sign-up → onboarding → home, email verification, add phone,
 * sign-out, SMS-code sign-in, forgot password, change password, role landing.
 * Run from apps/web: MOBILE_WEB_URL=http://10.12.19.174:8090 npx playwright test -c e2e/live/mobile.config.ts mobile-auth
 */
import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { MOBILE_URL, phoneContext, watch, shot, settled, textStable, mailCode, convexData, convexRun, sessionUser, signInUi, type Errors } from './mobile-harness';

const stamp = Date.now();
const email = `t-mobile-${stamp}@queenix.test`;
const phone = `+97150${String(stamp).slice(-7)}`;
const smsInbox = `sms+${phone.replace(/\D/g, '')}@sms.queenix.local`;
let password = 'MobileTest123!';

test.describe.configure({ mode: 'serial' });

let ctx: BrowserContext;
let page: Page;
let errors: Errors;

test.beforeAll(async ({ browser }) => {
  ctx = await phoneContext(browser);
  page = await ctx.newPage();
  errors = watch(page);
});
test.afterAll(async () => {
  console.log(`[mobile-auth] fresh member ${email} / ${phone}; page errors:\n  ${errors.join('\n  ') || 'none'}`);
  await ctx.close();
});

const toast = (p: Page, text: string | RegExp) => expect(p.getByText(text).first()).toBeVisible({ timeout: 30_000 });

test('opening the app signed out lands on the login screen', async () => {
  await page.goto(`${MOBILE_URL}/`);
  await page.waitForTimeout(5000);
  await shot(page, 'auth-root-signed-out');
  expect.soft(await page.getByText('Unmatched Route').count(), 'app root "/" shows Unmatched Route').toBe(0);
  await expect.soft(page).toHaveURL(/\/login$/);
});

test('login screen: Email and Phone modes both reachable at 390px', async () => {
  await page.goto(`${MOBILE_URL}/login`);
  await expect(page.getByText('Welcome back')).toBeVisible();
  const phoneTab = page.getByText('Phone', { exact: true });
  const box = await phoneTab.boundingBox();
  await shot(page, 'auth-login');
  expect.soft(box && box.x >= 0 && box.x + box.width <= 390, `Phone tab off-screen: ${JSON.stringify(box)}`).toBeTruthy();
});

test('sign up → onboarding → member home; Convex user created', async () => {
  await page.goto(`${MOBILE_URL}/login`);
  await page.getByText('Sign up', { exact: true }).click();
  await expect(page.getByText('Create your account')).toBeVisible();
  await page.getByPlaceholder('Your name').fill('Mobile Tester');
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByPlaceholder('At least 8 characters').fill(password);
  await page.getByPlaceholder('Re-enter your password').fill(password);
  await page.getByText('Create account', { exact: true }).click();
  // Sign-up should show the 3-step onboarding (DOB/emergency, health, goals) before home.
  const onboarding = await page.getByText('A bit about you').waitFor({ timeout: 20_000 }).then(() => true, () => false);
  await shot(page, 'auth-after-signup');
  expect.soft(onboarding, 'onboarding never shown after sign-up').toBe(true);
  if (onboarding) {
    await page.getByPlaceholder('YYYY-MM-DD').fill('1992-04-01');
    await page.getByPlaceholder('Full name').fill('Onboard Contact');
    await page.getByPlaceholder('+971 50 123 4567').fill('+971501112233');
    await page.getByText('Continue', { exact: true }).click();
    await page.getByText('Asthma').click();
    await page.getByText('Continue', { exact: true }).click();
    await page.getByText('Build strength').click();
    await page.getByText('Finish setup', { exact: true }).click();
  }
  await page.waitForURL(/\/home$/, { timeout: 60_000 });
  await settled(page);
  await textStable(page);
  await shot(page, 'auth-home-fresh');
  await expect(page.getByText('Mobile', { exact: true })).toBeVisible(); // greeting uses first name
  const user = await sessionUser(ctx);
  const row = convexData('users', 200).find((u) => u.email === email);
  expect(row, 'Convex users row for the new member').toBeTruthy();
  expect(row.betterAuthUserId).toBe(user.id);
  expect(row.roles).toEqual(['member']);
  if (onboarding) {
    // What onboarding collected should be saved on the member profile.
    const profile = convexRun<any>('queries/users:getMemberProfile', {}, user.id);
    expect.soft(profile?.dateOfBirth, 'onboarding DOB not persisted').toBe('1992-04-01');
    expect.soft(profile?.emergencyContact?.name, 'onboarding emergency contact not persisted').toBe('Onboard Contact');
  }
});

test('verify email with the code from the inbox', async () => {
  const code = await mailCode(email, stamp, /verif|code/i);
  await page.goto(`${MOBILE_URL}/(member)/security`);
  await expect(page.getByText('Not verified')).toBeVisible({ timeout: 30_000 });
  await page.getByPlaceholder('6-digit code from your email').fill(code);
  await page.getByText('Verify', { exact: true }).click();
  await toast(page, 'Email verified');
  await expect(page.getByText('Not verified')).toHaveCount(0);
  expect((await sessionUser(ctx)).emailVerified).toBe(true);
});

test('add a phone number via SMS code', async () => {
  const since = Date.now();
  await page.getByPlaceholder('+971 50 123 4567').fill(phone);
  await page.getByText('Text me a code', { exact: true }).click();
  const code = await mailCode(smsInbox, since);
  await page.getByPlaceholder('6-digit code').last().fill(code);
  await page.getByText('Confirm phone', { exact: true }).click();
  await expect(page.getByText(`${phone} · used for SMS sign-in`)).toBeVisible({ timeout: 30_000 });
  await shot(page, 'auth-security-verified');
  const u = await sessionUser(ctx);
  expect(u.phoneNumber).toBe(phone);
  expect(u.phoneNumberVerified).toBe(true);
});

async function signOut() {
  await page.goto(`${MOBILE_URL}/(member)/profile`);
  await page.getByText('Sign out', { exact: true }).click();
  await page.waitForURL(/\/login$/, { timeout: 30_000 });
  await expect(page.getByText('Welcome back')).toBeVisible();
  await expect.poll(async () => (await ctx.cookies()).some((c) => c.name.endsWith('session_token'))).toBe(false);
}

test('sign out returns to login and clears the session', async () => {
  await signOut();
});

test('SMS-code sign-in with the verified phone', async () => {
  await page.getByText('Phone', { exact: true }).click({ force: true });
  const since = Date.now();
  await page.getByPlaceholder('+971 50 123 4567').fill(phone);
  await page.getByText('Text me a code', { exact: true }).click();
  const code = await mailCode(smsInbox, since);
  await page.getByPlaceholder('6-digit code').fill(code);
  await page.getByText('Verify & sign in', { exact: true }).click();
  await page.waitForURL(/\/home$/, { timeout: 60_000 });
  expect((await sessionUser(ctx)).email).toBe(email);
  await signOut();
});

test('forgot password: email code → new password → sign in with it', async () => {
  await page.getByText('Forgot password?').click();
  await expect(page.getByText('Reset password')).toBeVisible();
  const since = Date.now();
  await page.getByPlaceholder('you@example.com').fill(email);
  await page.getByText('Email me a code', { exact: true }).click();
  const code = await mailCode(email, since, /reset|password|code/i);
  await page.getByPlaceholder('6-digit code').fill(code);
  password = 'MobileReset456!';
  await page.getByPlaceholder('At least 8 characters').fill(password);
  await page.getByText('Set new password', { exact: true }).click();
  await expect(page.getByText('Your password is updated')).toBeVisible({ timeout: 30_000 });
  await page.getByText('Back to sign in', { exact: true }).click();
  await signInUi(page, email, password);
  await expect(page).toHaveURL(/\/home$/);
});

test('change password in Security, then sign in with the new one', async () => {
  await page.goto(`${MOBILE_URL}/(member)/security`);
  await page.getByLabel('Current password').fill(password);
  const next = 'MobileChange789!';
  await page.getByLabel('New password', { exact: true }).fill(next);
  await page.getByLabel('Confirm new password').fill(next);
  await page.getByText('Change password', { exact: true }).last().click();
  await toast(page, /Password changed/);
  password = next;
  await signOut();
  await signInUi(page, email, password);
  await expect(page).toHaveURL(/\/home$/);
  await signOut();
});
