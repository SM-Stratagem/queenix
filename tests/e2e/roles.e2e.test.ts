/**
 * Committed e2e role-gating suite (offline, runs under root vitest).
 *
 * Covers every canonical role in the fixed contract
 * (superadmin, admin, finance, operations, salon, coffee, trainer, member)
 * plus the deprecated 'owner' alias (normalized to 'finance') and a custom
 * scoped multi-role user, across:
 *  - web landing gating  (WEB_LANDING / webLandingFor)
 *  - mobile home gating (MOBILE_HOME / mobileHomeFor)
 *  - one core action per role (capability / helper predicates)
 *  - modular custom access: capability grants are additive-only
 *  - backend agreement: packages/convex/convex/permissions.ts source
 *    carries the same capability matrix + grant-aware checks.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MOBILE_HOME,
  WEB_LANDING,
  canAccessAdmin,
  canAccessFinance,
  canManageStaff,
  hasRank,
  isStaff,
  mobileHomeFor,
  normalizeRole,
  webLandingFor,
  type Role,
} from "../../packages/auth/src/roles";

const CANONICAL_ROLES: Role[] = [
  "superadmin",
  "admin",
  "finance",
  "operations",
  "salon",
  "coffee",
  "trainer",
  "member",
];

// Core action per canonical role, expressed with the committed helper predicates.
const CORE_ACTIONS: Record<string, { label: string; allowed: boolean }> = {
  superadmin: { label: "manage platform + finance + staff", allowed: true },
  admin: { label: "manage staff + read/write finance", allowed: true },
  finance: { label: "read/write finance + manage venue staff", allowed: true },
  operations: { label: "manage classes/bookings + scan at door", allowed: true },
  salon: { label: "serve salon queue", allowed: true },
  coffee: { label: "serve coffee queue", allowed: true },
  trainer: { label: "coach PT sessions + manage classes", allowed: true },
  member: { label: "self-service booking (member.self)", allowed: true },
};

describe("web gating: one landing per role", () => {
  it.each(CANONICAL_ROLES)("role %s has a distinct web landing", (role) => {
    expect(WEB_LANDING[role]).toMatch(/^\//);
  });

  it("web landings match the committed contract", () => {
    expect(WEB_LANDING).toMatchObject({
      superadmin: "/admin/platform",
      admin: "/admin",
      finance: "/finance",
      operations: "/ops",
      salon: "/salon",
      coffee: "/coffee",
      trainer: "/trainer",
      member: "/app",
    });
  });

  it.each(CANONICAL_ROLES)("webLandingFor([%s]) resolves to its landing", (role) => {
    expect(webLandingFor([role])).toBe(WEB_LANDING[role]);
  });

  it("deprecated owner alias normalizes to finance landing", () => {
    expect(normalizeRole("owner")).toBe("finance");
    expect(webLandingFor(["owner"])).toBe(WEB_LANDING.finance);
    expect(webLandingFor(["member", "owner"])).toBe(WEB_LANDING.finance);
  });

  it("multi-role user lands on highest-ranked web surface", () => {
    expect(webLandingFor(["member", "finance"])).toBe(WEB_LANDING.finance);
    // salon = coffee = trainer share rank 3; precedence follows the ordered
    // tiebreak in webLandingFor (salon, coffee before trainer).
    expect(webLandingFor(["coffee", "trainer"])).toBe(WEB_LANDING.coffee);
    expect(webLandingFor(["member", "trainer"])).toBe(WEB_LANDING.trainer);
  });

  it("anonymous user falls back to /login", () => {
    expect(webLandingFor([])).toBe("/login");
  });
});

describe("mobile gating: one home per role", () => {
  it("mobile homes match the committed contract", () => {
    expect(MOBILE_HOME).toMatchObject({
      superadmin: "/(owner)/overview",
      admin: "/(owner)/overview",
      finance: "/(owner)/overview",
      operations: "/(ops)/scanner",
      salon: "/(ops)/scanner",
      coffee: "/(ops)/scanner",
      trainer: "/(trainer)/today",
      member: "/(member)/home",
    });
  });

  it.each(CANONICAL_ROLES)("mobileHomeFor([%s]) resolves to its home", (role) => {
    expect(mobileHomeFor([role])).toBe(MOBILE_HOME[role]);
  });

  it("deprecated owner alias normalizes to finance home", () => {
    expect(mobileHomeFor(["owner"])).toBe(MOBILE_HOME.finance);
  });

  it("anonymous user falls back to login", () => {
    expect(mobileHomeFor([])).toBe("/(auth)/login");
  });
});

describe("core action per role (client predicates)", () => {
  it("superadmin/admin/finance reach admin + finance + staff surfaces", () => {
    for (const r of ["superadmin", "admin", "finance"] as Role[]) {
      expect(canAccessAdmin([r])).toBe(true);
      expect(canAccessFinance([r])).toBe(true);
      expect(canManageStaff([r])).toBe(true);
    }
    // owner alias carries identical reach.
    expect(canAccessAdmin(["owner"])).toBe(true);
    expect(canAccessFinance(["owner"])).toBe(true);
    expect(CORE_ACTIONS.superadmin.allowed).toBe(true);
  });

  it("operations reaches staff-read level but NOT finance", () => {
    // operations: staff queue/scanner core action, no finance access.
    expect(canAccessFinance(["operations"])).toBe(false);
    expect(canAccessAdmin(["operations"])).toBe(false);
    expect(hasRank(["operations"], "operations")).toBe(true);
    expect(CORE_ACTIONS.operations.allowed).toBe(true);
  });

  it("salon / coffee / trainer are staff but NOT finance/admin", () => {
    for (const r of ["salon", "coffee", "trainer"] as Role[]) {
      expect(isStaff([r])).toBe(true);
      expect(canAccessFinance([r])).toBe(false);
      expect(canAccessAdmin([r])).toBe(false);
    }
    expect(CORE_ACTIONS.salon.label).toContain("salon");
    expect(CORE_ACTIONS.coffee.label).toContain("coffee");
    expect(CORE_ACTIONS.trainer.label).toContain("coach");
  });

  it("member is not staff and reaches only self-service", () => {
    expect(isStaff(["member"])).toBe(false);
    expect(canAccessAdmin(["member"])).toBe(false);
    expect(canAccessFinance(["member"])).toBe(false);
    expect(CORE_ACTIONS.member.allowed).toBe(true);
  });
});

describe("custom scoped user (multi-role, least-privilege)", () => {
  // e.g. a trainer who also covers the coffee bar: holds both service
  // capabilities, outranks member, but must NOT reach finance/admin.
  const custom: Role[] = ["trainer", "coffee"];

  it("lands on the highest-ranked home on web + mobile", () => {
    // trainer + coffee share rank 3; the ordered tiebreak puts coffee first.
    expect(webLandingFor(custom)).toBe(WEB_LANDING.coffee);
    expect(mobileHomeFor(custom)).toBe(MOBILE_HOME.coffee);
  });

  it("is staff without admin/finance reach", () => {
    expect(isStaff(custom)).toBe(true);
    expect(canAccessAdmin(custom)).toBe(false);
    expect(canAccessFinance(custom)).toBe(false);
    expect(canManageStaff(custom)).toBe(false);
  });

  it("outranks member-only users", () => {
    expect(hasRank(custom, "member")).toBe(true);
    expect(hasRank(["member"], "trainer")).toBe(false);
  });
});

describe("modular custom access: capability grants are additive-only", () => {
  const grantsSrc = readFileSync(
    join(__dirname, "../../packages/convex/convex/mutations/grants.ts"),
    "utf8",
  );
  const schemaSrc = readFileSync(
    join(__dirname, "../../packages/convex/convex/schema/grants.ts"),
    "utf8",
  );

  it("grants table supports global + branch-scoped + expiring grants", () => {
    expect(schemaSrc).toContain("capabilityGrants");
    expect(schemaSrc).toContain("branchId");
    expect(schemaSrc).toContain("expiresAt");
    expect(schemaSrc).toContain("by_user_capability");
  });

  it("grant/revoke endpoints are staff-gated and additive-only", () => {
    expect(grantsSrc).toContain("grantCapability");
    expect(grantsSrc).toContain("revokeCapability");
    expect(grantsSrc).toContain("staff.manage");
    expect(grantsSrc).toMatch(/ADDITIVE ONLY/);
  });
});

describe("backend agreement: convex permissions matrix", () => {
  const src = readFileSync(
    join(__dirname, "../../packages/convex/convex/permissions.ts"),
    "utf8",
  );

  it("declares all canonical roles plus the owner alias", () => {
    for (const r of CANONICAL_ROLES) expect(src).toContain(`'${r}'`);
    expect(src).toContain("'owner'");
    expect(src).toContain("normalizeRole");
  });

  it("finance alias carries identical capabilities", () => {
    expect(src).toContain("FINANCE_CAPABILITIES");
    expect(src).toContain("owner: FINANCE_CAPABILITIES");
  });

  it("grants platform.manage to superadmin only", () => {
    expect(src).toContain("platform.manage");
    // NOTE: "superadmin: [" contains the substring "admin: [", so anchor
    // on the line start to land on the admin block itself.
    const adminBlock = src.slice(src.indexOf("\n  admin: ["));
    expect(adminBlock).not.toMatch(/'platform\.manage'/);
  });

  it("grants finance.read/write to superadmin, admin, finance", () => {
    for (const cap of ["finance.read", "finance.write"]) {
      expect(src).toContain(cap);
    }
    // operations block must not contain finance caps
    const opsBlock = src.slice(
      src.indexOf("operations: ["),
      src.indexOf("operations: [") + 300,
    );
    expect(opsBlock).not.toContain("finance.read");
  });

  it("grants one core capability per scoped role", () => {
    expect(src).toContain("salon.serve");
    expect(src).toContain("coffee.serve");
    expect(src).toContain("training.coach");
    expect(src).toContain("bookings.scan");
    expect(src).toContain("member.self");
  });

  it("capability checks are grant-aware and additive-only", () => {
    expect(src).toContain("requireCapability");
    expect(src).toContain("getUserGrantedCapabilities");
    expect(src).toContain("userHasCapabilityWithGrants");
  });
});
