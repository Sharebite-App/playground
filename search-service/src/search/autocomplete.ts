import { z } from "zod";
import type { Logger } from "../logger";
import {
  buildTenantFilter,
  degradedFallback,
  searchRestaurantsIndex,
} from "../integrations/elasticsearch";
import type { GeoPoint } from "../types";

// Existing, reviewed endpoint. Kept here as the reference for how a search
// path in this service is expected to look: validated input, tenant filter
// inside the query, the shared timeout wrapper, a degraded fallback, and a
// projected response. New endpoints should follow the same shape.

const autocompleteInput = z.object({
  corporateId: z.string().min(1),
  origin: z.object({ lat: z.number(), lon: z.number() }),
  prefix: z.string().min(1).max(64),
  limit: z.number().int().min(1).max(10).default(8),
});

export type AutocompleteInput = z.infer<typeof autocompleteInput>;

export interface AutocompleteSuggestion {
  id: string;
  name: string;
}

export async function autocomplete(
  raw: unknown,
  log: Logger,
): Promise<AutocompleteSuggestion[]> {
  const input = autocompleteInput.parse(raw);

  try {
    const res = await searchRestaurantsIndex({
      size: input.limit,
      _source: ["id", "name"],
      query: {
        bool: {
          // Tenant scope is a hard filter inside the query — never post-filtered.
          filter: [buildTenantFilter(input.corporateId), { term: { is_online: true } }],
          must: [
            {
              match_phrase_prefix: {
                "name.autocomplete": { query: input.prefix },
              },
            },
          ],
        },
      },
    });

    return res.hits.hits
      .map((h) => h._source)
      .filter((s): s is NonNullable<typeof s> => Boolean(s))
      .map((s) => ({ id: s.id, name: s.name }));
  } catch (err) {
    log.error({ err }, "autocomplete failed; serving degraded suggestions");
    const fallback = await degradedFallback(input.corporateId, input.origin as GeoPoint);
    return fallback.slice(0, input.limit).map((d) => ({ id: d.id, name: d.name }));
  }
}
