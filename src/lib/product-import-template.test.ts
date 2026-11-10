import path from "node:path";
import { readSheet } from "read-excel-file/node";
import { describe, expect, it } from "vitest";
import { PRODUCT_IMPORT_EXCEL_TEMPLATE_PATH, PRODUCT_IMPORT_MAX_ROWS } from "@/lib/constants";
import { ImportFileError, IMPORT_COLUMN_KEYS } from "./product-import";
import { TEMPLATE_HEADERS, parseTemplateSheet } from "./product-import-template";

type Cells = Record<string, unknown>;

const SECTION_ROW = ["Identity"];
const headerRow = () => TEMPLATE_HEADERS.map((header) => `${header} *`);
const toRecord = (cells: Cells) => TEMPLATE_HEADERS.map((header) => cells[header] ?? null);
const sheet = (...rows: Cells[]) => [SECTION_ROW, headerRow(), ...rows.map(toRecord)];

const SIMPLE: Cells = {
  "Product type": "Simple",
  "Product code (SKU)": "rw-mba-m2-13",
  "GTIN / barcode": 194253082194,
  "Product name": "MacBook Air 13-inch (M2, 2022)",
  Brand: "Apple",
  Category: "Laptops",
  "Short description": "Thin, fanless and silent.",
  "Full description": "The first redesign of the Air.",
  Highlights: "8-core M2 chip\n15-hour battery",
  "Key specifications": "Chip: Apple M2, 8-core\nMemory: 8GB",
  "Condition grade": "Grade A · Pristine",
  "Battery health (%)": 98,
  Warranty: "12 months Rewire warranty",
  "What's in the box": "MacBook Air\nCharger",
  "Selling price (AED)": 3499,
  "Price when new (AED)": 4999,
  "Stock on hand": 6,
  "Visible on site": "Yes",
  "Image files or URLs": "https://example.com/1.jpg, https://example.com/2.jpg",
  "Image alt texts": "Open at an angle, Lid closed",
  "Attribute 1 name": "Chip",
  "Attribute 1 value": "Apple M2",
  "Attribute 1 defines variant": "No",
  "Attribute 2 name": "Colour",
  "Attribute 2 value": "Midnight",
  "Attribute 2 defines variant": "No",
  "SEO title": "Refurbished MacBook Air",
  "Meta description": "Certified refurbished.",
  "Focus keyword": "refurbished macbook air",
};

const PARENT: Cells = {
  "Product type": "Parent",
  "Product code (SKU)": "RW-IP14P",
  "Product name": "iPhone 14 Pro",
  Brand: "Apple",
  Category: "Phones",
  "Short description": "The always-on generation.",
  "Full description": "One cycle back from current.",
  Warranty: "12 months Rewire warranty",
  "Visible on site": "Yes",
  "Image files or URLs": "https://example.com/parent.jpg",
  "Image alt texts": "Standing upright",
};

const variant = (colour: string, storage: string, cells: Cells = {}): Cells => ({
  "Product type": "Variant",
  "Product code (SKU)": "RW-IP14P",
  "Product name": "iPhone 14 Pro",
  "Condition grade": "Grade B · Excellent",
  "Selling price (AED)": 2499,
  "Price when new (AED)": 4299,
  "Stock on hand": 5,
  "Image files or URLs": `https://example.com/${colour}.jpg`,
  "Image alt texts": `In ${colour}`,
  "Attribute 1 name": "Storage",
  "Attribute 1 value": storage,
  "Attribute 1 defines variant": "Yes",
  "Attribute 2 name": "Colour",
  "Attribute 2 value": colour,
  "Attribute 2 defines variant": "Yes",
  ...cells,
});

const parse = (...rows: Cells[]) => parseTemplateSheet(sheet(...rows));
const errorsOf = (...rows: Cells[]) => parse(...rows).rows.map((row) => row.templateErrors);

