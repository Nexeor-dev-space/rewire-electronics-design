import { PRODUCT_IMPORT_MAX_CELL_LENGTH } from "@/lib/constants";
import {
  IMPORT_COLUMN_KEYS,
  IMPORT_LIST_SEPARATOR,
  IMPORT_SPEC_SEPARATOR,
  ImportFileError,
  assertImportLimits,
  blankImportCells,
  type ImportRawRow,
  type ImportRow,
  type ParsedImportFile,
} from "@/lib/product-import";
import { slugify } from "@/lib/utils";

const TEMPLATE_SHEET_NAME = "Products";
const HEADER_ROW_INDEX = 1;
const FIRST_DATA_ROW_INDEX = 2;
const CONDITION = "REFURBISHED";
const SPEC_GROUP = "Specifications";
const MONTHS_PER_YEAR = 12;

const FIELDS_BEFORE_ATTRIBUTES = [
  { key: "type", header: "Product type" },
  { key: "code", header: "Product code (SKU)" },
  { key: "gtin", header: "GTIN / barcode" },
  { key: "name", header: "Product name" },
  { key: "brand", header: "Brand" },
  { key: "category", header: "Category" },
  { key: "slug", header: "URL slug (optional)" },
  { key: "shortDescription", header: "Short description" },
  { key: "description", header: "Full description" },
  { key: "highlights", header: "Highlights" },
  { key: "specifications", header: "Key specifications" },
  { key: "grade", header: "Condition grade" },
  { key: "batteryHealth", header: "Battery health (%)" },
  { key: "warranty", header: "Warranty" },
  { key: "included", header: "What's in the box" },
  { key: "price", header: "Selling price (AED)" },
  { key: "compareAtPrice", header: "Price when new (AED)" },
  { key: "promoDiscount", header: "Promo discount" },
  { key: "discountType", header: "Discount type" },
  { key: "saleStart", header: "Sale start" },
  { key: "saleEnd", header: "Sale end" },
  { key: "stock", header: "Stock on hand" },
  { key: "visible", header: "Visible on site" },
  { key: "featured", header: "Featured" },
  { key: "returnable", header: "Returnable" },
  { key: "backorders", header: "Allow backorders" },
  { key: "length", header: "Length (cm)" },
  { key: "width", header: "Width (cm)" },
  { key: "height", header: "Height (cm)" },
  { key: "weight", header: "Weight (kg)" },
  { key: "images", header: "Image files or URLs" },
  { key: "imageAlts", header: "Image alt texts" },
] as const;

const FIELDS_AFTER_ATTRIBUTES = [
  { key: "seoTitle", header: "SEO title" },
  { key: "metaDescription", header: "Meta description" },
  { key: "focusKeyword", header: "Focus keyword" },
  { key: "notes", header: "Notes for Rewire team" },
] as const;

const ATTRIBUTE_SLOTS = [1, 2, 3, 4, 5, 6] as const;
const ATTRIBUTE_COLUMN_COUNT = 3;

type TemplateField =
  | (typeof FIELDS_BEFORE_ATTRIBUTES)[number]["key"]
  | (typeof FIELDS_AFTER_ATTRIBUTES)[number]["key"];

export const TEMPLATE_HEADERS: readonly string[] = [
  ...FIELDS_BEFORE_ATTRIBUTES.map((field) => field.header),
  ...ATTRIBUTE_SLOTS.flatMap((slot) => [
    `Attribute ${slot} name`,
    `Attribute ${slot} value`,
    `Attribute ${slot} defines variant`,
  ]),
  ...FIELDS_AFTER_ATTRIBUTES.map((field) => field.header),
];

const REQUIRED_PRODUCT_FIELDS: readonly TemplateField[] = ["code", "name", "brand", "category"];
const REQUIRED_VARIANT_FIELDS: readonly TemplateField[] = ["code", "price"];
const BLANK_STOCK = "0";
const NOT_IMPORTED_FIELDS: readonly TemplateField[] = [
  "featured",
  "returnable",
  "backorders",
  "length",
  "width",
  "height",
  "weight",
];

const GRADES: Record<string, string> = { a: "PREMIUM", b: "EXCELLENT", c: "GOOD" };
const VISIBILITY: Record<string, string> = { yes: "PUBLISHED", no: "DRAFT" };
const OPTION_ATTRIBUTES: Record<string, "storage" | "colour"> = { storage: "storage", colour: "colour", color: "colour" };

