import Image from "next/image";
import Link from "next/link";
import type { OrderSummary } from "@/types/order";
import { ACCOUNT_ORDERS_PATH } from "@/lib/constants";
import { formatOrderDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { CONDITION_META, GRADE_META } from "@/lib/shop";
import { OrderStatusPill, orderEtaLabel } from "@/components/order/order-detail-body";

export function OrderSummaryCard({ order }: { order: OrderSummary }) {
  const first = order.firstLine;
  const remaining = order.lineCount - 1;
  const variant = first ? [first.storage, first.colour].filter(Boolean).join(" · ") : "";

  return (
    <article className="rounded-2xl border border-line bg-surface p-5 transition-colors duration-(--duration-fast) hover:border-line-strong md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink-muted">Order</p>
          <p className="text-[0.9375rem] font-medium text-ink">{order.number}</p>
          <p className="text-[0.8125rem] text-ink-muted">· {formatOrderDate(order.placedAt)}</p>
        </div>
        <OrderStatusPill status={order.status} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4 sm:flex-nowrap sm:gap-6">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-plate sm:size-24">
          {first?.imageUrl && (
            <Image src={first.imageUrl} alt={first.imageAlt} fill sizes="96px" className="object-contain p-2" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {first && (
            <>
              <p className="truncate text-[1rem] font-medium text-ink">{first.productName}</p>
              {variant && <p className="mt-1 truncate text-[0.8125rem] text-ink-secondary">{variant}</p>}
              <p className="mt-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
                {CONDITION_META[first.condition].label}
                {first.grade && ` · ${GRADE_META[first.grade].label}`}
                {` · Qty ${first.quantity}`}
              </p>
            </>
          )}
          {remaining > 0 && (
            <p className="mt-1.5 text-[0.8125rem] text-ink-muted">
              + {remaining} more item{remaining === 1 ? "" : "s"} in this order
            </p>
          )}
        </div>

        <div className="w-full shrink-0 sm:w-auto sm:text-right">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
            {orderEtaLabel(order)}
          </p>
          <p className="mt-1.5 text-[1.0625rem] font-medium tabular-nums text-ink">{formatMoney(order.total)}</p>
          <Link
            href={`${ACCOUNT_ORDERS_PATH}/${order.number}`}
            className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink hover:text-accent"
          >
            View order
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

export function OrderSummaryCardSkeleton() {
  return <div aria-hidden className="skeleton h-48 rounded-2xl md:h-44" />;
}
