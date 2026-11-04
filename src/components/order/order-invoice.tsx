"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { useGetAccountOrder } from "@/hooks/use-order";
import { ApiError } from "@/lib/api/api-client";
import { ACCOUNT_ORDERS_PATH, SUPPORT_PAGE_PATH } from "@/lib/constants";
import { formatOrderDate } from "@/lib/dates";
import { emirateLabel } from "@/lib/emirates";
import { formatMoney } from "@/lib/money";
import { invoiceNumber, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/orders";
import { vatIncludedIn } from "@/lib/pricing/price-cart";
import { CONDITION_META, GRADE_META } from "@/lib/shop";
import { siteConfig } from "@/lib/site";
import { supportContact } from "@/lib/support";
import type { OrderDetail, OrderLine } from "@/types/order";

/**
 * OrderInvoice — the tax invoice of one account order, laid out after the
 * Wishmaster invoice: customer and a dark "Tax Invoice" summary box on top,
 * billing / delivery / seller columns, order information, then the item
 * table with VAT split out per unit, and the totals.
 *
 * Everything comes from `useGetAccountOrder`; nothing is typed in. The sheet
 * renders in the light palette (`admin-theme` pinned to light) whatever the
 * storefront theme, because an invoice is paper. "Download PDF" opens the
 * browser's print dialog, where the A4 `@page` rule in `globals.css` and the
 * `print:` utilities here produce a clean one sheet per page PDF; the
 * toolbar is hidden from the print.
 *
 * Long product names and addresses wrap (`break-words`) instead of
 * widening the table, and table rows never split across a page break.
 */
export function OrderInvoice({ number }: { number: string }) {
  const order = useGetAccountOrder(number);

  return (
    <div className="admin-theme min-h-dvh bg-surface-2 print:bg-transparent" data-theme="light">
      <div className="mx-auto max-w-[52rem] px-4 py-6 print:max-w-none print:p-0 sm:py-10">
        <Toolbar canPrint={order.isSuccess} />
        {order.isPending ? (
          <div aria-hidden className="skeleton h-[60rem] rounded-xl" />
        ) : order.isError ? (
          <InvoiceError error={order.error} onRetry={() => order.refetch()} />
        ) : (
          <InvoiceSheet order={order.data} />
        )}
      </div>
    </div>
  );
}

function Toolbar({ canPrint }: { canPrint: boolean }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Link href={ACCOUNT_ORDERS_PATH} className="text-[0.8125rem] font-medium text-ink-secondary hover:text-ink">
        ← All orders
      </Link>
      <Button size="sm" disabled={!canPrint} onClick={() => window.print()}>
        Download PDF
      </Button>
    </div>
  );
}

