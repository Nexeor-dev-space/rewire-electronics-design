import {
  PRODUCT_IMPORT_MAX_BYTES,
  PRODUCT_IMPORT_MAX_CELL_LENGTH,
  PRODUCT_IMPORT_MAX_IMAGES,
  PRODUCT_IMPORT_MAX_ROWS,
  PRODUCT_IMPORT_MAX_STALLED_CALLS,
} from "@/lib/constants";
import { toCsv } from "@/lib/csv";
import { formatBytes } from "@/lib/media";

/**
 * The bulk upload CSV: its columns, the template, and a reader. Client safe,
 * so the browser reads and checks the file before sending it and the server
 * checks the same rows again. See docs/BULK-UPLOAD.md.
 */

export const IMPORT_MODES = ["CREATE_NEW", "UPDATE_EXISTING"] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];

export const IMPORT_MODE_LABELS: Record<ImportMode, string> = {
  CREATE_NEW: "Create New",
  UPDATE_EXISTING: "Update Existing",
};

export const IMPORT_MODE_HINTS: Record<ImportMode, string> = {
  CREATE_NEW: "Adds new products and their variants. A slug or SKU that already exists is refused.",
  UPDATE_EXISTING:
    "Changes existing variants matched by SKU. A blank cell keeps the current value, and nothing is deleted.",
};

/** Between the entries of the images and specifications cells. */
export const IMPORT_LIST_SEPARATOR = "|";
/** Between the group, label and value of one specification. */
export const IMPORT_SPEC_SEPARATOR = "::";

/** One CSV row is one variant. Order here is the order of the template. */
export const IMPORT_COLUMNS = [
  { key: "productName", header: "product_name", required: true },
  { key: "productSlug", header: "product_slug", required: true },
  { key: "description", header: "description", required: false },
  { key: "brand", header: "brand", required: true },
  { key: "category", header: "category", required: true },
  { key: "productStatus", header: "product_status", required: false },
  { key: "warrantyMonths", header: "warranty_months", required: false },
  { key: "images", header: "images", required: false },
  { key: "specifications", header: "specifications", required: false },
  { key: "sku", header: "sku", required: true },
  { key: "variantName", header: "variant_name", required: false },
  { key: "condition", header: "condition", required: true },
  { key: "grade", header: "grade", required: false },
  { key: "storage", header: "storage", required: false },
  { key: "colour", header: "colour", required: false },
  { key: "price", header: "price", required: true },
  { key: "compareAtPrice", header: "compare_at_price", required: false },
  { key: "stock", header: "stock", required: true },
] as const;

export type ImportColumnKey = (typeof IMPORT_COLUMNS)[number]["key"];
export type ImportRawRow = Record<ImportColumnKey, string>;
/** A CSV row as it travels to the server: its spreadsheet row number and its cells. */
export type ImportRow = ImportRawRow & { rowNumber: number };

export const IMPORT_COLUMN_KEYS = IMPORT_COLUMNS.map((column) => column.key);

const HEADER_TO_KEY = new Map<string, ImportColumnKey>(
  IMPORT_COLUMNS.map((column) => [column.header, column.key]),
);

export function importColumnHeader(key: ImportColumnKey): string {
  return IMPORT_COLUMNS.find((column) => column.key === key)?.header ?? key;
}

/** Create New needs the full set; Update Existing only needs the SKU to match on. */
export function requiredColumns(mode: ImportMode): ImportColumnKey[] {
  return IMPORT_COLUMNS.filter((column) => (mode === "CREATE_NEW" ? column.required : column.key === "sku")).map(
    (column) => column.key,
  );
}

export function missingColumns(columns: readonly ImportColumnKey[], mode: ImportMode): ImportColumnKey[] {
  return requiredColumns(mode).filter((key) => !columns.includes(key));
}

/* ---------- template ---------- */

const REQUIRED_MARK = "Required";
const OPTIONAL_MARK = "Optional";

