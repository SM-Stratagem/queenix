/** Money maths: VAT split, charge verification, checkout reuse, P&L, price display, gateway policy. */
import { afterEach, describe, expect, it } from "vitest"
import {
  CHECKOUT_REUSE_MS,
  findReusableCheckout,
  paidAmountMismatch,
  splitVatInclusive,
  summarizePnl,
  vatRateFor,
} from "../../packages/convex/convex/moneyLogic"
import { computeVat } from "../../packages/receipts/src/index"
import { gatewayMode } from "../../packages/payments/src/index"
import { formatPrice } from "../../apps/web/src/components/finance/ui"

describe("VAT-inclusive split", () => {
  it("receipt total equals the amount charged (500 AED → 476.19 + 23.81)", () => {
    expect(splitVatInclusive(50000, vatRateFor("AED"))).toEqual({ subtotalCents: 47619, vatCents: 2381, totalCents: 50000 })
  })
  it("subtotal + VAT always equals total", () => {
    for (const total of [1, 99, 9999, 10500, 49900, 123457]) {
      const r = splitVatInclusive(total, 0.05)
      expect(r.subtotalCents + r.vatCents).toBe(total)
      expect(r.totalCents).toBe(total)
    }
  })
  it("no VAT outside AED", () => {
    expect(vatRateFor("USD")).toBe(0)
    expect(vatRateFor("aed")).toBe(0.05)
    expect(splitVatInclusive(10000, 0)).toEqual({ subtotalCents: 10000, vatCents: 0, totalCents: 10000 })
  })
  it("Convex invoice maths and the receipts package agree", () => {
    for (const total of [9999, 10500, 49900]) {
      const pkg = computeVat([{ description: "x", quantity: 1, unitPriceCents: total, totalCents: total }])
      expect(pkg).toEqual(splitVatInclusive(total, 0.05))
    }
  })
})

describe("charge verification", () => {
  const base = { receivedCents: 49900, receivedCurrency: "AED", expectedCents: 49900, expectedCurrency: "AED" }
  it("accepts an exact match (currency case-insensitive)", () => {
    expect(paidAmountMismatch({ ...base, receivedCurrency: "aed", planPriceCents: 49900 })).toBeNull()
  })
  it("rejects an underpayment", () => {
    expect(paidAmountMismatch({ ...base, receivedCents: 1 })).toMatch(/charged 1/)
  })
  it("rejects a different currency", () => {
    expect(paidAmountMismatch({ ...base, receivedCurrency: "USD" })).toMatch(/currency/)
  })
  it("rejects a legacy record priced below the plan (1 fil for a paid plan)", () => {
    expect(paidAmountMismatch({ ...base, receivedCents: 1, expectedCents: 1, planPriceCents: 49900 })).toMatch(/below plan price/)
  })
})

describe("checkout reuse (double-submit)", () => {
  const now = 1_800_000_000_000
  const plan = { _id: "plan1", priceCents: 49900, currency: "AED" }
  const pending = { status: "pending", type: "membership", metadata: { planId: "plan1" }, amountCents: 49900, currency: "AED", createdAt: now - 1000 }
  it("reuses a recent pending checkout for the same plan", () => {
    expect(findReusableCheckout([pending], plan, now)).toBe(pending)
  })
  it("does not reuse other plans, other prices, settled or stale payments", () => {
    expect(findReusableCheckout([{ ...pending, metadata: { planId: "plan2" } }], plan, now)).toBeUndefined()
    expect(findReusableCheckout([{ ...pending, amountCents: 1 }], plan, now)).toBeUndefined()
    expect(findReusableCheckout([{ ...pending, status: "succeeded" }], plan, now)).toBeUndefined()
    expect(findReusableCheckout([{ ...pending, createdAt: now - CHECKOUT_REUSE_MS - 1 }], plan, now)).toBeUndefined()
  })
})

describe("P&L aggregation", () => {
  const rows = {
    payments: [
      { createdAt: 10, status: "succeeded", type: "membership", amountCents: 50000 },
      { createdAt: 20, status: "refunded", type: "membership", amountCents: 20000, refundedAmountCents: 15000 },
      { createdAt: 30, status: "pending", type: "membership", amountCents: 99999 },
      { createdAt: 999, status: "succeeded", type: "membership", amountCents: 77777 }, // out of window
    ],
    payouts: [
      { createdAt: 11, status: "paid", amountCents: 10000 },
      { createdAt: 12, status: "pending", amountCents: 2000 },
      { createdAt: 13, status: "cancelled", amountCents: 40000 },
    ],
    journal: [
      { entryDate: 14, kind: "income" as const, amountCents: 3000 },
      { entryDate: 15, kind: "expense" as const, amountCents: 1000 },
    ],
  }
  const pl = summarizePnl(rows, 0, 100)
  it("excludes cancelled payouts", () => {
    expect(pl.payoutsCents).toBe(12000)
    expect(pl.payoutsCount).toBe(2)
  })
  it("lines (incl. manual journal) sum to net", () => {
    expect(pl.manualIncomeCents).toBe(3000)
    expect(pl.manualExpenseCents).toBe(1000)
    expect(pl.grossCents - pl.refundedCents - pl.payoutsCents + pl.manualIncomeCents - pl.manualExpenseCents).toBe(pl.netCents)
    expect(pl.netCents).toBe(50000 - 15000 - 12000 + 3000 - 1000)
  })
  it("counts only succeeded as gross and respects the window", () => {
    expect(pl.grossCents).toBe(50000)
    expect(pl.succeededCount).toBe(1)
    expect(pl.byStatus).toEqual({ succeeded: 1, refunded: 1, pending: 1 })
  })
})

describe("price display", () => {
  it("keeps fils: 99.99 is not rounded to 100", () => {
    expect(formatPrice(9999)).toBe("99.99 AED")
    expect(formatPrice(10000, "AED")).toBe("100.00 AED")
    expect(formatPrice(123456789, "USD")).toBe("1,234,567.89 USD")
  })
})

describe("gateway policy", () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env = { ...saved }
  })
  it("mock is dev-only; production mock or missing keys → not configured", () => {
    process.env.PAYMENTS_PROVIDER = "mock"
    process.env.NODE_ENV = "development"
    expect(gatewayMode("tap")).toBe("mock")
    process.env.NODE_ENV = "production"
    expect(gatewayMode("tap")).toBeNull()
    delete process.env.PAYMENTS_PROVIDER
    delete process.env.TAP_SECRET_KEY
    delete process.env.STRIPE_SECRET_KEY
    expect(gatewayMode("tap")).toBeNull()
    expect(gatewayMode("stripe")).toBeNull()
    process.env.TAP_SECRET_KEY = "sk_test"
    expect(gatewayMode("tap")).toBe("live")
  })
})
