import { filterPayments, parseFilters, sortPayments } from "@/data/queries"
import { exportFilename, ExportScope, parseExportColumns, toCsv } from "@/lib/csv"
import { NextRequest, NextResponse } from "next/server"

function parseScope(param: string | null): ExportScope {
  return param === "all" ? "all" : "current"
}

/**
 * Exports the payments table as CSV.
 *
 * Reuses the query builder behind GET /api/payments. `scope=all` drops the
 * status/merchant/search/date filters but keeps sort, so it is still one
 * query path, not a second one. Column names are validated against the
 * allowlist in parseExportColumns before they reach toCsv or the filename.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const filters = parseFilters(params)
  const scope = parseScope(params.get("scope"))
  const columns = parseExportColumns(params.get("columns"))

  if (columns.length === 0) {
    return NextResponse.json(
      { error: "Select at least one column to export." },
      { status: 400 },
    )
  }

  const scopedFilters =
    scope === "all"
      ? { sort: filters.sort, direction: filters.direction }
      : filters

  const rows = sortPayments(
    filterPayments(scopedFilters),
    filters.sort,
    filters.direction,
  )

  return new Response(toCsv(rows, columns), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${exportFilename(scope, filters.status)}"`,
    },
  })
}
