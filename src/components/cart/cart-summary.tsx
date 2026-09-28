"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { CartTotals } from "@/types/cart";

interface CartSummaryProps {
  totals: CartTotals;
  itemCount: number;
  canCheckout: boolean;
}

/**
 * CartSummary — the commit panel.
 *
 * Every figure comes straight off the cart's server-priced totals, so
 * this component does no arithmetic of its own. Delivery is quoted at
 * checkout once an emirate is chosen, so it stays a placeholder row
 * here. VAT is included in every price already — the row states the
 * portion rather than adding anything on top (see `docs/CART.md`).
 *
 * Sits sticky on lg+ so the CTA is always in reach of the scrolling
 * items column beside it.
 */
export function CartSummary({ totals, itemCount, canCheckout }: CartSummaryProps) {
  return (
    <div className="lg:sticky lg:top-28">
      <div className="rounded-2xl bg-surface p-8 lg:p-9">
        <h2
          id="cart-summary-heading"
          className="text-xl font-medium tracking-[-0.015em] text-ink"
        >
          Order Summary
        </h2>

        <dl className="mt-8 space-y-4 border-t border-line pt-6">
          <Row
            label={
              itemCount > 0
                ? `Subtotal (${itemCount} ${itemCount === 1 ? "item" : "items"})`
                : "Subtotal"
            }
            value={formatMoney(totals.subtotal)}
          />
          {totals.discount > 0 && (
            <Row label="Discount" value={`− ${formatMoney(totals.discount)}`} accent />
          )}
          <Row
            label="Delivery"
            value={
              <span className="text-[0.8125rem] text-ink-secondary">
                Calculated at checkout
              </span>
            }
          />
          <Row
            label={`Includes VAT (${totals.vatRatePercent}%)`}
            value={formatMoney(totals.vatIncluded)}
            muted
          />
        </dl>

        <div
          className={cn(
            "mt-8 flex items-baseline justify-between border-t border-line pt-6",
          )}
        >
          <dt className="text-base font-medium text-ink">Total</dt>
          <dd className="text-2xl font-medium tabular-nums text-ink">
            {formatMoney(totals.total)}
          </dd>
        </div>

        {/* ---------- Primary CTA ---------- */}
        {canCheckout ? (
          <Link
            href="/checkout"
            aria-label={`Proceed to checkout with ${formatMoney(totals.total)}`}
            className={cn(
              buttonVariants({ variant: "primary", size: "lg" }),
              "mt-8 w-full",
            )}
          >
            Proceed to Checkout
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
        ) : (
          <>
            <span
              aria-disabled="true"
              className={cn(
                buttonVariants({ variant: "primary", size: "lg" }),
                "mt-8 w-full pointer-events-none opacity-50",
              )}
            >
              Proceed to Checkout
            </span>
            <p role="alert" className="mt-2 text-center text-[0.8125rem] text-danger">
              Remove unavailable items to continue.
            </p>
          </>
        )}

        {/* ---------- Trust footer ---------- */}
        <ul className="mt-8 grid grid-cols-2 gap-3 border-t border-line pt-6 text-[0.75rem] text-ink-secondary">
          {["Free delivery", "12-month warranty", "14-day returns", "Secure checkout"].map(
            (line) => (
              <li key={line} className="flex items-start gap-2">
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 size-3 shrink-0 text-accent"
                >
                  <path d="m3 8 3.5 3.5L13 4.5" />
                </svg>
                <span>{line}</span>
              </li>
            ),
          )}
        </ul>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn("text-sm text-ink-secondary", muted && "text-[0.8125rem] text-ink-muted")}>
        {label}
      </dt>
      <dd
        className={cn(
          "text-sm font-medium tabular-nums text-ink",
          muted && "text-[0.8125rem] font-normal text-ink-muted",
          accent && "text-accent",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
