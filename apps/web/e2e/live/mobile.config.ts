import { defineConfig } from '@playwright/test';

// Mobile web-build suite: targets the served Expo export (MOBILE_WEB_URL), not the Next app,
// so it skips the root config's webServer probe of E2E_BASE_URL.
// Run from apps/web: MOBILE_WEB_URL=http://10.12.19.174:8090 npx playwright test -c e2e/live/mobile.config.ts
export default defineConfig({
  testDir: '.',
  testMatch: /mobile.*\.spec\.ts$/,
  // Own output dir: other suites share apps/web/test-results and wipe it mid-run.
  outputDir: process.env.MOBILE_RESULTS_DIR ?? '/tmp/queenix-mobile-test-results',
  timeout: 300_000,
  expect: { timeout: 20_000 },
  use: { trace: 'retain-on-failure', actionTimeout: 30_000, navigationTimeout: 60_000 },
  fullyParallel: false,
  workers: 1,
});
