// Domain and transport types for search.
//
// Three layers, kept deliberately distinct:
//   - RestaurantDoc   : the shape stored in Elasticsearch (internal, denormalized)
//   - RestaurantDTO   : the shape returned to clients (public, projected)
//   - SearchInput/Result : the request/response envelope
//
// The internal doc carries fields the client must never see (tenant allowlist,
// internal scoring inputs). Always project to a DTO before returning — see
// search/dto.ts.

export interface GeoPoint {
  lat: number;
  lon: number;
}

/** Shape of a `restaurants_v3` document's `_source`. Internal. */
export interface RestaurantDoc {
  id: string;
  name: string;
  description: string;
  cuisine: string;
  rating: number;
  cheapest_entree_price_cents: number;
  location: GeoPoint;
  is_online: boolean;
  /** Corporates allowed to see this restaurant. Used as a hard ES filter. */
  allowed_corporate_ids: string[];
  /** Denormalized menu summary for snippet matching. */
  menu_items: Array<{
    id: string;
    name: string;
    price_cents: number;
    dietary_tags: string[];
    is_entree: boolean;
  }>;
}

/** A matching menu item surfaced on a restaurant card. */
export interface MatchedItem {
  id: string;
  name: string;
  priceCents: number;
}

/** Public projection returned to clients. No internal fields. */
export interface RestaurantDTO {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  distanceMeters: number | null;
  deliveryEtaMinutes: number | null;
  matchingItems: MatchedItem[];
}

export interface SearchFilters {
  cuisine?: string[];
  dietary?: string[];
  /** Max cents a user is willing to pay for the cheapest entree. */
  maxPriceCents?: number;
  /** ISO datetime the order must be deliverable by. */
  deliverableBy?: string;
}

export interface SearchInput {
  userId: string;
  corporateId: string;
  origin: GeoPoint;
  query: string;
  filters: SearchFilters;
  /** Opaque cursor for deep pagination; mutually exclusive with `page`. */
  cursor?: string;
  page: number;
  pageSize: number;
}

export interface SearchResult {
  results: RestaurantDTO[];
  /** Count AFTER all filters are applied — must match what the client can page through. */
  total: number;
  nextCursor: string | null;
}
