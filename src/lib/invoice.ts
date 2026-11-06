import { INVOICE_NUMBER_PREFIX, INVOICE_SEQUENCE_DIGITS } from "@/lib/constants";
import { CURRENCY, LOCALE } from "@/lib/money";
import type { OrderStatus } from "@/lib/orders";

/**
 * Tax invoice arithmetic, in minor units (fils). Pure, so it is unit tested
 * and shared by the PDF. Rules follow the Wishmaster invoice format
 * (docs/INVOICES.md §4):
 *
 * 1. Prices are VAT inclusive. Each unit is split once, rounding half up:
 *    `excl = round(incl × 100 / (100 + rate))`, `vat = incl − excl`.
 * 2. A row's figures are the unit figures times the quantity.
 * 3. Delivery and the discount are split the same way.
 * 4. The VAT summary adds up the rounded rows, so the printed figures
 *    always add up on paper.
 */

export interface InvoiceLineInput {
  description: string;
  sku?: string;
  quantity: number;
  /** VAT inclusive unit price. */
  unitIncl: number;
}

export interface InvoiceRow {
  description: string;
  sku?: string;
  quantity: number;
  unitExcl: number;
  unitVat: number;
  unitIncl: number;
  /** VAT inclusive row total; negative for a discount. */
  totalIncl: number;
}

export interface InvoiceTotals {
  items: InvoiceRow[];
  delivery: InvoiceRow | null;
  discount: InvoiceRow | null;
  totalExcl: number;
  totalVat: number;
  totalPayable: number;
}

export function splitInclusive(incl: number, ratePercent: number): { excl: number; vat: number } {
  const excl = Math.round((incl * 100) / (100 + ratePercent));
  return { excl, vat: incl - excl };
}

function row(line: InvoiceLineInput, ratePercent: number, sign = 1): InvoiceRow {
  const { excl, vat } = splitInclusive(line.unitIncl, ratePercent);
  return {
    description: line.description,
    sku: line.sku,
    quantity: line.quantity,
    unitExcl: sign * excl,
    unitVat: sign * vat,
    unitIncl: sign * line.unitIncl,
    totalIncl: sign * line.unitIncl * line.quantity,
  };
}

export function computeInvoice(input: {
  lines: InvoiceLineInput[];
  deliveryFee: number;
  deliveryLabel: string;
  discount: number;
  discountLabel: string;
  ratePercent: number;
}): InvoiceTotals {
  const { ratePercent } = input;
  const items = input.lines.map((line) => row(line, ratePercent));
  const delivery =
    input.deliveryFee > 0
      ? row({ description: input.deliveryLabel, quantity: 1, unitIncl: input.deliveryFee }, ratePercent)
      : null;
  const discount =
    input.discount > 0
      ? row({ description: input.discountLabel, quantity: 1, unitIncl: input.discount }, ratePercent, -1)
      : null;

  const rows = [...items, ...(delivery ? [delivery] : []), ...(discount ? [discount] : [])];
  return {
    items,
    delivery,
    discount,
    totalExcl: rows.reduce((sum, r) => sum + r.unitExcl * r.quantity, 0),
    totalVat: rows.reduce((sum, r) => sum + r.unitVat * r.quantity, 0),
    totalPayable: rows.reduce((sum, r) => sum + r.totalIncl, 0),
  };
}

/** `INV-2026-000123`: the issue year and the store wide sequence. */
export function formatInvoiceNumber(year: number, sequence: number): string {
  return `${INVOICE_NUMBER_PREFIX}${year}-${String(sequence).padStart(INVOICE_SEQUENCE_DIGITS, "0")}`;
}

/**
 * An order has an invoice once it is confirmed: not while awaiting card
 * payment, and never once cancelled. The buttons and the API both use this.
 */
export function isInvoiceable(status: OrderStatus): boolean {
  return status !== "PENDING_PAYMENT" && status !== "CANCELLED";
}

const invoiceMoney = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** `AED 1,269.00`: always two decimals, unlike `formatMoney`. */
export function formatInvoiceMoney(minor: number): string {
  return `${CURRENCY} ${invoiceMoney.format(minor / 100)}`;
}
