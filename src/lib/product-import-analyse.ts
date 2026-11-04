import { fromMinorUnits, toMinorUnits } from "@/lib/money";
import {
  IMPORT_LIST_SEPARATOR,
  IMPORT_SPEC_SEPARATOR,
  importColumnHeader,
  requiredColumns,
  type ImportColumnKey,
  type ImportMode,
  type ImportRow,
} from "@/lib/product-import";
import type { ImportPreview, ImportPreviewRow } from "@/types/product-import";
import {
  MAX_IMAGES,
  MAX_SPECS,
  PRODUCT_CONDITIONS,
  PRODUCT_GRADES,
  PRODUCT_STATUSES,
  productSchema,
  productVariantSchema,
  type ProductCondition,
  type ProductGrade,
  type ProductStatus,
} from "@/validators/product.validator";

/**
 * Checks every row of an import against the rules the product form enforces,
 * and against what is already stored, without writing anything. Pure: the
 * service looks the stored data up and passes it in, so this runs the same
 * in a test. See docs/BULK-UPLOAD.md.
 */

export interface ExistingProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  brandId: string;
  categoryId: string;
  status: ProductStatus;
  warrantyMonths: number;
  inTrash: boolean;
  imageCount: number;
}

export interface ExistingVariant {
  sku: string;
  storage: string | null;
  colour: string | null;
  colourHex: string | null;
  condition: ProductCondition;
  grade: ProductGrade | null;
  batteryHealth: number | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  lowStockThreshold: number | null;
  product: ExistingProduct;
}

export interface ImportLookups {
  /** Brand name, trimmed and lowercased, to its id. */
  brands: Map<string, string>;
  /** Category slug, lowercased, to its id and whether it is archived. */
  categories: Map<string, { id: string; archived: boolean }>;
  /** Product slug, lowercased, to what holds it. */
  productsBySlug: Map<string, { inTrash: boolean }>;
  /** SKU, lowercased, to the stored variant and its product. */
  variantsBySku: Map<string, ExistingVariant>;
  /** Image address to why it can't be used. An address missing from here is fine. */
  imageProblems: Map<string, string>;
}

interface Parsed {
  status: ProductStatus | null;
  condition: ProductCondition | null;
  grade: ProductGrade | null;
  price: number | null;
  compareAtPrice: number | null;
  stock: number | null;
  warrantyMonths: number | null;
  images: string[];
  specs: { group: string; label: string; value: string }[];
}

interface Item {
  row: ImportRow;
  out: ImportPreviewRow;
  parsed: Parsed;
}

const PRODUCT_COLUMNS: readonly ImportColumnKey[] = [
  "productName",
  "description",
  "brand",
  "category",
  "productStatus",
  "warrantyMonths",
  "images",
  "specifications",
];

const PRODUCT_FIELD_COLUMN: Record<string, ImportColumnKey> = {
  name: "productName",
  slug: "productSlug",
  description: "description",
  brandId: "brand",
  categoryId: "category",
  warrantyMonths: "warrantyMonths",
  images: "images",
  specs: "specifications",
};

const VARIANT_FIELD_COLUMN: Record<string, ImportColumnKey> = {
  sku: "sku",
  storage: "storage",
  colour: "colour",
  condition: "condition",
  grade: "grade",
  price: "price",
  compareAtPrice: "compareAtPrice",
  stock: "stock",
};

const WHOLE_NUMBER = /^\d+$/;
const PRICE_HINT = "Use a number like 1299.00.";
const WHOLE_HINT = "Use a whole number.";

const keyOf = (value: string) => value.trim().toLowerCase();
const enumKey = (value: string) => value.trim().toUpperCase().replace(/[\s-]+/g, "_");
const header = importColumnHeader;

