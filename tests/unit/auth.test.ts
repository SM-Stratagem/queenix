/** Auth server config: which header the per-IP rate limits trust (packages/auth/src/env.ts). */
import { describe, expect, it } from "vitest";
import { authIpConfig } from "../../packages/auth/src/env";

describe("authIpConfig", () => {
  it("trusts no client header by default (x-forwarded-for is spoofable)", () => {
    expect(authIpConfig({})).toEqual({ ipAddressHeaders: [] });
  });

  it("uses only the configured edge-overwritten header", () => {
    expect(authIpConfig({ AUTH_IP_HEADER: "X-Real-IP" })).toEqual({ ipAddressHeaders: ["x-real-ip"] });
    expect(authIpConfig({ AUTH_IP_HEADER: "cf-connecting-ip, x-real-ip" })).toEqual({
      ipAddressHeaders: ["cf-connecting-ip", "x-real-ip"],
    });
  });

  it("walks x-forwarded-for through trusted proxies when given", () => {
    expect(authIpConfig({ AUTH_TRUSTED_PROXIES: "10.0.0.0/8, 172.16.0.0/12" })).toEqual({
      ipAddressHeaders: ["x-forwarded-for"],
      trustedProxies: ["10.0.0.0/8", "172.16.0.0/12"],
    });
  });
});
