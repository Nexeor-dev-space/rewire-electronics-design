"use client";

import { useMemo, useState } from "react";
import type { Product, ProductOption } from "@/types";
import { AVAILABILITY_LABELS } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatPrice, savingsPercent } from "@/lib/utils";
import { useAccount } from "@/components/providers/account-provider";
import { useCartFeedback } from "@/components/cart/cart-feedback-provider";
import { addOnsFor, defaultSelection } from "@/lib/add-ons";
import { ProductAddOns } from "./product-add-ons";

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
  const [saved, setSaved] = useState(false);

  // Add-ons: category-scoped list (accessories drop through with an
  // empty list), and a local set of ticked IDs.
  const addOns = useMemo(
    () => addOnsFor(product.categorySlug ?? product.category),
    [product.categorySlug, product.category],
  );
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(
    defaultSelection,
  );
  function toggleAddOn(id: string) {
    setSelectedAddOns((current) =>
      current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id],
    );
  }

  const { items, addItem, updateQuantity, removeItem } = useAccount();
  const { notifyAdded } = useCartFeedback();

  // The line for THIS product, if any — drives the stepper state.
  const line = items.find((l) => l.productSlug === product.slug);
  const inCartQty = line?.quantity ?? 0;

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

  const purchasable = !soldOut && !comingSoon;
  const cta = soldOut
    ? "Notify me"
    : comingSoon
      ? "Join waitlist"
      : "Add to Cart";

  const currentVariantLabel = [color?.label, storage?.label]
    .filter(Boolean)
    .join(" · ") || product.variant;

  function handleAddToCart() {
    if (!purchasable) return;
    addItem(product.slug, 1);
    notifyAdded({
      productSlug: product.slug,
      variantLabel: currentVariantLabel,
      quantity: 1,
      unitPrice: price,
      currency: product.currency,
      locale: product.locale ?? "en-AE",
    });
  }

  const maxStock = Math.max(1, Math.min(product.stock || 1, 5));

  function handleIncrement() {
    if (!line || inCartQty >= maxStock) return;
    updateQuantity(line.id, inCartQty + 1);
  }
  function handleDecrement() {
    if (!line) return;
    if (inCartQty <= 1) {
      removeItem(line.id);
    } else {
      updateQuantity(line.id, inCartQty - 1);
    }
  }

  return (
    <div className="flex flex-col">
      {/* ---------- Identity ---------- */}
      <p className="eyebrow">{product.brand}</p>
      <h1 className="mt-3 text-display-md font-light text-ink">
        {product.name}
      </h1>

      {/* ---------- Price (sits directly under the name) ---------- */}
      <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
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

      {/* ---------- Availability ---------- */}
      <div className="mt-8 flex items-center gap-2 font-mono text-[0.75rem] uppercase tracking-[0.16em]">
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

      {/* ---------- Add to your order ----------
          The fourth axis after Storage / Colour / Grade: category-scoped
          extras (charger, sleeve, warranty extension, …) shown as
          checkbox rows with their own prices. Silently absent for
          categories with no add-ons defined (accessories). See
          `product-add-ons.tsx` for the two rules the panel enforces
          (every row states its price; the total appears only after
          something is ticked). */}
      <ProductAddOns
        addOns={addOns}
        selected={selectedAddOns}
        onToggle={toggleAddOn}
        basePrice={price}
        currency={product.currency}
        locale={product.locale}
      />

      {/* ---------- CTA ----------
          One button until the item is added, then the same footprint
          becomes a trash / qty / plus stepper (à la noon). No separate
          quantity picker in the panel — the stepper handles it. */}
      <div className="mt-10 flex flex-col gap-4 sm:flex-row">
        {purchasable && inCartQty > 0 ? (
          <div
            role="group"
            aria-label={`${product.name} in cart`}
            className={cn(
              "flex h-14 flex-1 items-center justify-between rounded-full px-2",
              "bg-[#94b2f3] text-[#0f1419] shadow-(--shadow-soft)",
            )}
          >
            <button
              type="button"
              onClick={handleDecrement}
              aria-label={
                inCartQty <= 1
                  ? `Remove ${product.name} from cart`
                  : `Decrease quantity`
              }
              className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-white/15"
            >
              {inCartQty <= 1 ? <TrashIcon /> : <MinusIcon />}
            </button>
            <span
              aria-live="polite"
              className="min-w-8 text-center font-mono text-base font-medium tabular-nums"
            >
              {inCartQty}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={inCartQty >= maxStock}
              aria-label="Increase quantity"
              className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-white/15 disabled:opacity-40"
            >
              <PlusIcon />
            </button>
          </div>
        ) : (
          <Button
            size="lg"
            variant="primary"
            onClick={handleAddToCart}
            className={cn(
              "flex-1",
              purchasable &&
                "bg-[#94b2f3] text-[#0f1419] shadow-(--shadow-soft) hover:bg-[#a8c1f6]",
            )}
            disabled={soldOut}
          >
            {cta}
          </Button>
        )}
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

      {/* ---------- Trust row ----------
          Rewritten to earn attention: two-column card grid on mobile,
          four across from sm. Each cell carries a distinct outlined
          icon in an accent-tinted tile, a bold label, and a one-line
          reassurance — the promise is scannable, not a whisper. */}
      <ul className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TRUST_ITEMS.map(({ title, sub, icon: Icon }) => (
          <li
            key={title}
            className={cn(
              "flex flex-col items-start gap-3 rounded-xl border border-line bg-surface p-4",
              "transition-colors duration-(--duration-fast)",
              "hover:border-line-strong hover:bg-ink/[0.02]",
            )}
          >
            <span
              aria-hidden
              className="flex size-9 items-center justify-center rounded-lg bg-accent/10 text-accent"
            >
              <Icon />
            </span>
            <div>
              <p className="text-[0.8125rem] font-semibold leading-tight text-ink">
                {title}
              </p>
              <p className="mt-1 text-[0.75rem] leading-snug text-ink-muted">
                {sub}
              </p>
            </div>
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
      {/* Legend carries the group name only. The trailing selection
          summary ("128GB", "Hazel") was removed — the pressed pill in the
          row below already communicates the choice, and repeating it in
          the corner read as a form-field label the reader had to reconcile
          with the pill they had just tapped. */}
      <legend className="eyebrow">{label}</legend>
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

const TRUST_ICON_CLS = "size-4";

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={TRUST_ICON_CLS}>
      <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7zM7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={TRUST_ICON_CLS}>
      <path d="M12 3 4.5 6v6c0 4.5 3.2 8.2 7.5 9 4.3-.8 7.5-4.5 7.5-9V6L12 3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function ReturnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={TRUST_ICON_CLS}>
      <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
      <path d="M18 3v4h-4M6 21v-4h4" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={TRUST_ICON_CLS}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}

const TRUST_ITEMS = [
  { title: "Free delivery", sub: "On every order", icon: TruckIcon },
  { title: "12-mo warranty", sub: "Rewire-backed", icon: ShieldIcon },
  { title: "14-day returns", sub: "No questions asked", icon: ReturnIcon },
  { title: "Secure checkout", sub: "Encrypted payment", icon: LockIcon },
] as const;

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="size-4">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}
function MinusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="size-4">
      <path d="M3 8h10" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-[1.125rem]">
      <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6" />
    </svg>
  );
}
