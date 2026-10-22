import { describe, it, expect } from "vitest"
import { renderReceiptHtml } from "../index"

describe("renderReceiptHtml", () => {
  it("produces HTML with brand, VAT line, and total", () => {
    const html = renderReceiptHtml({
      invoiceNumber: "INV-001",
      memberName: "Jane Doe",
      paymentId: "pay_123",
      paidAt: 1700000000000,
      lineItems: [
        {
          description: "Elite Monthly",
          quantity: 1,
          unitPriceCents: 49900,
          totalCents: 49900,
        },
      ],
      subtotalCents: 47524,
      vatCents: 2376,
      totalCents: 49900,
      currency: "AED",
      paymentMethodLabel: "Visa **** 4242",
      brandName: "Queenix Gym",
      brandAddress: "Dubai, UAE",
      vatNumber: "TRN-100",
    })
    expect(html).toContain("Queenix Gym")
    expect(html).toContain("VAT")
    expect(html).toContain("AED")
    expect(html).toContain("499.00") // total = amount charged (VAT-inclusive)
    expect(html).toContain("23.76")
    expect(html).toContain("Jane Doe")
    expect(html).toContain("INV-001")
  })

  it("escapes HTML in user-controlled strings", () => {
    const html = renderReceiptHtml({
      invoiceNumber: "INV-002",
      memberName: "<script>alert(1)</script>",
      paymentId: "p",
      paidAt: 1700000000000,
      lineItems: [],
      subtotalCents: 0,
      vatCents: 0,
      totalCents: 0,
      currency: "AED",
      paymentMethodLabel: "Card",
    })
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;")
  })
})
