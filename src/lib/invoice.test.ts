import { describe, expect, it } from "vitest";
import { computeInvoice, formatInvoiceNumber, splitInclusive } from "@/lib/invoice";

/** The Wishmaster sample invoice: AED 1208.55 + VAT 60.45 = AED 1269.00. */
const SAMPLE = {
  lines: [
    { description: "Headphones", sku: "WH-1000", quantity: 1, unitIncl: 899_00 },
    { description: "Charger", sku: "CH-65W", quantity: 2, unitIncl: 149_00 },
    { description: "Cable", quantity: 3, unitIncl: 39_00 },
  ],
  deliveryFee: 25_00,
  deliveryLabel: "Delivery",
  discount: 70_00,
  discountLabel: "Discount",
  ratePercent: 5,
};

describe("splitInclusive", () => {
  it("splits a VAT inclusive amount, rounding the excl part half up", () => {
    expect(splitInclusive(899_00, 5)).toEqual({ excl: 856_19, vat: 42_81 });
    expect(splitInclusive(39_00, 5)).toEqual({ excl: 37_14, vat: 1_86 });
  });

  it("puts nothing into VAT at a 0% rate", () => {
    expect(splitInclusive(10_00, 0)).toEqual({ excl: 10_00, vat: 0 });
  });
});

describe("computeInvoice", () => {
  it("matches the sample invoice to the fil", () => {
    const invoice = computeInvoice(SAMPLE);
    expect(invoice.items[1]).toMatchObject({ unitExcl: 141_90, unitVat: 7_10, totalIncl: 298_00 });
    expect(invoice.delivery).toMatchObject({ unitExcl: 23_81, unitVat: 1_19 });
    expect(invoice.discount).toMatchObject({ unitExcl: -66_67, unitVat: -3_33, totalIncl: -70_00 });
    expect(invoice.totalExcl).toBe(1208_55);
    expect(invoice.totalVat).toBe(60_45);
    expect(invoice.totalPayable).toBe(1269_00);
  });

  it("always adds up: excl + VAT = total payable", () => {
    const invoice = computeInvoice(SAMPLE);
    expect(invoice.totalExcl + invoice.totalVat).toBe(invoice.totalPayable);
  });

  it("leaves out free delivery and a zero discount", () => {
    const invoice = computeInvoice({ ...SAMPLE, deliveryFee: 0, discount: 0 });
    expect(invoice.delivery).toBeNull();
    expect(invoice.discount).toBeNull();
  });
});

describe("formatInvoiceNumber", () => {
  it("pads the sequence", () => {
    expect(formatInvoiceNumber(2026, 123)).toBe("INV-2026-000123");
  });
});
