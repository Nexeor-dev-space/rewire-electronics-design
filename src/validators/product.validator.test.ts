import { describe, expect, it } from "vitest";
import { MAX_PRODUCT_ADD_ONS, SHORT_DESCRIPTION_MAX_LENGTH } from "@/lib/constants";
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

describe("productSchema GTIN and short description", () => {
  it("defaults to no GTIN and an empty short description", () => {
    const parsed = productSchema.parse(product);
    expect(parsed.gtin).toBeNull();
    expect(parsed.shortDescription).toBe("");
  });

  it("keeps a GTIN of 8 to 14 digits", () => {
    expect(productSchema.parse({ ...product, gtin: "194253082194" }).gtin).toBe("194253082194");
  });

  it.each(["1234567", "123456789012345", "19425308219A"])("refuses the GTIN %s", (gtin) => {
    expect(errorPaths({ ...product, gtin })).toEqual(["gtin"]);
  });

  it("refuses a short description over the limit", () => {
    const shortDescription = "x".repeat(SHORT_DESCRIPTION_MAX_LENGTH + 1);
    expect(errorPaths({ ...product, shortDescription })).toEqual(["shortDescription"]);
  });
});

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