describe("the Excel sheet the upload page offers", () => {
  it("has the columns the upload reads and no products", async () => {
    const file = path.join(process.cwd(), "public", PRODUCT_IMPORT_EXCEL_TEMPLATE_PATH);
    const records = await readSheet(file, "Products");
    expect(() => parseTemplateSheet(records)).toThrow("no product rows");
  });
});

describe("parseTemplateSheet file checks", () => {
  it("marks the file as Excel with every required column", () => {
    const parsed = parse(SIMPLE);
    expect(parsed.source).toBe("XLSX");
    expect(parsed.columns).toEqual(IMPORT_COLUMN_KEYS);
  });

  it("refuses a renamed column", () => {
    const headers = headerRow();
    headers[3] = "Name";
    expect(() => parseTemplateSheet([SECTION_ROW, headers, toRecord(SIMPLE)])).toThrow(ImportFileError);
  });

  it("refuses a sheet with no product rows", () => {
    expect(() => parseTemplateSheet(sheet())).toThrow("no product rows");
  });

  it("refuses more rows than the limit", () => {
    const rows = Array.from({ length: PRODUCT_IMPORT_MAX_ROWS + 1 }, (_, index) => ({
      ...SIMPLE,
      "Product code (SKU)": `C-${index}`,
    }));
    expect(() => parse(...rows)).toThrow("more than");
  });

  it("numbers rows as Excel does and ignores blank ones", () => {
    const parsed = parseTemplateSheet([SECTION_ROW, headerRow(), toRecord({}), toRecord(SIMPLE)]);
    expect(parsed.rows.map((row) => row.rowNumber)).toEqual([4]);
  });
});

describe("parseTemplateSheet Simple rows", () => {
  const [row] = parse(SIMPLE).rows;

  it("has no errors", () => {
    expect(row?.templateErrors).toEqual([]);
  });

  it("upper-cases the SKU", () => {
    expect(row?.sku).toBe("RW-MBA-M2-13");
  });

  it("generates the slug from the name", () => {
    expect(row?.productSlug).toBe("macbook-air-13-inch-m2-2022");
  });

  it("keeps a slug given in the sheet", () => {
    expect(parse({ ...SIMPLE, "URL slug (optional)": "macbook-air" }).rows[0]?.productSlug).toBe("macbook-air");
  });

  it("maps the product cells", () => {
    expect(row).toMatchObject({
      productName: "MacBook Air 13-inch (M2, 2022)",
      brand: "Apple",
      category: "Laptops",
      gtin: "194253082194",
      shortDescription: "Thin, fanless and silent.",
      description: "The first redesign of the Air.",
      highlights: "8-core M2 chip|15-hour battery",
      included: "MacBook Air|Charger",
      warrantyMonths: "12",
      productStatus: "PUBLISHED",
      seoTitle: "Refurbished MacBook Air",
      metaDescription: "Certified refurbished.",
      focusKeyword: "refurbished macbook air",
    });
  });

  it("maps the variant cells", () => {
    expect(row).toMatchObject({
      condition: "REFURBISHED",
      grade: "PREMIUM",
      batteryHealth: "98",
      price: "3499",
      compareAtPrice: "4999",
      stock: "6",
      colour: "Midnight",
      storage: "",
    });
  });

  it("makes specifications from the key specifications and plain attributes", () => {
    expect(row?.specifications).toBe(
      "Specifications::Chip::Apple M2, 8-core|Specifications::Memory::8GB",
    );
  });

  it("keeps a plain attribute whose label isn't already a specification", () => {
    const sheetRow = { ...SIMPLE, "Attribute 1 name": "Port" , "Attribute 1 value": "MagSafe 3" };
    expect(parse(sheetRow).rows[0]?.specifications).toContain("Specifications::Port::MagSafe 3");
  });

  it("lists images with their alt text and no colour", () => {
    expect(row).toMatchObject({
      images: "https://example.com/1.jpg|https://example.com/2.jpg",
      imageAlts: "Open at an angle|Lid closed",
      imageColours: "|",
    });
  });

  it("maps a hidden product to draft", () => {
    expect(parse({ ...SIMPLE, "Visible on site": "No" }).rows[0]?.productStatus).toBe("DRAFT");
  });

  it.each([
    ["Grade A · Pristine", "PREMIUM"],
    ["Grade B · Excellent", "EXCELLENT"],
    ["Grade C · Good", "GOOD"],
  ])("maps %s", (grade, expected) => {
    expect(parse({ ...SIMPLE, "Condition grade": grade }).rows[0]?.grade).toBe(expected);
  });

  it.each([
    ["24 months", "24"],
    ["1 year Rewire warranty", "12"],
    ["2 years", "24"],
  ])("reads the warranty %s", (warranty, months) => {
    expect(parse({ ...SIMPLE, Warranty: warranty }).rows[0]?.warrantyMonths).toBe(months);
  });

  it("drops a price when new equal to the selling price", () => {
    expect(parse({ ...SIMPLE, "Price when new (AED)": 3499 }).rows[0]?.compareAtPrice).toBe("");
  });
});

