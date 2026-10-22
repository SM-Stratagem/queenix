import { describe, it, expect } from "vitest"
import { computeVat } from "../index"

// Prices are VAT-inclusive (UAE 5%): the total is what was charged and VAT is
// split out of it, never added on top.
describe("computeVat (VAT-inclusive)", () => {
  it("splits 5% VAT out of a 105.00 total", () => {
    const items = [{ description: "x", quantity: 1, unitPriceCents: 10500, totalCents: 10500 }]
    expect(computeVat(items)).toEqual({ subtotalCents: 10000, vatCents: 500, totalCents: 10500 })
  })

  it("keeps the total equal to the amount charged and rounds VAT to the nearest fils", () => {
    const items = [{ description: "x", quantity: 1, unitPriceCents: 9999, totalCents: 9999 }]
    const result = computeVat(items)
    expect(result.totalCents).toBe(9999)
    expect(result.vatCents).toBe(476) // 9999 × 5/105 = 476.14
    expect(result.subtotalCents).toBe(9523)
  })

  it("sums multiple line items", () => {
    const items = [
      { description: "a", quantity: 1, unitPriceCents: 5250, totalCents: 5250 },
      { description: "b", quantity: 2, unitPriceCents: 3150, totalCents: 6300 },
    ]
    expect(computeVat(items)).toEqual({ subtotalCents: 11000, vatCents: 550, totalCents: 11550 })
  })

  it("returns 0 VAT when rate is 0", () => {
    const items = [{ description: "x", quantity: 1, unitPriceCents: 5000, totalCents: 5000 }]
    expect(computeVat(items, 0)).toEqual({ subtotalCents: 5000, vatCents: 0, totalCents: 5000 })
  })

  it("handles empty line items", () => {
    expect(computeVat([])).toEqual({ subtotalCents: 0, vatCents: 0, totalCents: 0 })
  })
})
