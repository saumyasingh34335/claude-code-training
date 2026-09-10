"use client"

import { Button } from "@/components/Button"
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/Drawer"
import { Input } from "@/components/Input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/Select"
import { merchants } from "@/data/merchants"
import { CardCategory } from "@/data/types"
import { parseAmountToMinorUnits } from "@/lib/money"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

const CATEGORIES: { value: CardCategory; label: string }[] = [
  { value: "vendor_subscriptions", label: "Vendor subscriptions" },
  { value: "ad_spend", label: "Ad spend" },
  { value: "contractor_tools", label: "Contractor tools" },
]

type CreatedCard = { number: string; last4: string; nickname: string }

export function IssueCardDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [nickname, setNickname] = useState("")
  const [merchantId, setMerchantId] = useState("")
  const [limitInput, setLimitInput] = useState("")
  const [category, setCategory] = useState<CardCategory | "">("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedCard | null>(null)
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())

  const selectedMerchant = merchants.find((m) => m.id === merchantId)

  function reset() {
    setNickname("")
    setMerchantId("")
    setLimitInput("")
    setCategory("")
    setError(null)
    setCreated(null)
    setIdempotencyKey(crypto.randomUUID())
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    const limit = parseAmountToMinorUnits(limitInput)
    if (limit === null) {
      setError("Enter a spend limit like 250.00.")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/cards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nickname,
          merchantId,
          limit,
          currency: selectedMerchant?.currency,
          category: category || undefined,
          idempotencyKey,
        }),
      })
      const body = await response.json()
      if (!response.ok) {
        setError(body.error ?? "Something went wrong. Try again.")
        return
      }
      setCreated({ number: body.number, last4: body.card.last4, nickname: body.card.nickname })
      setIdempotencyKey(crypto.randomUUID())
      router.refresh()
    } catch {
      setError("Could not reach the server. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DrawerTrigger asChild>
        <Button variant="primary" className="w-full gap-2 py-1.5 sm:w-fit">
          <Plus className="-ml-0.5 size-4 shrink-0" aria-hidden="true" />
          Issue card
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        {created ? (
          <>
            <DrawerHeader>
              <DrawerTitle>Card issued</DrawerTitle>
              <DrawerDescription>
                This is the only time the full number is shown. After this it&rsquo;s masked everywhere.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerBody className="flex flex-col gap-4">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                <p className="text-sm text-gray-500">{created.nickname}</p>
                <p className="mt-1 font-mono text-lg tracking-wider text-gray-900 dark:text-gray-50">
                  {created.number}
                </p>
              </div>
              <p className="text-sm text-gray-500">
                Copy it now. From here on, this card shows as •••• {created.last4}.
              </p>
            </DrawerBody>
            <DrawerFooter>
              <Button
                variant="primary"
                onClick={() => {
                  setOpen(false)
                  reset()
                }}
              >
                Done
              </Button>
            </DrawerFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
            <DrawerHeader>
              <DrawerTitle>Issue a card</DrawerTitle>
              <DrawerDescription>
                Single-merchant, always virtual, with a limit from the moment it exists.
              </DrawerDescription>
            </DrawerHeader>
            <DrawerBody className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="card-nickname"
                  className="text-sm font-medium text-gray-900 dark:text-gray-50"
                >
                  Nickname
                </label>
                <Input
                  id="card-nickname"
                  className="mt-1"
                  placeholder="e.g. Q3 ad spend"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="card-merchant"
                  className="text-sm font-medium text-gray-900 dark:text-gray-50"
                >
                  Merchant
                </label>
                <Select value={merchantId} onValueChange={setMerchantId}>
                  <SelectTrigger id="card-merchant" className="mt-1">
                    <SelectValue placeholder="Select a merchant" />
                  </SelectTrigger>
                  <SelectContent>
                    {merchants.map((merchant) => (
                      <SelectItem key={merchant.id} value={merchant.id}>
                        {merchant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label
                    htmlFor="card-limit"
                    className="text-sm font-medium text-gray-900 dark:text-gray-50"
                  >
                    Spend limit
                  </label>
                  <Input
                    id="card-limit"
                    className="mt-1"
                    inputMode="decimal"
                    placeholder="250.00"
                    value={limitInput}
                    onChange={(event) => setLimitInput(event.target.value)}
                    required
                  />
                </div>
                <div className="w-28">
                  <label
                    htmlFor="card-currency"
                    className="text-sm font-medium text-gray-900 dark:text-gray-50"
                  >
                    Currency
                  </label>
                  <Input
                    id="card-currency"
                    className="mt-1"
                    readOnly
                    value={selectedMerchant?.currency ?? ""}
                    placeholder="—"
                  />
                </div>
              </div>
              <p className="-mt-2 text-xs text-gray-500">
                Currency follows the merchant and can&rsquo;t be changed here.
              </p>

              <div>
                <label
                  htmlFor="card-category"
                  className="text-sm font-medium text-gray-900 dark:text-gray-50"
                >
                  Category <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as CardCategory)}
                >
                  <SelectTrigger id="card-category" className="mt-1">
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-400/10 dark:text-red-400"
                >
                  {error}
                </p>
              )}
            </DrawerBody>
            <DrawerFooter>
              <Button variant="primary" type="submit" disabled={submitting}>
                {submitting ? "Issuing…" : "Issue card"}
              </Button>
            </DrawerFooter>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  )
}
