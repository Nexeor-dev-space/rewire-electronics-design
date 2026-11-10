import { describe, expect, it } from "vitest";
import { blankImportCells, type ImportRow } from "./product-import";
import type { ImportPreviewRow } from "@/types/product-import";
import {
  analyseImport,
  storedRowOutcome,
  type ExistingVariant,
  type ImportLookups,
  type ImportPlan,
} from "./product-import-analyse";

const SLUG = "iphone-14-pro";

function row(rowNumber: number, sku: string, cells: Partial<ImportRow> = {}): ImportRow {
  return {
    ...blankImportCells(),
    rowNumber,
    parentRowNumber: null,
    templateErrors: [],
    productName: "iPhone 14 Pro",
    productSlug: SLUG,
    brand: "Apple",
    category: "Phones",
    sku,
    condition: "REFURBISHED",
    grade: "PREMIUM",
    price: "2499",
    stock: "5",
    ...cells,
  };
}

function lookups(overrides: Partial<ImportLookups> = {}): ImportLookups {
  return {
    brands: new Map([["apple", "brand-1"]]),
    categories: new Map([["phones", { id: "category-1", archived: false }]]),
    productsBySlug: new Map(),
    productsByGtin: new Map(),
    variantsBySku: new Map(),
    imageProblems: new Map(),
    ...overrides,
  };
}

function stored(sku: string, slug = SLUG, inTrash = false): ExistingVariant {
  return {
    sku,
    storage: null,
    colour: null,
    colourHex: null,
    condition: "REFURBISHED",
    grade: "PREMIUM",
    batteryHealth: null,
    price: 249900,
    compareAtPrice: null,
    stock: 5,
    lowStockThreshold: null,
    product: {
      id: "product-1",
      slug,
      name: "iPhone 14 Pro",
      description: "",
      brandId: "brand-1",
      categoryId: "category-1",
      status: "DRAFT",
      warrantyMonths: 12,
      inTrash,
      imageCount: 0,
    },
  };
}

const twoRows = () => [row(5, "A-1", { storage: "128 GB" }), row(6, "A-2", { storage: "256 GB" })];
const skusStored = (...variants: ExistingVariant[]) => new Map(variants.map((variant) => [variant.sku.toLowerCase(), variant]));
const emptyPlan = (): ImportPlan => ({ creates: new Map(), updates: new Map() });

describe("analyseImport Create New re-upload", () => {
  it("skips a product whose SKUs are all stored under its slug", () => {
    const preview = analyseImport(twoRows(), "CREATE_NEW", lookups({
      productsBySlug: new Map([[SLUG, { inTrash: false }]]),
      variantsBySku: skusStored(stored("A-1"), stored("A-2")),
    }));
    expect(preview.rows.map((entry) => entry.action)).toEqual(["SKIP", "SKIP"]);
    expect(preview).toMatchObject({ skippedRows: 2, validRows: 0, invalidRows: 0 });
  });

  it("does not plan a write for a skipped product", () => {
    const plan = emptyPlan();
    analyseImport(twoRows(), "CREATE_NEW", lookups({
      productsBySlug: new Map([[SLUG, { inTrash: false }]]),
      variantsBySku: skusStored(stored("A-1"), stored("A-2")),
    }), plan);
    expect(plan.creates.size).toBe(0);
  });

  it("fails a file that adds a new variant to a stored product", () => {
    const preview = analyseImport(twoRows(), "CREATE_NEW", lookups({
      productsBySlug: new Map([[SLUG, { inTrash: false }]]),
      variantsBySku: skusStored(stored("A-1")),
    }));
    expect(preview.skippedRows).toBe(0);
    expect(preview.invalidRows).toBe(2);
  });

  it("fails a SKU stored under another product instead of skipping it", () => {
    const preview = analyseImport([row(5, "A-1")], "CREATE_NEW", lookups({
      variantsBySku: skusStored(stored("A-1", "another-product")),
    }));
    expect(preview.skippedRows).toBe(0);
    expect(preview.rows[0]?.errors[0]?.column).toBe("sku");
  });

  it("fails a product in Trash instead of skipping it", () => {
    const preview = analyseImport([row(5, "A-1")], "CREATE_NEW", lookups({
      productsBySlug: new Map([[SLUG, { inTrash: true }]]),
      variantsBySku: skusStored(stored("A-1", SLUG, true)),
    }));
    expect(preview.skippedRows).toBe(0);
    expect(preview.invalidRows).toBe(1);
  });
});

