/** OCR integration pure logic: /api/ocr role rules, plate matching, form prefill. */
import { describe, expect, it } from "vitest";
import { canOcr } from "../../apps/web/src/lib/access";
import { identityFromOcr, normalizePlate, platesMatch } from "../../packages/convex/convex/_scanFields";
import { receiptPrefill } from "../../apps/web/src/components/finance/receiptPrefill";

describe("ocr", () => {
  it("gates kinds by role", () => {
    expect(canOcr(["member"], "emirates_id")).toBe(true);
    expect(canOcr(["member"], "receipt")).toBe(false);
    expect(canOcr(["member"], "document")).toBe(false);
    expect(canOcr(["operations"], "plate")).toBe(true);
    expect(canOcr(["finance"], "plate")).toBe(false);
    expect(canOcr(["finance"], "receipt")).toBe(true);
    expect(canOcr(["trainer"], "document")).toBe(true);
    expect(canOcr(["superadmin"], "receipt")).toBe(true);
    expect(canOcr([], "passport")).toBe(false);
    expect(canOcr(["operations"], "bogus")).toBe(false);
  });

  it("matches plates ignoring spaces, case and emirate prefix", () => {
    expect(normalizePlate("dxb a 12345")).toBe("DXBA12345");
    expect(platesMatch("DXB A 12345", "A12345")).toBe(true);
    expect(platesMatch("a 12345", "A-12345")).toBe(true);
    expect(platesMatch("DXB A 12345", "B 12345")).toBe(false);
    expect(platesMatch("", "A1")).toBe(false);
  });

  it("prefills identity and receipt forms", () => {
    expect(
      identityFromOcr({ kind: "passport", fields: { passport_number: "L898902C3", given_names: "ANNA MARIA", surname: "ERIKSSON", sex: "F" } })
    ).toMatchObject({ docType: "passport", docNumber: "L898902C3", fullName: "ANNA MARIA ERIKSSON", nationality: "" });
    expect(identityFromOcr({ kind: "emirates_id", fields: { id_number: "784-1985-1122334-3", name: null } })).toMatchObject({
      docType: "emirates_id",
      docNumber: "784-1985-1122334-3",
      fullName: "",
    });
    expect(receiptPrefill({ vendor: "FAKE FITNESS SUPPLIES", total: 105, date: "2026-07-14", trn: "100123456700003" })).toEqual({
      amount: "105.00",
      date: "2026-07-14",
      note: "FAKE FITNESS SUPPLIES · TRN 100123456700003",
      category: "Supplies",
      currency: "AED",
    });
  });
});
