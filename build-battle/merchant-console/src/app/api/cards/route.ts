import { createCard, listCards } from "@/data/cards"
import { Currency } from "@/data/types"
import { NextRequest, NextResponse } from "next/server"

const ERROR_MESSAGES: Record<string, string> = {
  nickname_required: "Enter a nickname for the card.",
  merchant_required: "Select a merchant.",
  limit_invalid: "Enter a spend limit greater than zero.",
  limit_too_high: "Spend limit cannot exceed 5,000,000 minor units.",
  currency_invalid: "Currency must be USD, EUR, or GBP.",
  category_invalid: "Category must be vendor subscriptions, ad spend, or contractor tools.",
  currency_mismatch: "Currency must match the merchant's own currency.",
}

export function GET() {
  return NextResponse.json({ cards: listCards() })
}

/**
 * Issues a card. Every field is validated against an allowlist here —
 * the client's own checks are UX, never enforcement. The full generated
 * number is returned exactly once, in this response body, and is never
 * written to the store.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 })
  }

  const result = createCard({
    nickname: typeof body.nickname === "string" ? body.nickname : "",
    merchantId: typeof body.merchantId === "string" ? body.merchantId : "",
    limit: typeof body.limit === "number" ? body.limit : NaN,
    currency: body.currency as Currency,
    category: typeof body.category === "string" ? body.category : undefined,
    idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
  })

  if ("error" in result) {
    return NextResponse.json(
      { error: ERROR_MESSAGES[result.error] },
      { status: 400 },
    )
  }

  return NextResponse.json(result, { status: 201 })
}