describe("analyseImport Create New with a bad row", () => {
  it("names the bad row on the other rows of the product", () => {
    const preview = analyseImport([row(5, "A-1", { price: "abc" }), row(6, "A-2", { storage: "256 GB" })], "CREATE_NEW", lookups());
    expect(preview.invalidRows).toBe(2);
    expect(preview.rows[1]?.errors[0]?.message).toBe("Not imported: row 5 of this product has an error.");
  });

  it("leaves another product in the file importable", () => {
    const plan = emptyPlan();
    const preview = analyseImport(
      [row(5, "A-1", { price: "abc" }), row(6, "B-1", { productName: "iPhone 13", productSlug: "iphone-13" })],
      "CREATE_NEW",
      lookups(),
      plan,
    );
    expect(preview).toMatchObject({ validRows: 1, invalidRows: 1 });
    expect([...plan.creates.keys()]).toEqual(["iphone-13"]);
  });
});

describe("analyseImport template rows", () => {
  it("reports the sheet's own errors without repeating them as blank cells", () => {
    const preview = analyseImport(
      [row(5, "A-1", { brand: "", category: "", price: "", stock: "", templateErrors: ["Selling price (AED) is required."] })],
      "CREATE_NEW",
      lookups(),
    );
    expect(preview.rows[0]?.errors).toEqual([{ column: null, message: "Selling price (AED) is required." }]);
  });

  it("names the Parent row on a product level error", () => {
    const preview = analyseImport([row(5, "A-1", { parentRowNumber: 4, brand: "Nokia" })], "CREATE_NEW", lookups());
    expect(preview.rows[0]?.errors[0]).toMatchObject({
      column: "brand",
      message: expect.stringMatching(/^Parent row 4: /),
    });
  });

  it("does not name the Parent row on a variant level error", () => {
    const preview = analyseImport([row(5, "A-1", { parentRowNumber: 4, price: "abc" })], "CREATE_NEW", lookups());
    expect(preview.rows[0]?.errors[0]?.message).toBe("Use a number like 1299.00.");
  });
});

describe("analyseImport new product fields", () => {
  it("passes the new cells to the product", () => {
    const plan = emptyPlan();
    analyseImport(
      [
        row(5, "A-1", {
          shortDescription: "Short",
          gtin: "194253082194",
          highlights: "One|Two",
          included: "Phone|Cable",
          batteryHealth: "98",
          colour: "Black",
          images: "https://example.com/a.png|https://example.com/b.png",
          imageAlts: "Front|",
          imageColours: "|Black",
          seoTitle: "Title",
          metaDescription: "Meta",
          focusKeyword: "keyword",
        }),
      ],
      "CREATE_NEW",
      lookups(),
      plan,
    );
    const data = plan.creates.get(SLUG)?.data;
    expect(data).toMatchObject({
      shortDescription: "Short",
      gtin: "194253082194",
      highlights: ["One", "Two"],
      included: ["Phone", "Cable"],
      seoTitle: "Title",
      metaDescription: "Meta",
      metaKeywords: ["keyword"],
    });
    expect(data?.variants[0]?.batteryHealth).toBe(98);
    expect(data?.images).toEqual([
      { mediaId: "https://example.com/a.png", alt: "Front", colour: null },
      { mediaId: "https://example.com/b.png", alt: "", colour: "Black" },
    ]);
  });

  it("refuses a GTIN another product holds", () => {
    const preview = analyseImport([row(5, "A-1", { gtin: "194253082194" })], "CREATE_NEW", lookups({
      productsByGtin: new Map([["194253082194", { inTrash: false }]]),
    }));
    expect(preview.rows[0]?.errors[0]?.column).toBe("gtin");
  });

  it("refuses the same GTIN on two products in the file", () => {
    const preview = analyseImport(
      [
        row(5, "A-1", { gtin: "194253082194" }),
        row(6, "B-1", { productName: "iPhone 13", productSlug: "iphone-13", gtin: "194253082194" }),
      ],
      "CREATE_NEW",
      lookups(),
    );
    expect(preview.rows[1]?.errors[0]).toMatchObject({ column: "gtin", message: "Row 5 already uses this GTIN." });
  });
});

describe("storedRowOutcome", () => {
  const preview = (cells: Partial<ImportPreviewRow>): ImportPreviewRow => ({
    rowNumber: 5,
    productName: "iPhone 14 Pro",
    productSlug: SLUG,
    sku: "A-1",
    storage: null,
    colour: null,
    condition: null,
    price: null,
    stock: null,
    action: "CREATE",
    changes: [],
    errors: [],
    ...cells,
  });

  it("leaves a row to create as pending", () => {
    expect(storedRowOutcome(preview({}))).toEqual({});
  });

  it("stores a skipped row as skipped", () => {
    expect(storedRowOutcome(preview({ action: "SKIP" }))).toEqual({ status: "SKIPPED" });
  });

  it("stores an invalid row as failed with every reason", () => {
    const errors = [
      { column: "price" as const, message: "Use a number like 1299.00." },
      { column: null, message: "Selling price (AED) is required." },
    ];
    expect(storedRowOutcome(preview({ action: null, errors }))).toEqual({
      status: "FAILED",
      error: "price: Use a number like 1299.00. Selling price (AED) is required.",
    });
  });
});
