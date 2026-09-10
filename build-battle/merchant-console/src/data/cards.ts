import { canTransition } from "@/lib/cardStatus"
import { generateCardNumber } from "@/lib/cardNumber"
import { merchantById } from "./merchants"
import { store } from "./store"
import { Card, CardCategory, CardStatus, Currency } from "./types"

/**
 * The one place that reads or writes cards. Route handlers and pages call
 * this rather than touching `store.cards` directly — the same discipline
 * `src/data/queries.ts` holds for payments.
 */

const CARD_CURRENCIES: readonly Currency[] = ["USD", "EUR", "GBP"]
const CARD_CATEGORIES: readonly CardCategory[] = [
  "vendor_subscriptions",
  "ad_spend",
  "contractor_tools",
]
const MAX_LIMIT_MINOR_UNITS = 5_000_000

export function listCards(): Card[] {
  return store.cards
}

export function cardById(id: string): Card | null {
  return store.cards.find((c) => c.id === id) ?? null
}

export interface CreateCardInput {
  nickname: string
  merchantId: string
  limit: number
  currency: Currency
  /** Unvalidated client input — narrowed to CardCategory only after the allowlist check. */
  category?: string
}

export type CreateCardError =
  | "nickname_required"
  | "merchant_required"
  | "limit_invalid"
  | "limit_too_high"
  | "currency_invalid"
  | "category_invalid"

/**
 * Validates a card request against the allowlist rules and, if valid,
 * generates the number, stores everything except the number itself, and
 * returns the full number alongside the stored record. The caller must
 * treat `number` as a one-time value — it is never stored and cardById()
 * can never produce it again.
 */
export function createCard(
  input: CreateCardInput,
): { card: Card; number: string } | { error: CreateCardError } {
  if (!input.nickname || !input.nickname.trim()) {
    return { error: "nickname_required" }
  }
  if (!input.merchantId || !merchantById(input.merchantId)) {
    return { error: "merchant_required" }
  }
  if (!Number.isInteger(input.limit) || input.limit <= 0) {
    return { error: "limit_invalid" }
  }
  if (input.limit > MAX_LIMIT_MINOR_UNITS) {
    return { error: "limit_too_high" }
  }
  if (!CARD_CURRENCIES.includes(input.currency)) {
    return { error: "currency_invalid" }
  }
  if (input.category !== undefined && !CARD_CATEGORIES.includes(input.category as CardCategory)) {
    return { error: "category_invalid" }
  }

  const { number, last4 } = generateCardNumber()
  const card: Card = {
    id: `card_${String(store.cards.length + 1).padStart(6, "0")}`,
    reference: crypto.randomUUID(),
    nickname: input.nickname.trim(),
    merchantId: input.merchantId,
    last4,
    status: "active",
    limit: input.limit,
    currency: input.currency,
    category: input.category as CardCategory | undefined,
    spend: 0,
    createdAt: new Date().toISOString(),
  }

  store.cards.push(card)
  return { card, number }
}

export function setCardStatus(
  id: string,
  status: CardStatus,
): { card: Card } | { error: "not_found" | "illegal_transition" } {
  const card = cardById(id)
  if (!card) return { error: "not_found" }
  if (!canTransition(card.status, status)) return { error: "illegal_transition" }

  card.status = status
  return { card }
}
