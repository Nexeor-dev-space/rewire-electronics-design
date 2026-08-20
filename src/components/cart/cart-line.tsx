"use client";

import Image from "next/image";
import Link from "next/link";
import { CONDITION_LABELS, type Product } from "@/types";
import type { CartItem } from "@/components/providers/account-provider";
import { cn, formatPrice } from "@/lib/utils";

interface CartLineProps {
  line: CartItem;
  product: Product;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

/**
 * CartLine — one row in the review list.
 *
 * Composition, top to bottom on mobile, left-to-right from `sm`:
 *   Plate     Identity + condition + grade + variant     Price
 *             Quantity stepper                            Remove
 *
 * Price is repeated at the row level rather than derived from qty × unit,
 * because a shopper reading the line asks "what does this line cost" —
 * unit-price × quantity is what the summary answers. The unit price sits
 * as a small caption underneath, only when the quantity is greater than
 * one, so the row is not noisy for the common case.
 */
export function CartLine({
  line,
  product,
  onQuantityChange,
  onRemove,
}: CartLineProps) {
  const image = product.images[0];
  const contain = image?.fit !== "cover";
  const lineTotal = product.price * line.quantity;
  const grade = product.condition
    ? CONDITION_LABELS[product.condition]
    : undefined;
  // Every certified device in the catalogue is Refurbished; when other
  // outer conditions land, thread that through Product and read it here.
  const conditionLabel = "Refurbished";
  const maxQty = Math.max(1, Math.min(product.stock || 5, 5));

  return (
    <article className="flex flex-col gap-6 py-8 sm:flex-row sm:gap-8">
      {/* ---------- Plate ---------- */}
      <Link
        href={`/product/${product.slug}`}
        aria-label={`Open ${product.name}`}
        className={cn(
          "relative block w-full shrink-0 overflow-hidden rounded-xl border border-line bg-surface",
          "aspect-square sm:size-32 md:size-36",
        )}
      >
        {image && (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(max-width: 640px) 100vw, 9rem"
            className={cn(
              contain ? "object-contain p-4" : "object-cover",
              "transition-transform duration-(--duration-slow) ease-(--ease-out-expo) hover:scale-[1.03]",
            )}
          />
        )}
      </Link>

      {/* ---------- Copy ---------- */}
      <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{product.brand}</p>
          <h3 className="mt-2 text-lg font-medium leading-tight tracking-[-0.015em] text-ink sm:text-xl">
            <Link
              href={`/product/${product.slug}`}
              className="transition-colors duration-(--duration-fast) hover:text-ink-secondary"
            >
              {product.name}
            </Link>
          </h3>

          {/* Condition · Grade — two facts, one line. Kept in the same
              text register as the meta line beneath so the block reads as
              a tidy stack rather than three competing bands. */}
          <p className="mt-2 text-[0.875rem] text-ink-secondary">
            <span>{conditionLabel}</span>
            {grade && (
              <>
                <span aria-hidden className="mx-1.5 text-ink-faint">
                  ·
                </span>
                <span>{grade}</span>
              </>
            )}
          </p>

          <p className="mt-1 text-[0.875rem] text-ink-secondary">
            {product.variant}
          </p>

          {/* ---------- Mobile price ----------
              Duplicated below because the desktop price sits on the right;
              on stacked mobile it needs to travel with the identity. */}
          <p className="mt-4 flex items-baseline gap-3 sm:hidden">
            <span className="text-lg font-medium tabular-nums text-ink">
              {formatPrice(lineTotal, product.currency, product.locale)}
            </span>
            {line.quantity > 1 && (
              <span className="font-mono text-[0.75rem] tabular-nums text-ink-muted">
                {formatPrice(product.price, product.currency, product.locale)}{" "}
                each
              </span>
            )}
          </p>

          {/* ---------- Quantity + Remove ---------- */}
          <div className="mt-5 flex items-center gap-5">
            <QuantityStepper
              value={line.quantity}
              max={maxQty}
              onChange={onQuantityChange}
              productName={product.name}
            />

            <button
              type="button"
              onClick={onRemove}
              className={cn(
                "text-[0.8125rem] font-medium text-ink-secondary underline-offset-4",
                "transition-colors duration-(--duration-fast) hover:text-ink hover:underline",
              )}
              aria-label={`Remove ${product.name} from cart`}
            >
              Remove
            </button>
          </div>
        </div>

        {/* ---------- Desktop price ---------- */}
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-lg font-medium tabular-nums text-ink">
            {formatPrice(lineTotal, product.currency, product.locale)}
          </p>
          {line.quantity > 1 && (
            <p className="mt-1 font-mono text-[0.75rem] tabular-nums text-ink-muted">
              {formatPrice(product.price, product.currency, product.locale)}{" "}
              each
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/* ============================================================
   Local: quantity stepper
   ============================================================
   Mirrors the pill stepper from the product buy panel so the two
   surfaces read as the same control. Half-height here because the
   line does not need the presence a buy CTA needs. */

function QuantityStepper({
  value,
  max,
  onChange,
  productName,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  productName: string;
}) {
  return (
    <div className="flex h-10 items-center rounded-full border border-line px-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label={`Decrease quantity of ${productName}`}
        className="flex size-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 disabled:pointer-events-none disabled:opacity-30"
      >
        <MinusIcon />
      </button>
      <span
        aria-live="polite"
        className="w-7 text-center font-mono text-[0.8125rem] tabular-nums text-ink"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={`Increase quantity of ${productName}`}
        className="flex size-8 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 disabled:pointer-events-none disabled:opacity-30"
      >
        <PlusIcon />
      </button>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="size-3"
    >
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      className="size-3"
    >
      <path d="M3 8h10" />
    </svg>
  );
}