const SAMPLE_ROWS: ImportRawRow[] = [
  {
    productName: "iPhone 14 Pro",
    productSlug: "iphone-14-pro",
    description: "Certified refurbished iPhone 14 Pro.",
    brand: "Apple",
    category: "smartphones",
    productStatus: "DRAFT",
    warrantyMonths: "12",
    images: "https://example.com/images/iphone-14-pro-front.jpg|https://example.com/images/iphone-14-pro-back.jpg",
    specifications: "Display::Screen size::6.1 in|Display::Type::OLED|Memory::RAM::6 GB",
    sku: "IP14P-128-BLK",
    variantName: "128 GB Space Black",
    condition: "REFURBISHED",
    grade: "EXCELLENT",
    storage: "128 GB",
    colour: "Space Black",
    price: "2499.00",
    compareAtPrice: "2899.00",
    stock: "5",
  },
  {
    productName: "",
    productSlug: "iphone-14-pro",
    description: "",
    brand: "",
    category: "",
    productStatus: "",
    warrantyMonths: "",
    images: "",
    specifications: "",
    sku: "IP14P-256-BLK",
    variantName: "256 GB Space Black",
    condition: "REFURBISHED",
    grade: "EXCELLENT",
    storage: "256 GB",
    colour: "Space Black",
    price: "2799.00",
    compareAtPrice: "",
    stock: "3",
  },
  {
    productName: "AirPods Pro 2",
    productSlug: "airpods-pro-2",
    description: "",
    brand: "Apple",
    category: "audio",
    productStatus: "DRAFT",
    warrantyMonths: "12",
    images: "",
    specifications: "",
    sku: "APP2-WHT",
    variantName: "White",
    condition: "NEW",
    grade: "",
    storage: "",
    colour: "White",
    price: "849.00",
    compareAtPrice: "",
    stock: "20",
  },
];

/** Header row, a Required / Optional row under it, then two sample products. */
export function buildImportTemplate(): string {
  const toLine = (row: ImportRawRow) => IMPORT_COLUMNS.map((column) => row[column.key]);
  return toCsv(
    [
      IMPORT_COLUMNS.map((column) => column.header),
      IMPORT_COLUMNS.map((column) => (column.required ? REQUIRED_MARK : OPTIONAL_MARK)),
      ...SAMPLE_ROWS.map(toLine),
    ],
    [],
  );
}

export const IMPORT_TEMPLATE_FILENAME = "rewire-product-import-template.csv";

/* ---------- reading a file ---------- */

/** Something wrong with the file as a whole; the message is shown as is. */
export class ImportFileError extends Error {}

const UTF8_BOM = "﻿";
const NUL = "\u0000";
const CSV_EXTENSION = /\.csv$/i;

/** Checks that need only the file's name and size, so they run before it is read. */
export function checkImportFile(file: { name: string; size: number }): void {
  if (!CSV_EXTENSION.test(file.name)) throw new ImportFileError("Choose a .csv file.");
  if (file.size === 0) throw new ImportFileError("That file is empty.");
  if (file.size > PRODUCT_IMPORT_MAX_BYTES) {
    throw new ImportFileError(
      `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(PRODUCT_IMPORT_MAX_BYTES)}.`,
    );
  }
}

