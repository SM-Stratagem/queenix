import { describe, it, expect } from "vitest"
import { computeVat } from "../index"

describe("computeVat", () => {
  it("computes 5% VAT on a single line item", () => {
    const items = [{ description: "x", quantity: 1, unitPriceCents: 10000, totalCents: 10000 }]
    const result = computeVat(items)
    expect(result).toEqual({ subtotalCents: 10000, vatCents: 500, totalCents: 10500 })
  })

  it("rounds VAT half-up", () => {
    const items = [{ description: "x", quantity: 1, unitPriceCents: 9999, totalCents: 9999 }]
    const result = computeVat(items)
    expect(result.vatCents).toBe(500)
    expect(result.totalCents).toBe(10499)
  })

  it("sums multiple line items", () => {
    const items = [
      { description: "a", quantity: 1, unitPriceCents: 5000, totalCents: 5000 },
      { description: "b", quantity: 2, unitPriceCents: 3000, totalCents: 6000 },
    ]
    const result = computeVat(items)
    expect(result.subtotalCents).toBe(11000)
    expect(result.vatCents).toBe(550)
    expect(result.totalCents).toBe(11550)
  })

  it("returns 0 VAT when rate is 0", () => {
    const items = [{ description: "x", quantity: 1, unitPriceCents: 5000, totalCents: 5000 }]
    const result = computeVat(items, 0)
    expect(result).toEqual({ subtotalCents: 5000, vatCents: 0, totalCents: 5000 })
  })

  it("handles empty line items", () => {
    expect(computeVat([])).toEqual({ subtotalCents: 0, vatCents: 0, totalCents: 0 })
  })
})
