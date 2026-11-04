import type { ImportColumnKey, ImportMode } from "@/lib/product-import";

export type ImportAction = "CREATE" | "UPDATE";

export interface ImportRowError {
  /** The column at fault, or null when the whole row is. */
  column: ImportColumnKey | null;
  message: string;
}

/** One CSV row as the preview shows it. For an update, the values after the change. */
export interface ImportPreviewRow {
  rowNumber: number;
  productName: string;
  productSlug: string;
  sku: string;
  storage: string | null;
  colour: string | null;
  condition: string | null;
  /** Minor units, or null when the cell is blank or not a price. */
  price: number | null;
  stock: number | null;
  /** Null while the row has errors. */
  action: ImportAction | null;
  /** For an update: what differs from the stored variant and product. */
  changes: string[];
  errors: ImportRowError[];
}

export interface ImportPreview {
  mode: ImportMode;
  totalRows: number;
  productCount: number;
  validRows: number;
  invalidRows: number;
  rows: ImportPreviewRow[];
}
