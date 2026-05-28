# search-service

Restaurant + menu search for the employee app. When an employee opens the app
at lunch, this service returns a ranked, tenant-scoped list of restaurants with
up to three matching menu items each.

## Responsibilities

- Keyword + filter search over the restaurant catalog
- Geo filtering / distance ranking from the employee's delivery point
- Per-corporate allowlist enforcement (multi-tenant)
- Personalized ranking from the user's flavor profile
- Autocomplete

## Architecture

```
client ──▶ http/server.ts ──▶ search/*.ts ──▶ integrations/elasticsearch.ts ──▶ ES (restaurants_v3)
                                   │
                                   └────────▶ integrations/db.ts ──▶ Postgres (enrichment, allowlist)
```

- **Elasticsearch** (`restaurants_v3`) is the search read model: denormalized
  restaurant documents with a menu summary, geo point, rating, and the
  `allowed_corporate_ids` allowlist. It is rebuilt from Postgres by the
  menu-sync job; search never writes to it.
- **Postgres** is the system of record (`prisma/schema.prisma`) and the source
  for enrichment that isn't worth denormalizing (live delivery ETAs).

### Conventions every search path follows

These are load-bearing — see `search/autocomplete.ts` for the reference shape:

1. **Validate input** with zod at the boundary.
2. **Tenant scope inside the query.** Use `buildTenantFilter(corporateId)` as a
   `filter` clause. Never fetch broadly and filter by corporate in app code —
   that leaks cross-tenant data via counts, latency, and pagination.
3. **Full-text via `multiMatch`**, never `query_string` on raw user input
   (Lucene operator injection).
4. **One timeout-wrapped call** via `searchRestaurantsIndex` — never call
   `esClient.search` directly.
5. **Enrich in batches** (`getDeliveryWindows(ids)`), never one query per hit.
6. **Rank at query time** with `buildRankedQuery` and trust `_score`; do not
   re-sort in application code.
7. **Project to a DTO** with `toRestaurantDTO` before returning — internal
   fields never reach the client.
8. **Degrade, don't 500.** On ES failure fall back via `degradedFallback`.

## Latency budget (p95 < 300ms)

| Stage            | Budget |
|------------------|--------|
| ES query         | ~80ms  |
| Postgres enrich  | ~40ms  |
| Rank + project   | ~30ms  |
| Network / serde  | ~150ms |

## Local development

```bash
npm install
npm run prisma:generate
npm run dev      # ts-node-dev on :8080
npm test
```

Requires a local ES (`ES_NODE`) and Postgres (`DATABASE_URL`). See `src/config.ts`
for all tunables — ranking weights, timeouts, and page caps are env-overridable.
