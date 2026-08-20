"use client";

import { useMemo, useState } from "react";
import type { Product, ProductOption } from "@/types";
import { AVAILABILITY_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatPrice, savingsPercent } from "@/lib/utils";

/**
 * ProductBuyPanel — the right-hand column on desktop, the second block on
 * mobile. Holds every fact a shopper needs to commit: identity (brand,
 * name), state (condition & grade, availability), value (price, saving),
 * choice (variants) and the CTA.
 *
 * Condition and Grade are rendered as two separate lines by design — a
 * grade only qualifies a condition and merging them ("Grade A Pristine")
 * hides the distinction shoppers came here to check.
 */
interface Props {
  product: Product;
  condition: string;
  grade?: string;
}

const OPTION_UNSELECTABLE =
  "cursor-not-allowed border-line text-ink-muted line-through decoration-1";

export function ProductBuyPanel({ product, condition, grade }: Props) {
  const [storage, setStorage] = useState<ProductOption | undefined>(
    product.storageOptions?.find((o) => o.available),
  );
  const [color, setColor] = useState<ProductOption | undefined>(
    product.colorOptions?.find((o) => o.available),
  );
  const [qty, setQty] = useState(1);
  const [saved, setSaved] = useState(false);

  const price = useMemo(() => {
    const delta = (storage?.priceDelta ?? 0) + (color?.priceDelta ?? 0);
    return product.price + delta;
  }, [product.price, storage, color]);

  const originalPrice = product.originalPrice
    ? product.originalPrice + ((storage?.priceDelta ?? 0) + (color?.priceDelta ?? 0))
    : undefined;

  const saving = originalPrice ? savingsPercent(price, originalPrice) : 0;

  const availability = product.availability ?? "in-stock";
  const soldOut = availability === "sold-out";
  const comingSoon = availability === "coming-soon";
  const low = availability === "low-stock";

  const cta = soldOut
    ? "Notify me"
    : comingSoon
      ? "Join waitlist"
      : "Add to bag";

  const maxQty = Math.max(1, Math.min(product.stock || 1, 5));

  return (
    <div className="flex flex-col">
      {/* ---------- Identity ---------- */}
      <p className="eyebrow">{product.brand}</p>
      <h1 className="mt-3 text-display-md font-light text-ink">
        {product.name}
      </h1>

      {product.description && (
        <p className="mt-5 text-base leading-relaxed text-ink-secondary">
          {product.description}
        </p>
      )}

      {/* ---------- Condition + Grade ---------- */}
      <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-line py-6">
        <div>
          <dt className="eyebrow">Condition</dt>
          <dd className="mt-2 text-base font-medium text-ink">{condition}</dd>
        </div>
        {grade && (
          <div>
            <dt className="eyebrow">Grade</dt>
            <dd className="mt-2 text-base font-medium text-ink">{grade}</dd>
          </div>
        )}
      </dl>

      {/* ---------- Highlights ---------- */}
      {product.highlights && product.highlights.length > 0 && (
        <ul className="mt-6 space-y-2.5">
          {product.highlights.map((line) => (
            <li
              key={line}
              className="flex items-start gap-3 text-[0.9375rem] text-ink-secondary"
            >
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-1.5 size-3 shrink-0 text-accent"
              >
                <path d="m3 8 3.5 3.5L13 4.5" />
              </svg>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}

      {/* ---------- Price ---------- */}
      <div className="mt-8 flex flex-wrap items-end gap-x-4 gap-y-2">
        <span className="text-4xl font-medium tabular-nums text-ink">
          {formatPrice(price, product.currency, product.locale)}
        </span>
        {originalPrice && originalPrice > price && (
          <>
            <s className="font-mono text-sm tabular-nums text-ink-muted">
              {formatPrice(originalPrice, product.currency, product.locale)}
            </s>
            {saving > 0 && (
              <Badge variant="accent" className="text-[0.6875rem]">
                Save {saving}%
              </Badge>
            )}
          </>
        )}
      </div>

      {/* ---------- Availability ---------- */}
      <div className="mt-4 flex items-center gap-2 font-mono text-[0.75rem] uppercase tracking-[0.16em]">
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            soldOut && "bg-ink-muted",
            comingSoon && "bg-warn",
            low && "bg-urgent animate-pulse-dot",
            !soldOut && !comingSoon && !low && "bg-live",
          )}
        />
        <span
          className={cn(
            soldOut && "text-ink-muted",
            comingSoon && "text-warn",
            low && "text-urgent",
            !soldOut && !comingSoon && !low && "text-live",
          )}
        >
          {AVAILABILITY_LABELS[availability]}
        </span>
        {low && product.stock > 0 && (
          <span className="text-ink-muted">· {product.stock} left</span>
        )}
      </div>

      {/* ---------- Storage ---------- */}
      {product.storageOptions && product.storageOptions.length > 0 && (
        <OptionGroup
          label="Storage"
          value={storage?.label}
          options={product.storageOptions}
          onSelect={setStorage}
          renderOption={(option, selected) => (
            <span
              className={cn(
                "flex h-11 min-w-16 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors duration-(--duration-fast)",
                selected
                  ? "border-ink bg-ink text-surface"
                  : option.available
                    ? "border-line text-ink hover:border-ink"
                    : OPTION_UNSELECTABLE,
              )}
            >
              {option.label}
            </span>
          )}
        />
      )}

      {/* ---------- Colour ---------- */}
      {product.colorOptions && product.colorOptions.length > 0 && (
        <OptionGroup
          label="Colour"
          value={color?.label}
          options={product.colorOptions}
          onSelect={setColor}
          renderOption={(option, selected) => (
            <span
              className={cn(
                "flex items-center gap-2.5 rounded-full border px-3.5 py-2 text-sm transition-colors duration-(--duration-fast)",
                selected
                  ? "border-ink text-ink"
                  : option.available
                    ? "border-line text-ink-secondary hover:border-line-strong hover:text-ink"
                    : OPTION_UNSELECTABLE,
              )}
            >
              {option.swatch && (
                <span
                  aria-hidden
                  className="size-4 rounded-full border border-line"
                  style={{ background: option.swatch }}
                />
              )}
              {option.label}
            </span>
          )}
        />
      )}

      {/* ---------- Quantity + CTAs ---------- */}
      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        {!soldOut && !comingSoon && (
          <div className="flex h-14 items-center rounded-full border border-line px-2">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
              className="flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 disabled:opacity-30"
            >
              <MinusIcon />
            </button>
            <span
              aria-live="polite"
              className="w-8 text-center font-mono text-sm tabular-nums text-ink"
            >
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              aria-label="Increase quantity"
              className="flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 disabled:opacity-30"
            >
              <PlusIcon />
            </button>
          </div>
        )}
        <Button
          size="lg"
          variant="primary"
          className="flex-1"
          disabled={soldOut}
        >
          {cta}
        </Button>
        <button
          type="button"
          onClick={() => setSaved((s) => !s)}
          aria-pressed={saved}
          aria-label={
            saved
              ? `Remove ${product.name} from wishlist`
              : `Save ${product.name} to wishlist`
          }
          className={cn(
            "flex size-14 shrink-0 items-center justify-center rounded-full border transition-colors duration-(--duration-fast)",
            saved
              ? "border-line-strong text-urgent"
              : "border-line text-ink-muted hover:border-line-strong hover:text-ink",
          )}
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill={saved ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-5"
          >
            <path d="M12 20.25S3.75 15.5 3.75 9.6A4.35 4.35 0 0 1 12 7.6a4.35 4.35 0 0 1 8.25 2c0 5.9-8.25 10.65-8.25 10.65Z" />
          </svg>
        </button>
      </div>

      {/* ---------- Micro trust row ---------- */}
      <ul className="mt-8 grid grid-cols-2 gap-3 border-t border-line pt-6 text-[0.8125rem] text-ink-secondary sm:grid-cols-4">
        {[
          "Free delivery",
          "12-month warranty",
          "14-day returns",
          "Secure checkout",
        ].map((line) => (
          <li key={line} className="flex items-start gap-2">
            <svg
              aria-hidden
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mt-0.5 size-3.5 shrink-0 text-accent"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m3 8 3.5 3.5L13 4.5" />
            </svg>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function OptionGroup({
  label,
  value,
  options,
  onSelect,
  renderOption,
}: {
  label: string;
  value: string | undefined;
  options: ProductOption[];
  onSelect: (option: ProductOption) => void;
  renderOption: (option: ProductOption, selected: boolean) => React.ReactNode;
}) {
  return (
    <fieldset className="mt-8">
      <legend className="flex w-full items-baseline justify-between">
        <span className="eyebrow">{label}</span>
        {value && (
          <span className="text-[0.8125rem] text-ink-secondary">{value}</span>
        )}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2.5">
        {options.map((option) => {
          const selected = option.label === value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={!option.available}
              aria-pressed={selected}
              onClick={() => option.available && onSelect(option)}
              className="rounded-full"
            >
              {renderOption(option, selected)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-3.5">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}
function MinusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="size-3.5">
      <path d="M3 8h10" />
    </svg>
  );
}
