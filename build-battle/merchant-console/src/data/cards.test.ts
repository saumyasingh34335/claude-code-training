import { describe, expect, it } from "vitest"
import { createCard, listCards, setCardStatus } from "./cards"

// mch_01 (Lumen Coffee Roasters) is USD; mch_04 (Halcyon Studio) is GBP —
// fixed seed data, safe to reference directly.

describe("createCard", () => {
  it("rejects a currency that doesn't match the merchant's own currency", () => {
    const result = createCard({
      nickname: "Mismatched",
      merchantId: "mch_01",
      limit: 10000,
      currency: "EUR",
    })
    expect(result).toEqual({ error: "currency_mismatch" })
  })

  it("accepts a currency that matches the merchant", () => {
    const result = createCard({
      nickname: "Matched",
      merchantId: "mch_04",
      limit: 10000,
      currency: "GBP",
    })
    expect("card" in result).toBe(true)
  })

  it("returns the same result for a repeated idempotency key instead of creating a second card", () => {
    const before = listCards().length
    const key = crypto.randomUUID()
    const input = {
      nickname: "Retry me",
      merchantId: "mch_01",
      limit: 5000,
      currency: "USD" as const,
      idempotencyKey: key,
    }

    const first = createCard(input)
    const second = createCard(input)

    expect(first).toEqual(second)
    expect(listCards().length).toBe(before + 1)
  })

  it("starts history with a single 'active' entry at creation", () => {
    const result = createCard({
      nickname: "History start",
      merchantId: "mch_01",
      limit: 5000,
      currency: "USD",
    })
    if (!("card" in result)) throw new Error("expected a card")
    expect(result.card.history).toEqual([
      { status: "active", at: result.card.createdAt },
    ])
  })
})

describe("setCardStatus", () => {
  it("appends each legal transition to history, in order", () => {
    const created = createCard({
      nickname: "History track",
      merchantId: "mch_01",
      limit: 5000,
      currency: "USD",
    })
    if (!("card" in created)) throw new Error("expected a card")

    setCardStatus(created.card.id, "frozen")
    const cancelled = setCardStatus(created.card.id, "cancelled")

    if (!("card" in cancelled)) throw new Error("expected a card")
    expect(cancelled.card.history.map((entry) => entry.status)).toEqual([
      "active",
      "frozen",
      "cancelled",
    ])
  })

  it("still refuses to leave cancelled, even after history has entries", () => {
    const created = createCard({
      nickname: "Terminal",
      merchantId: "mch_01",
      limit: 5000,
      currency: "USD",
    })
    if (!("card" in created)) throw new Error("expected a card")

    setCardStatus(created.card.id, "cancelled")
    const result = setCardStatus(created.card.id, "active")

    expect(result).toEqual({ error: "illegal_transition" })
  })
})
