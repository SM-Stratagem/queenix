import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { auth } from "@queenix/auth/server"

const TOKEN_TTL_SECONDS = 60 * 5 // 5 minutes

function sign(payload: object): string {
  const secret = process.env.AUTH_SECRET ?? "change-me-min-32-chars"
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .toString("base64url")
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest("base64url")
  return `${header}.${body}.${sig}`
}

/**
 * Mint a short-lived HS256 JWT for the currently logged-in BetterAuth user.
 *
 * Convex's custom auth provider expects an OIDC-ish JWT; for self-hosted
 * Convex on the same network, we use a symmetric secret signed by this
 * route and verified by Convex's `auth.config.ts` issuer. The token
 * contains only the user id + session id; richer claims can be added.
 *
 * Used by both mobile (Expo) and web admin clients before they open a
 * `useConvexQuery` stream.
 */
export async function GET() {
  const session = await auth.api.getSession({ headers: new Headers() })
  if (!session?.user?.id || !session?.session?.id) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }
  const now = Math.floor(Date.now() / 1000)
  const token = sign({
    sub: session.user.id,
    sid: session.session.id,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  })
  return NextResponse.json({ token })
}
