import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: "echo 'web admin already running on http://localhost:3300'",
    url: "http://localhost:3300",
    timeout: 30_000,
    reuseExistingServer: true,
  },
  use: {
    baseURL: "http://localhost:3300",
    trace: "retain-on-failure",
  },
  fullyParallel: false,
  workers: 1,
})
