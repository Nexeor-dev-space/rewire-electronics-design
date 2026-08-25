"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { readLastOrder, type PlacedOrder } from "@/lib/checkout";
import { cn, formatPrice } from "@/lib/utils";

/**
 * OrderSuccess — the reassurance page after a placed order.
 *
 * Reads the persisted order out of localStorage (put there by
 * CheckoutView), rebuilds the confirmation on the client, and hands the
 * shopper three clear next steps: track this order, view all orders, or
 * carry on shopping. If the storage read fails (private mode, direct
 * link) the page still shows a graceful confirmation using the order
 * number from the query string.
 */
export function OrderSuccess() {
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [numberFromQuery, setNumberFromQuery] = useState<string | null>(null);

  useEffect(() => {
    const stored = readLastOrder();
    if (stored) setOrder(stored);
    try {
      const query = new URLSearchParams(window.location.search);
      setNumberFromQuery(query.get("order"));
    } catch {
      /* ignore */
    }
  }, []);

  const number = order?.number ?? numberFromQuery ?? "—";

  return (
    <div className="mx-auto w-full max-w-4xl px-(--spacing-gutter) py-14 md:py-20">
      {/* ---------- Confirmation ---------- */}
      <header className="flex flex-col items-center gap-6 text-center">
        <span
          aria-hidden
          className="flex size-16 items-center justify-center rounded-full bg-live/15"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-7 text-live"
          >
            <path d="m5 12 4.5 4.5L19 7" />
          </svg>
        </span>
        <div>
          <p className="eyebrow">Order confirmed</p>
          <h1 className="mt-3 text-display-md font-light text-ink">
            Thank you for your order.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-secondary">
            A confirmation is on its way to your inbox. You can track this
            order at any time from your account.
          </p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5 font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink">
            Order {number}
          </p>
        </div>
      </header>

      {/* ---------- Actions ---------- */}
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href={`/account/orders/${encodeURIComponent(number.toLowerCase())}`}
          className={cn(
            "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6",
            "bg-accent text-white text-sm font-medium",
            "transition-colors duration-(--duration-fast) hover:bg-accent-hover",
          )}
        >
          Track order
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Link>
        <Link
          href="/account/orders"
          className="inline-flex h-12 items-center justify-center rounded-full border border-line-strong px-6 text-sm font-medium text-ink transition-colors duration-(--duration-fast) hover:bg-white/5"
        >
          View my orders
        </Link>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium text-ink-secondary transition-colors duration-(--duration-fast) hover:text-ink"
        >
          Continue shopping →
        </Link>
      </div>

      {/* ---------- Details ---------- */}
      {order && <OrderReceipt order={order} />}
    </div>
  );
}

/* ============================================================
   Receipt panel — the order laid out below the confirmation
   ============================================================ */

function OrderReceipt({ order }: { order: PlacedOrder }) {
  const money = (value: number) =>
    formatPrice(value, order.currency, order.locale);
  const placedLabel = useMemo(() => {
    try {
      return new Intl.DateTimeFormat(order.locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(order.placedAt));
    } catch {
      return "";
    }
  }, [order.placedAt, order.locale]);

  return (
    <div className="mt-14 grid gap-6 lg:grid-cols-3">
      {/* ---------- Lines ---------- */}
      <section
        aria-labelledby="receipt-items"
        className="rounded-2xl border border-line bg-surface p-6 sm:p-7 lg:col-span-2"
      >
        <div className="flex items-baseline justify-between gap-4">
          <h2
            id="receipt-items"
            className="text-[1rem] font-medium tracking-tight text-ink"
          >
            What&rsquo;s in the box
          </h2>
          {placedLabel && (
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
              Placed {placedLabel}
            </span>
          )}
        </div>
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {order.lines.map((line) => (
            <li
              key={`${line.slug}-${line.quantity}`}
              className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-line bg-void">
                {line.imageUrl && (
                  <Image
                    src={line.imageUrl}
                    alt=""
                    fill
                    sizes="64px"
                    className={
                      line.imageFit === "cover"
                        ? "object-cover"
                        : "object-contain p-1.5"
                    }
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9375rem] font-medium text-ink">
                  {line.name}
                </p>
                <p className="mt-0.5 truncate text-[0.75rem] text-ink-secondary">
                  {line.variantLabel}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                  <span>{line.condition}</span>
                  {line.grade && (
                    <>
                      <span aria-hidden className="text-ink-faint">
                        ·
                      </span>
                      <span>Grade {line.grade}</span>
                    </>
                  )}
                  {line.quantity > 1 && (
                    <>
                      <span aria-hidden className="text-ink-faint">
                        ·
                      </span>
                      <span>Qty {line.quantity}</span>
                    </>
                  )}
                </p>
              </div>
              <p className="shrink-0 text-[0.9375rem] font-medium tabular-nums text-ink">
                {money(line.unitPrice * line.quantity)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Meta ---------- */}
      <section
        aria-labelledby="receipt-meta"
        className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 sm:p-7"
      >
        <div>
          <h2
            id="receipt-meta"
            className="text-[1rem] font-medium tracking-tight text-ink"
          >
            Order details
          </h2>
        </div>

        <Meta label="Deliver to">
          <p className="text-[0.875rem] text-ink">{order.address.name}</p>
          <p className="text-[0.8125rem] text-ink-secondary">
            {order.address.line1}
            {order.address.line2 && (
              <>
                <br />
                {order.address.line2}
              </>
            )}
            <br />
            {order.address.city}, {order.address.emirate}
            <br />
            {order.address.country}
          </p>
        </Meta>

        <Meta label="Delivery method">
          <p className="text-[0.875rem] text-ink">{order.deliveryLabel}</p>
          <p className="text-[0.75rem] text-ink-muted">
            {order.deliveryEstimate}
          </p>
        </Meta>

        <Meta label="Payment">
          <p className="text-[0.875rem] text-ink">{order.paymentLabel}</p>
        </Meta>

        <div className="mt-2 border-t border-line pt-4">
          <div className="grid gap-2 text-[0.8125rem] text-ink-secondary">
            <Row label="Subtotal" value={money(order.subtotal)} />
            {order.discount > 0 && (
              <Row
                label={
                  order.promoCode
                    ? `Discount · ${order.promoCode}`
                    : "Discount"
                }
                value={`− ${money(order.discount)}`}
                accent
              />
            )}
            <Row
              label="Delivery"
              value={order.deliveryPrice === 0 ? "Free" : money(order.deliveryPrice)}
            />
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-[0.9375rem] font-medium text-ink">Total paid</span>
            <span className="text-[1.25rem] font-medium tabular-nums text-ink">
              {money(order.total)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
        {label}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span>{label}</span>
      <span className={cn("tabular-nums", accent ? "text-accent" : "text-ink")}>
        {value}
      </span>
    </div>
  );
}
