# SPEC · NWP-201 — Issue virtual cards from the console

> Written before any code.
> Load it as context when you build: `@docs/specs/NWP-201-issue-cards.md`

**Ticket:** [NWP-201](../tickets/NWP-201.md)
**Author:** Pupu (with Claude)
**Status:** draft

## Problem

Ops issues virtual cards by messaging the platform team, who create them by hand. It takes hours, happens 12–20 times a week, and last month two cards went out with the wrong spend limit because the request lived in a Slack thread instead of a form. Marcus wants ops able to issue a card, see what's been issued, and open one to check it — today, in the console, with no round trip to another team.

## Current state

Nothing card-related exists yet. This is greenfield inside an established codebase:

- `src/data/types.ts` — has `Currency` ("USD"|"EUR"|"GBP"), `Merchant`, `Payment`, etc. No `Card` type.
- `src/data/store.ts` — in-memory `Store` interface (`merchants`, `payments`, `refunds`, `disputes`, `payouts`), held on `globalThis.__northwindStore`. No `cards` array.
- `src/data/merchants.ts` — 10 fixed fictional merchants, each with `id`, `name`, `currency`. No category field — the ticket's "merchant category lock" stretch is a spend-purpose category chosen at issue time, not a merchant attribute (merchants don't have one).
- `src/app/api/` — every existing route is a `GET`. There is no `POST` anywhere in this codebase yet; card creation is the first write path.
- `src/components/` — `Button`, `Input`, `Select`, `Badge`, `Drawer` (Radix Dialog under a slide-over skin, already used for the export options dialog in NWP-101) exist. There is no dedicated `Dialog.tsx` — `Drawer` is the dialog primitive in this codebase.
- `src/components/ui/payments/StatusBadge.tsx` — a generic status-badge component keyed by a status union (`PaymentStatus | DisputeStatus | PayoutStatus`), with `LABELS`/`DOTS`/`VARIANTS` maps. Built to be extended, not duplicated.
- `src/app/payments/page.tsx` — the pattern for a list route: a server component calling a data function directly (`queryPayments`), not fetching its own API route. The API routes exist for client-side needs (the export dialog fetches `/api/payments` for counts).
- `src/app/siteConfig.ts` + `src/components/ui/navigation/AppSidebar.tsx` — nav is config-driven (`siteConfig.baseLinks`); there's no `/cards` entry, so the page would be unreachable from the sidebar without adding one.
- `build-battle/merchant-console/.claude/rules/cards.md` already exists (written ahead of this ticket) and is the authority on card rules: test BIN + Luhn, generate server-side, reveal once, mask everywhere else as `•••• 4242`, state machine `active ⇄ frozen` → `cancelled` (terminal), guarded server-side, spend limits follow the money rule. It only loads when a `card*.ts`/`card*.tsx`/`cards/**` file is open, so file naming has to match its glob for the rule to actually apply while building.

## Domain rules

| Rule | Source | What breaks if ignored |
| --- | --- | --- |
| Money is integer minor units, formatted once at the edge | `CLAUDE.md`, ticket rule #1 | A `$250.00` limit stored as `250.00` or `"$250"` drifts the moment it's compared or summed |
| Full card number is never stored, never re-readable after creation | `cards.md`, ticket rule #2 | A masked-everywhere-else promise is broken by one stray field on the `Card` record |
| Status is a state machine: `active ⇄ frozen`, either → `cancelled`, `cancelled` terminal, guarded server-side | `cards.md`, ticket rule #3 | A client-only guard lets a direct API call resurrect a cancelled card |
| Every generated number starts `4242`, valid Luhn check digit | `cards.md`, ticket rule #4 | A number that fails Luhn or uses a different BIN could pass for a real card pattern |
| One query builder per entity; a second implementation is a defect | `CLAUDE.md` (stated for payments; the same discipline applies here) | Card list/detail/status logic drifts if scattered across routes instead of one `src/data/cards.ts` |
| Validate on the server; client checks are UX, never enforcement | `api-routes.md`, ticket rule (validation criterion) | A crafted request bypasses the merchant/limit/currency checks entirely |

## Approach

