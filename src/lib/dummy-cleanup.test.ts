import { describe, expect, it } from "vitest";
import { planProductCleanup, sheetCatalogue, type SheetProduct, type StoredProduct } from "./dummy-cleanup";

function stored(slug: string, skus: string[], cells: Partial<StoredProduct> = {}): StoredProduct {
  return { id: `id-${slug}`, slug, name: slug, deletedAt: null, skus, ...cells };
}

const SHEET: SheetProduct[] = [
  { slug: "iphone-12", name: "iPhone 12", skus: ["SKU-019", "SKU-020"] },
  { slug: "iphone-13", name: "iPhone 13", skus: ["SKU-055"] },
];

const ids = (products: StoredProduct[]) => products.map((product) => product.id).sort();

describe("sheetCatalogue", () => {
  it("groups variant rows into one product per slug", () => {
    const sheet = sheetCatalogue([
      { productSlug: "iphone-12", productName: "iPhone 12", sku: "SKU-019" },
      { productSlug: "iphone-12", productName: "iPhone 12", sku: "SKU-020" },
      { productSlug: "iphone-13", productName: "iPhone 13", sku: "SKU-055" },
    ]);
    expect(sheet).toEqual(SHEET);
  });

  it("trims and lowercases slugs, uppercases SKUs and drops repeats", () => {
    const sheet = sheetCatalogue([
      { productSlug: " iPhone-12 ", productName: " iPhone 12 ", sku: " sku-019 " },
      { productSlug: "iphone-12", productName: "iPhone 12", sku: "SKU-019" },
    ]);
    expect(sheet).toEqual([{ slug: "iphone-12", name: "iPhone 12", skus: ["SKU-019"] }]);
  });

  it("skips rows with no slug and keeps a product whose SKU is blank", () => {
    const sheet = sheetCatalogue([
      { productSlug: "", productName: "Stray", sku: "SKU-999" },
      { productSlug: "iphone-14", productName: "iPhone 14", sku: "" },
    ]);
    expect(sheet).toEqual([{ slug: "iphone-14", name: "iPhone 14", skus: [] }]);
  });

  it("returns nothing for an empty sheet", () => {
    expect(sheetCatalogue([])).toEqual([]);
  });
});

describe("planProductCleanup", () => {
  it("keeps a product matched by slug and deletes the rest", () => {
    const plan = planProductCleanup(SHEET, [
      stored("iphone-12", ["SKU-019", "SKU-020"]),
      stored("iphone-13", ["SKU-055"]),
      stored("apple-macbook-air-13-m2", ["APPLE-MACBOOK-AIR-13-M2-256GB"]),
    ]);
    expect(ids(plan.keep)).toEqual(["id-iphone-12", "id-iphone-13"]);
    expect(ids(plan.remove)).toEqual(["id-apple-macbook-air-13-m2"]);
    expect(plan.blockers).toEqual([]);
  });

  it("keeps a product matched only by SKU, ignoring case, after its slug was renamed", () => {
    const plan = planProductCleanup(SHEET, [stored("iphone-12-renamed", ["sku-019"]), stored("iphone-13", ["SKU-055"])]);
    expect(ids(plan.keep)).toEqual(["id-iphone-12-renamed", "id-iphone-13"]);
    expect(plan.remove).toEqual([]);
    expect(plan.missing).toEqual([]);
    expect(plan.missingSkus).toEqual(["SKU-020"]);
  });

  it("deletes a seeded near-miss slug", () => {
    const plan = planProductCleanup(SHEET, [
      stored("iphone-12", ["SKU-019", "SKU-020"]),
      stored("iphone-13", ["SKU-055"]),
      stored("apple-iphone-12", ["APPLE-IPHONE-12-64GB"]),
    ]);
    expect(ids(plan.remove)).toEqual(["id-apple-iphone-12"]);
  });

  it("matches a stored slug with different case or spaces", () => {
    const plan = planProductCleanup(SHEET, [stored(" IPHONE-12 ", []), stored("iphone-13", ["SKU-055"])]);
    expect(plan.remove).toEqual([]);
  });

  it("keeps a sheet product in Trash and deletes a dummy product in Trash", () => {
    const trashed = new Date("2026-11-01");
    const plan = planProductCleanup(SHEET, [
      stored("iphone-12", ["SKU-019", "SKU-020"], { deletedAt: trashed }),
      stored("iphone-13", ["SKU-055"]),
      stored("sample-product", ["SAMPLE-1"], { deletedAt: trashed }),
    ]);
    expect(ids(plan.keep)).toEqual(["id-iphone-12", "id-iphone-13"]);
    expect(ids(plan.remove)).toEqual(["id-sample-product"]);
  });

  it("reports extra variants on a kept product without deleting it", () => {
    const plan = planProductCleanup(SHEET, [stored("iphone-12", ["SKU-019", "SKU-020", "EXTRA-1"]), stored("iphone-13", ["SKU-055"])]);
    expect(plan.extraVariants).toEqual([{ product: plan.keep[0], skus: ["EXTRA-1"] }]);
    expect(plan.remove).toEqual([]);
  });

  it("blocks when a sheet product is missing from the database", () => {
    const plan = planProductCleanup(SHEET, [stored("iphone-12", ["SKU-019", "SKU-020"]), stored("dummy", ["D-1"])]);
    expect(plan.missing.map((product) => product.slug)).toEqual(["iphone-13"]);
    expect(plan.blockers).toHaveLength(1);
  });

  it("blocks when nothing in the database matches the sheet", () => {
    const plan = planProductCleanup(SHEET, [stored("dummy-a", ["D-1"]), stored("dummy-b", ["D-2"])]);
    expect(plan.keep).toEqual([]);
    expect(plan.remove).toHaveLength(2);
    expect(plan.blockers).toHaveLength(1);
  });

  it("blocks on an empty sheet so it never deletes every product", () => {
    const plan = planProductCleanup([], [stored("iphone-12", ["SKU-019"])]);
    expect(plan.remove).toHaveLength(1);
    expect(plan.blockers).toHaveLength(1);
  });

  it("blocks on an empty database", () => {
    const plan = planProductCleanup(SHEET, []);
    expect(plan.keep).toEqual([]);
    expect(plan.remove).toEqual([]);
    expect(plan.missing).toHaveLength(2);
    expect(plan.blockers).toHaveLength(1);
  });

  it("finds nothing to remove when only sheet products are left", () => {
    const plan = planProductCleanup(SHEET, [stored("iphone-12", ["SKU-019", "SKU-020"]), stored("iphone-13", ["SKU-055"])]);
    expect(plan.remove).toEqual([]);
    expect(plan.missingSkus).toEqual([]);
    expect(plan.blockers).toEqual([]);
  });
});