const GRADE_TEXT = /^grade\s+([abc])\b/i;
const WARRANTY_TEXT = /^(\d+)\s*(month|year)/i;
const SKU_UNSAFE = /[^A-Z0-9._-]+/g;
const SKU_EDGES = /^-+|-+$/g;
const REQUIRED_MARK = /\s*\*$/;
const IMAGE_SEPARATOR = /[,\n]/;
const REPEATED_PARENT_CODE = "More than one Parent row uses this product code.";

interface TemplateAttribute {
  slot: number;
  name: string;
  value: string;
  definesVariant: boolean;
}

interface TemplateRow {
  rowNumber: number;
  fields: Record<TemplateField, string>;
  attributes: TemplateAttribute[];
}

interface ParentGroup {
  parent: TemplateRow;
  variants: TemplateRow[];
}

interface ImageEntry {
  url: string;
  alt: string;
  general: boolean;
  colours: Set<string>;
}

interface Converted {
  cells: Partial<ImportRawRow>;
  problems: string[];
}

function headerOf(field: TemplateField): string {
  return [...FIELDS_BEFORE_ATTRIBUTES, ...FIELDS_AFTER_ATTRIBUTES].find((entry) => entry.key === field)?.header ?? field;
}

function cellText(cell: unknown): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell).trim();
}

const typeOf = (row: TemplateRow) => row.fields.type.toLowerCase();
const codeOf = (row: TemplateRow) => row.fields.code.toUpperCase();
const nameKeyOf = (row: TemplateRow) => row.fields.name.toLowerCase();
const slugOf = (row: TemplateRow) => row.fields.slug || slugify(row.fields.name);
const safeListText = (text: string) =>
  text.replaceAll(IMPORT_LIST_SEPARATOR, "/").replaceAll(IMPORT_SPEC_SEPARATOR, ":");
const splitLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
const splitCell = (text: string, separator: RegExp | string) =>
  text
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean);
const joinList = (entries: readonly string[]) => entries.join(IMPORT_LIST_SEPARATOR);
const imagesOf = (row: TemplateRow) => splitCell(row.fields.images, IMAGE_SEPARATOR);
const altsOf = (row: TemplateRow) => splitCell(row.fields.imageAlts, ",");

function checkHeaders(record: readonly unknown[]) {
  const found = TEMPLATE_HEADERS.map((_, position) => cellText(record[position]).replace(REQUIRED_MARK, ""));
  const wrong = TEMPLATE_HEADERS.findIndex((header, position) => found[position] !== header);
  if (wrong !== -1) {
    throw new ImportFileError(
      `Column ${wrong + 1} should be “${TEMPLATE_HEADERS[wrong]}”. Don't rename or reorder the columns of the product sheet.`,
    );
  }
}

function toTemplateRow(cells: readonly string[], rowNumber: number): TemplateRow {
  const attributesEnd = FIELDS_BEFORE_ATTRIBUTES.length + ATTRIBUTE_SLOTS.length * ATTRIBUTE_COLUMN_COUNT;
  const fields = Object.fromEntries([
    ...FIELDS_BEFORE_ATTRIBUTES.map((field, position) => [field.key, cells[position] ?? ""]),
    ...FIELDS_AFTER_ATTRIBUTES.map((field, position) => [field.key, cells[attributesEnd + position] ?? ""]),
  ]) as Record<TemplateField, string>;

  const attributes = ATTRIBUTE_SLOTS.map((slot, index): TemplateAttribute => {
    const start = FIELDS_BEFORE_ATTRIBUTES.length + index * ATTRIBUTE_COLUMN_COUNT;
    return {
      slot,
      name: cells[start] ?? "",
      value: cells[start + 1] ?? "",
      definesVariant: (cells[start + 2] ?? "").toLowerCase() === "yes",
    };
  }).filter((attribute) => attribute.name !== "" || attribute.value !== "");

  return { rowNumber, fields, attributes };
}

function readRows(records: readonly (readonly unknown[])[]): TemplateRow[] {
  const rows: TemplateRow[] = [];
  records.slice(FIRST_DATA_ROW_INDEX).forEach((record, offset) => {
    const cells = TEMPLATE_HEADERS.map((_, position) => cellText(record[position]));
    if (cells.every((cell) => cell === "")) return;
    const rowNumber = offset + FIRST_DATA_ROW_INDEX + 1;
    const tooLong = cells.findIndex((cell) => cell.length > PRODUCT_IMPORT_MAX_CELL_LENGTH);
    if (tooLong !== -1) {
      throw new ImportFileError(
        `Row ${rowNumber}: “${TEMPLATE_HEADERS[tooLong]}” is longer than ${PRODUCT_IMPORT_MAX_CELL_LENGTH} characters.`,
      );
    }
    rows.push(toTemplateRow(cells, rowNumber));
  });
  return rows;
}

