import { describe, it, expect } from "vitest"
import {
  RoleSchema,
  UserSchema,
  MembershipPlanSchema,
  PaymentSchema,
} from "../index"

describe("schemas accept good input and reject bad input", () => {
  describe("RoleSchema", () => {
    it("accepts the four valid roles", () => {
      expect(RoleSchema.parse("member")).toBe("member")
      expect(RoleSchema.parse("trainer")).toBe("trainer")
      expect(RoleSchema.parse("owner")).toBe("owner")
      expect(RoleSchema.parse("operations")).toBe("operations")
    })
    it("rejects unknown roles", () => {
      expect(() => RoleSchema.parse("admin")).toThrow()
      expect(() => RoleSchema.parse("")).toThrow()
    })
  })

  describe("UserSchema", () => {
    const valid = {
      _id: "user_1",
      _creationTime: 1700000000000,
      email: "a@example.com",
      fullName: "A",
      activeRole: "member" as const,
      roles: ["member"] as const,
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    }

    it("accepts minimal valid input", () => {
      expect(UserSchema.parse(valid)).toMatchObject(valid)
    })

    it("rejects missing required fields", () => {
      const { email, ...rest } = valid
      expect(() => UserSchema.parse(rest)).toThrow()
    })

    it("rejects invalid email", () => {
      expect(() => UserSchema.parse({ ...valid, email: "not-an-email" })).toThrow()
    })
  })

  describe("MembershipPlanSchema", () => {
    const valid = {
      _id: "plan_1",
      name: "Elite Monthly",
      description: "Monthly elite tier",
      durationDays: 30,
      priceCents: 49900,
    }

    it("accepts valid plan", () => {
      const parsed = MembershipPlanSchema.parse(valid)
      expect(parsed._id).toBe("plan_1")
      expect(parsed.priceCents).toBe(49900)
    })

    it("rejects missing name", () => {
      const { name, ...rest } = valid
      expect(() => MembershipPlanSchema.parse(rest)).toThrow()
    })
  })
})
