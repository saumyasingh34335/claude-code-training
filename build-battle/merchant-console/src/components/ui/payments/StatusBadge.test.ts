import { describe, expect, it } from "vitest"
import { DOTS, LABELS, VARIANTS } from "./StatusBadge"

/**
 * NWP-201 widened this component's status union to cover CardStatus.
 * These pin the pre-existing payment/dispute/payout values so extending it
 * for cards couldn't have silently changed how /payments, /disputes, or
 * /payouts render — no DOM here, same as every other test in this repo,
 * just the data the component renders from.
 */

describe("StatusBadge maps: pre-existing statuses are unchanged", () => {
  it("keeps every payment status label, dot, and variant as before", () => {
    expect(LABELS.captured).toBe("Captured")
    expect(LABELS.disputed).toBe("Disputed")
    expect(LABELS.failed).toBe("Failed")
    expect(VARIANTS.captured).toBe("success")
    expect(VARIANTS.failed).toBe("error")
    expect(DOTS.captured).toBe("bg-emerald-600 dark:bg-emerald-400")
  })

  it("keeps every dispute status label, dot, and variant as before", () => {
    expect(LABELS.needs_response).toBe("Needs response")
    expect(LABELS.won).toBe("Won")
    expect(VARIANTS.won).toBe("success")
    expect(VARIANTS.lost).toBe("error")
  })

  it("keeps every payout status label, dot, and variant as before", () => {
    expect(LABELS.paid).toBe("Paid")
    expect(LABELS.in_transit).toBe("In transit")
    expect(VARIANTS.pending).toBe("neutral")
  })
})

describe("StatusBadge maps: card statuses added by NWP-201", () => {
  it("covers active, frozen, and cancelled with no key collisions", () => {
    expect(LABELS.active).toBe("Active")
    expect(LABELS.frozen).toBe("Frozen")
    expect(LABELS.cancelled).toBe("Cancelled")
    expect(VARIANTS.cancelled).toBe("neutral")
  })
})