/** RFC 4180: quoted cells may hold commas, doubled quotes and line breaks. */
export function parseCsv(text: string): string[][] {
  const input = text.startsWith(UTF8_BOM) ? text.slice(1) : text;
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char !== '"') cell += char;
      else if (input[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      record.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++;
      record.push(cell);
      records.push(record);
      record = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (quoted) throw new ImportFileError("The file has a quote that never closes. Check the cell that starts with one.");
  if (cell !== "" || record.length > 0) {
    record.push(cell);
    records.push(record);
  }
  return records;
}

const isBlank = (record: readonly string[]) => record.every((cell) => cell.trim() === "");
const isMarkRow = (record: readonly string[]) =>
  record.some((cell) => cell.trim() !== "") &&
  record.every((cell) => ["", REQUIRED_MARK.toLowerCase(), OPTIONAL_MARK.toLowerCase()].includes(cell.trim().toLowerCase()));

/** Every distinct image address in the rows. */
export function distinctImageUrls(rows: readonly { images: string }[]): string[] {
  const urls = rows.flatMap((row) => row.images.split(IMPORT_LIST_SEPARATOR).map((url) => url.trim()));
  return [...new Set(urls.filter(Boolean))];
}

export interface ParsedImportFile {
  /** The columns the file has, in the template's names. */
  columns: ImportColumnKey[];
  rows: ImportRow[];
}

export function parseImportFile(text: string): ParsedImportFile {
  if (text.includes(NUL)) throw new ImportFileError("That doesn't look like a text CSV file.");

  const records = parseCsv(text);
  const headerIndex = records.findIndex((record) => !isBlank(record));
  if (headerIndex === -1) throw new ImportFileError("That file is empty.");

  const headerRecord = records[headerIndex] ?? [];
  if (headerRecord.length === 1 && /[;\t]/.test(headerRecord[0] ?? "")) {
    throw new ImportFileError("The columns must be separated by commas. In Excel, save the file as CSV (Comma delimited).");
  }

  const keys = headerRecord.map((cell) => {
    const header = cell.trim().toLowerCase();
    const key = HEADER_TO_KEY.get(header);
    if (!key) {
      throw new ImportFileError(`Unknown column “${cell.trim()}”. Download the template to see the columns.`);
    }
    return key;
  });
  if (new Set(keys).size !== keys.length) throw new ImportFileError("The header repeats a column.");

  const rows: ImportRow[] = [];
  const dataStart = isMarkRow(records[headerIndex + 1] ?? []) ? headerIndex + 2 : headerIndex + 1;

  for (let index = dataStart; index < records.length; index++) {
    const record = records[index] ?? [];
    if (isBlank(record)) continue;

    const rowNumber = index + 1;
    if (record.length > keys.length && record.slice(keys.length).some((cell) => cell.trim() !== "")) {
      throw new ImportFileError(`Row ${rowNumber} has more cells than the header has columns.`);
    }

    const row = Object.fromEntries(IMPORT_COLUMN_KEYS.map((key) => [key, ""])) as ImportRawRow;
    keys.forEach((key, position) => {
      const value = (record[position] ?? "").trim();
      if (value.length > PRODUCT_IMPORT_MAX_CELL_LENGTH) {
        throw new ImportFileError(`Row ${rowNumber}: “${importColumnHeader(key)}” is longer than ${PRODUCT_IMPORT_MAX_CELL_LENGTH} characters.`);
      }
      row[key] = value;
    });
    rows.push({ ...row, rowNumber });

    if (rows.length > PRODUCT_IMPORT_MAX_ROWS) {
      throw new ImportFileError(`That file has more than ${PRODUCT_IMPORT_MAX_ROWS} rows. Split it and upload the parts one at a time.`);
    }
  }

  if (rows.length === 0) throw new ImportFileError("The file has a header but no product rows.");
  const images = distinctImageUrls(rows).length;
  if (images > PRODUCT_IMPORT_MAX_IMAGES) {
    throw new ImportFileError(
      `That file lists ${images} different image addresses. The limit is ${PRODUCT_IMPORT_MAX_IMAGES} per file. Split it and upload the parts one at a time.`,
    );
  }
  return { columns: keys, rows };
}

/* ---------- saved imports ---------- */

export const IMPORT_STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "COMPLETED_WITH_ERRORS", "FAILED"] as const;
export type ImportStatus = (typeof IMPORT_STATUSES)[number];

export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  COMPLETED_WITH_ERRORS: "Completed with Errors",
  FAILED: "Failed",
};

export const IMPORT_ROW_STATUSES = ["PENDING", "IMPORTED", "FAILED"] as const;
export type ImportRowStatus = (typeof IMPORT_ROW_STATUSES)[number];

/** An import still has rows to save: Pending, or Processing after a break. */
export const isImportUnfinished = (status: ImportStatus) => status === "PENDING" || status === "PROCESSING";

export const ERROR_REPORT_HEADERS = ["Row", "SKU", "Product", "Reason"] as const;
export const errorReportFilename = (id: string) => `import-${id}-errors.csv`;

/**
 * Asks for the next batch until the import has no rows left. Stops with an
 * error when several batches in a row save nothing, which means the rest are
 * stuck, rather than asking for ever.
 */
export async function runImportToEnd<T extends { id: string; status: ImportStatus; importedRows: number; failedRows: number }>(
  start: T,
  step: (id: string) => Promise<T>,
  onProgress?: (record: T) => void,
): Promise<T> {
  let current = start;
  let stalled = 0;
  while (isImportUnfinished(current.status)) {
    const next = await step(current.id);
    const moved = next.importedRows + next.failedRows !== current.importedRows + current.failedRows;
    stalled = moved || !isImportUnfinished(next.status) ? 0 : stalled + 1;
    if (stalled >= PRODUCT_IMPORT_MAX_STALLED_CALLS) {
      throw new Error("The import isn't making progress. Wait a few minutes, then resume it from Import history.");
    }
    current = next;
    onProgress?.(current);
  }
  return current;
}
