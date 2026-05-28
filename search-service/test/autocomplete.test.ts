import { autocomplete } from "../src/search/autocomplete";
import * as es from "../src/integrations/elasticsearch";
import { logger } from "../src/logger";

jest.mock("../src/integrations/elasticsearch", () => {
  const actual = jest.requireActual("../src/integrations/elasticsearch");
  return {
    ...actual,
    searchRestaurantsIndex: jest.fn(),
    degradedFallback: jest.fn(),
  };
});

const searchMock = es.searchRestaurantsIndex as jest.Mock;
const fallbackMock = es.degradedFallback as jest.Mock;

const validInput = {
  corporateId: "corp-1",
  origin: { lat: 40.74, lon: -73.99 },
  prefix: "swe",
  limit: 5,
};

beforeEach(() => {
  searchMock.mockReset();
  fallbackMock.mockReset();
});

describe("autocomplete", () => {
  it("scopes the ES query to the requesting corporate via a hard filter clause", async () => {
    searchMock.mockResolvedValue({ hits: { hits: [] } });
    await autocomplete(validInput, logger);

    expect(searchMock).toHaveBeenCalledTimes(1);
    const sent = searchMock.mock.calls[0][0];
    const filters = sent.query.bool.filter;
    // The tenant guard must be IN the query, not applied afterwards.
    expect(filters).toContainEqual({ term: { allowed_corporate_ids: "corp-1" } });
    expect(filters).toContainEqual({ term: { is_online: true } });
  });

  it("rejects input that fails validation", async () => {
    await expect(
      autocomplete({ ...validInput, prefix: "" }, logger),
    ).rejects.toThrow();
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("falls back to degraded suggestions when ES throws (never 500s the path)", async () => {
    searchMock.mockRejectedValue(new Error("es unreachable"));
    fallbackMock.mockResolvedValue([{ id: "r9", name: "Cached Spot" }]);

    const out = await autocomplete(validInput, logger);
    expect(fallbackMock).toHaveBeenCalledWith("corp-1", validInput.origin);
    expect(out).toEqual([{ id: "r9", name: "Cached Spot" }]);
  });
});
