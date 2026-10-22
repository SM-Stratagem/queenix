import { describe, it, expect } from "vitest"
import { pickProvider, generateInvoiceNumber, createPayment } from "../index"

describe("pickProvider", () => {
  it("returns 'tap' for AED currency", () => {
    process.env.TAP_SECRET_KEY = "test"
    expect(pickProvider("AED")).toBe("tap")
    expect(pickProvider("aed")).toBe("tap")
  })

  it("falls back to 'stripe' for non-AED", () => {
    process.env.TAP_SECRET_KEY = "test"
    expect(pickProvider("USD")).toBe("stripe")
    expect(pickProvider("EUR")).toBe("stripe")
    expect(pickProvider("GBP")).toBe("stripe")
  })

  it("returns 'stripe' when TAP_SECRET_KEY is missing for AED", () => {
    const prev = process.env.TAP_SECRET_KEY
    delete process.env.TAP_SECRET_KEY
    try {
      expect(pickProvider("AED")).toBe("stripe")
    } finally {
      if (prev) process.env.TAP_SECRET_KEY = prev
    }
  })
})

describe("generateInvoiceNumber", () => {
  it("pads sequence to 5 digits with year", () => {
    expect(generateInvoiceNumber(1, 2026)).toBe("QNX-2026-00001")
    expect(generateInvoiceNumber(42, 2026)).toBe("QNX-2026-00042")
    expect(generateInvoiceNumber(99999, 2026)).toBe("QNX-2026-99999")
  })

  it("uses current year by default", () => {
    const inv = generateInvoiceNumber(1)
    expect(inv).toMatch(/^QNX-\d{4}-00001$/)
  })
})

describe("createPayment mock mode", () => {
  const params = { amountCents: 49900, currency: "aed", userId: "u1", description: "d", idempotencyKey: "k1" }

  it("returns a fake Stripe-shaped intent without calling a gateway", async () => {
    process.env.PAYMENTS_PROVIDER = "mock"
    try {
      const intent = await createPayment(params)
      expect(intent).toMatchObject({ id: "pi_mock_k1", provider: "stripe", amountCents: 49900, currency: "AED" })
      expect(intent.clientSecret).toBeTruthy()
    } finally {
      delete process.env.PAYMENTS_PROVIDER
    }
  })

  it("refuses to run in production", async () => {
    process.env.PAYMENTS_PROVIDER = "mock"
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = "production"
    try {
      await expect(createPayment(params)).rejects.toThrow(/not allowed in production/)
    } finally {
      process.env.NODE_ENV = prev
      delete process.env.PAYMENTS_PROVIDER
    }
  })
})
