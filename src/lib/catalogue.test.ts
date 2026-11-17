import { describe, expect, it } from "vitest";
import { hasShopQuery, withChildCounts } from "./catalogue";

describe("withChildCounts", () => {
  it("adds each child's products to its parent and leaves children alone", () => {
    const counts = withChildCounts([
      { slug: "phones", name: "Phones", parentSlug: null, count: 1 },
      { slug: "iphone", name: "iPhone", parentSlug: "phones", count: 3 },
      { slug: "galaxy", name: "Galaxy", parentSlug: "phones", count: 2 },
      { slug: "laptops", name: "Laptops", parentSlug: null, count: 4 },
    ]).map((category) => [category.slug, category.count]);

    expect(counts).toEqual([
      ["phones", 6],
      ["iphone", 3],
      ["galaxy", 2],
      ["laptops", 4],
    ]);
  });

  it("gives a parent with products only in its children a count above zero", () => {
    const [parent] = withChildCounts([
      { slug: "phones", name: "Phones", parentSlug: null, count: 0 },
      { slug: "iphone", name: "iPhone", parentSlug: "phones", count: 5 },
    ]);

    expect(parent.count).toBe(5);
  });
});

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
