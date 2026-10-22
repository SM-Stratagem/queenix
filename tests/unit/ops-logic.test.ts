/** Booking counters, venue state machines, unfreeze, trial throttle, CMS guards, broadcast paging. */
import { describe, expect, it } from "vitest";
import {
  COFFEE_NEXT,
  DAY_MS,
  SALON_NEXT,
  TRIAL_THROTTLE_MAX,
  canBookClass,
  cancelBookingEffect,
  isAllowedImageType,
  isSafeHref,
  safePaymentLink,
  scrubPaymentLink,
  transition,
  trialLeadDecision,
  unfreezeEarly,
} from "../../packages/convex/convex/opsLogic";
import { FANOUT_PAGE, fanOutPage } from "../../packages/convex/convex/mutations/engagement";
import { filterByPushPreference } from "../../packages/convex/convex/pushLogic";

describe("cancelBooking counters", () => {
  it("waitlisted cancel frees a waitlist slot, never a seat (no overbooking)", () => {
    const r = cancelBookingEffect("waitlisted", { bookedCount: 10, waitlistCount: 1 }, false);
    expect(r).toEqual({ ok: true, counts: { bookedCount: 10, waitlistCount: 0 }, promote: false });
  });
  it("confirmed cancel with nobody waiting frees a seat", () => {
    const r = cancelBookingEffect("confirmed", { bookedCount: 10, waitlistCount: 0 }, false);
    expect(r).toEqual({ ok: true, counts: { bookedCount: 9, waitlistCount: 0 }, promote: false });
  });
  it("confirmed cancel hands the seat to the waitlist: booked stays, waitlist drops", () => {
    const r = cancelBookingEffect("confirmed", { bookedCount: 10, waitlistCount: 2 }, true);
    expect(r).toEqual({ ok: true, counts: { bookedCount: 10, waitlistCount: 1 }, promote: true });
  });
  it("attended / no_show cannot be cancelled", () => {
    expect(cancelBookingEffect("attended", { bookedCount: 3, waitlistCount: 0 }, false).ok).toBe(false);
    expect(cancelBookingEffect("no_show", { bookedCount: 3, waitlistCount: 0 }, false).ok).toBe(false);
  });
  it("never goes negative", () => {
    const r = cancelBookingEffect("waitlisted", { bookedCount: 0, waitlistCount: 0 }, false);
    expect(r).toEqual({ ok: true, counts: { bookedCount: 0, waitlistCount: 0 }, promote: false });
  });
});

describe("class booking needs a live membership", () => {
  const now = 1_000_000;
  it("member without membership is refused", () => expect(canBookClass(["member"], [], now)).toBe(false));
  it("active / trial unexpired is allowed", () => {
    expect(canBookClass(["member"], [{ status: "active", endDate: now + 1 }], now)).toBe(true);
    expect(canBookClass(["member"], [{ status: "trial", endDate: now + 1 }], now)).toBe(true);
  });
  it("frozen, cancelled, expired or past end date is refused", () => {
    for (const status of ["frozen", "cancelled", "expired", "pending"])
      expect(canBookClass(["member"], [{ status, endDate: now + DAY_MS }], now)).toBe(false);
    expect(canBookClass(["member"], [{ status: "active", endDate: now - 1 }], now)).toBe(false);
  });
  it("staff and trainers book without one", () => {
    expect(canBookClass(["trainer"], [], now)).toBe(true);
    expect(canBookClass(["member", "operations"], [], now)).toBe(true);
  });
});

describe("venue state machines", () => {
  it("coffee moves forward one step, cancel from any open state", () => {
    expect(transition(COFFEE_NEXT, "queued", "preparing")).toBe("ok");
    expect(transition(COFFEE_NEXT, "ready", "served")).toBe("ok");
    expect(transition(COFFEE_NEXT, "ready", "cancelled")).toBe("ok");
    expect(transition(COFFEE_NEXT, "served", "preparing")).toBe("invalid");
    expect(transition(COFFEE_NEXT, "cancelled", "served")).toBe("invalid");
    expect(transition(COFFEE_NEXT, "queued", "served")).toBe("invalid");
    expect(transition(COFFEE_NEXT, "preparing", "preparing")).toBe("same");
  });
  it("salon: pending → confirmed → completed; terminal states stay put", () => {
    expect(transition(SALON_NEXT, "pending", "confirmed")).toBe("ok");
    expect(transition(SALON_NEXT, "confirmed", "completed")).toBe("ok");
    expect(transition(SALON_NEXT, "pending", "cancelled")).toBe("ok");
    expect(transition(SALON_NEXT, "completed", "confirmed")).toBe("invalid");
    expect(transition(SALON_NEXT, "pending", "completed")).toBe("invalid");
    expect(transition(SALON_NEXT, "cancelled", "confirmed")).toBe("invalid");
  });
});

describe("early unfreeze", () => {
  it("gives back only the days actually frozen", () => {
    const start = 0;
    const m = { endDate: 40 * DAY_MS, freezes: [{ startDate: start, endDate: start + 10 * DAY_MS }] };
    const r = unfreezeEarly(m, start + 3 * DAY_MS);
    expect(r.endDate).toBe(33 * DAY_MS); // 30-day plan + 3 frozen days
    expect(r.freezes[0]!.endDate).toBe(3 * DAY_MS);
  });
  it("no change once the freeze has run its course", () => {
    const m = { endDate: 40 * DAY_MS, freezes: [{ startDate: 0, endDate: 10 * DAY_MS }] };
    expect(unfreezeEarly(m, 11 * DAY_MS).endDate).toBe(40 * DAY_MS);
  });
});

