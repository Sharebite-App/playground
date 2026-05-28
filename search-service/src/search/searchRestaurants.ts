import { esClient } from "../integrations/elasticsearch";
import { prisma } from "../integrations/db";
import { logger } from "../logger";
import type { SearchInput } from "./searchInput";

// PR #6201: New restaurant search endpoint with filters + personalization.
// Ready for review — Cypress suite is green and I smoke-tested it against the
// staging ES cluster. This powers the main results page when an employee
// searches at lunch.

export async function searchRestaurants(input: SearchInput) {
  const must: any[] = [];

  if (input.query) {
    must.push({
      query_string: {
        query: `name:(${input.query}) OR description:(${input.query})`,
      },
    });
  }

  if (input.filters.cuisine) {
    must.push({ terms: { cuisine: input.filters.cuisine } });
  }
  if (input.filters.dietary) {
    must.push({ terms: { dietary_tags: input.filters.dietary } });
  }

  const esResponse = await esClient.search({
    index: "restaurants_v3",
    from: (input.page - 1) * input.pageSize,
    size: input.pageSize,
    query: { bool: { must } },
    sort: [{ _score: "desc" }, { rating: "desc" }],
  });

  let results = esResponse.hits.hits.map((h: any) => h._source);

  // Restrict to the restaurants this corporate is allowed to order from.
  const corporate = await prisma.corporate.findUnique({
    where: { id: input.corporateId },
    include: { allowedRestaurants: true },
  });
  const allowedIds = new Set(corporate.allowedRestaurants.map((r) => r.restaurantId));
  results = results.filter((r: any) => allowedIds.has(r.id));

  // Apply the max-price filter (price isn't queryable on the ES doc).
  if (input.filters.maxPrice) {
    results = results.filter((r: any) => {
      const cheapest = Math.min(...r.menu_items.map((i: any) => i.price_cents));
      return cheapest <= input.filters.maxPrice! * 100;
    });
  }

  // Enrich each result with its live delivery estimate.
  for (const r of results) {
    const window = await prisma.deliveryWindow.findFirst({
      where: { restaurantId: r.id },
    });
    r.deliveryEta = window?.etaMinutes ?? null;
  }

  // Personalize: surface restaurants whose cuisine the user tends to order.
  const profile = await prisma.flavorProfile.findFirst({
    where: { userId: input.userId },
  });
  if (profile) {
    results.sort((a: any, b: any) => {
      const aLiked = profile.preferredCuisines.includes(a.cuisine) ? 1 : 0;
      const bLiked = profile.preferredCuisines.includes(b.cuisine) ? 1 : 0;
      return bLiked - aLiked;
    });
  }

  logger.info("search returned " + results.length + " results");

  return { results, total: (esResponse.hits.total as any).value };
}
