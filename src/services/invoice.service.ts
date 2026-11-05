import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { Prisma } from "@/generated/prisma/client";
import { InvoiceDocument, type InvoiceDocumentData } from "@/components/invoice/invoice-document";
import { ServiceError } from "@/lib/api/api-response";
import { conditionLabel, gradeLabel } from "@/lib/catalogue";
import { INVOICE_FOOTER_NOTE, INVOICE_TITLE, SUPPORT_PAGE_PATH } from "@/lib/constants";
import { formatInvoiceDate, storeToday } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { emirateLabel } from "@/lib/emirates";
import {
  computeInvoice,
  formatInvoiceMoney,
  formatInvoiceNumber,
  isInvoiceable,
  type InvoiceLineInput,
} from "@/lib/invoice";
import { accountOrdersWhere, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/orders";
import { brandLogo, siteConfig } from "@/lib/site";
import { getInvoiceSettings, nextInvoiceSequence } from "@/services/store-settings.service";
import type { InvoiceSettingsView } from "@/types/invoice";

/**
 * Tax invoices for orders (docs/INVOICES.md). An invoice exists once the
 * order is confirmed; its sequential number is assigned the first time
 * anyone downloads it and never changes after that. Every download renders
 * the PDF afresh from the order's stored figures, so nothing is cached.
 */

const TAX_NAME = "VAT";
/** The delivery row's label, as on the Wishmaster invoice. */
const SHIPPING_LABEL = "Shipping Charges";
/** The PDF is rendered on the server, so the logo is read from `public/` once, on first use. */
let logo: Buffer | null = null;
function logoBytes(): Buffer {
  logo ??= readFileSync(path.join(process.cwd(), "public", brandLogo.onLight));
  return logo;
}

const invoiceOrderSelect = {
  id: true,
  number: true,
  status: true,
  paymentStatus: true,
  paymentMethod: true,
  createdAt: true,
  deliveredAt: true,
  firstName: true,
  lastName: true,
  phone: true,
  address1: true,
  address2: true,
  city: true,
  emirate: true,
  deliveryMethod: true,
  deliveryFee: true,
  discount: true,
  couponCode: true,
  vatRatePercent: true,
  invoiceNumber: true,
  invoiceIssuedAt: true,
  items: {
    select: {
      productName: true,
      brandName: true,
      sku: true,
      storage: true,
      colour: true,
      condition: true,
      grade: true,
      unitPrice: true,
      quantity: true,
      addOns: { select: { name: true, price: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.OrderSelect;

type InvoiceOrder = Prisma.OrderGetPayload<{ select: typeof invoiceOrderSelect }>;

export interface RenderedInvoice {
  fileName: string;
  pdf: Buffer;
}

/** The signed in customer's invoice; 404 for anyone else's order. */
export function renderAccountInvoice(
  viewer: { id: string; emailVerified: boolean },
  number: string,
): Promise<RenderedInvoice> {
  return renderInvoice({ number, ...accountOrdersWhere(viewer) });
}

/** Any order's invoice, for staff with access to Orders. */
export function renderAdminInvoice(number: string): Promise<RenderedInvoice> {
  return renderInvoice({ number });
}

async function renderInvoice(where: Prisma.OrderWhereInput): Promise<RenderedInvoice> {
  const order = await prisma.order.findFirst({ where, select: invoiceOrderSelect });
  if (!order) throw new ServiceError("NOT_FOUND", "We couldn't find that order.", 404);
  if (!isInvoiceable(order.status)) {
    throw new ServiceError("CONFLICT", "The invoice is available once the order is confirmed.", 409);
  }

  const issued =
    order.invoiceNumber && order.invoiceIssuedAt
      ? { invoiceNumber: order.invoiceNumber, issuedAt: order.invoiceIssuedAt }
      : await issueInvoice(order.id);

  const data = toDocumentData(order, issued, await getInvoiceSettings());
  // `InvoiceDocument` renders a <Document>; renderToBuffer's type only accepts that element directly.
  const pdf = await renderToBuffer(createElement(InvoiceDocument, { data }) as ReactElement<DocumentProps>);
  return { fileName: `Rewire-${issued.invoiceNumber}.pdf`, pdf };
}

class AlreadyIssued extends Error {}

/**
 * Stamps the order with the next invoice number. Raising the counter locks
 * the settings row, so a second request for the same order waits here, then
 * sees the number the first one committed, and rolls back its own raise:
 * no number is ever skipped or given twice.
 */
async function issueInvoice(orderId: string): Promise<{ invoiceNumber: string; issuedAt: Date }> {
  try {
    return await prisma.$transaction(async (tx) => {
      const sequence = await nextInvoiceSequence(tx);
      const current = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        select: { invoiceNumber: true },
      });
      if (current.invoiceNumber) throw new AlreadyIssued();

      const issuedAt = new Date();
      const invoiceNumber = formatInvoiceNumber(Number(storeToday(issuedAt).slice(0, 4)), sequence);
      await tx.order.update({ where: { id: orderId }, data: { invoiceNumber, invoiceIssuedAt: issuedAt } });
      return { invoiceNumber, issuedAt };
    });
  } catch (error) {
    if (!(error instanceof AlreadyIssued)) throw error;
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { invoiceNumber: true, invoiceIssuedAt: true },
    });
    return { invoiceNumber: order.invoiceNumber!, issuedAt: order.invoiceIssuedAt! };
  }
}

function itemLines(order: InvoiceOrder): InvoiceLineInput[] {
  return order.items.flatMap((item) => {
    const details = [
      item.storage,
      item.colour,
      conditionLabel(item.condition),
      item.grade ? gradeLabel(item.grade) : null,
    ].filter(Boolean);
    const product: InvoiceLineInput = {
      description: `${item.brandName} ${item.productName}${details.length ? ` (${details.join(", ")})` : ""}`,
      sku: item.sku || undefined,
      quantity: item.quantity,
      unitIncl: item.unitPrice,
    };
    const addOns = item.addOns.map((addOn) => ({
      description: `${addOn.name} (add-on)`,
      quantity: item.quantity,
      unitIncl: addOn.price,
    }));
    return [product, ...addOns];
  });
}


function toDocumentData(
  order: InvoiceOrder,
  issued: { invoiceNumber: string; issuedAt: Date },
  settings: InvoiceSettingsView,
): InvoiceDocumentData {
  const totals = computeInvoice({
    lines: itemLines(order),
    deliveryFee: order.deliveryFee,
    deliveryLabel: SHIPPING_LABEL,
    discount: order.discount,
    discountLabel: order.couponCode ? `Discount (${order.couponCode})` : "Discount",
    ratePercent: order.vatRatePercent,
  });

  const sellerName = settings.sellerName || siteConfig.name;
  const website = siteConfig.url.replace(/^https?:\/\//, "");
  const vat = settings.sellerTrn ? `${TAX_NAME}: ${settings.sellerTrn}` : null;
  const contact = [settings.sellerEmail, website].filter(Boolean).join(" | ");

  return {
    logo: logoBytes(),
    title: INVOICE_TITLE,
    invoiceNumber: issued.invoiceNumber,
    issueDate: formatInvoiceDate(issued.issuedAt),
    orderNumber: order.number,
    orderDate: formatInvoiceDate(order.createdAt),
    deliveredOn: order.deliveredAt ? formatInvoiceDate(order.deliveredAt) : null,
    customer: {
      name: `${order.firstName} ${order.lastName}`.trim(),
      lines: [order.address1, order.address2, order.city, emirateLabel(order.emirate), order.phone].filter(Boolean),
    },
    seller: {
      name: sellerName,
      address: settings.sellerAddress,
      vat,
      email: settings.sellerEmail,
      website,
      supportUrl: `${siteConfig.url}${SUPPORT_PAGE_PATH}`,
    },
    footer: {
      left: [sellerName, settings.sellerAddress].filter(Boolean),
      right: [vat ?? "", contact].filter(Boolean),
      note: INVOICE_FOOTER_NOTE,
    },
    taxName: TAX_NAME,
    ratePercent: order.vatRatePercent,
    rows: totals.items,
    delivery: totals.delivery,
    discount: totals.discount,
    totals: { excl: totals.totalExcl, vat: totals.totalVat, payable: totals.totalPayable },
    payment: {
      method: PAYMENT_METHOD_LABELS[order.paymentMethod],
      status: PAYMENT_STATUS_LABELS[order.paymentStatus],
    },
    terms: settings.terms
      .split("\n")
      .map((term) => term.trim())
      .filter(Boolean),
    money: formatInvoiceMoney,
  };
}
