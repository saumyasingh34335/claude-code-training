"use client"

import { StatusBadge } from "@/components/ui/payments/StatusBadge"
import { CardStatus } from "@/data/types"
import { useRouter } from "next/navigation"
import { useState } from "react"

/**
 * Freezes or unfreezes a card without a full page reload: the request
 * updates local state immediately, then router.refresh() re-syncs the
 * server-rendered data around it (in place, no navigation). The server
 * route is still the enforcement — canTransition() there, not the button
 * being hidden here — is what actually blocks an illegal move.
 */
export function CardStatusControl({
  id,
  status,
}: {
  id: string
  status: CardStatus
}) {
  const router = useRouter()
  const [current, setCurrent] = useState(status)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function transition(to: CardStatus) {
    setPending(true)
    setError(null)
    try {
      const response = await fetch(`/api/cards/${id}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: to }),
      })
      const body = await response.json()
      if (!response.ok) {
        setError(body.error ?? "Could not update this card's status.")
        return
      }
      setCurrent(body.card.status)
      router.refresh()
    } catch {
      setError("Could not reach the server.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <StatusBadge status={current} />
      {current === "active" && (
        <button
          type="button"
          onClick={() => transition("frozen")}
          disabled={pending}
          className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-500"
        >
          Freeze
        </button>
      )}
      {current === "frozen" && (
        <button
          type="button"
          onClick={() => transition("active")}
          disabled={pending}
          className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50 dark:text-blue-500"
        >
          Unfreeze
        </button>
      )}
      {error && (
        <span role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </div>
  )
}