export function analyseImport(rows: readonly ImportRow[], mode: ImportMode, lookups: ImportLookups): ImportPreview {
  const items = rows.map((row): Item => {
    const item: Item = { row, out: previewRow(row), parsed: emptyParsed() };
    readCells(item, mode, lookups);
    return item;
  });

  checkDuplicateSkus(items);
  const groups = mode === "CREATE_NEW" ? analyseCreate(items, lookups) : analyseUpdate(items, lookups);

  for (const { out } of items) out.action = out.errors.length > 0 ? null : mode === "CREATE_NEW" ? "CREATE" : "UPDATE";

  const invalidRows = items.filter(({ out }) => out.errors.length > 0).length;
  return {
    mode,
    totalRows: items.length,
    productCount: groups,
    validRows: items.length - invalidRows,
    invalidRows,
    rows: items.map(({ out }) => out),
  };
}

/* ---------- one row on its own ---------- */

function previewRow(row: ImportRow): ImportPreviewRow {
  return {
    rowNumber: row.rowNumber,
    productName: row.productName,
    productSlug: row.productSlug,
    sku: row.sku,
    storage: row.storage || null,
    colour: row.colour || null,
    condition: row.condition || null,
    price: null,
    stock: null,
    action: null,
    changes: [],
    errors: [],
  };
}

function fail(item: Item, column: ImportColumnKey | null, message: string) {
  item.out.errors.push({ column, message });
}

/** Reads the typed cells of a row. A cell that can't be read is reported and left null. */
function readCells(item: Item, mode: ImportMode, lookups: ImportLookups) {
  const { row, parsed } = item;

  // Product level cells are required on the first row of a product only; the product step checks those.
  const required = requiredColumns(mode).filter((key) => !PRODUCT_COLUMNS.includes(key));
  for (const key of required) {
    if (row[key] === "") fail(item, key, `Enter ${header(key)}.`);
  }

  parsed.status = parseEnum(item, "productStatus", PRODUCT_STATUSES);
  parsed.condition = parseEnum(item, "condition", PRODUCT_CONDITIONS);
  parsed.grade = parseEnum(item, "grade", PRODUCT_GRADES);
  parsed.price = parseMoney(item, "price");
  parsed.compareAtPrice = parseMoney(item, "compareAtPrice");
  parsed.stock = parseWhole(item, "stock");
  parsed.warrantyMonths = parseWhole(item, "warrantyMonths");
  parsed.images = parseImages(item, lookups);
  parsed.specs = parseSpecs(item);
}

function emptyParsed(): Parsed {
  return {
    status: null,
    condition: null,
    grade: null,
    price: null,
    compareAtPrice: null,
    stock: null,
    warrantyMonths: null,
    images: [],
    specs: [],
  };
}

function parseEnum<T extends string>(item: Item, key: ImportColumnKey, values: readonly T[]): T | null {
  const raw = item.row[key];
  if (raw === "") return null;
  const found = values.find((value) => value === enumKey(raw));
  if (!found) fail(item, key, `Use one of ${values.join(", ")}.`);
  return found ?? null;
}

function parseMoney(item: Item, key: ImportColumnKey): number | null {
  const raw = item.row[key];
  if (raw === "") return null;
  const value = toMinorUnits(raw);
  if (value === null) fail(item, key, PRICE_HINT);
  return value;
}

function parseWhole(item: Item, key: ImportColumnKey): number | null {
  const raw = item.row[key];
  if (raw === "") return null;
  if (!WHOLE_NUMBER.test(raw)) {
    fail(item, key, WHOLE_HINT);
    return null;
  }
  return Number(raw);
}

