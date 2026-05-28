import { config } from "../config";
import type { GeoPoint, MatchedItem, RestaurantDoc, RestaurantDTO } from "../types";

/**
 * Project an internal ES document into the public DTO. This is the ONLY place
 * a `RestaurantDoc` is allowed to become client-facing — it drops internal
 * fields (`allowed_corporate_ids`, raw scoring inputs) and shapes the menu down
 * to the matching items we surface on a card.
 *
 * Keeping this projection in one function is what lets us evolve the index
 * schema without leaking internal fields or breaking the public contract.
 */
export function toRestaurantDTO(
  doc: RestaurantDoc,
  opts: {
    origin: GeoPoint;
    deliveryEtaMinutes: number | null;
    matchingItems: MatchedItem[];
  },
): RestaurantDTO {
  return {
    id: doc.id,
    name: doc.name,
    cuisine: doc.cuisine,
    rating: doc.rating,
    distanceMeters: haversineMeters(opts.origin, doc.location),
    deliveryEtaMinutes: opts.deliveryEtaMinutes,
    matchingItems: opts.matchingItems.slice(0, config.search.matchingItemsPerCard),
  };
}

function haversineMeters(a: GeoPoint, b: { lat: number; lon: number }): number {
  const R = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
