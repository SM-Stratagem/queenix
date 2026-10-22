import { NextResponse } from "next/server"
import { auth, syncUserToConvex } from "@queenix/auth/server"
import { safeEqual, secret } from "@queenix/auth/env"

// Canonical roles plus the deprecated 'owner' alias (normalized to 'finance').
const VALID_ROLES = [
  "superadmin",
  "admin",
  "finance",
  "operations",
  "salon",
  "coffee",
  "trainer",
  "member",
  "owner",
] as const
type Role = (typeof VALID_ROLES)[number]

function canonicalRole(r: Role): string {
  return r === "owner" ? "finance" : r
}

const DEMO_TOKEN_HEADER = "x-queenix-admin-token"

function isAdminAuthorized(req: Request): boolean {
  const token = req.headers.get(DEMO_TOKEN_HEADER) ?? ""
  return safeEqual(token ?? "", secret("QUEENIX_ADMIN_TOKEN", "queenix-dev-admin-token"))
}

/**
 * POST /api/admin/users/{id}/role
 * Body: { activeRole: Role, roles: Role[] }
 * Sets the role fields on one user through BetterAuth's internal adapter
 * (works on Postgres and SQLite; serializes the roles array correctly).
 * Guarded by QUEENIX_ADMIN_TOKEN — a required, strong secret in production.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const { id: userId } = await params
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const activeRole: Role = body.activeRole
  const roles: Role[] = Array.isArray(body.roles) ? body.roles : []
  // Optional: attach a verified phone (E.164) — used to seed SMS sign-in.
  const phoneNumber: string | undefined = typeof body.phoneNumber === "string" ? body.phoneNumber : undefined
  if (phoneNumber !== undefined && !/^\+[1-9]\d{7,14}$/.test(phoneNumber)) {
    return NextResponse.json({ error: "phoneNumber must be E.164, e.g. +971501234567" }, { status: 400 })
  }

  if (!VALID_ROLES.includes(activeRole) || roles.some((r) => !VALID_ROLES.includes(r))) {
    return NextResponse.json(
      { error: `role must be one of ${VALID_ROLES.join(", ")}` },
      { status: 400 }
    )
  }

  try {
    const ctx = await auth.$context
    const existing = await ctx.internalAdapter.findUserById(userId)
    if (!existing) {
      return NextResponse.json({ error: "user not found" }, { status: 404 })
    }
    const updated = await ctx.internalAdapter.updateUser(userId, {
      activeRole: canonicalRole(activeRole),
      roles: roles.map(canonicalRole),
      ...(phoneNumber ? { phoneNumber, phoneNumberVerified: true } : {}),
    })
    // Convex enforces roles too — push them now, not at the user's next login.
    await syncUserToConvex({ ...existing, ...updated, roles: roles.map(canonicalRole) } as any)
    return NextResponse.json({
      ok: true,
      activeRole: canonicalRole(activeRole),
      roles: roles.map(canonicalRole),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 })
  }
}

