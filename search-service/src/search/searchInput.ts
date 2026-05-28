// Input for the new restaurant search endpoint (PR #6201).

export interface SearchInput {
  userId: string;
  corporateId: string;
  query: string;
  filters: {
    cuisine?: string[];
    maxPrice?: number; // dollars
    dietary?: string[];
    deliverableBy?: string; // ISO datetime, e.g. "2026-05-28T12:30"
  };
  page: number;
  pageSize: number;
}
