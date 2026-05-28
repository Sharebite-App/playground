# Variant C — Live PR Review Answer Key

> **Reviewer-only. Do NOT share with the candidate, and do NOT push this file to
> the candidate-facing branches (`ai-eng-base` / `ai-eng-feature`).** It lives on
> `ai-eng` with the rest of the interview kit.

This is the answer key for the *realized* version of Variant C's Part 1B — a real
GitHub PR the candidate reviews in situ, instead of the inline snippet in
[variant-c-search-discovery.md](variant-c-search-discovery.md). The severity
philosophy, rubric guidance, and Part 2 bridge in that file still apply; this key
just maps the findings to actual `file:line` locations and adds the bad-test signal.

## Setup

- **PR under review:** `ai-eng-feature` → `ai-eng-base` — https://github.com/Sharebite-App/playground/pull/2
- **Base branch** (`ai-eng-base`) is the existing, *clean* search service. It ships
  the correct helpers and the reference endpoint (`search/autocomplete.ts`) plus a
  README documenting the house conventions. Encourage the candidate to read it —
  most blockers are the new endpoint **ignoring a helper the base already provides**.
- **The diff** is four files: `searchRestaurants.ts` (new), `searchInput.ts` (new),
  `routes.ts` (modified), `searchRestaurants.test.ts` (new).
- The candidate can clone and read but the project is **not wired to run** — this is
  a read-and-react review, ~20–30 min.

## How to run it

1. Point the candidate at the PR (or `git diff ai-eng-base...ai-eng-feature`).
2. Setup line: *"This is in your review queue. Tell me what you'd block on, what's a
   nit, and what you'd want to discuss before approving."*
3. Let them drive. The base README + `autocomplete.ts` are fair game and a strong
   candidate will use them to anchor "we already do this correctly over here."
4. Use the Part 2 bridge from the main variant file once they've surfaced the
   tenant-leak and injection findings.

## Findings map (severity: B blocker / M major / N nit)

All 16 from the original snippet are present; line numbers are in
`search-service/src/search/searchRestaurants.ts` unless noted. The base provides the
correct tool for each blocker — named in the "should have used" column.

