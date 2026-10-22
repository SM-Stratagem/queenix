import { defineConfig } from '@playwright/test';

// Live auth & security suites. No webServer probe: the shared prod stack is
// slow under load and the root config's probe of `/` flakes on transient 500s.
// Run from apps/web: E2E_BASE_URL=http://10.12.19.174:4000 … npx playwright test -c e2e/live/auth.config.ts
export default defineConfig({
  testDir: '.',
  testMatch: /auth-.*\.spec\.ts$/,
  timeout: 300_000,
  expect: { timeout: 20_000 },
  use: { baseURL: process.env.E2E_BASE_URL, trace: 'retain-on-failure', actionTimeout: 30_000, navigationTimeout: 60_000 },
  fullyParallel: false,
  workers: 1,
});