function requiredProblems(row: TemplateRow, fields: readonly TemplateField[]): string[] {
  return fields.filter((field) => row.fields[field] === "").map((field) => `${headerOf(field)} is required.`);
}

function altProblems(row: TemplateRow): string[] {
  const [images, alts] = [imagesOf(row).length, altsOf(row).length];
  if (images === 0 || alts === 0 || images === alts) return [];
  return [`${headerOf("imageAlts")}: ${alts} for ${images} images. Give one per image, or leave it blank.`];
}

function attributeProblems(row: TemplateRow): string[] {
  return row.attributes.flatMap(({ slot, name, value, definesVariant }) => {
    if (value === "") return [`Attribute ${slot} has a name but no value.`];
    if (name === "") return [`Attribute ${slot} has a value but no name.`];
    if (definesVariant && !OPTION_ATTRIBUTES[name.toLowerCase()]) {
      return [`Attribute ${slot} can't define a variant. Only Storage and Colour can.`];
    }
    return [];
  });
}

function optionOf(row: TemplateRow, option: "storage" | "colour"): string {
  return row.attributes.find((attribute) => OPTION_ATTRIBUTES[attribute.name.toLowerCase()] === option)?.value ?? "";
}

function collectImages(source: TemplateRow, variants: readonly TemplateRow[]): ImageEntry[] {
  const entries = new Map<string, ImageEntry>();
  const add = (row: TemplateRow, colour: string) => {
    const alts = altsOf(row);
    imagesOf(row).forEach((url, index) => {
      const entry = entries.get(url) ?? { url, alt: "", general: false, colours: new Set<string>() };
      entry.alt ||= alts[index] ?? "";
      if (colour === "") entry.general = true;
      else entry.colours.add(colour);
      entries.set(url, entry);
    });
  };
  add(source, "");
  for (const variant of variants) {
    if (variant !== source) add(variant, optionOf(variant, "colour"));
  }
  return [...entries.values()];
}

function imageColour(entry: ImageEntry): string {
  const [colour] = entry.colours;
  return !entry.general && entry.colours.size === 1 && colour ? colour : "";
}

function specEntries(source: TemplateRow, variants: readonly TemplateRow[]): { entries: string[]; problems: string[] } {
  const specs = new Map<string, string>();
  const entries: string[] = [];
  const problems: string[] = [];
  const add = (label: string, value: string) => {
    if (specs.has(label.toLowerCase())) return;
    specs.set(label.toLowerCase(), value);
    entries.push([SPEC_GROUP, safeListText(label), safeListText(value)].join(IMPORT_SPEC_SEPARATOR));
  };

  splitLines(source.fields.specifications).forEach((line, index) => {
    const colon = line.indexOf(":");
    const label = line.slice(0, Math.max(colon, 0)).trim();
    const value = line.slice(colon + 1).trim();
    if (colon === -1 || label === "" || value === "") {
      problems.push(`${headerOf("specifications")}: line ${index + 1} should look like Label: Value.`);
    } else {
      add(label, value);
    }
  });

  for (const row of [source, ...variants]) {
    for (const { name, value } of row.attributes) {
      if (name !== "" && value !== "" && !OPTION_ATTRIBUTES[name.toLowerCase()]) add(name, value);
    }
  }
  return { entries, problems };
}

function warrantyMonths(text: string): number | null {
  const match = WARRANTY_TEXT.exec(text);
  if (!match) return null;
  const amount = Number(match[1]);
  return (match[2] ?? "").toLowerCase() === "year" ? amount * MONTHS_PER_YEAR : amount;
}

function productCells(source: TemplateRow, variants: readonly TemplateRow[]): Converted {
  const { fields } = source;
  const isSellable = variants.includes(source);
  const specs = specEntries(source, variants);
  const images = collectImages(source, variants);
  const months = warrantyMonths(fields.warranty);
  const status = VISIBILITY[fields.visible.toLowerCase()];

  const problems = [
    ...requiredProblems(source, REQUIRED_PRODUCT_FIELDS.filter((field) => !(isSellable && field === "code"))),
    ...specs.problems,
    ...altProblems(source),
    ...(isSellable ? [] : attributeProblems(source)),
    ...(fields.warranty !== "" && months === null ? [`${headerOf("warranty")} must start with a length, like 12 months.`] : []),
    ...(fields.visible !== "" && !status ? [`${headerOf("visible")} must be Yes or No.`] : []),
    ...(images.length === 0 ? [`${headerOf("images")} is required.`] : []),
  ];

  return {
    problems,
    cells: {
      description: fields.description,
      shortDescription: fields.shortDescription,
      gtin: fields.gtin,
      brand: fields.brand,
      category: fields.category,
      productStatus: status ?? "",
      warrantyMonths: months === null ? "" : String(months),
      highlights: joinList(splitLines(fields.highlights).map(safeListText)),
      included: joinList(splitLines(fields.included).map(safeListText)),
      specifications: joinList(specs.entries),
      images: joinList(images.map((image) => image.url)),
      imageAlts: joinList(images.map((image) => safeListText(image.alt))),
      imageColours: joinList(images.map(imageColour)),
      seoTitle: fields.seoTitle,
      metaDescription: fields.metaDescription,
      focusKeyword: fields.focusKeyword,
    },
  };
}

