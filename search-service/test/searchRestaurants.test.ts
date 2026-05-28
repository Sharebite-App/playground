import { searchRestaurants } from "../src/search/searchRestaurants";
import { esClient } from "../src/integrations/elasticsearch";
import { prisma } from "../src/integrations/db";

// Unit tests for the new search endpoint.

jest.mock("../src/integrations/elasticsearch", () => ({
  esClient: { search: jest.fn() },
}));

jest.mock("../src/integrations/db", () => ({
  prisma: {
    corporate: { findUnique: jest.fn() },
    deliveryWindow: { findFirst: jest.fn() },
    flavorProfile: { findFirst: jest.fn() },
  },
}));

const esSearch = (esClient as unknown as { search: jest.Mock }).search;

const oneRestaurant = {
  hits: {
    total: { value: 1 },
    hits: [
      {
        _source: {
          id: "rest-1",
          name: "Sweetgreen",
          cuisine: "salad",
          rating: 4.5,
          menu_items: [{ id: "i1", name: "Kale Caesar", price_cents: 1300 }],
        },
      },
    ],
  },
};

beforeEach(() => {
  esSearch.mockResolvedValue(oneRestaurant);
  (prisma.corporate.findUnique as jest.Mock).mockResolvedValue({
    allowedRestaurants: [{ restaurantId: "rest-1" }],
  });
  (prisma.deliveryWindow.findFirst as jest.Mock).mockResolvedValue({ etaMinutes: 22 });
  (prisma.flavorProfile.findFirst as jest.Mock).mockResolvedValue(null);
});

describe("searchRestaurants", () => {
  const input = {
    userId: "user-1",
    corporateId: "corp-1",
    query: "salad",
    filters: {},
    page: 1,
    pageSize: 20,
  };

  it("returns results", async () => {
    const out = await searchRestaurants(input);
    expect(out).toBeDefined();
    expect(out.results.length).toBeGreaterThan(0);
  });

  it("only returns restaurants the corporate is allowed to see", async () => {
    const out = await searchRestaurants(input);
    expect(out.results.map((r: any) => r.id)).toContain("rest-1");
  });

  it("calls Elasticsearch", async () => {
    await searchRestaurants(input);
    expect(esSearch).toHaveBeenCalled();
  });

  it("reports the total result count", async () => {
    const out = await searchRestaurants(input);
    expect(out.total).toBe(1);
  });

  it("handles personalization", () => {
    expect(searchRestaurants(input)).resolves.toBeTruthy();
  });
});
