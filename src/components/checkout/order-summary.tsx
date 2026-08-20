"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";
import type { CheckoutLine, CheckoutTotals } from "@/lib/checkout";

/**
 * OrderSummary — the running total the shopper checks against as they
 * fill the form. On desktop it's a sticky right-hand column; on mobile
 * it collapses to a summary block above the CTA.
 *
 * Every number is derived: subtotal from the lines, delivery and
 * discount from the props the parent forwards, and total from the
 * three. No number appears twice on the page from two sources.
 */
interface Props {
  lines: CheckoutLine[];
  totals: CheckoutTotals;
  deliveryLabel: string;
  deliveryPrice: number;
  discount: number;
  onPlaceOrder: () => void;
  placing?: boolean;
  className?: string;
  compact?: boolean;
}

export function OrderSummary({
  lines,
  totals,
  deliveryLabel,
  deliveryPrice,
  discount,
  onPlaceOrder,
  placing,
  className,
  compact,
}: Props) {
  const total = Math.max(0, totals.subtotal + deliveryPrice - discount);
  const money = (value: number) =>
    formatPrice(value, totals.currency, totals.locale);

  return (
    <aside
      aria-label="Order summary"
      className={cn(
        "flex flex-col gap-6 rounded-2xl border border-line bg-surface p-6 sm:p-7",
        className,
      )}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[1rem] font-medium tracking-tight text-ink">
          Order summary
        </h2>
        <span className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink-muted">
          {lines.length} {lines.length === 1 ? "item" : "items"}
        </span>
      </div>

      {/* ---------- Lines ---------- */}
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((line) => (
          <LineRow key={line.key} line={line} money={money} />
        ))}
      </ul>

      {/* ---------- Totals ---------- */}
      <dl className="grid gap-2.5 text-[0.9375rem]">
        <Row label="Subtotal" value={money(totals.subtotal)} />
        <Row
          label={`Delivery · ${deliveryLabel}`}
          value={deliveryPrice === 0 ? "Free" : money(deliveryPrice)}
        />
        {discount > 0 && (
          <Row label="Discount" value={`− ${money(discount)}`} accent />
        )}
        {totals.savings > 0 && (
          <Row
            label="You save vs. new"
            value={money(totals.savings)}
            muted
          />
        )}
      </dl>

      <div className="flex items-baseline justify-between border-t border-line pt-4">
        <span className="text-[0.9375rem] font-medium text-ink">Total</span>
        <span className="text-[1.375rem] font-medium tabular-nums text-ink">
          {money(total)}
        </span>
      </div>

      {!compact && (
        <>
          <Button
            size="lg"
            variant="primary"
            loading={placing}
            onClick={onPlaceOrder}
            className="w-full"
          >
            Place Order
          </Button>

          <p className="text-[0.75rem] leading-relaxed text-ink-muted">
            By placing this order you agree to the Rewire terms of sale and
            confirm the delivery address is correct. You will receive a
            confirmation email within a few minutes.
          </p>
        </>
      )}
    </aside>
  );
}

function LineRow({
  line,
  money,
}: {
  line: CheckoutLine;
  money: (value: number) => string;
}) {
  const image = line.product.images[0];
  return (
    <li className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-line bg-void">
        {image && (
          <Image
            src={image.url}
            alt=""
            fill
            sizes="64px"
            className={cn(
              image.fit === "cover" ? "object-cover" : "object-contain p-1.5",
            )}
          />
        )}
        {line.quantity > 1 && (
          <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-ink text-[0.625rem] font-medium text-surface">
            {line.quantity}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-medium text-ink">
          {line.product.name}
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
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[0.9375rem] font-medium tabular-nums text-ink">
          {money(line.unitPrice * line.quantity)}
        </p>
        {line.originalUnitPrice != null &&
          line.originalUnitPrice > line.unitPrice && (
            <p className="mt-0.5 font-mono text-[0.6875rem] tabular-nums text-ink-muted">
              <s>{money(line.originalUnitPrice * line.quantity)}</s>
            </p>
          )}
      </div>
    </li>
  );
}

function Row({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt
        className={cn(
          "text-ink-secondary",
          muted && "text-[0.8125rem] text-ink-muted",
          accent && "text-ink",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "tabular-nums",
          muted ? "text-[0.8125rem] text-ink-muted" : "text-ink",
          accent && "text-accent",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
