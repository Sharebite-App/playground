import type { QueryDslQueryContainer } from "@elastic/elasticsearch/lib/api/types";
import { config } from "../config";
import type { GeoPoint } from "../types";

/**
 * Blend ranking signals into a single ES `function_score` query so that
 * relevance, distance, rating, and personalization are combined AT QUERY TIME
 * and the resulting `_score` is authoritative. Downstream code must sort by
 * `_score` and never re-sort results in application code (that discards the
 * blended ordering).
 *
 * Personalization enters as a precomputed per-restaurant boost field
 * (`personalization_boost`, written by the profile-sync job) plus, optionally,
 * a script that reads a passed-in boost map. Here we use the indexed field so
 * the hot path stays cheap.
 */
export function buildRankedQuery(
  baseQuery: QueryDslQueryContainer,
  origin: GeoPoint,
): QueryDslQueryContainer {
  const w = config.rankingWeights;

  return {
    function_score: {
      query: baseQuery,
      score_mode: "sum",
      boost_mode: "sum",
      functions: [
        // Text relevance: the query's own _score, weighted.
        { weight: w.relevance },
        // Closer is better — Gauss decay over distance.
        {
          weight: w.distance,
          gauss: {
            location: {
              origin: { lat: origin.lat, lon: origin.lon },
              scale: "3km",
              offset: "500m",
              decay: 0.5,
            },
          },
        },
        // Higher rating is better, with diminishing returns.
        {
          weight: w.rating,
          field_value_factor: {
            field: "rating",
            modifier: "sqrt",
            missing: 0,
          },
        },
        // Precomputed personalization boost in [0, 1].
        {
          weight: w.personalization,
          field_value_factor: {
            field: "personalization_boost",
            modifier: "none",
            missing: 0.5,
          },
        },
      ],
    },
  };
}
