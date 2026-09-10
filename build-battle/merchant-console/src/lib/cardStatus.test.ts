import { describe, expect, it } from "vitest"
import { CardStatus } from "@/data/types"
import { canTransition } from "./cardStatus"

const STATUSES: CardStatus[] = ["active", "frozen", "cancelled"]

describe("canTransition", () => {
  it("allows active to frozen and back", () => {
    expect(canTransition("active", "frozen")).toBe(true)
    expect(canTransition("frozen", "active")).toBe(true)
  })

  it("allows active or frozen to cancelled", () => {
    expect(canTransition("active", "cancelled")).toBe(true)
    expect(canTransition("frozen", "cancelled")).toBe(true)
  })

  it("treats cancelled as terminal — nothing comes back from it", () => {
    expect(canTransition("cancelled", "active")).toBe(false)
    expect(canTransition("cancelled", "frozen")).toBe(false)
    expect(canTransition("cancelled", "cancelled")).toBe(false)
  })

  it("rejects a status transitioning to itself, except where explicitly listed", () => {
    expect(canTransition("active", "active")).toBe(false)
    expect(canTransition("frozen", "frozen")).toBe(false)
  })

  it("has no undefined behavior for any status pair", () => {
    for (const from of STATUSES) {
      for (const to of STATUSES) {
        expect(typeof canTransition(from, to)).toBe("boolean")
      }
    }
  })
})