describe("parseTemplateSheet Parent and Variant rows", () => {
  const { rows } = parse(PARENT, variant("Space Black", "256GB"), variant("Silver", "128GB"));

  it("makes one row per variant and none for the Parent", () => {
    expect(rows.map((row) => row.rowNumber)).toEqual([4, 5]);
  });

  it("generates hyphenated SKUs from the attributes that define the variant", () => {
    expect(rows.map((row) => row.sku)).toEqual(["RW-IP14P-256GB-SPACE-BLACK", "RW-IP14P-128GB-SILVER"]);
  });

  it("removes characters a SKU can't hold", () => {
    expect(parse(PARENT, variant("(PRODUCT)RED", "64 GB")).rows[0]?.sku).toBe("RW-IP14P-64-GB-PRODUCT-RED");
  });

  it("writes product cells on the first variant only", () => {
    expect(rows[0]).toMatchObject({ brand: "Apple", shortDescription: "The always-on generation.", productStatus: "PUBLISHED" });
    expect(rows[1]).toMatchObject({ brand: "", shortDescription: "", productStatus: "" });
  });

  it("repeats the name and slug on every variant", () => {
    expect(rows.map((row) => row.productSlug)).toEqual(["iphone-14-pro", "iphone-14-pro"]);
    expect(rows[1]?.productName).toBe("iPhone 14 Pro");
  });

  it("records the Parent's row number", () => {
    expect(rows.map((row) => row.parentRowNumber)).toEqual([3, 3]);
  });

  it("takes each variant's own options and price", () => {
    expect(rows[1]).toMatchObject({ storage: "128GB", colour: "Silver", grade: "EXCELLENT", price: "2499", stock: "5" });
  });

  it("combines images, tagging a variant's image with its colour", () => {
    expect(rows[0]).toMatchObject({
      images: "https://example.com/parent.jpg|https://example.com/Space Black.jpg|https://example.com/Silver.jpg",
      imageAlts: "Standing upright|In Space Black|In Silver",
      imageColours: "|Space Black|Silver",
    });
  });

  it("lists an image shared by two storage sizes once", () => {
    const { rows: shared } = parse(PARENT, variant("Black", "128GB"), variant("Black", "256GB"));
    expect(shared[0]?.images).toBe("https://example.com/parent.jpg|https://example.com/Black.jpg");
    expect(shared[0]?.imageColours).toBe("|Black");
  });

  it("leaves untagged an image two colours share", () => {
    const same = { "Image files or URLs": "https://example.com/same.jpg", "Image alt texts": "" };
    const { rows: shared } = parse(PARENT, variant("Black", "128GB", same), variant("White", "128GB", same));
    expect(shared[0]?.imageColours).toBe("|");
  });

  it("leaves the Parent's stock blank without an error", () => {
    expect(rows[0]?.templateErrors).toEqual([]);
  });
});

