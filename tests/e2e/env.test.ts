/** Production env guard (packages/auth/src/env.ts). */
import { afterEach, describe, expect, it } from "vitest";
import { assertProductionEnv, safeEqual, secret, setting } from "../../packages/auth/src/env";

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});
const prod = () => Object.assign(process.env, { NODE_ENV: "production", NEXT_PHASE: "" });

describe("env guard", () => {
  it("dev falls back, production refuses", () => {
    delete process.env.AUTH_SECRET;
    expect(secret("AUTH_SECRET", "dev-fallback")).toBe("dev-fallback");
    prod();
    expect(() => secret("AUTH_SECRET", "dev-fallback")).toThrow(/required in production/);
    process.env.AUTH_SECRET = "short";
    expect(() => secret("AUTH_SECRET", "x")).toThrow(/at least 32/);
    delete process.env.AUTH_BASE_URL;
    expect(() => setting("AUTH_BASE_URL", "http://localhost:3000")).toThrow(/required/);
  });

  it("next build phase is exempt", () => {
    prod();
    process.env.NEXT_PHASE = "phase-production-build";
    delete process.env.AUTH_SECRET;
    expect(secret("AUTH_SECRET", "dev")).toBe("dev");
  });

  it("boot check lists every missing variable at once", () => {
    prod();
    for (const k of ["AUTH_SECRET", "DATABASE_URL", "TWILIO_FROM"]) delete process.env[k];
    expect(() => assertProductionEnv()).toThrow(/AUTH_SECRET is missing[\s\S]*DATABASE_URL is missing[\s\S]*TWILIO_FROM/);
  });

  it("compares keys in constant time", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
