import { merchantById } from "@/data/merchants"
import { Payment, PaymentStatus } from "@/data/types"
import { formatMoney } from "./money"

/**
 * CSV export for the payments table.
 *
 * Ops picks the column set and the scope (NWP-101). Column names arrive from
 * the client as a comma-separated list, so parseExportColumns is the
 * allowlist gate — nothing past it reaches toCsv or a filename unvalidated.
 */

export const EXPORT_COLUMNS = [
  "id",
  "created_at",
  "merchant",
  "description",
  "status",
  "method",
  "card_brand",
  "last4",
  "amount",
  "currency",
] as const

export type ExportColumn = (typeof EXPORT_COLUMNS)[number]

/** Every column except the card last four, which ops must opt into. */
export const DEFAULT_EXPORT_COLUMNS = EXPORT_COLUMNS.filter(
  (column) => column !== "last4",
)

function isExportColumn(value: string): value is ExportColumn {
  return (EXPORT_COLUMNS as readonly string[]).includes(value)
}

/**
 * Validates the client-supplied `columns` param against the allowlist.
 *
 * `null` (no param) means "not specified" and returns the default set.
 * Anything else — including an empty string — returns only the requested
 * columns that are actually valid, deduped, in the order given. A selection
 * that resolves to nothing is returned as `[]` rather than falling back to
 * the default, so the caller can tell "unspecified" from "chose none."
 */
export function parseExportColumns(param: string | null): ExportColumn[] {
  if (param === null) return [...DEFAULT_EXPORT_COLUMNS]

  const seen = new Set<ExportColumn>()
  for (const raw of param.split(",")) {
    const trimmed = raw.trim()
    if (isExportColumn(trimmed)) seen.add(trimmed)
  }
  return [...seen]
}

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function cell(payment: Payment, column: ExportColumn): string {
  switch (column) {
    case "id":
      return payment.id
    case "created_at":
      return payment.createdAt
    case "merchant":
      return merchantById(payment.merchantId)?.name ?? payment.merchantId
    case "description":
      return payment.description
    case "status":
      return payment.status
    case "method":
      return payment.method
    case "card_brand":
      return payment.cardBrand ?? ""
    case "last4":
      return payment.last4 ?? ""
    case "amount":
      return formatMoney(payment.amount, payment.currency)
    case "currency":
      return payment.currency
  }
}

export function toCsv(
  payments: Payment[],
  columns: readonly ExportColumn[] = EXPORT_COLUMNS,
): string {
  const header = columns.join(",")
  const rows = payments.map((payment) =>
    columns.map((column) => escapeCell(cell(payment, column))).join(","),
  )
  return [header, ...rows].join("\n")
}

export type ExportScope = "current" | "all"

/**
 * `scope: "all"` labels the file "all"; `scope: "current"` labels it with
 * the active status filter, or "filtered" when the status filter is "all"
 * (or unset) but some other filter narrowed the rows.
 */
export function exportFilename(
  scope: ExportScope,
  status: PaymentStatus | "all" | undefined,
  date = new Date(),
): string {
  const label =
    scope === "all" ? "all" : status && status !== "all" ? status : "filtered"
  return `payments-${label}-${date.toISOString().slice(0, 10)}.csv`
}
