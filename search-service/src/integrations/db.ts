import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

/**
 * Resolve a corporate's allowlist as a Set for O(1) membership checks.
 * NOTE: this is a defense-in-depth cross-check, not the primary tenant guard —
 * the primary guard is the ES `buildTenantFilter` clause. Returns null if the
 * corporate doesn't exist so callers can fail closed.
 */
export async function getAllowedRestaurantIds(
  corporateId: string,
): Promise<Set<string> | null> {
  const corporate = await prisma.corporate.findUnique({
    where: { id: corporateId },
    include: { allowedRestaurants: { select: { restaurantId: true } } },
  });
  if (!corporate) return null;
  return new Set(corporate.allowedRestaurants.map((a) => a.restaurantId));
}

/**
 * Batch-load delivery ETAs for many restaurants in a single query. Search
 * enrichment must never issue one query per result — pass every restaurant id
 * and look up from the returned Map.
 */
export async function getDeliveryWindows(
  restaurantIds: string[],
): Promise<Map<string, number>> {
  if (restaurantIds.length === 0) return new Map();
  const windows = await prisma.deliveryWindow.findMany({
    where: { restaurantId: { in: restaurantIds } },
    select: { restaurantId: true, etaMinutes: true },
  });
  return new Map(windows.map((w) => [w.restaurantId, w.etaMinutes]));
}

export interface FlavorProfile {
  preferredCuisines: string[];
  dislikedCuisines: string[];
  dietaryRestrictions: string[];
}

export async function getFlavorProfile(
  userId: string,
): Promise<FlavorProfile | null> {
  return prisma.flavorProfile.findUnique({
    where: { userId },
    select: {
      preferredCuisines: true,
      dislikedCuisines: true,
      dietaryRestrictions: true,
    },
  });
}