function splitList(raw: string): string[] {
  return raw
    .split(IMPORT_LIST_SEPARATOR)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseImages(item: Item, lookups: ImportLookups): string[] {
  const urls = splitList(item.row.images);
  if (urls.length > MAX_IMAGES) fail(item, "images", `Add up to ${MAX_IMAGES} images.`);
  if (new Set(urls).size !== urls.length) fail(item, "images", "The same image is listed twice.");
  for (const url of urls) {
    const problem = imageAddressProblem(url) ?? lookups.imageProblems.get(url);
    if (problem) fail(item, "images", `${url}: ${problem}`);
  }
  return urls;
}

/** What can be told from the address alone; whether it answers is checked by the service. */
export function imageAddressProblem(url: string): string | null {
  try {
    return new URL(url).protocol === "https:" ? null : "Use an https:// address.";
  } catch {
    return "That isn't a web address.";
  }
}

function parseSpecs(item: Item): Parsed["specs"] {
  const entries = splitList(item.row.specifications);
  if (entries.length > MAX_SPECS) fail(item, "specifications", `Add up to ${MAX_SPECS} specifications.`);
  const specs: Parsed["specs"] = [];
  for (const entry of entries) {
    const [group, label, value, ...extra] = entry.split(IMPORT_SPEC_SEPARATOR).map((part) => part.trim());
    if (!group || !label || !value || extra.length > 0) {
      fail(item, "specifications", `“${entry}” should look like Group${IMPORT_SPEC_SEPARATOR}Label${IMPORT_SPEC_SEPARATOR}Value.`);
    } else {
      specs.push({ group, label, value });
    }
  }
  return specs;
}

/* ---------- across rows ---------- */

function checkDuplicateSkus(items: Item[]) {
  const seen = new Map<string, number>();
  for (const item of items) {
    const sku = keyOf(item.row.sku);
    if (!sku) continue;
    const first = seen.get(sku);
    if (first === undefined) seen.set(sku, item.row.rowNumber);
    else fail(item, "sku", `This SKU is already on row ${first}.`);
  }
}

function groupBy(items: Item[], keyFor: (item: Item) => string | undefined): Item[][] {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const key = keyFor(item);
    if (key) groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()];
}

/** Later rows of a product may repeat the product cells or leave them blank, but not change them. */
function checkAgreement(group: Item[]) {
  const [first, ...rest] = group;
  if (!first) return;
  for (const item of rest) {
    for (const key of PRODUCT_COLUMNS) {
      const mine = item.row[key];
      if (mine !== "" && keyOf(mine) !== keyOf(first.row[key])) {
        fail(item, key, `Differs from row ${first.row.rowNumber}. Repeat the same value or leave it blank.`);
      }
    }
  }
}

function mapIssues(group: Item[], issues: readonly { path: PropertyKey[]; message: string }[]) {
  for (const issue of issues) {
    const [section, index, field] = issue.path;
    if (section === "variants" && typeof index === "number") {
      const column = typeof field === "string" ? VARIANT_FIELD_COLUMN[field] : undefined;
      const item = group[index];
      if (item) fail(item, column ?? null, issue.message);
    } else if (group[0]) {
      fail(group[0], typeof section === "string" ? (PRODUCT_FIELD_COLUMN[section] ?? null) : null, issue.message);
    }
  }
}

const hasErrors = (group: Item[]) => group.some((item) => item.out.errors.length > 0);

/* ---------- Create New ---------- */