describe("parseTemplateSheet linking a Variant to its Parent", () => {
  it("links by product name and keeps the variant's own SKU", () => {
    const { rows } = parse(PARENT, variant("Black", "64 GB", { "Product code (SKU)": "sku-001" }));
    expect(rows[0]).toMatchObject({ sku: "SKU-001", parentRowNumber: 3, brand: "Apple", templateErrors: [] });
  });

  it("rejects a Variant with no Parent", () => {
    const [errors] = errorsOf(variant("Black", "64 GB"));
    expect(errors).toEqual(["No Parent row has this product code or product name."]);
  });

  it("reports a Variant's blank cells as well as its missing Parent", () => {
    const [errors] = errorsOf(variant("Black", "64 GB", { "Stock on hand": null }));
    expect(errors).toEqual(["No Parent row has this product code or product name.", "Stock on hand is required."]);
  });

  it("rejects a name shared by two Parents", () => {
    const second = { ...PARENT, "Product code (SKU)": "RW-OTHER" };
    const errors = errorsOf(PARENT, second, variant("Black", "64 GB", { "Product code (SKU)": "SKU-1" }));
    expect(errors.flat()).toContain("More than one Parent row has this product name. Repeat the Parent's code on this row.");
  });

  it("rejects a Parent with no variants", () => {
    expect(errorsOf(PARENT)).toEqual([["This Parent row has no Variant rows."]]);
  });

  it("rejects both Parents that share a code, and their Variants", () => {
    const parsed = parse(
      PARENT,
      variant("Black", "64 GB"),
      { ...PARENT, "Product name": "iPhone 15" },
      variant("Blue", "256 GB", { "Product name": "iPhone 15" }),
    );
    expect(parsed.rows.map((row) => row.templateErrors)).toEqual([
      ["More than one Parent row uses this product code."],
      ["More than one Parent row uses this product code."],
      ["More than one Parent row uses this product code."],
      ["More than one Parent row uses this product code."],
    ]);
  });

  it("rejects a Variant with a Parent's code and another product's name", () => {
    const errors = errorsOf(PARENT, variant("Black", "64 GB", { "Product name": "iPhone 15" }));
    expect(errors.flat()).toContain("This row uses the code of the Parent on row 3 but a different product name.");
  });

  it("links a Variant with a blank name by its code", () => {
    const { rows } = parse(PARENT, variant("Black", "64 GB", { "Product name": null }));
    expect(rows[0]).toMatchObject({ parentRowNumber: 3, templateErrors: [] });
  });

  it("reports a Variant linked by name to a Parent whose code is repeated", () => {
    const own = { "Product code (SKU)": "SKU-9", "Product name": "iPhone 15" };
    const { rows } = parse(
      PARENT,
      variant("Black", "64 GB"),
      { ...PARENT, "Product name": "iPhone 15" },
      variant("Blue", "256 GB", own),
    );
    expect(rows.map((row) => row.rowNumber)).toEqual([3, 4, 5, 6]);
    expect(rows[3]?.templateErrors).toEqual(["Its Parent row uses a product code another Parent also uses."]);
  });

  it("rejects a hidden Variant under a visible Parent", () => {
    const [errors] = errorsOf(PARENT, variant("Black", "64 GB", { "Visible on site": "No" }));
    expect(errors).toEqual(["Visible on site is No here but Yes on its Parent. A product is shown or hidden as a whole."]);
  });

  it("rejects two products that would share a URL slug", () => {
    const second = { ...SIMPLE, "Product code (SKU)": "RW-OTHER" };
    const message = "URL slug (optional): another product in this file has the same one. Enter a different one.";
    expect(errorsOf(SIMPLE, second)).toEqual([[message], [message]]);
  });

  it("rejects an unknown product type", () => {
    expect(errorsOf({ ...SIMPLE, "Product type": "Bundle" })).toEqual([["Product type must be Simple, Parent or Variant."]]);
  });
});