function InvoiceError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const notFound = error instanceof ApiError && error.body.code === "NOT_FOUND";
  return (
    <div role="alert" className="rounded-xl border border-line bg-void p-8 text-center">
      <p className="text-[0.9375rem] text-ink-secondary">{error.message}</p>
      {!notFound && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ============================================================
   The sheet
   ============================================================ */

function InvoiceSheet({ order }: { order: OrderDetail }) {
  const { contact, totals } = order;
  const customerName = `${contact.firstName} ${contact.lastName}`.trim();

  return (
    <article className="rounded-xl border border-line bg-void p-6 text-[0.75rem] leading-relaxed text-ink shadow-(--shadow-soft) print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-10">
      {/* ---------- Customer and summary box ---------- */}
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Logo />
          <p className="mt-5 font-semibold uppercase">{customerName}</p>
          <AddressLines order={order} />
          <p className="mt-3 text-ink-secondary">
            For questions about your order, visit{" "}
            <a href={`${siteConfig.url}${SUPPORT_PAGE_PATH}`} className="break-all text-accent underline">
              {siteConfig.url.replace(/^https?:\/\//, "")}
              {SUPPORT_PAGE_PATH}
            </a>
          </p>
        </div>

        <dl className="w-full shrink-0 rounded-lg bg-accent p-4 text-white [print-color-adjust:exact] sm:w-64">
          <p className="mb-2 text-[1rem] font-semibold">Tax Invoice</p>
          <SummaryRow label="Issue Date" value={formatOrderDate(order.placedAt)} />
          <SummaryRow label="Invoice No" value={invoiceNumber(order.number)} />
          <SummaryRow label="Total Payable" value={formatMoney(totals.total)} />
        </dl>
      </header>

      {/* ---------- Billing, delivery, seller ---------- */}
      <section className="mt-8 grid gap-6 border-t border-line pt-6 sm:grid-cols-3">
        <div className="min-w-0">
          <ColumnTitle>Billing Address</ColumnTitle>
          <p>{customerName}</p>
          <AddressLines order={order} />
        </div>
        <div className="min-w-0">
          <ColumnTitle>Delivery Address</ColumnTitle>
          <p>{customerName}</p>
          <AddressLines order={order} />
        </div>
        <div className="min-w-0">
          <ColumnTitle>Sold by</ColumnTitle>
          <p>{siteConfig.name}</p>
          <p className="break-words">
            Email:{" "}
            <a href={`mailto:${supportContact.email}`} className="text-accent underline">
              {supportContact.email}
            </a>
          </p>
          <p className="break-words">
            Website:{" "}
            <a href={siteConfig.url} className="text-accent underline">
              {siteConfig.url.replace(/^https?:\/\//, "")}
            </a>
          </p>
        </div>
      </section>

      {/* ---------- Order information ---------- */}
      <section className="mt-8 border-t border-line pt-6">
        <SectionTitle>Order Information</SectionTitle>
        <dl className="grid max-w-md grid-cols-[8rem_minmax(0,1fr)] gap-x-4 gap-y-1.5">
          <InfoRow label="Order Date" value={formatOrderDate(order.placedAt)} />
          <InfoRow label="Order Number" value={order.number} />
          {order.deliveredAt && <InfoRow label="Delivered On" value={formatOrderDate(order.deliveredAt)} />}
          <InfoRow label="Payment Method" value={PAYMENT_METHOD_LABELS[order.paymentMethod]} />
          <InfoRow label="Payment Status" value={PAYMENT_STATUS_LABELS[order.paymentStatus]} />
        </dl>
      </section>

      {/* ---------- Items ---------- */}
      <section className="mt-8">
        <SectionTitle>Invoice Detail</SectionTitle>
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[36rem] border-collapse text-left print:min-w-0">
            <thead className="bg-surface [print-color-adjust:exact]">
              <tr className="align-bottom font-semibold">
                <th className="w-[34%] px-2.5 py-2">Description</th>
                <Th>Qty</Th>
                <Th>Unit Price (excl. VAT)</Th>
                <Th>VAT Rate</Th>
                <Th>Unit VAT</Th>
                <Th>Unit Price (incl. VAT)</Th>
                <Th>Item Subtotal (incl. VAT)</Th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <ItemRow key={line.id} line={line} vatRatePercent={totals.vatRatePercent} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------- Totals ---------- */}
      <section className="mt-6 flex justify-end break-inside-avoid">
        <dl className="w-full max-w-xs space-y-1.5">
          <TotalRow label="Subtotal (incl. VAT)" value={formatMoney(totals.subtotal)} />
          {totals.discount > 0 && (
            <TotalRow
              label={order.couponCode ? `Discount (${order.couponCode})` : "Discount"}
              value={`− ${formatMoney(totals.discount)}`}
            />
          )}
          <TotalRow label="Delivery" value={totals.delivery === 0 ? "Free" : formatMoney(totals.delivery)} />
          <TotalRow label={`VAT included (${totals.vatRatePercent}%)`} value={formatMoney(totals.vatIncluded)} />
          <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2 text-[0.875rem] font-semibold">
            <dt>Total Payable</dt>
            <dd className="tabular-nums">{formatMoney(totals.total)}</dd>
          </div>
          {totals.refunded > 0 && <TotalRow label="Refunded" value={`− ${formatMoney(totals.refunded)}`} />}
        </dl>
      </section>

      <p className="mt-10 border-t border-line pt-4 text-center text-ink-muted">
        This is a computer generated invoice and needs no signature. Prices include VAT.
      </p>
    </article>
  );
}

function ItemRow({ line, vatRatePercent }: { line: OrderLine; vatRatePercent: number }) {
  const unitIncl = line.unitPrice + line.addOnUnitPrice;
  const unitVat = vatIncludedIn(unitIncl, vatRatePercent);
  const details = [
    line.brand,
    line.storage,
    line.colour,
    CONDITION_META[line.condition].label,
    line.grade ? GRADE_META[line.grade].label : null,
  ].filter(Boolean);

  return (
    <tr className="break-inside-avoid border-b border-line align-top">
      <td className="px-2.5 py-2.5">
        <p className="break-words font-medium">{line.productName}</p>
        <p className="break-words text-ink-secondary">{details.join(" · ")}</p>
        {line.sku && <p className="text-ink-muted">SKU {line.sku}</p>}
        {line.addOns.length > 0 && (
          <p className="break-words text-ink-secondary">
            Includes: {line.addOns.map((addOn) => addOn.name).join(", ")}
          </p>
        )}
      </td>
      <Td>{line.quantity}</Td>
      <Td>{formatMoney(unitIncl - unitVat)}</Td>
      <Td>{vatRatePercent}%</Td>
      <Td>{formatMoney(unitVat)}</Td>
      <Td>{formatMoney(unitIncl)}</Td>
      <Td>{formatMoney(line.lineTotal)}</Td>
    </tr>
  );
}

/* ---------- Small pieces ---------- */

function AddressLines({ order }: { order: OrderDetail }) {
  const { address, contact } = order;
  return (
    <address className="break-words not-italic">
      <p>{address.address1}</p>
      {address.address2 && <p>{address.address2}</p>}
      <p className="uppercase">{address.city}</p>
      <p>
        {emirateLabel(address.emirate)}
        {address.postalCode ? ` ${address.postalCode}` : ""}
      </p>
      <p>{contact.phone}</p>
    </address>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1.5">
      <dt className="font-semibold">{label}:</dt>
      <dd className="min-w-0 break-all">{value}</dd>
    </div>
  );
}

function ColumnTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-1.5 font-semibold">{children}</h2>;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-[0.8125rem] font-semibold uppercase tracking-wide">{children}</h2>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-2.5 py-2 text-right">{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td className="whitespace-nowrap px-2.5 py-2.5 text-right tabular-nums">{children}</td>;
}
