import { defineConfig } from "@playwright/test"

// Docker stack (./scripts/dev-up.sh) serves :3000; auth.spec's host dev server uses :3300.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3300"

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: `echo 'web admin already running on ${baseURL}'`,
    url: baseURL,
    timeout: 30_000,
    reuseExistingServer: true,
  },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  fullyParallel: false,
  workers: 1,
})
