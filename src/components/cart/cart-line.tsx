"use client";

import Image from "next/image";
import Link from "next/link";
import { CONDITION_LABELS, type Product } from "@/types";
import type { CartItem } from "@/components/providers/account-provider";
import { addOnsFor, addOnsTotal, type AddOn } from "@/lib/add-ons";
import { cn, formatPrice } from "@/lib/utils";

interface CartLineProps {
  line: CartItem;
  product: Product;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  /** Tick / untick one of this line's add-ons. */
  onToggleAddOn: (addOnId: string) => void;
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
  onToggleAddOn,
}: CartLineProps) {
  const image = product.images[0];
  const contain = image?.fit !== "cover";

  // Category-scoped extras, same list the PDP buy panel offers — so a
  // shopper who skipped them there gets a second, quieter chance here.
  const addOns = addOnsFor(product.categorySlug ?? product.category);
  const selectedAddOns = line.addOnIds ?? [];
  const extrasTotal = addOnsTotal(addOns, selectedAddOns);

  // Device price scales with quantity; add-ons are priced once per line
  // (see the note on `CartItem.addOnIds`).
  const lineTotal = product.price * line.quantity + extrasTotal;
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

          {/* ---------- Add-ons ---------- */}
          {addOns.length > 0 && (
            <LineAddOns
              addOns={addOns}
              selected={selectedAddOns}
              onToggle={onToggleAddOn}
              productName={product.name}
              currency={product.currency}
              locale={product.locale}
            />
          )}
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
          {extrasTotal > 0 && (
            <p className="mt-1 font-mono text-[0.75rem] tabular-nums text-ink-muted">
              incl. {formatPrice(extrasTotal, product.currency, product.locale)}{" "}
              accessories
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/* ============================================================
   Local: per-line add-ons
   ============================================================
   A chip row, not a disclosure. The old collapsed "Add accessories ▾"
   line read as unfinished chrome and hid what is only ever four
   items; the chips put every option one tap away and wear their own
   state — the ticked chip carries the accent hairline, a soft accent
   tint and a check where the plus was. Reads as "complete the setup",
   not as a form. */

function LineAddOns({
  addOns,
  selected,
  onToggle,
  productName,
  currency,
  locale,
}: {
  addOns: AddOn[];
  selected: string[];
  onToggle: (addOnId: string) => void;
  productName: string;
  currency: string;
  locale?: string;
}) {
  return (
    <div className="mt-6 border-t border-line pt-5">
      <p className="flex items-baseline gap-2.5 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">
        Complete the setup
        {selected.length > 0 && (
          <span className="text-accent">
            {selected.length} added
          </span>
        )}
      </p>

      <ul className="mt-3.5 flex flex-wrap gap-2">
        {addOns.map((addOn) => {
          const checked = selected.includes(addOn.id);
          return (
            <li key={addOn.id}>
              <button
                type="button"
                onClick={() => onToggle(addOn.id)}
                aria-pressed={checked}
                aria-label={`${addOn.label}, ${
                  checked ? "remove from" : "add to"
                } ${productName} for ${formatPrice(addOn.price, currency, locale)}`}
                className={cn(
                  "group/chip inline-flex h-9 items-center gap-2 rounded-full border pl-2.5 pr-3.5",
                  "text-[0.8125rem] tracking-tight",
                  "transition-[border-color,background-color,color] duration-(--duration-fast) ease-(--ease-out-quart)",
                  "active:scale-[0.97]",
                  checked
                    ? "border-accent/60 bg-accent/10 text-ink"
                    : "border-line bg-surface-2/60 text-ink-secondary hover:border-line-strong hover:text-ink",
                )}
              >
                {/* Plus that becomes a check — the one moving part.
                    Drawn as a ring so the chip reads as an action at
                    rest and as a confirmation once ticked. */}
                <span
                  aria-hidden
                  className={cn(
                    "flex size-4.5 shrink-0 items-center justify-center rounded-full",
                    "transition-colors duration-(--duration-fast)",
                    checked
                      ? "bg-accent text-white"
                      : "border border-line-strong text-ink-muted group-hover/chip:border-ink-muted group-hover/chip:text-ink",
                  )}
                >
                  {checked ? (
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-2.5"
                    >
                      <path d="m3.5 8.5 3 3 6-7" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      className="size-2.5"
                    >
                      <path d="M8 3.5v9M3.5 8h9" />
                    </svg>
                  )}
                </span>

                <span className="whitespace-nowrap">{addOn.label}</span>

                <span
                  className={cn(
                    "whitespace-nowrap font-mono text-[0.6875rem] tabular-nums",
                    checked ? "text-accent" : "text-ink-muted",
                  )}
                >
                  +{formatPrice(addOn.price, currency, locale)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
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
