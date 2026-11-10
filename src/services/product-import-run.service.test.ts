import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ImportPreview, ImportPreviewRow } from "@/types/product-import";

const { transaction, createRecord, createRows, validateImport } = vi.hoisted(() => ({
  transaction: vi.fn(),
  createRecord: vi.fn(),
  createRows: vi.fn(),
  validateImport: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ prisma: { $transaction: transaction } }));
vi.mock("@/lib/storage/image-storage", () => ({ imageStorage: {} }));
vi.mock("./audit.service", () => ({ recordAudit: vi.fn() }));
vi.mock("./catalogue.service", () => ({ refreshStorefrontCatalogue: vi.fn() }));
vi.mock("./media.service", () => ({ releaseImage: vi.fn() }));
vi.mock("./product.service", () => ({ createProduct: vi.fn() }));
vi.mock("./product-import.service", () => ({
  assertImportAccess: vi.fn(),
  imageResponseProblem: vi.fn(),
  loadLookups: vi.fn(),
  validateImport,
}));

import { createImport } from "./product-import-run.service";

const USER = { id: "user-1", fullName: "Admin" } as Parameters<typeof createImport>[0];

function previewRow(rowNumber: number, cells: Partial<ImportPreviewRow>): ImportPreviewRow {
  return {
    rowNumber,
    productName: "iPhone",
    productSlug: "iphone",
    sku: `A-${rowNumber}`,
    storage: null,
    colour: null,
    condition: null,
    price: null,
    stock: null,
    action: "CREATE",
    changes: [],
    errors: [],
    ...cells,
  };
}

function preview(mode: ImportPreview["mode"], rows: ImportPreviewRow[]): ImportPreview {
  const invalidRows = rows.filter((row) => row.errors.length > 0).length;
  const skippedRows = rows.filter((row) => row.action === "SKIP").length;
  return { mode, totalRows: rows.length, productCount: 1, validRows: rows.length - invalidRows - skippedRows, invalidRows, skippedRows, rows };
}

const input = (mode: ImportPreview["mode"], count: number) =>
  ({
    mode,
    fileName: "sheet.xlsx",
    columns: [],
    rows: Array.from({ length: count }, (_, index) => ({ rowNumber: index + 3, sku: `A-${index + 3}`, productSlug: "iphone" })),
  }) as unknown as Parameters<typeof createImport>[1];

const BAD_IMAGE = { column: "images" as const, message: "The image couldn't be reached." };
const storedRows = () => createRows.mock.calls[0]?.[0].data as { status?: string; error?: string }[];

beforeEach(() => {
  vi.clearAllMocks();
  createRecord.mockImplementation(async ({ data }) => ({
    ...data,
    id: "import-1",
    status: "PENDING",
    importedRows: 0,
    createdAt: new Date(0),
    completedAt: null,
  }));
  transaction.mockImplementation(async (work) => work({ productImport: { create: createRecord }, productImportRow: { createMany: createRows } }));
});

describe("createImport", () => {
  it("stores valid rows pending, duplicates skipped and invalid rows failed", async () => {
    validateImport.mockResolvedValue(
      preview("CREATE_NEW", [
        previewRow(3, {}),
        previewRow(4, { action: "SKIP" }),
        previewRow(5, { action: null, errors: [{ column: null, message: "Selling price (AED) is required." }] }),
      ]),
    );

    const record = await createImport(USER, input("CREATE_NEW", 3));

    expect(storedRows().map((row) => row.status)).toEqual([undefined, "SKIPPED", "FAILED"]);
    expect(storedRows()[2]?.error).toBe("Selling price (AED) is required.");
    expect(record).toMatchObject({ failedRows: 1, skippedRows: 1 });
  });

  it("does not store as pending a row whose image the check refuses", async () => {
    validateImport.mockImplementation(async (_input, checkImages = true) =>
      preview("CREATE_NEW", [
        previewRow(3, {}),
        checkImages ? previewRow(4, { action: null, errors: [BAD_IMAGE] }) : previewRow(4, {}),
      ]),
    );

    await createImport(USER, input("CREATE_NEW", 2));

    expect(storedRows()[1]?.status).toBe("FAILED");
  });

  it("refuses a file with nothing to import", async () => {
    validateImport.mockResolvedValue(preview("CREATE_NEW", [previewRow(3, { action: "SKIP" })]));
    await expect(createImport(USER, input("CREATE_NEW", 1))).rejects.toThrow("Nothing in this file can be imported");
    expect(createRecord).not.toHaveBeenCalled();
  });

  it("refuses an update with any invalid row", async () => {
    validateImport.mockResolvedValue(
      preview("UPDATE_EXISTING", [
        previewRow(3, { action: "UPDATE" }),
        previewRow(4, { action: null, errors: [{ column: "price", message: "Use a number like 1299.00." }] }),
      ]),
    );
    await expect(createImport(USER, input("UPDATE_EXISTING", 2))).rejects.toThrow("every row");
    expect(createRecord).not.toHaveBeenCalled();
  });
});
