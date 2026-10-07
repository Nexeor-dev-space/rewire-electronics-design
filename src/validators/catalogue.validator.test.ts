import { describe, expect, it } from "vitest";
import { SEARCH_QUERY_MAX_LENGTH } from "@/lib/constants";
import { searchSuggestQuerySchema } from "./catalogue.validator";

describe("searchSuggestQuerySchema", () => {
  it("trims the query", () => {
    expect(searchSuggestQuerySchema.parse({ q: "  iphone  " })).toEqual({ q: "iphone" });
  });

  it("rejects a missing query", () => {
    expect(searchSuggestQuerySchema.safeParse({}).success).toBe(false);
  });

  it("rejects a query shorter than two characters after trimming", () => {
    expect(searchSuggestQuerySchema.safeParse({ q: " a " }).success).toBe(false);
  });

  it("accepts a two character query", () => {
    expect(searchSuggestQuerySchema.safeParse({ q: "ip" }).success).toBe(true);
  });

  it("rejects a query over the maximum length", () => {
    const q = "a".repeat(SEARCH_QUERY_MAX_LENGTH + 1);
    expect(searchSuggestQuerySchema.safeParse({ q }).success).toBe(false);
  });
});
