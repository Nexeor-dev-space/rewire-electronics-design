"use client";

import Image from "next/image";
import Link from "next/link";
import type { Order } from "@/types";
import { ORDER_STATUS_LABELS } from "@/types";
import { cn, formatPrice } from "@/lib/utils";
import {
  formatOrderDate,
  orderStatusTone,
  conditionLabelFor,
} from "@/lib/account-data";
import { StatusPill } from "./status-pill";

/**
 * OrderSummaryCard — one order rendered as a compact card.
 *
 * Used across the orders list and on the account overview. Stacks all
 * fields on mobile; on `sm+` the price + CTA rail sits on the right so
 * the two facts a shopper scans for (status and total) are always the
 * corners the eye lands on.
 */
export function OrderSummaryCard({ order }: { order: Order }) {
  const first = order.items[0];
  const remaining = order.items.length - 1;

  return (
    <article className="rounded-2xl border border-line bg-surface p-5 transition-colors duration-(--duration-fast) hover:border-line-strong md:p-6">
      {/* ---------- Top row — number, date, status ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink-muted">
            Order
          </p>
          <p className="text-[0.9375rem] font-medium text-ink">
            {order.number}
          </p>
          <p className="text-[0.8125rem] text-ink-muted">
            · {formatOrderDate(order.placedAt)}
          </p>
        </div>
        <StatusPill tone={orderStatusTone(order.status)}>
          {ORDER_STATUS_LABELS[order.status]}
        </StatusPill>
      </div>

      {/* ---------- Body ---------- */}
      <div className="mt-5 flex flex-wrap items-center gap-4 sm:flex-nowrap sm:gap-6">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-plate sm:size-24">
          {first && (
            <Image
              src={first.image.url}
              alt={first.image.alt}
              fill
              sizes="96px"
              className={first.image.fit === "cover" ? "object-cover" : "object-contain p-2"}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {first && (
            <>
              <p className="truncate text-[1rem] font-medium text-ink">
                {first.name}
              </p>
              <p className="mt-1 truncate text-[0.8125rem] text-ink-secondary">
                {first.variant}
              </p>
              <p className="mt-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
                {conditionLabelFor(first).condition} · Grade {conditionLabelFor(first).grade}
                {" · "}Qty {first.quantity}
              </p>
              {remaining > 0 && (
                <p className="mt-1.5 text-[0.8125rem] text-ink-muted">
                  + {remaining} more item{remaining === 1 ? "" : "s"} in this order
                </p>
              )}
            </>
          )}
        </div>

        <div className="w-full shrink-0 sm:w-auto sm:text-right">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
            {order.estimatedDelivery}
          </p>
          <p className="mt-1.5 text-[1.0625rem] font-medium tabular-nums text-ink">
            {formatPrice(order.total, order.currency, order.locale)}
          </p>
          <Link
            href={`/account/orders/${order.id}`}
            className={cn(
              "mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink",
              "hover:text-accent",
            )}
          >
            View Order
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3"
            >
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}
