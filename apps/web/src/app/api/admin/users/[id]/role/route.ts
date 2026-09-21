import { NextResponse } from "next/server"
import Database from "better-sqlite3"
import path from "node:path"

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
  return token === (process.env.QUEENIX_ADMIN_TOKEN ?? "queenix-dev-admin-token")
}

/**
 * POST /api/admin/users/{id}/role
 * Body: { activeRole: Role, roles: Role[] }
 * Sets the role fields on a single demo user by writing directly to the
 * shared SQLite file. Bypasses BetterAuth's auth.api.updateUser (which
 * requires an admin session) — fine for the dev-only token check.
 *
 * For a real deploy, replace with an OIDC role-assignment endpoint.
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

  if (!VALID_ROLES.includes(activeRole) || roles.some((r) => !VALID_ROLES.includes(r))) {
    return NextResponse.json(
      { error: `role must be one of ${VALID_ROLES.join(", ")}` },
      { status: 400 }
    )
  }

  const dbPath =
    process.env.AUTH_DB_PATH ||
    path.join(process.cwd(), "apps/web/.data/queenix-auth.db")

  try {
    const db = new Database(dbPath)
    db.pragma("journal_mode = WAL")
    const result = db
      .prepare(
        `UPDATE "user"
         SET "activeRole" = ?, "roles" = ?, "updatedAt" = ?
         WHERE "id" = ?`
      )
      .run(
        canonicalRole(activeRole),
        JSON.stringify(roles.map(canonicalRole)),
        Date.now(),
        userId
      )
    db.close()
    if (result.changes === 0) {
      return NextResponse.json({ error: "user not found" }, { status: 404 })
    }
    return NextResponse.json({
      ok: true,
      activeRole: canonicalRole(activeRole),
      roles: roles.map(canonicalRole),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "unknown" }, { status: 500 })
  }
}

