"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import type { CheckoutLine, CheckoutTotals, PromoCode } from "@/lib/checkout";

/**
 * OrderSummary — the fact ledger and the point of no return.
 *
 * On desktop it's a sticky right-hand column; on mobile it slots into
 * the flow above the terms and the sticky CTA bar. Every number in it
 * is derived: subtotal from the lines, delivery + discount + VAT from
 * props, total from the sum. No number lives here in two places.
 *
 * The `PLACE ORDER · AED X` button carries the total in its label so a
 * shopper never has to look up to check what they are about to pay.
 * Compact variants skip the CTA entirely — used above the mobile form
 * and, elsewhere, when a separate sticky bar owns the action.
 */
interface Props {
  lines: CheckoutLine[];
  totals: CheckoutTotals;
  deliveryLabel: string;
  deliveryPrice: number;
  vatRate: number;
  discount: number;
  promo: PromoCode | undefined;
  onApplyPromo: (code: string) => string | null;
  onRemovePromo: () => void;
  onPlaceOrder?: () => void;
  placing?: boolean;
  className?: string;
  compact?: boolean;
}

export function OrderSummary({
  lines,
  totals,
  deliveryLabel,
  deliveryPrice,
  vatRate,
  discount,
  promo,
  onApplyPromo,
  onRemovePromo,
  onPlaceOrder,
  placing,
  className,
  compact,
}: Props) {
  const money = (value: number) =>
    formatPrice(value, totals.currency, totals.locale);

  const discounted = Math.max(0, totals.subtotal - discount);
  const vat = Math.round(discounted * vatRate);
  const total = Math.max(0, discounted + deliveryPrice + vat);

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
          Your order
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

      {/* ---------- Promo code ---------- */}
      {!compact && (
        <PromoCodeField
          promo={promo}
          onApply={onApplyPromo}
          onRemove={onRemovePromo}
          formatMoney={money}
        />
      )}

      {/* ---------- Totals ---------- */}
      <dl className="grid gap-2.5 text-[0.9375rem]">
        <Row label="Subtotal" value={money(totals.subtotal)} />
        {discount > 0 && (
          <Row
            label={promo ? `Discount · ${promo.code}` : "Discount"}
            value={`− ${money(discount)}`}
            accent
          />
        )}
        <Row
          label={`Delivery · ${deliveryLabel}`}
          value={deliveryPrice === 0 ? "Free" : money(deliveryPrice)}
        />
        <Row label={`VAT · ${Math.round(vatRate * 100)}%`} value={money(vat)} />
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

      {!compact && onPlaceOrder && (
        <>
          <button
            type="button"
            onClick={onPlaceOrder}
            disabled={placing || lines.length === 0}
            aria-busy={placing || undefined}
            className={cn(
              "relative inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-6",
              "bg-[#c2410c] text-[#f5f5f2] shadow-(--shadow-soft)",
              "text-[0.9375rem] font-medium",
              "transition-[background-color,transform] duration-(--duration-fast) ease-(--ease-out-quart)",
              "hover:bg-[#d9531c] active:scale-[0.99]",
              "disabled:pointer-events-none disabled:opacity-70",
            )}
          >
            {placing && <Spinner className="absolute size-4" />}
            <span
              className={cn(
                "inline-flex items-center gap-2",
                placing && "opacity-0",
              )}
            >
              {placing ? "Processing your order…" : `Place Order · ${money(total)}`}
              {!placing && (
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.5"
                >
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              )}
            </span>
          </button>

          <TrustRow />

          <p className="text-[0.75rem] leading-relaxed text-ink-muted">
            By placing this order you agree to the{" "}
            <a
              href="/legal/terms"
              className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
            >
              Terms &amp; Conditions
            </a>{" "}
            and{" "}
            <a
              href="/legal/privacy"
              className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
            >
              Privacy Policy
            </a>
            . A confirmation email is on the way once your order is placed.
          </p>
        </>
      )}
    </aside>
  );
}

