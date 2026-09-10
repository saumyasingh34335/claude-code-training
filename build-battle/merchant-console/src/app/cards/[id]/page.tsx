import { Divider } from "@/components/Divider"
import { cardById } from "@/data/cards"
import { merchantById } from "@/data/merchants"
import { formatDate, formatInZone } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { cx } from "@/lib/utils"
import Link from "next/link"
import { notFound } from "next/navigation"
import { CardStatusControl } from "../card-status-control"

const CATEGORY_LABELS: Record<string, string> = {
  vendor_subscriptions: "Vendor subscriptions",
  ad_spend: "Ad spend",
  contractor_tools: "Contractor tools",
}

export default async function CardDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const card = cardById(id)
  if (!card) notFound()

  const merchant = merchantById(card.merchantId)
  const percentSpent = card.limit > 0 ? Math.min(100, (card.spend / card.limit) * 100) : 0
  const overEightyPercent = percentSpent > 80

  return (
    <div className="p-4 sm:p-6">
      <Link
        href="/cards"
        className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-50"
      >
        ← All cards
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">
          {card.nickname}
        </h1>
        <CardStatusControl id={card.id} status={card.status} />
      </div>
      <p className="mt-1 font-mono text-sm text-gray-500">•••• {card.last4}</p>

      <Divider />

      <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Merchant">
          {merchant?.name ?? card.merchantId}
          {merchant && <span className="ml-2 text-gray-500">{merchant.country}</span>}
        </Field>
        <Field label="Currency">{card.currency}</Field>
        {card.category && (
          <Field label="Category">{CATEGORY_LABELS[card.category] ?? card.category}</Field>
        )}
        <Field label="Created (UTC)">
          <span className="font-mono text-sm">{card.createdAt}</span>
        </Field>
        <Field label="Created">{formatDate(card.createdAt)}</Field>
        <Field label="Reference">
          <span className="font-mono text-sm text-gray-500">{card.reference}</span>
        </Field>
      </dl>

      <Divider />

      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
        Spend against limit
      </h2>
      <div className="mt-4 max-w-md">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium tabular-nums text-gray-900 dark:text-gray-50">
            {formatMoney(card.spend, card.currency)}
          </p>
          <p className="text-sm text-gray-500">
            of {formatMoney(card.limit, card.currency)} limit
          </p>
        </div>
        <svg
          viewBox="0 0 100 8"
          preserveAspectRatio="none"
          className="mt-2 h-2 w-full"
          role="img"
          aria-label={`${percentSpent.toFixed(0)}% of spend limit used`}
        >
          <rect
            width="100"
            height="8"
            rx="4"
            className="fill-gray-200 dark:fill-gray-800"
          />
          <rect
            width={percentSpent}
            height="8"
            rx="4"
            className={cx(
              "transition-[width]",
              overEightyPercent ? "fill-amber-500" : "fill-emerald-500",
            )}
          />
        </svg>
        {overEightyPercent && (
          <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-500">
            Over 80% of the spend limit.
          </p>
        )}
      </div>

      <Divider />

      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">History</h2>
      <ol className="mt-4 space-y-4">
        {card.history.map((entry, index) => (
          <li key={index} className="flex gap-3">
            <span
              className="mt-1.5 size-2 shrink-0 rounded-full bg-blue-500"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm text-gray-900 dark:text-gray-50">
                {historyLabel(entry.status, index)}
              </p>
              <p className="text-sm text-gray-500">
                {merchant ? formatInZone(entry.at, merchant.timezone) : formatDate(entry.at)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function historyLabel(status: string, index: number): string {
  if (index === 0) return "Issued"
  if (status === "active") return "Reactivated"
  if (status === "frozen") return "Frozen"
  if (status === "cancelled") return "Cancelled"
  return status
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900 dark:text-gray-50">{children}</dd>
    </div>
  )
}
