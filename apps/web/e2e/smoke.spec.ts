import { test, expect } from "@playwright/test"

test("home page loads", async ({ page }) => {
  const response = await page.goto("/")
  // Even if auth is required, the request should at least get a non-5xx response
  expect([200, 302, 307]).toContain(response?.status() ?? 0)
})

test("auth sign-in route responds", async ({ request }) => {
  // BetterAuth exposes /api/auth/sign-in/email even before any user exists.
  // Sending a POST with empty body should 400 (Bad Request) because the
  // body is missing required fields.
  const res = await request.post("/api/auth/sign-in/email", {
    data: {},
  })
  expect(res.status()).toBeGreaterThanOrEqual(400)
})