describe("parseTemplateSheet required and invalid cells", () => {
  it.each([
    "Product name",
    "Brand",
    "Category",
    "Short description",
    "Full description",
    "Warranty",
    "Visible on site",
    "Condition grade",
    "Selling price (AED)",
    "Stock on hand",
    "Image files or URLs",
  ])("requires %s on a Simple row", (header) => {
    expect(errorsOf({ ...SIMPLE, [header]: null })[0]).toContain(`${header} is required.`);
  });

  it("names the Parent row on the Parent's blank cells", () => {
    const [errors] = errorsOf({ ...PARENT, "Short description": null }, variant("Black", "64 GB"));
    expect(errors).toEqual(["Parent row 3: Short description is required."]);
  });

  it("accepts images on the Variant rows alone", () => {
    const parent = { ...PARENT, "Image files or URLs": null, "Image alt texts": null };
    expect(errorsOf(parent, variant("Black", "64 GB"))).toEqual([[]]);
  });

  it("requires an image somewhere on the product", () => {
    const parent = { ...PARENT, "Image files or URLs": null, "Image alt texts": null };
    const bare = variant("Black", "64 GB", { "Image files or URLs": null, "Image alt texts": null });
    expect(errorsOf(parent, bare)).toEqual([["Parent row 3: Image files or URLs is required."]]);
  });

  it("rejects a grade outside the list", () => {
    expect(errorsOf({ ...SIMPLE, "Condition grade": "Mint" })[0]).toEqual([
      "Condition grade must be Grade A · Pristine, Grade B · Excellent or Grade C · Good.",
    ]);
  });

  it("rejects a warranty with no length", () => {
    expect(errorsOf({ ...SIMPLE, Warranty: "Rewire warranty" })[0]).toEqual(["Warranty must start with a length, like 12 months."]);
  });

  it("rejects a visibility that isn't Yes or No", () => {
    expect(errorsOf({ ...SIMPLE, "Visible on site": "Maybe" })[0]).toEqual(["Visible on site must be Yes or No."]);
  });

  it("rejects a specification line with no label", () => {
    expect(errorsOf({ ...SIMPLE, "Key specifications": "Memory 8GB" })[0]).toEqual([
      "Key specifications: line 1 should look like Label: Value.",
    ]);
  });

  it("rejects alt texts that don't match the images", () => {
    expect(errorsOf({ ...SIMPLE, "Image alt texts": "Only one" })[0]).toEqual([
      "Image alt texts: 1 for 2 images. Give one per image, or leave it blank.",
    ]);
  });

  it("rejects an attribute that can't define a variant", () => {
    const bad = variant("Black", "64 GB", {
      "Attribute 3 name": "Size",
      "Attribute 3 value": "Large",
      "Attribute 3 defines variant": "Yes",
    });
    expect(errorsOf(PARENT, bad)[0]).toEqual(["Attribute 3 can't define a variant. Only Storage and Colour can."]);
  });

  it("rejects an attribute with a name and no value", () => {
    expect(errorsOf({ ...SIMPLE, "Attribute 3 name": "Port" })[0]).toEqual(["Attribute 3 has a name but no value."]);
  });
});

describe("parseTemplateSheet notices", () => {
  it("says nothing when no ignored column is filled", () => {
    expect(parse(SIMPLE).notices).toEqual([]);
  });

  it("names each filled column that isn't imported", () => {
    expect(parse({ ...SIMPLE, Featured: "Yes", "Weight (kg)": 1.9 }).notices).toEqual([
      "Featured: filled on 1 row, not imported.",
      "Weight (kg): filled on 1 row, not imported.",
    ]);
  });

  it("points a promo at Campaigns", () => {
    expect(parse({ ...SIMPLE, "Promo discount": 500, "Discount type": "Amount" }).notices).toEqual([
      "Promo discount: filled on 1 row, not imported. Set up a Campaign after the import.",
    ]);
  });

  it("ignores a promo of zero", () => {
    expect(parse({ ...SIMPLE, "Promo discount": 0 }).notices).toEqual([]);
  });
});