describe("trial-form throttle", () => {
  const now = 10 * DAY_MS;
  it("same phone within 24h is a silent duplicate", () => {
    expect(trialLeadDecision(now, 0, [now - 1000])).toBe("duplicate");
    expect(trialLeadDecision(now, 0, [now - DAY_MS - 1])).toBe("insert");
  });
  it("global cap per minute", () => {
    expect(trialLeadDecision(now, TRIAL_THROTTLE_MAX - 1, [])).toBe("insert");
    expect(trialLeadDecision(now, TRIAL_THROTTLE_MAX, [])).toBe("throttled");
  });
});

describe("CMS guards", () => {
  it("raster images only", () => {
    for (const t of ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "IMAGE/PNG; charset=binary"])
      expect(isAllowedImageType(t), t).toBe(true);
    for (const t of ["image/svg+xml", "text/html", "image/x-icon", undefined]) expect(isAllowedImageType(t), String(t)).toBe(false);
  });
  it("links: no javascript:/data:/protocol-relative", () => {
    for (const h of ["", "#", "/contact", "https://x.com", "mailto:a@b.c", "tel:+971"]) expect(isSafeHref(h), h).toBe(true);
    for (const h of ["javascript:alert(1)", " JavaScript:alert(1)", "data:text/html,x", "//evil.example"]) expect(isSafeHref(h), h).toBe(false);
  });
});

describe("push preference", () => {
  it("drops users who turned push off", () => {
    expect(filterByPushPreference(["a", "b", "c"], new Set(["b"]))).toEqual({ allowed: ["a", "c"], skippedOptOut: 1 });
  });
});

/** Fake ctx: `users` paginated by cursor (index into the array), inserts + scheduled calls recorded. */
function fakeCtx(users: { _id: string; roles: string[] }[]) {
  const inserted: any[] = [];
  const scheduled: any[] = [];
  const ctx = {
    db: {
      query: (table: string) => {
        expect(table).toBe("users");
        return {
          paginate: async ({ numItems, cursor }: { numItems: number; cursor: string | null }) => {
            const from = cursor ? Number(cursor) : 0;
            const page = users.slice(from, from + numItems);
            const next = from + page.length;
            return { page, isDone: next >= users.length, continueCursor: String(next) };
          },
        };
      },
      insert: async (table: string, doc: any) => {
        inserted.push({ table, doc });
      },
    },
    scheduler: {
      runAfter: async (_ms: number, fn: unknown, args: any) => {
        scheduled.push({ fn, args });
      },
    },
  };
  return { ctx, inserted, scheduled };
}

describe("broadcast fan-out paging", () => {
  // 1200 users, every 4th is staff — the old offset/slice code reached 375 of 900 members.
  const users = Array.from({ length: 1200 }, (_, i) => ({ _id: `u${i}`, roles: i % 4 === 0 ? ["operations"] : ["member"] }));

  it("every member gets exactly one notification, pushes queued per page", async () => {
    const { ctx, inserted, scheduled } = fakeCtx(users);
    const base = {
      actorId: "staff",
      batchId: "b1",
      audience: "members" as const,
      title: "t",
      body: "b",
      type: "system",
      data: { broadcast: true },
      push: true,
    };
    const first = await fanOutPage(ctx, { ...base, cursor: null });
    expect(first.isDone).toBe(false);
    // Drain the self-scheduled continuations like the Convex scheduler would.
    let pages = 1;
    for (let i = 0; i < scheduled.length; i++) {
      const s = scheduled[i];
      if (s.args.cursor === undefined) continue; // push.sendToUsers
      await fanOutPage(ctx, s.args);
      pages++;
    }
    expect(pages).toBe(Math.ceil(users.length / FANOUT_PAGE));
    const notified = inserted.filter((r) => r.table === "notifications").map((r) => r.doc.userId);
    const members = users.filter((u) => u.roles.includes("member")).map((u) => u._id);
    expect(notified.length).toBe(members.length);
    expect(new Set(notified)).toEqual(new Set(members));
    const pushed = scheduled.filter((s) => s.args.userIds).flatMap((s) => s.args.userIds);
    expect(pushed.sort()).toEqual([...members].sort());
    expect(first.sent).toBeGreaterThan(0);
  });

  it("audience 'all' reaches everyone, small audiences finish in one page", async () => {
    const { ctx, inserted, scheduled } = fakeCtx(users.slice(0, 30));
    const r = await fanOutPage(ctx, {
      actorId: "staff",
      batchId: "b2",
      audience: "all",
      title: "t",
      body: "b",
      type: "system",
      data: {},
      push: false,
      cursor: null,
    });
    expect(r).toEqual({ sent: 30, isDone: true });
    expect(inserted.length).toBe(30);
    expect(scheduled.length).toBe(0);
  });
});

describe("venue payment links", () => {
  it("never returns a stored stripe:<id>:<client_secret>", () => {
    expect(safePaymentLink("stripe:pi_1:pi_1_secret_x")).toBeUndefined();
    expect(safePaymentLink("https://pay.example/abc")).toBe("https://pay.example/abc");
    expect(scrubPaymentLink({ a: 1, paymentLink: "stripe:pi_1:secret" })).toEqual({ a: 1, paymentLink: undefined });
    const ok = { a: 1, paymentLink: "https://pay.example/abc" };
    expect(scrubPaymentLink(ok)).toBe(ok);
  });
});
