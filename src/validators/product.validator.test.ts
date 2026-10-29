import { describe, expect, it } from "vitest";
import { MAX_PRODUCT_ADD_ONS } from "@/lib/constants";
import { productSchema } from "./product.validator";

const product = {
  name: "iPhone 15",
  slug: "iphone-15",
  brandId: "brand",
  categoryId: "category",
  variants: [{ sku: "IP15-128", condition: "REFURBISHED", price: 250000, stock: 3 }],
};

const errorPaths = (input: object) => {
  const result = productSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
};

describe("productSchema add-ons", () => {
  it("defaults to no picks", () => {
    expect(productSchema.parse(product).addOns).toEqual([]);
  });

  it("keeps a pick without an override as null", () => {
    expect(productSchema.parse({ ...product, addOns: [{ addOnId: "a" }] }).addOns).toEqual([
      { addOnId: "a", priceOverride: null },
    ]);
  });

  it("refuses the same add-on twice", () => {
    const addOns = [{ addOnId: "a" }, { addOnId: "a" }];
    expect(errorPaths({ ...product, addOns })).toEqual(["addOns.1.addOnId"]);
  });

  it("refuses more picks than the product page shows", () => {
    const addOns = Array.from({ length: MAX_PRODUCT_ADD_ONS + 1 }, (_, index) => ({ addOnId: `a${index}` }));
    expect(errorPaths({ ...product, addOns })).toEqual(["addOns"]);
  });

  it("refuses a negative override", () => {
    expect(errorPaths({ ...product, addOns: [{ addOnId: "a", priceOverride: -1 }] })).toEqual([
      "addOns.0.priceOverride",
    ]);
  });
});