function variantSku(variant: TemplateRow, parent: TemplateRow | null): string {
  const code = codeOf(variant);
  if (parent === null || code !== codeOf(parent)) return code;
  const suffix = variant.attributes
    .filter((attribute) => attribute.definesVariant)
    .map((attribute) => attribute.value.toUpperCase().replace(SKU_UNSAFE, "-").replace(SKU_EDGES, ""))
    .filter(Boolean);
  return [code, ...suffix].join("-");
}

function variantCells(variant: TemplateRow, parent: TemplateRow | null): Converted {
  const { fields } = variant;
  const letter = GRADE_TEXT.exec(fields.grade)?.[1]?.toLowerCase();
  const grade = letter ? GRADES[letter] : undefined;
  const [storage, colour] = [optionOf(variant, "storage"), optionOf(variant, "colour")];
  const samePrice = fields.compareAtPrice !== "" && Number(fields.compareAtPrice) === Number(fields.price);
  const hiddenUnderVisibleParent = fields.visible.toLowerCase() === "no" && parent?.fields.visible.toLowerCase() === "yes";

  return {
    problems: [
      ...requiredProblems(variant, REQUIRED_VARIANT_FIELDS),
      ...(hiddenUnderVisibleParent
        ? [`${headerOf("visible")} is No here but Yes on its Parent. A product is shown or hidden as a whole.`]
        : []),
      ...(fields.grade !== "" && !grade
        ? [`${headerOf("grade")} must be Grade A · Pristine, Grade B · Excellent or Grade C · Good.`]
        : []),
      ...(parent ? altProblems(variant) : []),
      ...attributeProblems(variant),
    ],
    cells: {
      sku: variantSku(variant, parent),
      condition: CONDITION,
      grade: grade ?? "",
      storage,
      colour,
      variantName: [storage, colour].filter(Boolean).join(" "),
      price: fields.price,
      compareAtPrice: samePrice ? "" : fields.compareAtPrice,
      stock: fields.stock || BLANK_STOCK,
      batteryHealth: fields.batteryHealth,
    },
  };
}

function productRows(
  source: TemplateRow,
  variants: readonly TemplateRow[],
  parent: TemplateRow | null,
  slugCounts: ReadonlyMap<string, number>,
): ImportRow[] {
  const product = productCells(source, variants);
  const slugProblems =
    (slugCounts.get(slugOf(source)) ?? 0) > 1
      ? [`${headerOf("slug")}: another product in this file has the same one. Enter a different one.`]
      : [];
  const prefix = parent ? `Parent row ${parent.rowNumber}: ` : "";
  const productProblems = [...product.problems, ...slugProblems].map((problem) => `${prefix}${problem}`);

  return variants.map((variant, index) => {
    const own = variantCells(variant, parent);
    return {
      ...blankImportCells(),
      ...(index === 0 ? product.cells : {}),
      ...own.cells,
      productName: source.fields.name,
      productSlug: slugOf(source),
      rowNumber: variant.rowNumber,
      parentRowNumber: parent?.rowNumber ?? null,
      templateErrors: [...(index === 0 ? productProblems : []), ...own.problems],
    };
  });
}

function errorRow(row: TemplateRow, templateErrors: string[]): ImportRow {
  return {
    ...blankImportCells(),
    productName: row.fields.name,
    productSlug: slugOf(row),
    sku: codeOf(row),
    rowNumber: row.rowNumber,
    parentRowNumber: null,
    templateErrors,
  };
}

function addToList<K, V>(lists: Map<K, V[]>, key: K, value: V) {
  lists.set(key, [...(lists.get(key) ?? []), value]);
}

