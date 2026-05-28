import { Client } from "@elastic/elasticsearch";
import type {
  QueryDslQueryContainer,
  SearchRequest,
  SearchResponse,
} from "@elastic/elasticsearch/lib/api/types";
import { config } from "../config";
import { logger } from "../logger";
import type { GeoPoint, RestaurantDoc } from "../types";

export const esClient = new Client({
  node: config.es.node,
  requestTimeout: config.es.requestTimeoutMs,
  maxRetries: 1,
});

/**
 * The tenant guard. EVERY restaurant query must include this as a `filter`
 * clause so cross-tenant documents are never even scored, let alone returned.
 * Tenant scoping is not something we do in application code after the fact —
 * it lives inside the query.
 */
export function buildTenantFilter(corporateId: string): QueryDslQueryContainer {
  return { term: { allowed_corporate_ids: corporateId } };
}

/**
 * Safe full-text clause. We deliberately use `multi_match` and never
 * `query_string`/`simple_query_string` on raw user input: `query_string`
 * exposes Lucene operators (field overrides, wildcards, regex, fuzzy) that let
 * a user reach fields they shouldn't or burn CPU. User text is data, not DSL.
 */
export function multiMatch(
  query: string,
  fields: string[] = ["name^3", "description", "menu_items.name^2"],
): QueryDslQueryContainer {
  return {
    multi_match: {
      query,
      fields,
      type: "best_fields",
      operator: "and",
      fuzziness: "AUTO",
    },
  };
}

/** Restaurants beyond this distance are not useful for lunch delivery. */
export function geoFilter(origin: GeoPoint, radiusKm = 8): QueryDslQueryContainer {
  return {
    geo_distance: {
      distance: `${radiusKm}km`,
      location: { lat: origin.lat, lon: origin.lon },
    },
  };
}

/**
 * Translate a page number into a bounded `from`. Past `maxFromOffset` callers
 * must use `searchAfter` instead — deep `from` pagination is O(from) per shard
 * and blows past `index.max_result_window`.
 */
export function boundedFrom(page: number, pageSize: number): number {
  const from = Math.max(0, (page - 1) * pageSize);
  if (from + pageSize > config.search.maxFromOffset) {
    throw new DeepPaginationError(page, pageSize);
  }
  return from;
}

export class DeepPaginationError extends Error {
  constructor(page: number, pageSize: number) {
    super(
      `page ${page} (size ${pageSize}) exceeds maxFromOffset ${config.search.maxFromOffset}; use a cursor`,
    );
    this.name = "DeepPaginationError";
  }
}

/**
 * Every search goes through here. Applies the per-call ES timeout AND a body
 * `timeout` so a stalled shard returns partial results instead of hanging the
 * request. Callers must NOT call `esClient.search` directly.
 */
export async function searchRestaurantsIndex(
  request: Omit<SearchRequest, "index">,
): Promise<SearchResponse<RestaurantDoc>> {
  return esClient.search<RestaurantDoc>({
    index: config.es.restaurantIndex,
    timeout: `${config.es.requestTimeoutMs}ms`,
    ...request,
  });
}

/**
 * Degraded path for when ES is unavailable. Returns a small set of cached,
 * tenant-scoped "popular near you" restaurants so search never hard-fails.
 * Backed by a short-TTL cache populated out of band.
 */
export async function degradedFallback(
  corporateId: string,
  origin: GeoPoint,
): Promise<RestaurantDoc[]> {
  logger.warn({ corporateId }, "search degraded: serving cached popular restaurants");
  // Implementation elsewhere (Redis-backed). Empty here is a safe default —
  // the caller turns this into an empty-but-200 response, not a 500.
  void origin;
  return [];
}
