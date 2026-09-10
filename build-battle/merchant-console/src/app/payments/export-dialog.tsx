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
import { DEFAULT_EXPORT_COLUMNS, EXPORT_COLUMNS, ExportColumn } from "@/lib/csv"
import { Download } from "lucide-react"
import { useEffect, useState } from "react"

const COLUMN_LABELS: Record<ExportColumn, string> = {
  id: "Payment ID",
  created_at: "Date",
  merchant: "Merchant",
  description: "Description",
  status: "Status",
  method: "Method",
  card_brand: "Card brand",
  last4: "Card last 4",
  amount: "Amount",
  currency: "Currency",
}

type Scope = "current" | "all"

export function ExportDialog({ query }: { query: string }) {
  const [open, setOpen] = useState(false)
  const [columns, setColumns] = useState<Set<ExportColumn>>(
    () => new Set(DEFAULT_EXPORT_COLUMNS),
  )
  const [scope, setScope] = useState<Scope>("current")
  const [counts, setCounts] = useState<{ current?: number; all?: number }>({})

  useEffect(() => {
    if (!open) return

    let cancelled = false
    async function loadCounts() {
      const [current, all] = await Promise.all([
        fetch(`/api/payments?${query}`).then((r) => r.json()),
        fetch(`/api/payments`).then((r) => r.json()),
      ])
      if (!cancelled) {
        setCounts({ current: current.total, all: all.total })
      }
    }
    loadCounts()
    return () => {
      cancelled = true
    }
  }, [open, query])

  function toggleColumn(column: ExportColumn) {
    setColumns((prev) => {
      const next = new Set(prev)
      if (next.has(column)) next.delete(column)
      else next.add(column)
      return next
    })
  }

  const exportParams = new URLSearchParams(query)
  exportParams.set("scope", scope)
  exportParams.set(
    "columns",
    EXPORT_COLUMNS.filter((column) => columns.has(column)).join(","),
  )
  const rowCount = scope === "all" ? counts.all : counts.current

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="secondary" className="w-full gap-2 py-1.5 sm:w-fit">
          <Download
            className="-ml-0.5 size-4 shrink-0 text-gray-400 dark:text-gray-600"
            aria-hidden="true"
          />
          Export
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Export payments</DrawerTitle>
          <DrawerDescription>
            Choose which columns to include and how much of the table to export.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerBody className="flex flex-col gap-6">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Columns
            </legend>
            {EXPORT_COLUMNS.map((column) => (
              <label
                key={column}
                className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  className="size-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500 dark:border-gray-700"
                  checked={columns.has(column)}
                  onChange={() => toggleColumn(column)}
                />
                {COLUMN_LABELS[column]}
                {column === "last4" && (
                  <span className="text-xs text-gray-400">off by default</span>
                )}
              </label>
            ))}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Scope
            </legend>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="export-scope"
                className="size-4 border-gray-300 text-blue-500 focus:ring-blue-500 dark:border-gray-700"
                checked={scope === "current"}
                onChange={() => setScope("current")}
              />
              Current filter
              <span className="text-xs text-gray-400">
                {counts.current === undefined
                  ? "…"
                  : `${counts.current.toLocaleString()} rows`}
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="radio"
                name="export-scope"
                className="size-4 border-gray-300 text-blue-500 focus:ring-blue-500 dark:border-gray-700"
                checked={scope === "all"}
                onChange={() => setScope("all")}
              />
              All payments
              <span className="text-xs text-gray-400">
                {counts.all === undefined ? "…" : `${counts.all.toLocaleString()} rows`}
              </span>
            </label>
          </fieldset>
        </DrawerBody>
        <DrawerFooter>
          <Button
            variant="primary"
            className="gap-2"
            disabled={columns.size === 0}
            asChild={columns.size > 0}
          >
            {columns.size > 0 ? (
              <a href={`/api/payments/export?${exportParams.toString()}`}>
                Download{rowCount !== undefined ? ` (${rowCount.toLocaleString()})` : ""}
              </a>
            ) : (
              <span>Download</span>
            )}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
