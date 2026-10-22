/** Expo Push batching + consent (packages/convex/convex/pushLogic.ts). */
import { describe, expect, it } from "vitest";
import { buildMessages, filterByConsent, sendBatches } from "../../packages/convex/convex/pushLogic";

const msg = { title: "Hi", body: "Body", type: "system", batchId: "b1" };

describe("push logic", () => {
  it("250 tokens → 3 requests of ≤100, DeviceNotRegistered collected", async () => {
    const targets = Array.from({ length: 250 }, (_, i) => ({ userId: `u${i}`, token: `ExponentPushToken[t${i}]` }));
    const sizes: number[] = [];
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      const batch = JSON.parse(String(init.body)) as { to: string }[];
      sizes.push(batch.length);
      const data = batch.map((m) =>
        m.to === "ExponentPushToken[t7]"
          ? { status: "error", message: "gone", details: { error: "DeviceNotRegistered" } }
          : { status: "ok", id: "x" },
      );
      return new Response(JSON.stringify({ data }), { status: 200 });
    }) as typeof fetch;

    const messages = buildMessages(targets, msg);
    expect(messages[0]).toEqual({
      to: "ExponentPushToken[t0]",
      title: "Hi",
      body: "Body",
      data: { type: "system", batchId: "b1" },
      sound: "default",
    });
    const res = await sendBatches(messages, fakeFetch);
    expect(sizes).toEqual([100, 100, 50]);
    expect(res).toMatchObject({ sent: 249, failed: 1, deadTokens: ["ExponentPushToken[t7]"] });
  });

  it("HTTP failure fails the whole batch", async () => {
    const fail = (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
    const res = await sendBatches(buildMessages([{ userId: "u", token: "ExponentPushToken[a]" }], msg), fail);
    expect(res).toMatchObject({ sent: 0, failed: 1, deadTokens: [] });
  });

  it("promotion skips users without a granted marketing_push consent; latest row wins", () => {
    const consents = {
      yes: [{ userId: "yes", type: "marketing_push", granted: true, grantedAt: 1 }],
      revoked: [
        { userId: "revoked", type: "marketing_push", granted: true, grantedAt: 1 },
        { userId: "revoked", type: "marketing_push", granted: false, grantedAt: 2 },
      ],
      emailOnly: [{ userId: "emailOnly", type: "marketing_email", granted: true, grantedAt: 1 }],
    };
    const ids = ["yes", "revoked", "emailOnly", "none"];
    expect(filterByConsent("promotion", ids, consents)).toEqual({ allowed: ["yes"], skippedNoConsent: 3 });
    expect(filterByConsent("system", ids, consents)).toEqual({ allowed: ids, skippedNoConsent: 0 });
  });
});
