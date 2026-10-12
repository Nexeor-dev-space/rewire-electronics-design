"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useGetMe } from "@/hooks/use-auth";
import { usePlacedOrder } from "@/hooks/use-checkout";
import { useGetAccountOrder } from "@/hooks/use-order";
import { ApiError } from "@/lib/api/api-client";
import { ACCOUNT_HOME_PATH, ORDER_TRACK_PAGE_PATH } from "@/lib/constants";
import { DELIVERY_METHOD_LABELS, formatEta } from "@/lib/delivery";
import { emirateLabel } from "@/lib/emirates";
import { LOCALE, formatMoney } from "@/lib/money";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_LINK_NOTICE,
  PAYMENT_METHOD_LABELS,
  awaitsPaymentLink,
} from "@/lib/orders";
import { CONDITION_META, GRADE_META } from "@/lib/shop";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import type { OrderDetail } from "@/types/order";

const ACCOUNT_ORDERS_PATH = `${ACCOUNT_HOME_PATH}/orders`;

const PRIMARY_LINK = cn(
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6",
  "bg-accent text-white text-sm font-medium",
  "transition-colors duration-(--duration-fast) hover:bg-accent-hover",
);
const SECONDARY_LINK =
  "inline-flex h-12 items-center justify-center rounded-full border border-line-strong px-6 text-sm font-medium text-ink transition-colors duration-(--duration-fast) hover:bg-white/5";
const TERTIARY_LINK =
  "inline-flex h-12 items-center justify-center rounded-full px-6 text-sm font-medium text-ink-secondary transition-colors duration-(--duration-fast) hover:text-ink";

function trackHref(order: OrderDetail, signedIn: boolean): string {
  if (signedIn) return `${ACCOUNT_ORDERS_PATH}/${encodeURIComponent(order.number)}`;
  const query = new URLSearchParams({ number: order.number, email: order.contact.email });
  return `${ORDER_TRACK_PAGE_PATH}?${query}`;
}

function trackLookupHref(number: string): string {
  return number ? `${ORDER_TRACK_PAGE_PATH}?${new URLSearchParams({ number })}` : ORDER_TRACK_PAGE_PATH;
}

export function OrderSuccess({ number }: { number: string }) {
  const me = useGetMe();
  const placed = usePlacedOrder(number);
  const signedIn = Boolean(me.data);
  const needsAccountOrder = Boolean(number) && !placed.data && signedIn;
  const accountOrder = useGetAccountOrder(needsAccountOrder ? number : "");
  const order = placed.data ?? accountOrder.data;

  if (order) return <Confirmation order={order} signedIn={signedIn} />;

  if (number && (me.isPending || (needsAccountOrder && accountOrder.isPending))) {
    return (
      <StatusPanel>
        <Spinner className="size-6 text-ink-secondary" />
        <p className="text-sm text-ink-secondary">Loading your order…</p>
      </StatusPanel>
    );
  }

  const failed =
    accountOrder.isError &&
    !(accountOrder.error instanceof ApiError && accountOrder.error.body.code === "NOT_FOUND");

  if (failed) {
    return (
      <StatusPanel>
        <p role="alert" className="text-sm text-ink-secondary">
          {accountOrder.error.message}
        </p>
        <button
          type="button"
          onClick={() => accountOrder.refetch()}
          className="text-sm font-medium text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
        >
          Try again
        </button>
      </StatusPanel>
    );
  }

  return (
    <StatusPanel>
      <div>
        <h1 className="text-display-sm font-light text-ink">We can&rsquo;t show this order here.</h1>
        <p className="mt-3 text-base text-ink-secondary">
          Look it up with your order number and the email you used at checkout.
        </p>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link href={trackLookupHref(number)} className={PRIMARY_LINK}>
          Track your order
        </Link>
        {signedIn && (
          <Link href={ACCOUNT_ORDERS_PATH} className={SECONDARY_LINK}>
            View my orders
          </Link>
        )}
      </div>
    </StatusPanel>
  );
}

function StatusPanel({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center gap-6 px-(--spacing-gutter) py-16 text-center">
      {children}
    </div>
  );
}