| # | Finding | Where | Sev | Should have used |
|---|---|---|---|---|
| 1 | **`query_string` injection** — raw user input interpolated into a Lucene `query_string`; user can reach arbitrary fields, run wildcards/regex, burn CPU. | L16–18 | **B** | `multiMatch()` |
| 2 | **Tenant filter applied AFTER fetch** — ES is queried with no corporate scope, then results are filtered in app by the Postgres allowlist. Leaks cross-tenant data via counts/latency/pagination, and the leaked docs even carry `allowed_corporate_ids`. | L29–35 query, L40–45 filter | **B** | `buildTenantFilter()` as a `filter` clause |
| 3 | **Unbounded `from`/`size` pagination** — `from = (page-1)*pageSize` with no cap; deep pages blow past `index.max_result_window` (10k) and are O(from) per shard. | L31 | **B** | `boundedFrom()` / cursor |
| 4 | **`total` is wrong** — returns the raw ES hit total while app-side filters (allowlist, max-price) drop results. Breaks pagination math. | L77 | **B** | count after filtering / filter in-query |
| 5 | **N+1 delivery enrichment** — one `findFirst` per result inside a loop. | L56–61 | **M** | `getDeliveryWindows(ids)` |
| 6 | **Max-price computed app-side over ALL menu items** — `Math.min` includes non-entree sides, so a $1 drink makes an expensive place pass. Should range-filter on the indexed `cheapest_entree_price_cents`. | L49–52 | **M** | indexed `cheapest_entree_price_cents` + ES range filter |
| 7 | **No timeout on the ES call** — `esClient.search` called directly; a stalled shard hangs the request. | L29 | **M** | `searchRestaurantsIndex()` (timeout-wrapped) |
| 8 | **No fallback when ES is down** — no try/catch; the endpoint just 500s. | whole fn (L29) | **M** | `degradedFallback()` |
| 9 | **Raw `_source` returned to client** — couples the public API to the internal index schema and leaks internal fields (incl. `allowed_corporate_ids`). | L37, L77 | **M** | `toRestaurantDTO()` |
| 10 | **Binary personalization post-sort** — re-sorts results 1/0 on "cuisine liked," discarding the ES `_score` (relevance, distance, rating all lost). | L68–72 | **M** | `buildRankedQuery()` (query-time blend) |
| 11 | **No rate limiting on `/search`** — route registered without the `rateLimit()` middleware that `/autocomplete` uses; abusable, esp. with the injection vector. | `routes.ts` L23 | **M** | `rateLimit()` middleware |
| 12 | **`corporate` may be `null`** — `findUnique` can return null; `corporate.allowedRestaurants` then throws (and there's no auth check the corporate matches the user). | L40–44 | **M** | null-check / fail closed |
| 13 | **`deliverableBy` filter declared but never used** — dead input; the advertised filter silently does nothing. | declared `searchInput.ts` L11 | **M** | implement or remove |
| 14 | **`Math.min(...[])` → `Infinity`** — a restaurant with an empty `menu_items` passes the max-price filter (and if `menu_items` is absent, `.map` throws). | L50 | **M** | guard empty / use indexed field |
| 15 | **No tracing / metrics** — single string-concatenated info log with no `correlationId` (the per-request `req.log` is never threaded in) and no latency/error metrics. | L75 | **N** | `req.log` child logger + metrics |
| 16 | **Misleading unit test (false confidence)** — see below. Arguably worse than no test. | `searchRestaurants.test.ts` | **M** | real coverage |

## Finding #16 — the bad test (call out each anti-pattern)

The PR ships `test/searchRestaurants.test.ts` that *looks* like coverage but isn't. A
strong reviewer should say **"this is worse than no test — it greenlights two of the
blockers."** Anti-patterns planted:

1. **Vacuous tenant test.** `"only returns restaurants the corporate is allowed to
   see"` — the fixture only ever contains `rest-1`, which *is* in the allowlist. It
   never includes a foreign-corporate restaurant, so the assertion passes whether or
   not the filter works. **It cannot catch finding #2**, the bug it names.
2. **Over-mocking.** ES and every Prisma call are stubbed; the tests assert "a result
   came back" / "the mock was called," never real filtering, ranking, or `total`.
3. **Happy-path only.** No cases for injection input, `maxPrice`, empty `menu_items`,
   a `null` corporate, or deep pagination — every blocker branch is untested.
4. **Floating promise.** `"handles personalization"` does
   `expect(searchRestaurants(input)).resolves.toBeTruthy()` with no `await`/`return`,
   so Jest may finish before the assertion runs — it passes vacuously.
5. **Enshrines a bug.** `"reports the total result count"` asserts `total` equals the
   raw ES total — codifying finding #4 (wrong total) as "expected" so a future fix
   would "break" this test.

Contrast with the base's good tests (`test/autocomplete.test.ts`,
`test/ranking.test.ts`): the autocomplete test asserts the tenant filter is *in the
query* and exercises the degraded-fallback path on ES error. A candidate who points
to those as the bar is showing strong testing instincts.

## Bonus findings (beyond the original 16 — treat as upside)

- **`is_online` never filtered** — offline restaurants (POS unreachable) surface in
  results; the base filters `is_online` in autocomplete and the doc carries the field.
- **No input validation** — `req.body` flows straight into the handler with no zod
  schema, unlike every other path in the service.
- **Diverges from the canonical `SearchInput`** in `types.ts` (no `origin`, dollars
  instead of cents) — redefines its own input type rather than reusing the domain type.
- **Mutates the ES `_source`** (`r.deliveryEta = …`) — writes onto the internal doc
  shape rather than building a DTO.

## Scoring

Use [scoring-rubric.md](scoring-rubric.md). For Part 1B specifically:
- **Strong:** raises ≥3 of B1–B4 unprompted (esp. injection #1 and tenant-leak #2),
  frames severity rather than listing flat, *and* flags the test as false confidence
  (#16) — bonus for connecting "the base already provides `buildTenantFilter` /
  `searchRestaurantsIndex` and this PR ignored them."
- **OK:** spots the N+1 (#5) and pagination (#3) and the missing-fallback (#8), but
  misses the security-flavored bugs (#1/#2) or trusts the test.
- **Weak:** focuses on `any` types / the string-concat log / magic strings and misses
  the data-leak and injection.