Build cards as their own small vertical slice, mirroring the shape merchants/payments already use rather than inventing a new pattern: a `Card` type, a `src/data/cards.ts` module as the one place that reads/writes the store (the cards analog of `queries.ts`), two `src/lib/` helpers with tests beside them (`cardNumber.ts` for generation/Luhn, `cardStatus.ts` for the transition guard), two API routes (`POST/GET /api/cards`, `POST /api/cards/[id]/status`), and two pages (`/cards` list, `/cards/[id]` detail) plus a create dialog reusing `Drawer`. `StatusBadge` gets extended to cover `CardStatus` rather than duplicated.

**Considered and rejected:** putting card reads/writes directly in the API route handlers, the way a first draft might. Rejected because the ticket explicitly grades "no second query builder," and route handlers that touch the store directly are exactly how that discipline erodes — every future card feature (freeze from the list, NWP-202's limit edit) would either duplicate the transition/validation logic or reach back into a route file to reuse it. One `src/data/cards.ts` module, called from routes and from the server-rendered pages alike, keeps it in one place.

**Considered and rejected:** storing `spend` as anything other than a static `0` at creation. There's no transaction engine in scope this ticket (real card network calls are explicitly out), so any nonzero seeded spend would be fabricated data with no code producing it. The core criterion ("shows its full record and its spend against the limit") is satisfied by rendering real integer-minor-unit data — it just happens to always be zero today. Honest over decorative.

## File map

| File | Add or change | Why |
| --- | --- | --- |
| `src/data/types.ts` | change | Add `CardStatus`, `CardCategory`, `Card` |
| `src/data/store.ts` | change | Add `cards: Card[]` to `Store`, init to `[]` |
| `src/data/cards.ts` | add | The one place that reads/writes cards: `listCards`, `cardById`, `createCard`, `setCardStatus` |
| `src/lib/cardNumber.ts` | add | `luhnCheckDigit`, `isValidLuhn`, `generateCardNumber` (BIN `424242` + random + check digit) |
| `src/lib/cardNumber.test.ts` | add | Stretch: unit tests on the generator — cheapest stretch, first tie-break |
| `src/lib/cardStatus.ts` | add | `canTransition(from, to)` — the state-machine guard, called server-side |
| `src/lib/cardStatus.test.ts` | add | Stretch: unit tests on every legal/illegal transition |
| `src/app/api/cards/route.ts` | add | `GET` (list, for client-side use) + `POST` (create, fully validated) |
| `src/app/api/cards/[id]/status/route.ts` | add | `POST` status transition, guarded by `canTransition`, 409 on illegal move |
| `src/app/cards/page.tsx` | add | Card list (core): nickname, merchant, masked number, limit, status, created date. Written empty state. |
| `src/app/cards/issue-card-dialog.tsx` | add | Client component: create form → one-time reveal success screen. Written error state on a rejected submission. |
| `src/app/cards/[id]/page.tsx` | add | Card detail (core): full record, spend vs. limit, category if set |
| `src/app/cards/[id]/status-control.tsx` | add | Stretch: freeze/unfreeze client component, no reload |
| `src/components/ui/payments/StatusBadge.tsx` | change | Widen `AnyStatus` and its three maps to cover `CardStatus`, instead of a parallel badge component |
| `src/app/siteConfig.ts` | change | Add `cards: "/cards"` to `baseLinks` |
| `src/components/ui/navigation/AppSidebar.tsx` | change | Add a "Cards" nav entry so the page is reachable |

## Plan

Server side first, in an order where each step is independently checkable before the next begins.

1. **Types + store** (`types.ts`, `store.ts`) — done when: `tsc --noEmit` passes with the new `Card` shape and an empty `cards: []` in the store.
2. **`cardNumber.ts` + its test** — done when: `npx vitest run src/lib/cardNumber.test.ts` passes: every generated number is 16 digits, starts `424242`, passes `isValidLuhn`, and `last4` matches its own tail.
3. **`cardStatus.ts` + its test** — done when: `npx vitest run src/lib/cardStatus.test.ts` passes for all 3×3 from/to pairs (2 legal from `active`, 2 from `frozen`, 0 from `cancelled`).
4. **`src/data/cards.ts`** (`listCards`, `cardById`, `createCard`, `setCardStatus`) — done when: a scratch script or the route below can create a card and read it back from the store.
5. **`POST/GET /api/cards`** with full server-side validation (missing merchant, limit ≤ 0, limit > 5,000,000, currency outside USD/EUR/GBP) — done when: `curl` against the running dev server proves each rejection returns 400 with a message, and a valid request returns 201 with the full number in the body and nothing but `last4` in the stored-shape echo.
6. **Stop and read the diff.** Confirm: integer minor units throughout, no full number anywhere but the one response, transitions guarded server-side, no second data-access path for cards.
7. **`/cards` page** (list, empty state) — done when: it renders real (empty, then populated) data from `listCards()`.
8. **`issue-card-dialog.tsx`** (form → one-time reveal) — done when: issuing a card in the browser shows the full number once, and a page refresh afterward shows only `•••• last4` in the list.
9. **`/cards/[id]` page** (detail, spend vs. limit) — done when: opening a freshly issued card shows its record and `$0.00 of <limit>`.
10. **`StatusBadge` extended**, nav entry added — done when: cards render a badge without a new component, and `/cards` is reachable from the sidebar.
11. **Stretch, in tie-break order:** tests are already done by step 2–3. Then freeze/unfreeze (`status-control.tsx` + the status route), then the spend-progress bar (amber past 80%) on the detail page, then the category field end-to-end (type → form → validation → detail display).
12. **`/ship-ready`, `org-standards` review, `/northwind-pr`, then `/submit`** — repeat `/submit` after any later fix; the pre-push hook re-runs `npm test`/`npm run build` on every push regardless.

## Verification

| Acceptance criterion | How it is proven |
| --- | --- |
| Issue a card via a form; it appears in the list | Manual: submit the dialog, see the row in `/cards` without a manual refresh |
| `/cards` list: nickname, merchant, masked number, limit, status, created date | Manual read of the rendered table |
| Card detail: full record + spend vs. limit | Manual: open a card, see `$0.00 of $<limit>` |
| Generated numbers, server-side, `4242` BIN, valid Luhn | `src/lib/cardNumber.test.ts` |
| Reveal once, mask forever | Manual: full number shown once on success; `curl GET /api/cards` and the stored `Card` shape never contain it, only `last4` |
| Server-side validation (missing merchant, ≤0 limit, >5,000,000 limit, bad currency) | `curl` against `POST /api/cards` for each rejection case, each returning 400 |
| Freeze/unfreeze without reload (stretch) | Manual: click in the list/detail, network tab shows no navigation |
| Spend-progress bar, amber past 80% (stretch) | Manual, or a quick fixture card with `spend` near the limit |
| Category lock (stretch) | Manual: set at issue time, shown on detail, immutable after |
| Luhn + status-transition tests (stretch) | `npm test` output, named tests |
| Written empty/error states (stretch) | Manual: empty `/cards`, and a rejected submission in the dialog |

## Risks

- **Dev-server module caching.** `store.ts` is held on `globalThis` so Fast Refresh doesn't reset it. Adding a new `cards` field to that cached object means a dev server already running from before this change needs a restart, or `store.cards` will be `undefined` at runtime. Restart the dev server once, right after step 1.
- **`StatusBadge` widening** touches a file shared with payments/disputes/payouts. Low risk (additive to existing `Record` maps), but worth a fast visual check on `/payments` after the change to confirm nothing shifted.
- **Time.** 45 minutes for 6 core criteria plus rules plus five possible stretch goals is tight. If time runs out mid-stretch, stop at the end of a completed stretch item, not mid-way through one — a half-built freeze button that sometimes 500s costs more than not having it.

## Out of scope

- Persistence (NWP-203), auth/roles, real card network calls, editing a limit after issue (NWP-202) — per the ticket, explicitly.
- Any seeded/fabricated spend history — no transaction engine exists to produce it honestly.
- Enforcing the category against anything (no transactions to categorize) — it's a label chosen at issue time and displayed, nothing more, if built at all.

## Open questions

- None blocking. If merchant currency and requested card currency are allowed to differ (e.g., a USD card on a GBP merchant), the ticket doesn't say either way — defaulting to allowing any of the three valid currencies regardless of merchant, since nothing in the rules ties them together and adding that constraint would be scope not asked for.