function Confirmation({ order, signedIn }: { order: OrderDetail; signedIn: boolean }) {
  const awaitingPayment = awaitsPaymentLink(order.paymentMethod) && order.paymentStatus === "UNPAID";

  return (
    <div className="mx-auto w-full max-w-4xl px-(--spacing-gutter) py-14 md:py-20">
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
          <p className="eyebrow">Order {ORDER_STATUS_LABELS[order.status].toLowerCase()}</p>
          <h1 className="mt-3 text-display-md font-light text-ink">
            Thank you for your order.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-secondary">
            A confirmation is on its way to {order.contact.email}.
          </p>
          {awaitingPayment && (
            <p className="mt-2 max-w-xl text-base leading-relaxed text-ink">
              {PAYMENT_LINK_NOTICE}
            </p>
          )}
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5 font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink">
            Order {order.number}
          </p>
        </div>
      </header>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link href={trackHref(order, signedIn)} className={PRIMARY_LINK}>
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
        {signedIn && (
          <Link href={ACCOUNT_ORDERS_PATH} className={SECONDARY_LINK}>
            View my orders
          </Link>
        )}
        <Link href="/" className={TERTIARY_LINK}>
          Continue shopping →
        </Link>
      </div>

      <OrderReceipt order={order} awaitingPayment={awaitingPayment} />
    </div>
  );
}

function OrderReceipt({ order, awaitingPayment }: { order: OrderDetail; awaitingPayment: boolean }) {
  const { address, contact, totals } = order;
  const placedLabel = new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(order.placedAt));

  return (
    <div className="mt-14 grid gap-6 lg:grid-cols-3">
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
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
            Placed {placedLabel}
          </span>
        </div>
        <ul className="mt-5 divide-y divide-line border-y border-line">
          {order.lines.map((line) => {
            const variantLabel = [line.storage, line.colour].filter(Boolean).join(" · ");
            return (
              <li key={line.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-line bg-void">
                  {line.imageUrl && (
                    <Image
                      src={line.imageUrl}
                      alt={line.imageAlt}
                      fill
                      sizes="64px"
                      className="object-contain p-1.5"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-medium text-ink">
                    {line.productName}
                  </p>
                  {variantLabel && (
                    <p className="mt-0.5 truncate text-[0.75rem] text-ink-secondary">
                      {variantLabel}
                    </p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
                    <span>{CONDITION_META[line.condition].label}</span>
                    {line.grade && (
                      <>
                        <span aria-hidden className="text-ink-faint">
                          ·
                        </span>
                        <span>{GRADE_META[line.grade].label}</span>
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
                  {line.addOns.length > 0 && (
                    <ul className="mt-1.5 flex flex-col gap-0.5">
                      {line.addOns.map((addOn) => (
                        <li
                          key={`${line.id}-${addOn.name}`}
                          className="truncate text-[0.75rem] text-ink-secondary"
                        >
                          + {addOn.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="shrink-0 text-[0.9375rem] font-medium tabular-nums text-ink">
                  {formatMoney(line.lineTotal)}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section
        aria-labelledby="receipt-meta"
        className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6 sm:p-7"
      >
        <h2
          id="receipt-meta"
          className="text-[1rem] font-medium tracking-tight text-ink"
        >
          Order details
        </h2>

        <Meta label="Deliver to">
          <p className="text-[0.875rem] text-ink">
            {contact.firstName} {contact.lastName}
          </p>
          <p className="text-[0.8125rem] text-ink-secondary">
            {address.address1}
            {address.address2 && (
              <>
                <br />
                {address.address2}
              </>
            )}
            <br />
            {address.city}, {emirateLabel(address.emirate)}
          </p>
          <p className="mt-1 text-[0.75rem] text-ink-muted">{contact.phone}</p>
        </Meta>

        <Meta label="Delivery method">
          <p className="text-[0.875rem] text-ink">{DELIVERY_METHOD_LABELS[order.deliveryMethod]}</p>
          <p className="text-[0.75rem] text-ink-muted">
            {formatEta(order.etaMinDays, order.etaMaxDays)}
          </p>
        </Meta>

        <Meta label="Payment">
          <p className="text-[0.875rem] text-ink">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</p>
          {awaitingPayment && (
            <p className="text-[0.75rem] text-ink-muted">{PAYMENT_LINK_NOTICE}</p>
          )}
        </Meta>

        <div className="mt-2 border-t border-line pt-4">
          <div className="grid gap-2 text-[0.8125rem] text-ink-secondary">
            <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
            {totals.discount > 0 && (
              <Row
                label={order.couponCode ? `Discount · ${order.couponCode}` : "Discount"}
                value={`− ${formatMoney(totals.discount)}`}
                accent
              />
            )}
            <Row
              label="Delivery"
              value={totals.delivery === 0 ? "Free" : formatMoney(totals.delivery)}
            />
            <Row
              label={`Includes VAT ${totals.vatRatePercent}%`}
              value={formatMoney(totals.vatIncluded)}
            />
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="text-[0.9375rem] font-medium text-ink">Total</span>
            <span className="text-[1.25rem] font-medium tabular-nums text-ink">
              {formatMoney(totals.total)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: ReactNode }) {
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
