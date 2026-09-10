import { CardStatus } from "@/data/types"

/**
 * active ⇄ frozen, either can go to cancelled, cancelled is terminal.
 * Guard every status write with this — client-side disabling is UX, not
 * enforcement.
 */
const ALLOWED_TRANSITIONS: Record<CardStatus, readonly CardStatus[]> = {
  active: ["frozen", "cancelled"],
  frozen: ["active", "cancelled"],
  cancelled: [],
}

export function canTransition(from: CardStatus, to: CardStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}
