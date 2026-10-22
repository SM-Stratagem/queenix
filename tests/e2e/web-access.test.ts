/** Web console route gating + post-login landing (apps/web/src/lib/access.ts). */
import { describe, expect, it } from "vitest";
import { canOpen, landingFor, sessionRoles } from "../../apps/web/src/lib/access";
import { errMsg } from "../../apps/web/src/lib/errors";

describe("web access", () => {
  it("normalizes session roles (owner → finance, deduped)", () => {
    expect(sessionRoles({ roles: ["owner", "finance", "member"] })).toEqual(["finance", "member"]);
    expect(sessionRoles({ activeRole: "trainer" })).toEqual(["trainer"]);
    expect(sessionRoles(undefined)).toEqual([]);
  });

  it("admins open everything; others only their routes", () => {
    expect(canOpen(["superadmin"], "/audit")).toBe(true);
    expect(canOpen(["trainer"], "/finance")).toBe(false);
    expect(canOpen(["trainer"], "/trainer")).toBe(true);
    expect(canOpen(["operations"], "/reports")).toBe(false);
    expect(canOpen(["operations"], "/members/abc123")).toBe(true);
    expect(canOpen(["salon"], "/coffee")).toBe(false);
    expect(canOpen(["finance"], "/finance")).toBe(true);
    // Trainers can't push: the engagement backend rejects them.
    expect(canOpen(["trainer"], "/notifications")).toBe(false);
    expect(canOpen(["trainer"], "/sales-push")).toBe(false);
    expect(canOpen(["operations"], "/notifications")).toBe(true);
  });

  it("a capability grant opens the page it covers, nothing else", () => {
    expect(canOpen(["trainer"], "/website")).toBe(false);
    expect(canOpen(["trainer"], "/website", ["content.manage"])).toBe(true);
    expect(canOpen(["trainer"], "/website/pages", ["content.manage"])).toBe(true);
    expect(canOpen(["trainer"], "/finance", ["content.manage"])).toBe(false);
    expect(canOpen(["trainer"], "/website", ["notifications.push"])).toBe(false);
  });

  it("lands single-role staff on their home, others on ?next", () => {
    expect(landingFor(["finance"])).toBe("/finance");
    expect(landingFor(["trainer", "member"])).toBe("/trainer");
    expect(landingFor(["coffee"], "/settings")).toBe("/settings");
    expect(landingFor(["coffee"], "/finance")).toBe("/coffee");
    expect(landingFor(["superadmin"], "/audit")).toBe("/audit");
    expect(landingFor(["operations"])).toBe("/dashboard");
  });

  it("never redirects off-site via ?next", () => {
    for (const bad of [
      "//evil.example",
      "https://evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
      "/\t/evil.example",
      "/\n/evil.example",
      "/\r\n/evil.example",
      "/\t\\evil.example",
      " //evil.example",
    ]) {
      expect(landingFor(["superadmin"], bad)).toBe("/dashboard");
    }
    expect(landingFor(["superadmin"], "/members/abc?tab=1#x")).toBe("/members/abc?tab=1#x");
    // Gated on the path, not the query string.
    expect(landingFor(["operations"], "/finance?x=1")).toBe("/dashboard");
  });

  it("shows the ConvexError payload, not the raw server dump", () => {
    expect(errMsg({ data: "Slot already booked", message: "[CONVEX M(x)] Server Error ..." }, "x")).toBe("Slot already booked");
    expect(errMsg({ data: { code: "FORBIDDEN", message: "Requires finance" } }, "x")).toBe("Requires finance");
    expect(errMsg(new Error("boom"), "x")).toBe("boom");
    expect(errMsg(undefined, "fallback")).toBe("fallback");
  });
});
