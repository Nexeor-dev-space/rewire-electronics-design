"use client";

import Image from "next/image";
import Link from "next/link";
import type { Order } from "@/types";
import { ORDER_STATUS_LABELS } from "@/types";
import { cn, formatPrice } from "@/lib/utils";
import {
  conditionLabelFor,
  formatOrderDate,
  formatOrderStamp,
  orderStatusTone,
} from "@/lib/account-data";
import { AccountShell } from "./account-shell";
import { StatusPill } from "./status-pill";

/**
 * AccountOrderDetail — /account/orders/[id].
 *
 * Kept editorial rather than tabular: a wide two-column layout on
 * desktop with the tracker/items on the left and the ledger (address,
 * payment, breakdown, invoice) on the right. Below `lg` the ledger
 * stacks below.
 */

const PROGRESS_STEPS = [
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for delivery",
  "Delivered",
] as const;

export function AccountOrderDetail({ order }: { order: Order }) {
  const currentStep = progressIndexFor(order);
  const hasAnyReturnable = order.items.some((item) => item.returnable);

  return (
    <AccountShell
      title={`Order ${order.number}`}
      subtitle={`Placed ${formatOrderDate(order.placedAt)} · ${order.estimatedDelivery}`}
      aside={
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill tone={orderStatusTone(order.status)}>
            {ORDER_STATUS_LABELS[order.status]}
          </StatusPill>
          <Link
            href="/account/orders"
            className="text-[0.8125rem] font-medium text-ink-secondary hover:text-ink"
          >
            ← All orders
          </Link>
        </div>
      }
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:gap-10">
        <div className="flex flex-col gap-8">
          <ProgressTracker order={order} currentStep={currentStep} />
          <OrderItems order={order} />
        </div>

        <div className="flex flex-col gap-8">
          <AddressCard order={order} />
          <PaymentCard order={order} />
          <PriceBreakdown order={order} />

          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-11 items-center justify-center rounded-full border border-line-strong text-[0.875rem] font-medium text-ink transition-colors duration-(--duration-fast) hover:border-ink"
            >
              Download / view invoice
            </button>
            {order.trackingNumber && (
              <a
                href="#"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-line-strong text-[0.875rem] font-medium text-ink hover:border-ink"
              >
                Track shipment · {order.trackingNumber}
              </a>
            )}
            {hasAnyReturnable && (
              <Link
                href={`/account/returns?order=${order.id}`}
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#94b2f3] text-[0.875rem] font-medium text-[#0f1419] hover:bg-[#a8c1f6]"
              >
                Request a return
              </Link>
            )}
          </div>
        </div>
      </div>
    </AccountShell>
  );
}

/* ============================================================
   Progress tracker — a 5-step rail
   ============================================================ */

function progressIndexFor(order: Order): number {
  // Cancelled / returned bail out early — the rail shows the last
  // step actually reached rather than pretending progress happened.
  if (order.status === "cancelled" || order.status === "returned") {
    return order.tracking.findIndex((s) => !s.at) - 1;
  }
  const inOrder: Record<Order["status"], number> = {
    processing: 1,
    shipped: 2,
    delivered: 4,
    cancelled: 0,
    returned: 4,
  };
  return inOrder[order.status] ?? 0;
}