/* ============================================================
   Bits
   ============================================================ */

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

function PromoCodeField({
  promo,
  onApply,
  onRemove,
  formatMoney,
}: {
  promo: PromoCode | undefined;
  onApply: (code: string) => string | null;
  onRemove: () => void;
  formatMoney: (value: number) => string;
}) {
  void formatMoney;
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (promo) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-live/30 bg-live/5 px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-live">
            Promo applied · {promo.code}
          </p>
          <p className="mt-1 truncate text-[0.8125rem] text-ink-secondary">
            {promo.label}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 text-[0.75rem] font-medium text-ink-secondary transition-colors hover:text-ink"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[0.875rem] text-ink transition-colors hover:bg-white/[0.02]"
      >
        <span className="inline-flex items-center gap-2">
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5 text-ink-secondary"
          >
            <path d="M2.5 9.5 9 3l4 4-6.5 6.5-4-4z" />
            <circle cx="6" cy="6" r="0.75" />
          </svg>
          Have a promo code?
        </span>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "size-3 text-ink-muted transition-transform duration-(--duration-fast)",
            open && "rotate-180",
          )}
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-line p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError(null);
              }}
              placeholder="Enter code"
              aria-label="Promo code"
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "promo-error" : undefined}
              className={cn(
                "h-11 flex-1 rounded-lg bg-void px-3 text-sm text-ink placeholder:text-ink-muted",
                "border transition-colors duration-(--duration-fast)",
                error
                  ? "border-danger"
                  : "border-line hover:border-line-strong focus:border-accent focus:outline-none",
              )}
            />
            <button
              type="button"
              onClick={() => {
                const problem = onApply(value);
                if (problem) setError(problem);
                else setValue("");
              }}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line-strong px-4 text-[0.8125rem] font-medium text-ink transition-colors hover:bg-white/5"
            >
              Apply
            </button>
          </div>
          {error && (
            <p
              id="promo-error"
              role="alert"
              className="mt-2 text-[0.75rem] text-danger"
            >
              {error}
            </p>
          )}
          <p className="mt-2 text-[0.75rem] text-ink-muted">
            Try <span className="font-mono text-ink-secondary">REWIRE10</span>{" "}
            for a first-order discount.
          </p>
        </div>
      )}
    </div>
  );
}

function TrustRow() {
  const items: { label: string; icon: ReactNode }[] = [
    {
      label: "Secure checkout",
      icon: (
        <>
          <path d="M8.4 10.3V7.6a3.6 3.6 0 1 1 7.2 0v2.7" />
          <path d="M6.9 10.3h10.2a1.7 1.7 0 0 1 1.7 1.7v6a1.7 1.7 0 0 1-1.7 1.7H6.9a1.7 1.7 0 0 1-1.7-1.7v-6a1.7 1.7 0 0 1 1.7-1.7Z" />
        </>
      ),
    },
    {
      label: "12-month warranty",
      icon: (
        <>
          <path d="M12 2.6 4.9 5.5v5.6c0 4.4 2.9 8.2 7.1 9.3 4.2-1.1 7.1-4.9 7.1-9.3V5.5L12 2.6Z" />
          <path d="m8.9 11.9 2.2 2.2 4.3-4.5" />
        </>
      ),
    },
    {
      label: "Easy returns",
      icon: (
        <>
          <path d="M20.25 12a8.25 8.25 0 1 1-2.6-6" />
          <path d="M20.25 3.75v4.5h-4.5" />
        </>
      ),
    },
  ];
  return (
    <ul className="grid grid-cols-3 gap-3">
      {items.map((item) => (
        <li
          key={item.label}
          className="flex items-center gap-2 text-[0.75rem] text-ink-secondary"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4 shrink-0 text-ink-muted"
          >
            {item.icon}
          </svg>
          <span className="truncate">{item.label}</span>
        </li>
      ))}
    </ul>
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
