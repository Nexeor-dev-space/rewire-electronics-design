import { describe, expect, it } from "vitest";
import { hasShopQuery } from "./catalogue";

describe("hasShopQuery", () => {
  it("is false for a clean listing", () => {
    expect(hasShopQuery({})).toBe(false);
  });

  it("ignores tracking and unknown parameters", () => {
    expect(hasShopQuery({ utm_source: "newsletter", fbclid: "x" })).toBe(false);
  });

  it("is true for any filter, sort, search or page", () => {
    for (const key of ["q", "category", "condition", "grade", "brand", "storage", "price", "sort", "page", "pageSize"]) {
      expect(hasShopQuery({ [key]: "x" })).toBe(true);
    }
  });

  it("counts a repeated parameter", () => {
    expect(hasShopQuery({ brand: ["apple", "samsung"] })).toBe(true);
  });

  it("skips a key with no value", () => {
    expect(hasShopQuery({ brand: undefined })).toBe(false);
  });
});