function analyseCreate(items: Item[], lookups: ImportLookups): number {
  const groups = groupBy(items, (item) => keyOf(item.row.productSlug));

  for (const group of groups) {
    const first = group[0];
    if (!first) continue;
    checkAgreement(group);
    for (const key of ["productName", "brand", "category"] as const) {
      if (first.row[key] === "") fail(first, key, `Enter ${header(key)}.`);
    }

    const taken = lookups.productsBySlug.get(keyOf(first.row.productSlug));
    if (taken) {
      fail(
        first,
        "productSlug",
        taken.inTrash
          ? "A product in Trash uses this URL slug. Restore it or delete it permanently first."
          : "Another product already uses this URL slug.",
      );
    }
    for (const item of group) {
      const stored = lookups.variantsBySku.get(keyOf(item.row.sku));
      if (stored) {
        fail(
          item,
          "sku",
          stored.product.inTrash
            ? "This SKU belongs to a product in Trash. Restore it or delete it permanently first."
            : "This SKU is already used by another product. Use Update Existing to change it.",
        );
      }
    }

    const brandId = first.row.brand ? lookups.brands.get(keyOf(first.row.brand)) : undefined;
    if (first.row.brand && !brandId) fail(first, "brand", `“${first.row.brand}” isn't a brand yet. Add it under Brands first.`);
    const category = first.row.category ? lookups.categories.get(keyOf(first.row.category)) : undefined;
    if (first.row.category && !category) fail(first, "category", `No category has the slug “${first.row.category}”.`);
    if (category?.archived) fail(first, "category", `“${first.row.category}” is archived.`);

    if (first.parsed.status === "PUBLISHED" && first.parsed.images.length === 0) {
      fail(first, "images", "Add at least one image to publish, or set product_status to DRAFT.");
    }

    // The form's own schema runs once the cells themselves are sound, so each fault is reported once.
    if (hasErrors(group) || !brandId || !category) continue;
    const result = productSchema.safeParse({
      name: first.row.productName,
      slug: first.row.productSlug,
      description: first.row.description,
      brandId,
      categoryId: category.id,
      warrantyMonths: first.parsed.warrantyMonths ?? undefined,
      // The address stands in for the media id the import will create, so duplicates are still caught.
      images: first.parsed.images.map((url) => ({ mediaId: url, alt: "", colour: null })),
      specs: first.parsed.specs,
      variants: group.map((item) => ({
        sku: item.row.sku,
        storage: item.row.storage || null,
        colour: item.row.colour || null,
        condition: item.parsed.condition,
        grade: item.parsed.grade,
        price: item.parsed.price,
        compareAtPrice: item.parsed.compareAtPrice,
        stock: item.parsed.stock,
      })),
    });
    if (!result.success) mapIssues(group, result.error.issues);
  }

  for (const item of items) {
    item.out.price = item.parsed.price;
    item.out.stock = item.parsed.stock;
  }
  return groups.length;
}

/* ---------- Update Existing ---------- */

function analyseUpdate(items: Item[], lookups: ImportLookups): number {
  const found = items.filter((item) => {
    if (!item.row.sku) return false;
    if (lookups.variantsBySku.has(keyOf(item.row.sku))) return true;
    fail(item, "sku", "No variant has this SKU. Switch to Create New to add it.");
    return false;
  });

  for (const item of found) {
    const stored = lookups.variantsBySku.get(keyOf(item.row.sku));
    if (!stored) continue;
    const { product } = stored;
    if (product.inTrash) fail(item, "sku", "This SKU belongs to a product in Trash. Restore it first.");
    if (item.row.productSlug && keyOf(item.row.productSlug) !== product.slug) {
      fail(item, "productSlug", `This SKU belongs to “${product.slug}”. An import can't change a product's slug.`);
    }
    showStored(item, stored);
  }

  const groups = groupBy(found, (item) => lookups.variantsBySku.get(keyOf(item.row.sku))?.product.id);
  for (const group of groups) {
    checkAgreement(group);
    const first = group[0];
    const product = first && lookups.variantsBySku.get(keyOf(first.row.sku))?.product;
    if (first && product) updateProduct(first, product, lookups);

    for (const item of group) {
      const stored = lookups.variantsBySku.get(keyOf(item.row.sku));
      if (stored && item.out.errors.length === 0) updateVariant(item, stored);
    }
  }
  return groups.length;
}

/** The preview shows what the row will leave behind, so start from what is stored. */
function showStored(item: Item, stored: ExistingVariant) {
  item.out.productName = item.row.productName || stored.product.name;
  item.out.productSlug = stored.product.slug;
  item.out.storage = item.row.storage || stored.storage;
  item.out.colour = item.row.colour || stored.colour;
  item.out.condition = item.parsed.condition ?? stored.condition;
  item.out.price = item.parsed.price ?? stored.price;
  item.out.stock = item.parsed.stock ?? stored.stock;
}