function findParent(
  row: TemplateRow,
  parentsByCode: ReadonlyMap<string, ParentGroup[]>,
  parentsByName: ReadonlyMap<string, ParentGroup[]>,
): ParentGroup | string {
  const holders = parentsByCode.get(codeOf(row)) ?? [];
  if (holders.length > 1) return REPEATED_PARENT_CODE;
  const [holder] = holders;
  if (holder) {
    return row.fields.name === "" || nameKeyOf(row) === nameKeyOf(holder.parent)
      ? holder
      : `This row uses the code of the Parent on row ${holder.parent.rowNumber} but a different product name.`;
  }

  const named = parentsByName.get(nameKeyOf(row)) ?? [];
  if (named.length > 1) return "More than one Parent row has this product name. Repeat the Parent's code on this row.";
  const [group] = named;
  if (!group) return "No Parent row has this product code or product name.";
  return (parentsByCode.get(codeOf(group.parent))?.length ?? 0) > 1
    ? "Its Parent row uses a product code another Parent also uses."
    : group;
}

function flattenRows(rows: readonly TemplateRow[]): ImportRow[] {
  const parents = rows.filter((row) => typeOf(row) === "parent").map((parent): ParentGroup => ({ parent, variants: [] }));
  const groupsByParent = new Map(parents.map((group) => [group.parent, group]));
  const parentsByCode = new Map<string, ParentGroup[]>();
  const parentsByName = new Map<string, ParentGroup[]>();
  for (const group of parents) {
    if (codeOf(group.parent) !== "") addToList(parentsByCode, codeOf(group.parent), group);
    if (nameKeyOf(group.parent) !== "") addToList(parentsByName, nameKeyOf(group.parent), group);
  }

  const slugCounts = new Map<string, number>();
  for (const row of rows.filter((entry) => typeOf(entry) === "simple" || typeOf(entry) === "parent")) {
    slugCounts.set(slugOf(row), (slugCounts.get(slugOf(row)) ?? 0) + 1);
  }

  const orphans = new Map<TemplateRow, string>();
  for (const row of rows.filter((entry) => typeOf(entry) === "variant")) {
    const found = findParent(row, parentsByCode, parentsByName);
    if (typeof found === "string") orphans.set(row, found);
    else found.variants.push(row);
  }

  const output = rows.flatMap((row): ImportRow[] => {
    const type = typeOf(row);
    if (type === "simple") return productRows(row, [row], null, slugCounts);
    if (type === "variant") {
      const orphan = orphans.get(row);
      return orphan ? [errorRow(row, [orphan, ...variantCells(row, null).problems])] : [];
    }
    if (type !== "parent") return [errorRow(row, ["Product type must be Simple, Parent or Variant."])];

    if ((parentsByCode.get(codeOf(row))?.length ?? 0) > 1) return [errorRow(row, [REPEATED_PARENT_CODE])];
    const variants = groupsByParent.get(row)?.variants ?? [];
    return variants.length > 0
      ? productRows(row, variants, row, slugCounts)
      : [errorRow(row, ["This Parent row has no Variant rows."])];
  });

  return output.sort((first, second) => first.rowNumber - second.rowNumber);
}

function notImportedNotice(field: TemplateField, rows: number, advice = ""): string[] {
  if (rows === 0) return [];
  return [`${headerOf(field)}: filled on ${rows} ${rows === 1 ? "row" : "rows"}, not imported.${advice}`];
}

function promoNotice(rows: readonly TemplateRow[]): string[] {
  const promos = rows.filter(({ fields }) => fields.promoDiscount !== "" && Number(fields.promoDiscount) !== 0).length;
  return notImportedNotice("promoDiscount", promos, " Set up a Campaign after the import.");
}

function buildNotices(rows: readonly TemplateRow[]): string[] {
  return [
    ...NOT_IMPORTED_FIELDS.flatMap((field) =>
      notImportedNotice(field, rows.filter((row) => row.fields[field] !== "").length),
    ),
    ...promoNotice(rows),
  ];
}

export function parseTemplateSheet(records: readonly (readonly unknown[])[]): ParsedImportFile {
  checkHeaders(records[HEADER_ROW_INDEX] ?? []);
  const rows = readRows(records);
  if (rows.length === 0) throw new ImportFileError("The Products tab has no product rows.");

  const flattened = flattenRows(rows);
  assertImportLimits(flattened);
  return { source: "XLSX", columns: [...IMPORT_COLUMN_KEYS], rows: flattened, notices: buildNotices(rows) };
}

export async function readTemplateFile(file: File): Promise<ParsedImportFile> {
  const { readSheet } = await import("read-excel-file/browser");
  let records: readonly (readonly unknown[])[];
  try {
    records = await readSheet(file, TEMPLATE_SHEET_NAME);
  } catch {
    throw new ImportFileError("We couldn't read a Products tab in that workbook. Use the Rewire product sheet.");
  }
  return parseTemplateSheet(records);
}
