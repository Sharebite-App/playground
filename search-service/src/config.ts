// Centralized, env-overridable configuration. Nothing in the search path
// should hardcode a tunable — ranking weights, timeouts, and page caps all
// live here so they can be changed without a code deploy.

function numFromEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  es: {
    node: process.env.ES_NODE ?? "http://localhost:9200",
    restaurantIndex: process.env.ES_RESTAURANT_INDEX ?? "restaurants_v3",
    // Hard ceiling on a single ES call. The route-level deadline is shorter;
    // this is the backstop so a stalled shard can't hang a worker.
    requestTimeoutMs: numFromEnv("ES_REQUEST_TIMEOUT_MS", 250),
  },

  search: {
    defaultPageSize: numFromEnv("SEARCH_DEFAULT_PAGE_SIZE", 20),
    maxPageSize: numFromEnv("SEARCH_MAX_PAGE_SIZE", 50),
    // ES `from + size` cannot exceed index.max_result_window (10k). We cap well
    // below that and switch to search_after cursors past this depth.
    maxFromOffset: numFromEnv("SEARCH_MAX_FROM_OFFSET", 1000),
    // How many matching menu items to surface per restaurant card.
    matchingItemsPerCard: numFromEnv("SEARCH_ITEMS_PER_CARD", 3),
  },

  // Relative weights blended into the final document score. Tunable; see
  // ranking/signals.ts for how they're applied via function_score.
  rankingWeights: {
    relevance: numFromEnv("RANK_W_RELEVANCE", 1.0),
    distance: numFromEnv("RANK_W_DISTANCE", 0.6),
    rating: numFromEnv("RANK_W_RATING", 0.3),
    personalization: numFromEnv("RANK_W_PERSONALIZATION", 0.5),
  },

  rateLimit: {
    perUserPerMinute: numFromEnv("RL_PER_USER_PER_MIN", 60),
    perCorporatePerMinute: numFromEnv("RL_PER_CORP_PER_MIN", 1200),
  },
} as const;

export type RankingWeights = typeof config.rankingWeights;
