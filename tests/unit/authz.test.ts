/** Convex authorization rules (packages/convex/convex/permissions.ts + mutations/access.ts). */
import { describe, expect, it } from "vitest";
import {
  approvalDecisionError,
  grantChangeError,
  roleChangeError,
  type Role,
} from "../../packages/convex/convex/permissions";
import { accessDecision } from "../../packages/convex/convex/mutations/access";

const u = (id: string, ...roles: Role[]) => ({ id, roles });
const superadmin = u("sa", "superadmin");
const admin = u("ad", "admin");
const finance = u("fi", "finance");
const owner = u("ow", "owner"); // legacy alias of finance
const ops = u("op", "operations");
const trainer = u("tr", "trainer", "member");
const member = u("me", "member");

describe("setStaffRoles ceiling (roleChangeError)", () => {
  it("nobody edits their own roles, not even superadmin", () => {
    expect(roleChangeError(finance, finance, ["superadmin", "finance"])).toMatch(/own roles/);
    expect(roleChangeError(admin, admin, ["superadmin"])).toMatch(/own roles/);
    expect(roleChangeError(superadmin, superadmin, ["member"])).toMatch(/own roles/);
  });

  it("only superadmin assigns superadmin/admin", () => {
    expect(roleChangeError(superadmin, member, ["admin"])).toBeNull();
    expect(roleChangeError(superadmin, admin, ["superadmin"])).toBeNull();
    expect(roleChangeError(admin, member, ["admin"])).toMatch(/cannot assign: admin/);
    expect(roleChangeError(finance, member, ["superadmin"])).toMatch(/cannot assign/);
    expect(roleChangeError(owner, member, ["admin"])).toMatch(/cannot assign/);
  });

  it("others assign only roles strictly below their rank", () => {
    expect(roleChangeError(admin, member, ["finance"])).toBeNull();
    expect(roleChangeError(finance, member, ["operations", "trainer"])).toBeNull();
    expect(roleChangeError(finance, member, ["finance"])).toMatch(/cannot assign: finance/);
    expect(roleChangeError(finance, member, ["owner"])).toMatch(/cannot assign: owner/);
  });

  it("cannot edit (or demote) someone at or above your level", () => {
    expect(roleChangeError(finance, superadmin, ["member"])).toMatch(/at or above/);
    expect(roleChangeError(finance, owner, ["member"])).toMatch(/at or above/);
    expect(roleChangeError(admin, u("ad2", "admin"), ["member"])).toMatch(/at or above/);
    expect(roleChangeError(ops, trainer, ["member"])).toBeNull(); // rank-wise ok; mutation still requires finance
  });
});

describe("capability grants (grantChangeError)", () => {
  it("no self-grants (the live finance → content.manage repro)", () => {
    expect(grantChangeError(finance, finance, "content.manage")).toMatch(/yourself/);
    expect(grantChangeError(superadmin, superadmin, "platform.manage")).toMatch(/yourself/);
  });

  it("dropping your own grant is allowed", () => {
    expect(grantChangeError(finance, finance, "content.manage", { revoke: true })).toBeNull();
  });

  it("actor must hold the capability through their role", () => {
    expect(grantChangeError(finance, trainer, "content.manage")).toMatch(/your role holds/);
    expect(grantChangeError(finance, trainer, "notifications.push")).toMatch(/your role holds/);
    expect(grantChangeError(admin, trainer, "platform.manage")).toMatch(/your role holds/);
    expect(grantChangeError(finance, trainer, "finance.read")).toBeNull();
    expect(grantChangeError(superadmin, trainer, "content.manage")).toBeNull();
    expect(grantChangeError(superadmin, admin, "platform.manage")).toBeNull();
  });

  it("actor must outrank the target", () => {
    expect(grantChangeError(finance, owner, "finance.read")).toMatch(/ranked below/);
    expect(grantChangeError(admin, superadmin, "content.manage")).toMatch(/ranked below/);
    expect(grantChangeError(admin, finance, "content.manage")).toBeNull();
  });
});

describe("approvals (approvalDecisionError)", () => {
  const payout = { type: "payout.early_requested", requestorId: "tr" };
  const refund = { type: "payment.refund_requested", requestorId: "m2" };
  const freeze = { type: "membership.freeze_requested", requestorId: "m2" };

  it("members and trainers never decide", () => {
    expect(approvalDecisionError(member, freeze)).toMatch(/finance or operations/);
    expect(approvalDecisionError(trainer, freeze)).toMatch(/finance or operations/);
    expect(approvalDecisionError(member, refund)).toMatch(/Only finance/);
  });

  it("nobody decides their own request", () => {
    expect(approvalDecisionError(u("tr", "trainer", "finance"), payout)).toMatch(/your own/);
    expect(approvalDecisionError(u("m2", "superadmin"), freeze)).toMatch(/your own/);
  });

  it("money kinds are finance-only; ops decides the rest", () => {
    expect(approvalDecisionError(finance, payout)).toBeNull();
    expect(approvalDecisionError(owner, refund)).toBeNull();
    expect(approvalDecisionError(admin, payout)).toBeNull();
    expect(approvalDecisionError(ops, payout)).toMatch(/Only finance/);
    expect(approvalDecisionError(ops, refund)).toMatch(/Only finance/);
    expect(approvalDecisionError(ops, freeze)).toBeNull();
    expect(approvalDecisionError(ops, payout, ["finance.write"])).toBeNull(); // explicit grant
  });
});

describe("door decision (accessDecision)", () => {
  const now = 1_000_000;
  const cred = { status: "active", tokenExpiresAt: now + 30_000 };
  const m = (status: string, endDate = now + 86_400_000) => ({ _id: "m1" as any, status, endDate });

  it("unknown/used token, inactive credential, expired token are denied with distinct reasons", () => {
    expect(accessDecision(null, [], now)).toEqual({ granted: false, reason: "Invalid or already used token" });
    expect(accessDecision({ ...cred, status: "suspended" }, [m("active")], now).reason).toBe("Credential suspended");
    expect(accessDecision({ ...cred, tokenExpiresAt: now - 1 }, [m("active")], now).reason).toBe("Token expired");
  });

  it("requires an active/trial membership that hasn't ended", () => {
    expect(accessDecision(cred, [m("active")], now)).toEqual({ granted: true });
    expect(accessDecision(cred, [m("trial")], now).granted).toBe(true);
    expect(accessDecision(cred, [m("frozen")], now).reason).toBe("Membership frozen");
    expect(accessDecision(cred, [m("cancelled")], now).reason).toBe("Membership cancelled");
    expect(accessDecision(cred, [m("active", now - 1)], now).reason).toBe("Membership expired");
    expect(accessDecision(cred, [], now).reason).toBe("No membership");
    // newest first: an active renewal admits despite an older expired row
    expect(accessDecision(cred, [m("active"), m("expired", now - 1)], now).granted).toBe(true);
  });
});
