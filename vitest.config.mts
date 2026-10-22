import { configDefaults, defineConfig } from "vitest/config";

// Playwright specs (apps/web/e2e) run under `playwright test`, not vitest.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "**/.muse/**", "apps/web/e2e/**"],
  },
});
