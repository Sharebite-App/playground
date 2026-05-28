import type { FlavorProfile } from "../integrations/db";
import type { RestaurantDoc } from "../types";

/**
 * Continuous personalization score in [0, 1] for one restaurant given a user's
 * flavor profile. This is NOT a binary like/dislike — a hard 0/1 collapses the
 * ranking into two buckets and throws away relevance ordering within each.
 *
 * Signals, blended:
 *   +  cuisine is in the user's preferred set
 *   -  cuisine is in the user's disliked set
 *   +  fraction of the menu that satisfies the user's dietary restrictions
 */
export function personalizationScore(
  profile: FlavorProfile | null,
  doc: RestaurantDoc,
): number {
  if (!profile) return 0.5; // neutral prior for cold-start users

  let score = 0.5;

  if (profile.preferredCuisines.includes(doc.cuisine)) score += 0.3;
  if (profile.dislikedCuisines.includes(doc.cuisine)) score -= 0.4;

  if (profile.dietaryRestrictions.length > 0 && doc.menu_items.length > 0) {
    const satisfying = doc.menu_items.filter((item) =>
      profile.dietaryRestrictions.every((r) => item.dietary_tags.includes(r)),
    ).length;
    score += 0.2 * (satisfying / doc.menu_items.length);
  }

  return clamp01(score);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
