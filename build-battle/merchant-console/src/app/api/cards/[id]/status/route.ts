import { setCardStatus } from "@/data/cards"
import { CardStatus } from "@/data/types"
import { NextRequest, NextResponse } from "next/server"

const VALID_STATUSES: readonly CardStatus[] = ["active", "frozen", "cancelled"]

/**
 * Transitions a card's status. Guarded here by canTransition() (via
 * setCardStatus), not only by which buttons the client shows — a client
 * that disables a button is UX, this route is the enforcement.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  const status = body?.status

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Status must be active, frozen, or cancelled." },
      { status: 400 },
    )
  }

  const result = setCardStatus(id, status)

  if ("error" in result) {
    if (result.error === "not_found") {
      return NextResponse.json({ error: "Card not found." }, { status: 404 })
    }
    return NextResponse.json(
      { error: `Cannot move a card from its current status to "${status}".` },
      { status: 409 },
    )
  }

  return NextResponse.json(result)
}