function ProgressTracker({ order, currentStep }: { order: Order; currentStep: number }) {
  const isCancelled = order.status === "cancelled";
  const isReturned = order.status === "returned";

  return (
    <section className="rounded-2xl border border-line bg-surface p-6 md:p-7">
      <div className="mb-6 flex items-baseline justify-between">
        <h2 className="text-[1.125rem] font-medium text-ink">
          {isCancelled ? "Order timeline" : isReturned ? "Order timeline" : "Delivery progress"}
        </h2>
        {order.trackingNumber && !isCancelled && (
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
            Ref {order.trackingNumber}
          </p>
        )}
      </div>

      {isCancelled ? (
        <p className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-[0.9375rem] text-ink">
          This order was cancelled. Your original payment method has been
          refunded in full.
        </p>
      ) : (
        <ol className="grid gap-4 sm:grid-cols-5">
          {PROGRESS_STEPS.map((label, index) => {
            const reached = index <= currentStep;
            const active = index === currentStep;
            return (
              <li key={label} className="relative">
                <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border",
                      reached
                        ? active
                          ? "border-[#94b2f3] bg-[#94b2f3]/15 text-[#94b2f3]"
                          : "border-live/60 bg-live/15 text-live"
                        : "border-line-strong text-ink-muted",
                    )}
                  >
                    {reached ? (
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3">
                        <path d="m3 8 3.5 3.5L13 4.5" />
                      </svg>
                    ) : (
                      <span className="text-[0.6875rem] font-medium tabular-nums">{index + 1}</span>
                    )}
                  </span>
                  <div>
                    <p className={cn("text-[0.9375rem] font-medium", reached ? "text-ink" : "text-ink-muted")}>
                      {label}
                    </p>
                    {order.tracking[index]?.at && (
                      <p className="mt-0.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted">
                        {formatOrderStamp(order.tracking[index].at!)}
                      </p>
                    )}
                  </div>
                </div>
                {index < PROGRESS_STEPS.length - 1 && (
                  <div
                    aria-hidden
                    className={cn(
                      "hidden sm:block absolute top-3 left-6 right-[-1rem] h-px",
                      reached ? "bg-live/40" : "bg-line",
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      )}

      {/* Full timeline notes, expanded below the rail — only when a
          step has a note attached. */}
      {order.tracking.some((s) => s.note) && (
        <ul className="mt-6 space-y-3 border-t border-line pt-6">
          {order.tracking
            .filter((s) => s.at && s.note)
            .map((step, i) => (
              <li key={`${step.label}-${i}`} className="flex items-start gap-4 text-[0.875rem]">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-live" aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-ink">{step.label}</p>
                    <p className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted">
                      {formatOrderStamp(step.at!)}
                    </p>
                  </div>
                  <p className="mt-0.5 text-ink-secondary">{step.note}</p>
                </div>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

/* ============================================================
   Items list
   ============================================================ */

function OrderItems({ order }: { order: Order }) {
  return (
    <section className="rounded-2xl border border-line bg-surface">
      <header className="border-b border-line px-6 py-5">
        <h2 className="text-[1.125rem] font-medium text-ink">
          {order.items.length} item{order.items.length === 1 ? "" : "s"} in this order
        </h2>
      </header>
      <ul>
        {order.items.map((item, i) => {
          const cond = conditionLabelFor(item);
          return (
            <li
              key={item.id}
              className={cn(
                "flex flex-wrap items-start gap-5 p-6 sm:flex-nowrap sm:gap-6",
                i > 0 && "border-t border-line",
              )}
            >
              <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-plate">
                <Image
                  src={item.image.url}
                  alt={item.image.alt}
                  fill
                  sizes="96px"
                  className={item.image.fit === "cover" ? "object-cover" : "object-contain p-2"}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[1rem] font-medium text-ink">{item.name}</p>
                <p className="mt-1 text-[0.8125rem] text-ink-secondary">{item.variant}</p>
                <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted sm:grid-cols-3">
                  <div>
                    <dt>Condition</dt>
                    <dd className="mt-0.5 text-ink">{cond.condition}</dd>
                  </div>
                  <div>
                    <dt>Grade</dt>
                    <dd className="mt-0.5 text-ink">{cond.grade}</dd>
                  </div>
                  <div>
                    <dt>Qty</dt>
                    <dd className="mt-0.5 text-ink">{item.quantity}</dd>
                  </div>
                </dl>
              </div>

              <div className="w-full shrink-0 text-left sm:w-auto sm:text-right">
                <p className="text-[1rem] font-medium tabular-nums text-ink">
                  {formatPrice(item.price * item.quantity, order.currency, order.locale)}
                </p>
                <p className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted">
                  {formatPrice(item.price, order.currency, order.locale)} each
                </p>
                {item.returnable ? (
                  <Link
                    href={`/account/returns?order=${order.id}&item=${item.id}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-ink hover:text-accent"
                  >
                    Return this item
                  </Link>
                ) : (
                  <p className="mt-3 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted">
                    Return window closed
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ============================================================
   Ledger — address, payment, breakdown
   ============================================================ */

function AddressCard({ order }: { order: Order }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
        Shipping to
      </p>
      <address className="mt-3 not-italic text-[0.9375rem] leading-relaxed text-ink">
        <p className="font-medium">{order.address.name}</p>
        <p className="text-ink-secondary">
          {order.address.line1}
          {order.address.line2 ? `, ${order.address.line2}` : ""}
        </p>
        <p className="text-ink-secondary">
          {order.address.city}, {order.address.emirate}
          {order.address.postalCode ? ` · ${order.address.postalCode}` : ""}
        </p>
        <p className="mt-2 text-ink-secondary">{order.address.phone}</p>
      </address>
      <p className="mt-4 border-t border-line pt-3 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
        {order.deliveryMethod}
      </p>
    </section>
  );
}

function PaymentCard({ order }: { order: Order }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
        Paid with
      </p>
      <p className="mt-3 text-[0.9375rem] text-ink">
        {order.payment.brand} ending {order.payment.last4}
      </p>
      <p className="mt-1 text-[0.8125rem] text-ink-muted">
        Expiry {order.payment.expiry}
      </p>
    </section>
  );
}

function PriceBreakdown({ order }: { order: Order }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
        Order total
      </p>
      <dl className="mt-4 space-y-3 text-[0.9375rem]">
        <Row label="Subtotal" value={formatPrice(order.subtotal, order.currency, order.locale)} />
        <Row
          label="Delivery"
          value={order.delivery === 0 ? "Free" : formatPrice(order.delivery, order.currency, order.locale)}
        />
        {order.discount > 0 && (
          <Row
            label="Discount"
            value={`− ${formatPrice(order.discount, order.currency, order.locale)}`}
            tone="accent"
          />
        )}
      </dl>
      <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink-muted">
          Total
        </p>
        <p className="text-[1.25rem] font-medium tabular-nums text-ink">
          {formatPrice(order.total, order.currency, order.locale)}
        </p>
      </div>
    </section>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "accent" }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className={cn("tabular-nums", tone === "accent" ? "text-accent" : "text-ink")}>
        {value}
      </dd>
    </div>
  );
}
