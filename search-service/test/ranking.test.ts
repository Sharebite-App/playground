import { personalizationScore } from "../src/ranking/personalization";
import { buildRankedQuery } from "../src/ranking/signals";
import type { FlavorProfile } from "../src/integrations/db";
import type { RestaurantDoc, GeoPoint } from "../src/types";

const origin: GeoPoint = { lat: 40.74, lon: -73.99 };

function doc(overrides: Partial<RestaurantDoc> = {}): RestaurantDoc {
  return {
    id: "r1",
    name: "Test",
    description: "",
    cuisine: "mexican",
    rating: 4.2,
    cheapest_entree_price_cents: 1200,
    location: { lat: 40.74, lon: -73.99 },
    is_online: true,
    allowed_corporate_ids: ["corp-1"],
    menu_items: [
      { id: "i1", name: "Bowl", price_cents: 1200, dietary_tags: ["vegan"], is_entree: true },
      { id: "i2", name: "Taco", price_cents: 400, dietary_tags: [], is_entree: false },
    ],
    ...overrides,
  };
}

describe("personalizationScore", () => {
  it("returns a neutral prior for cold-start users", () => {
    expect(personalizationScore(null, doc())).toBe(0.5);
  });

  it("boosts a preferred cuisine above neutral and penalizes a disliked one", () => {
    const profile: FlavorProfile = {
      preferredCuisines: ["mexican"],
      dislikedCuisines: [],
      dietaryRestrictions: [],
    };
    const liked = personalizationScore(profile, doc({ cuisine: "mexican" }));
    const disliked = personalizationScore(
      { ...profile, preferredCuisines: [], dislikedCuisines: ["mexican"] },
      doc({ cuisine: "mexican" }),
    );
    expect(liked).toBeGreaterThan(0.5);
    expect(disliked).toBeLessThan(0.5);
    expect(liked).toBeGreaterThan(disliked);
  });

  it("rewards restaurants whose menu satisfies dietary restrictions, continuously", () => {
    const profile: FlavorProfile = {
      preferredCuisines: [],
      dislikedCuisines: [],
      dietaryRestrictions: ["vegan"],
    };
    const halfVegan = personalizationScore(profile, doc()); // 1 of 2 items vegan
    const allVegan = personalizationScore(
      profile,
      doc({
        menu_items: [
          { id: "i1", name: "A", price_cents: 1, dietary_tags: ["vegan"], is_entree: true },
          { id: "i2", name: "B", price_cents: 1, dietary_tags: ["vegan"], is_entree: true },
        ],
      }),
    );
    expect(allVegan).toBeGreaterThan(halfVegan);
  });

  it("clamps to [0, 1]", () => {
    const profile: FlavorProfile = {
      preferredCuisines: [],
      dislikedCuisines: ["mexican"],
      dietaryRestrictions: ["vegan", "halal", "kosher"],
    };
    const score = personalizationScore(profile, doc());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe("buildRankedQuery", () => {
  it("wraps the base query in a function_score that blends all four signals", () => {
    const base = { match_all: {} };
    const ranked = buildRankedQuery(base, origin);
    const fs = ranked.function_score!;
    expect(fs.query).toBe(base);
    // relevance + distance + rating + personalization
    expect(fs.functions).toHaveLength(4);
    const kinds = fs.functions!.map((f) =>
      "gauss" in f ? "gauss" : "field_value_factor" in f ? f.field_value_factor!.field : "weight",
    );
    expect(kinds).toContain("gauss");
    expect(kinds).toContain("rating");
    expect(kinds).toContain("personalization_boost");
  });
});
