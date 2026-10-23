import { describe, expect, it } from "vitest";
import { MAX_PRODUCT_ADD_ONS } from "@/lib/constants";
import { addOnScopeOf, resolveOfferedAddOns, type OfferableAddOn } from "./add-on-rules";

const row = (id: string, price: number, categoryIds: string[] = [], appliesToAll = false): OfferableAddOn => ({
  id,
  price,
  appliesToAll,
  categories: categoryIds.map((categoryId) => ({ categoryId })),
});

const rows = [
  row("all", 100, [], true),
  row("phones", 200, ["phones"]),
  row("laptops", 300, ["laptops"]),
  row("parent", 400, ["devices"]),
];

describe("addOnScopeOf", () => {
  it("takes the category and its parent", () => {
    expect(addOnScopeOf({ categoryId: "phones", category: { parentId: "devices" }, addOns: [] })).toEqual({
      categoryIds: ["phones", "devices"],
      picks: [],
    });
  });

  it("takes only the category when it has no parent", () => {
    expect(addOnScopeOf({ categoryId: "phones", category: { parentId: null }, addOns: [] }).categoryIds).toEqual([
      "phones",
    ]);
  });
});

describe("resolveOfferedAddOns", () => {
  it("offers add-ons for every product, the category and its parent", () => {
    const offered = resolveOfferedAddOns(rows, { categoryIds: ["phones", "devices"], picks: [] });
    expect(offered.map((addOn) => addOn.id)).toEqual(["all", "phones", "parent"]);
  });

  it("offers only the product's picks when it has any", () => {
    const offered = resolveOfferedAddOns(rows, {
      categoryIds: ["phones"],
      picks: [{ addOnId: "laptops", priceOverride: null }],
    });
    expect(offered).toEqual([row("laptops", 300, ["laptops"])]);
  });

  it("applies an override price only to the picked add-on", () => {
    const offered = resolveOfferedAddOns(rows, {
      categoryIds: ["phones"],
      picks: [
        { addOnId: "phones", priceOverride: 50 },
        { addOnId: "all", priceOverride: null },
      ],
    });
    expect(offered.map(({ id, price }) => ({ id, price }))).toEqual([
      { id: "all", price: 100 },
      { id: "phones", price: 50 },
    ]);
  });

  it("skips a pick that is no longer active and does not fall back to the category", () => {
    expect(resolveOfferedAddOns(rows, { categoryIds: ["phones"], picks: [{ addOnId: "gone", priceOverride: 1 }] })).toEqual(
      [],
    );
  });

  it("keeps the given order and caps the list", () => {
    const many = Array.from({ length: MAX_PRODUCT_ADD_ONS + 2 }, (_, index) => row(`a${index}`, index, [], true));
    const offered = resolveOfferedAddOns(many, { categoryIds: ["phones"], picks: [] });
    expect(offered.map((addOn) => addOn.id)).toEqual(many.slice(0, MAX_PRODUCT_ADD_ONS).map((addOn) => addOn.id));
  });
});
