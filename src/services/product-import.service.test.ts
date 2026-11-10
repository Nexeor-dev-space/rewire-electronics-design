import { describe, expect, it, vi } from "vitest";
import { blankImportCells, type ImportRow } from "@/lib/product-import";

const { findBrands, findCategories, findProducts, findVariants } = vi.hoisted(() => ({
  findBrands: vi.fn(async () => []),
  findCategories: vi.fn(),
  findProducts: vi.fn(async () => []),
  findVariants: vi.fn(async () => []),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  prisma: {
    brand: { findMany: findBrands },
    category: { findMany: findCategories },
    product: { findMany: findProducts },
    productVariant: { findMany: findVariants },
  },
}));

import { loadLookups } from "./product-import.service";

const row: ImportRow = { ...blankImportCells(), rowNumber: 3, parentRowNumber: null, templateErrors: [], category: "phones" };

describe("loadLookups categories", () => {
  it("finds a category by its name", async () => {
    findCategories.mockResolvedValue([{ id: "by-name", slug: "mobile", nameKey: "phones", status: "PUBLISHED" }]);
    const { categories } = await loadLookups([row], false);
    expect(categories.get("phones")?.id).toBe("by-name");
  });

  it("prefers a slug over another category's name", async () => {
    findCategories.mockResolvedValue([
      { id: "by-slug", slug: "phones", nameKey: "smartphones", status: "PUBLISHED" },
      { id: "by-name", slug: "mobile", nameKey: "phones", status: "PUBLISHED" },
    ]);
    const { categories } = await loadLookups([row], false);
    expect(categories.get("phones")?.id).toBe("by-slug");
  });
});
