import { test, expect, request } from "@playwright/test"

test.describe("BetterAuth e2e", () => {
  const baseURL = "http://localhost:3300"
  const stamp = Date.now()
  const email = `e2e-${stamp}@queenix.test`
  const password = "Test123456!"

  test("root renders Tamagui with 200", async ({ request }) => {
    const res = await request.get("/")
    expect(res.status()).toBe(200)
    const html = await res.text()
    expect(html).toContain("Queenix")
  })

  test("get-session returns null for anonymous", async ({ request }) => {
    const res = await request.get("/api/auth/get-session")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toBeNull()
  })

  test("sign-up + admin role assignment + sign-in all work", async () => {
    const ctx = await request.newContext({ baseURL })

    const signup = await ctx.post("/api/auth/sign-up/email", {
      data: { email, password, name: "E2E Tester", fullName: "E2E Tester" },
    })
    expect(signup.status()).toBe(200)
    const signupBody = await signup.json()
    const userId = signupBody.user.id
    expect(signupBody.user.email).toBe(email)
    expect(signupBody.user.activeRole).toBe("member")

    const roleRes = await ctx.post(`/api/admin/users/${userId}/role`, {
      headers: {
        "x-queenix-admin-token": "queenix-dev-admin-token",
        "content-type": "application/json",
      },
      data: { activeRole: "owner", roles: ["owner", "member"] },
    })
    expect(roleRes.status()).toBe(200)
    const roleBody = await roleRes.json()
    expect(roleBody.ok).toBe(true)
    expect(roleBody.activeRole).toBe("owner")
    expect(roleBody.roles).toEqual(["owner", "member"])

    // Use a fresh context (no cookies) for the sign-in test.
    const signinCtx = await request.newContext({ baseURL })
    const signin = await signinCtx.post("/api/auth/sign-in/email", {
      data: { email, password },
    })
    expect(signin.status()).toBe(200)
    const signinBody = await signin.json()
    expect(signinBody.user.activeRole).toBe("owner")
    expect(signinBody.user.roles).toEqual(["owner", "member"])

    const session = await signinCtx.get("/api/auth/get-session")
    expect(session.status()).toBe(200)
    const sessionBody = await session.json()
    expect(sessionBody.user.email).toBe(email)
    expect(sessionBody.session.userId).toBe(userId)

    await signinCtx.dispose()
    await ctx.dispose()
  })

  test("admin role endpoint rejects wrong token", async ({ request }) => {
    const res = await request.post("/api/admin/users/abc/role", {
      headers: {
        "x-queenix-admin-token": "wrong-token",
        "content-type": "application/json",
      },
      data: { activeRole: "owner", roles: ["owner"] },
    })
    expect(res.status()).toBe(401)
  })

  test("sign-in with wrong password is rejected", async ({ request }) => {
    const res = await request.post("/api/auth/sign-in/email", {
      headers: { "content-type": "application/json" },
      data: { email: "nobody@queenix.test", password: "wrong-password" },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
  })

  test("convex health endpoint reachable", async ({ request }) => {
    const res = await request.get("http://localhost:3210/version")
    expect(res.status()).toBe(200)
  })
})

