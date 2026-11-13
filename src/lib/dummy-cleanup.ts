import type { ImportRow } from "@/lib/product-import";

export interface SheetProduct {
  slug: string;
  name: string;
  skus: string[];
}

export interface StoredProduct {
  id: string;
  slug: string;
  name: string;
  deletedAt: Date | null;
  skus: string[];
}

export interface ExtraVariants {
  product: StoredProduct;
  skus: string[];
}

export interface ProductCleanupPlan {
  keep: StoredProduct[];
  remove: StoredProduct[];
  missing: SheetProduct[];
  missingSkus: string[];
  extraVariants: ExtraVariants[];
  blockers: string[];
}

type SheetRow = Pick<ImportRow, "productSlug" | "productName" | "sku">;

export const normaliseSlug = (slug: string) => slug.trim().toLowerCase();
export const normaliseSku = (sku: string) => sku.trim().toUpperCase();

export function sheetCatalogue(rows: readonly SheetRow[]): SheetProduct[] {
  const products = new Map<string, { name: string; skus: Set<string> }>();
  for (const row of rows) {
    const slug = normaliseSlug(row.productSlug);
    if (!slug) continue;
    const product = products.get(slug) ?? { name: row.productName.trim(), skus: new Set<string>() };
    const sku = normaliseSku(row.sku);
    if (sku) product.skus.add(sku);
    products.set(slug, product);
  }
  return [...products].map(([slug, { name, skus }]) => ({ slug, name, skus: [...skus] }));
}

export function planProductCleanup(
  sheet: readonly SheetProduct[],
  stored: readonly StoredProduct[],
): ProductCleanupPlan {
  const sheetSlugs = new Set(sheet.map((product) => product.slug));
  const sheetSkus = new Set(sheet.flatMap((product) => product.skus));
  const inSheet = (product: StoredProduct) =>
    sheetSlugs.has(normaliseSlug(product.slug)) || product.skus.some((sku) => sheetSkus.has(normaliseSku(sku)));

  const keep = stored.filter(inSheet);
  const remove = stored.filter((product) => !inSheet(product));

  const keptSlugs = new Set(keep.map((product) => normaliseSlug(product.slug)));
  const keptSkus = new Set(keep.flatMap((product) => product.skus.map(normaliseSku)));
  const missing = sheet.filter(
    (product) => !keptSlugs.has(product.slug) && !product.skus.some((sku) => keptSkus.has(sku)),
  );
  const missingSkus = sheet.flatMap((product) => product.skus).filter((sku) => !keptSkus.has(sku));
  const extraVariants = keep
    .map((product) => ({ product, skus: product.skus.filter((sku) => !sheetSkus.has(normaliseSku(sku))) }))
    .filter((extra) => extra.skus.length > 0);

  const blockers: string[] = [];
  if (sheet.length === 0) blockers.push("The sheet has no products, so every product would be deleted.");
  if (missing.length > 0) {
    blockers.push(
      `${missing.length} of ${sheet.length} sheet products are not in this database. Check the database and the sheet before deleting anything.`,
    );
  }

  return { keep, remove, missing, missingSkus, extraVariants, blockers };
}