function updateProduct(first: Item, product: ExistingProduct, lookups: ImportLookups) {
  const { row, parsed } = first;
  const shape = productSchema.shape;
  const checks = [
    ["productName", row.productName, shape.name],
    ["description", row.description, shape.description],
    ["warrantyMonths", parsed.warrantyMonths === null ? "" : String(parsed.warrantyMonths), shape.warrantyMonths],
  ] as const;
  for (const [key, raw, schema] of checks) {
    if (raw === "") continue;
    const result = schema.safeParse(key === "warrantyMonths" ? Number(raw) : raw);
    if (!result.success) fail(first, key, result.error.issues[0]?.message ?? "Check this value.");
  }

  const brandId = row.brand ? lookups.brands.get(keyOf(row.brand)) : undefined;
  if (row.brand && !brandId) fail(first, "brand", `“${row.brand}” isn't a brand yet. Add it under Brands first.`);
  const category = row.category ? lookups.categories.get(keyOf(row.category)) : undefined;
  if (row.category && !category) fail(first, "category", `No category has the slug “${row.category}”.`);
  if (category?.archived) fail(first, "category", `“${row.category}” is archived.`);

  if (parsed.status === "PUBLISHED" && product.imageCount === 0 && parsed.images.length === 0) {
    fail(first, "productStatus", "This product has no images. Add images in the same row, or keep it a draft.");
  }

  if (first.out.errors.length > 0) return;
  const change = (key: ImportColumnKey, before: string, after: string) => {
    if (after !== "" && after !== before) first.out.changes.push(`${header(key)}: ${before || "none"} → ${after}`);
  };
  change("productName", product.name, row.productName);
  change("description", product.description, row.description);
  change("productStatus", product.status, parsed.status ?? "");
  change("warrantyMonths", String(product.warrantyMonths), parsed.warrantyMonths === null ? "" : String(parsed.warrantyMonths));
  if (brandId && brandId !== product.brandId) first.out.changes.push(`${header("brand")}: ${row.brand}`);
  if (category && category.id !== product.categoryId) first.out.changes.push(`${header("category")}: ${row.category}`);
  if (parsed.images.length > 0) first.out.changes.push(`${header("images")}: replaced with ${parsed.images.length}`);
  if (parsed.specs.length > 0) first.out.changes.push(`${header("specifications")}: replaced with ${parsed.specs.length}`);
}

/** The stored variant with the filled cells laid over it must still pass the form's variant rules. */
function updateVariant(item: Item, stored: ExistingVariant) {
  const { row, parsed } = item;
  const merged = {
    sku: stored.sku,
    storage: row.storage || stored.storage,
    colour: row.colour || stored.colour,
    colourHex: stored.colourHex,
    condition: parsed.condition ?? stored.condition,
    grade: parsed.grade ?? stored.grade,
    batteryHealth: stored.batteryHealth,
    price: parsed.price ?? stored.price,
    compareAtPrice: parsed.compareAtPrice ?? stored.compareAtPrice,
    stock: parsed.stock ?? stored.stock,
    lowStockThreshold: stored.lowStockThreshold,
  };
  const result = productVariantSchema.safeParse(merged);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      fail(item, typeof field === "string" ? (VARIANT_FIELD_COLUMN[field] ?? null) : null, issue.message);
    }
    return;
  }

  const money = (minor: number | null) => (minor === null ? "none" : fromMinorUnits(minor));
  const change = (key: ImportColumnKey, before: string, after: string) => {
    if (before !== after) item.out.changes.push(`${header(key)}: ${before} → ${after}`);
  };
  change("price", money(stored.price), money(merged.price));
  change("compareAtPrice", money(stored.compareAtPrice), money(merged.compareAtPrice));
  change("stock", String(stored.stock), String(merged.stock));
  change("condition", stored.condition, merged.condition);
  change("grade", stored.grade ?? "none", merged.grade ?? "none");
  change("storage", stored.storage ?? "none", merged.storage ?? "none");
  change("colour", stored.colour ?? "none", merged.colour ?? "none");
}
