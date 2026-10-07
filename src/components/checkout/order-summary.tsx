"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { CONDITION_META, GRADE_META } from "@/lib/shop";
import { Spinner } from "@/components/ui/spinner";
import type { AppliedCoupon, Cart, CartLine } from "@/types/cart";
import { POLICY_ROUTES } from "@/lib/policy-types";

interface Props {
  cart: Cart;
  deliveryLabel: string;
  onApplyCoupon?: (code: string) => void;
  onRemoveCoupon?: () => void;
  couponPending?: boolean;
  couponFieldError?: string | null;
  onPlaceOrder?: () => void;
  placing?: boolean;
  stepsComplete?: boolean;
  className?: string;
  compact?: boolean;
  /** True while a new delivery quote is loading in the background. */
  quotePending?: boolean;
}

export function OrderSummary({
  cart,
  deliveryLabel,
  onApplyCoupon,
  onRemoveCoupon,
  couponPending,
  couponFieldError,
  onPlaceOrder,
  placing,
  stepsComplete = true,
  className,
  compact,
  quotePending,
}: Props) {
  const { items, totals, coupon, couponsAllowed, canCheckout } = cart;

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
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>

      <ul className="divide-y divide-line border-y border-line">
        {items.map((line) => (
          <LineRow key={line.id} line={line} />
        ))}
      </ul>

      {!compact && couponsAllowed && (
        <CouponField
          coupon={coupon}
          onApply={onApplyCoupon}
          onRemove={onRemoveCoupon}
          pending={couponPending}
          fieldError={couponFieldError}
        />
      )}

      <dl className="grid gap-2.5 text-[0.9375rem]">
        <Row label="Subtotal" value={formatMoney(totals.subtotal)} />
        {totals.discount > 0 && (
          <Row
            label={coupon ? `Discount · ${coupon.code}` : "Discount"}
            value={`− ${formatMoney(totals.discount)}`}
            accent
          />
        )}
        <Row
          label={`Delivery · ${deliveryLabel}`}
          value={
            totals.delivery === null
              ? "—"
              : totals.delivery === 0
                ? "Free"
                : formatMoney(totals.delivery)
          }
        />
        <Row
          label={`Includes VAT ${totals.vatRatePercent}%`}
          value={formatMoney(totals.vatIncluded)}
          muted
        />
      </dl>

      <div className="flex items-baseline justify-between border-t border-line pt-4">
        <span className="inline-flex items-center gap-2 text-[0.9375rem] font-medium text-ink">
          Total
          {quotePending && <Spinner className="size-3.5 text-ink-secondary" />}
        </span>
        <span
          aria-live="polite"
          className={cn(
            "text-[1.375rem] font-medium tabular-nums text-ink",
            quotePending && "opacity-70",
          )}
        >
          {formatMoney(totals.total)}
        </span>
      </div>

      {!compact && onPlaceOrder && (
        <>
          <button
            type="button"
            onClick={onPlaceOrder}
            disabled={placing || items.length === 0 || !canCheckout || !stepsComplete}
            aria-busy={placing || undefined}
            className={cn(
              "relative inline-flex h-14 w-full items-center justify-center gap-2 rounded-full px-6",
              "bg-accent text-white",
              "text-[0.9375rem] font-medium",
              "transition-[background-color,transform] duration-(--duration-fast) ease-(--ease-out-quart)",
              "hover:bg-accent-hover active:scale-[0.99]",
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
              {placing
                ? "Processing your order…"
                : `Place Order · ${formatMoney(totals.total)}`}
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

          {!canCheckout && (
            <p role="alert" className="text-[0.8125rem] text-danger">
              Remove unavailable items to continue.
            </p>
          )}

          {canCheckout && !stepsComplete && (
            <p className="text-[0.8125rem] text-ink-secondary">
              Complete each step to place your order.
            </p>
          )}

          <TrustRow />

          <p className="text-[0.75rem] leading-relaxed text-ink-muted">
            By placing this order you agree to the{" "}
            <a
              href={POLICY_ROUTES["terms-and-conditions"]}
              className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink"
            >
              Terms &amp; Conditions
            </a>{" "}
            and{" "}
            <a
              href={POLICY_ROUTES["privacy-policy"]}
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

function LineRow({ line }: { line: CartLine }) {
  const variantLabel = [line.storage, line.colour].filter(Boolean).join(" · ");
  const blocked = line.issues.some((issue) =>
    ["UNAVAILABLE", "OUT_OF_STOCK", "INSUFFICIENT_STOCK"].includes(issue),
  );

  return (
    <li className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-line bg-void">
        {line.imageUrl && (
          <Image
            src={line.imageUrl}
            alt=""
            fill
            sizes="64px"
            className="object-contain p-1.5"
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
        </p>

        {line.addOns.length > 0 && (
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {line.addOns.map((addOn) => (
              <li
                key={addOn.id}
                className="flex items-baseline justify-between gap-3 text-[0.75rem] text-ink-secondary"
              >
                <span className="truncate">+ {addOn.label}</span>
                <span className="shrink-0 font-mono tabular-nums text-ink-muted">
                  {formatMoney(addOn.price)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="shrink-0 text-right">
        {blocked ? (
          <p className="text-[0.9375rem] font-medium tabular-nums text-ink-muted">—</p>
        ) : (
          <p className="text-[0.9375rem] font-medium tabular-nums text-ink">
            {formatMoney(line.lineTotal)}
          </p>
        )}
        {line.previousUnitPrice != null && (
          <p className="mt-0.5 font-mono text-[0.6875rem] tabular-nums text-ink-muted">
            <s>{formatMoney(line.previousUnitPrice * line.quantity)}</s>
          </p>
        )}
      </div>
    </li>
  );
}

function CouponField({
  coupon,
  onApply,
  onRemove,
  pending,
  fieldError,
}: {
  coupon: AppliedCoupon | null;
  onApply?: (code: string) => void;
  onRemove?: () => void;
  pending?: boolean;
  fieldError?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  if (coupon) {
    return (
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-xl border px-4 py-3",
          coupon.valid ? "border-live/30 bg-live/5" : "border-danger/30 bg-danger/5",
        )}
      >
        <div className="min-w-0">
          <p
            className={cn(
              "font-mono text-[0.6875rem] uppercase tracking-[0.16em]",
              coupon.valid ? "text-live" : "text-danger",
            )}
          >
            {coupon.valid ? "Promo applied" : "Promo not applied"} · {coupon.code}
          </p>
          <p className="mt-1 truncate text-[0.8125rem] text-ink-secondary">
            {coupon.valid ? coupon.description : coupon.message}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={pending}
          className="shrink-0 text-[0.75rem] font-medium text-ink-secondary transition-colors hover:text-ink disabled:opacity-50"
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
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                if (!pending && value.trim()) onApply?.(value);
              }}
              placeholder="Enter code"
              aria-label="Promo code"
              aria-invalid={Boolean(fieldError) || undefined}
              aria-describedby={fieldError ? "promo-error" : undefined}
              className={cn(
                "h-11 flex-1 rounded-lg bg-void px-3 text-sm text-ink placeholder:text-ink-muted",
                "border transition-colors duration-(--duration-fast)",
                fieldError
                  ? "border-danger"
                  : "border-line hover:border-line-strong focus:border-accent focus:outline-none",
              )}
            />
            <button
              type="button"
              onClick={() => onApply?.(value)}
              disabled={pending || value.trim().length === 0}
              aria-busy={pending || undefined}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-line-strong px-4 text-[0.8125rem] font-medium text-ink transition-colors hover:bg-white/5 disabled:pointer-events-none disabled:opacity-50"
            >
              Apply
            </button>
          </div>
          {fieldError && (
            <p id="promo-error" role="alert" className="mt-2 text-[0.75rem] text-danger">
              {fieldError}
            </p>
          )}
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
