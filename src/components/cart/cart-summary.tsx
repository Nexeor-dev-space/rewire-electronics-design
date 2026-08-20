"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatPrice } from "@/lib/utils";

interface CartSummaryProps {
  subtotal: number;
  currency: string;
  locale: string;
  itemCount: number;
}

/**
 * CartSummary — the commit panel.
 *
 * Deliberately quiet: subtotal, delivery, total, and the button. Shipping
 * and discount are surfaced as placeholder rows rather than invented
 * numbers — "Calculated at checkout" is the honest state before an
 * address is entered, and no line for a discount is shown unless one
 * actually applies. Total therefore equals subtotal until the checkout
 * page finalises delivery and any code the shopper enters.
 *
 * Sits sticky on lg+ so the CTA is always in reach of the scrolling
 * items column beside it.
 */
export function CartSummary({
  subtotal,
  currency,
  locale,
  itemCount,
}: CartSummaryProps) {
  // No shipping/discount computed here on purpose — see the header note.
  const total = subtotal;

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
            value={formatPrice(subtotal, currency, locale)}
          />
          <Row
            label="Delivery"
            value={
              <span className="text-[0.8125rem] text-ink-secondary">
                Calculated at checkout
              </span>
            }
          />
          {/* Discount row is intentionally not rendered — no code has been
              applied and inventing an amount would misrepresent the cart. */}
        </dl>

        <div
          className={cn(
            "mt-8 flex items-baseline justify-between border-t border-line pt-6",
          )}
        >
          <dt className="text-base font-medium text-ink">Total</dt>
          <dd className="text-2xl font-medium tabular-nums text-ink">
            {formatPrice(total, currency, locale)}
          </dd>
        </div>

        <p className="mt-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
          {currency} · Taxes included where applicable
        </p>

        {/* ---------- Primary CTA ---------- */}
        <Link
          href="/checkout"
          aria-label={`Proceed to checkout with ${formatPrice(total, currency, locale)}`}
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

        {/* ---------- Trust footer ----------
            The same four lines the buy panel prints, kept in the same
            order so a shopper who scanned them on the product page
            recognises them here. */}
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
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-sm text-ink-secondary">{label}</dt>
      <dd className="text-sm font-medium tabular-nums text-ink">{value}</dd>
    </div>
  );
}
