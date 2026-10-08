import { describe, expect, it } from "vitest";
import { SEARCH_QUERY_MAX_LENGTH } from "@/lib/constants";
import { searchSuggestionsQuerySchema } from "./catalogue.validator";

describe("searchSuggestionsQuerySchema", () => {
  it("trims the query", () => {
    expect(searchSuggestionsQuerySchema.parse({ q: "  iphone  " })).toEqual({ q: "iphone" });
  });

  it("turns a missing query into an empty one", () => {
    expect(searchSuggestionsQuerySchema.parse({})).toEqual({ q: "" });
  });

  it("turns a query over the maximum length into an empty one", () => {
    const q = "a".repeat(SEARCH_QUERY_MAX_LENGTH + 1);
    expect(searchSuggestionsQuerySchema.parse({ q })).toEqual({ q: "" });
  });

  it("keeps a query at the maximum length", () => {
    const q = "a".repeat(SEARCH_QUERY_MAX_LENGTH);
    expect(searchSuggestionsQuerySchema.parse({ q })).toEqual({ q });
  });
});
