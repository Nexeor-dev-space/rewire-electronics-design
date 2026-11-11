"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ProductOption } from "@/types";
import { AVAILABILITY_LABELS, availabilityFromStock } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, savingsPercent } from "@/lib/utils";
import { controlSwap } from "@/lib/motion";
import { CURRENCY, LOCALE, formatMoney } from "@/lib/money";
import { CART_MAX_LINE_QUANTITY } from "@/lib/constants";
import { useAddCartItem, useGetCart, useRemoveCartItem, useUpdateCartItem } from "@/hooks/use-cart";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { ConfettiBurst } from "@/components/ui/confetti-burst";
import { useDebouncedQuantity } from "@/hooks/use-debounced-quantity";
import { CONDITION_META, GRADE_META } from "@/lib/shop";
import type { ShopAddOn, ShopProductDetail, ShopVariant } from "@/types/catalogue";
import { ProductAddOns } from "./product-add-ons";
import { HeartIcon } from "@/components/product/heart-icon";
import { useAccount } from "@/components/providers/account-provider";

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
  product: ShopProductDetail;
  addOns: ShopAddOn[];
  variant: ShopVariant;
  returnWindowDays: number;
  onVariantChange: (id: string) => void;
}

const OPTION_UNSELECTABLE =
  "cursor-not-allowed border-line text-ink-muted line-through decoration-1";

const inStock = (variant: ShopVariant) => variant.stock > 0;

/** How long the add-ons stay ringed after Add to Cart scrolls to them. */
const ADD_ONS_HIGHLIGHT_MS = 1600;

type Axis = "state" | "storage" | "colour";
const AXES: Axis[] = ["state", "storage", "colour"];

const stateLabel = (variant: ShopVariant) =>
  [CONDITION_META[variant.condition].label, variant.grade && GRADE_META[variant.grade].label]
    .filter(Boolean)
    .join(" · ");

const axisValue = (variant: ShopVariant, axis: Axis) =>
  axis === "state" ? `${variant.condition}|${variant.grade ?? ""}` : variant[axis];

const axisLabel = (variant: ShopVariant, axis: Axis) =>
  axis === "state" ? stateLabel(variant) : (variant[axis] ?? "");

function optionsFor(variants: ShopVariant[], selected: ShopVariant, axis: Axis): ProductOption[] {
  const earlier = AXES.slice(0, AXES.indexOf(axis));
  const samples = new Map<string, ShopVariant>();
  for (const variant of variants) {
    const value = axisValue(variant, axis);
    if (value !== null && !samples.has(value)) samples.set(value, variant);
  }
  return [...samples].map(([value, sample]) => ({
    label: axisLabel(sample, axis),
    value,
    swatch: axis === "colour" ? (sample.colourHex ?? undefined) : undefined,
    available: variants.some(
      (variant) =>
        axisValue(variant, axis) === value &&
        inStock(variant) &&
        earlier.every((other) => axisValue(variant, other) === axisValue(selected, other)),
    ),
  }));
}

const compareRanks = (a: number[], b: number[]) =>
  a.reduce((difference, rank, index) => difference || rank - b[index], 0);

function closestVariant(variants: ShopVariant[], selected: ShopVariant, axis: Axis, value: string) {
  const others = AXES.filter((other) => other !== axis);
  const rank = (variant: ShopVariant) =>
    [
      others.every((other) => axisValue(variant, other) === axisValue(selected, other)),
      inStock(variant),
      ...others.map((other) => axisValue(variant, other) === axisValue(selected, other)),
    ].map(Number);
  return variants
    .filter((variant) => axisValue(variant, axis) === value)
    .sort((a, b) => compareRanks(rank(b), rank(a)))[0];
}

export function ProductBuyPanel({ product, addOns, variant, returnWindowDays, onVariantChange }: Props) {
  const variants = product.variants;
  const stateOptions = optionsFor(variants, variant, "state");
  const storageOptions = optionsFor(variants, variant, "storage");
  const colorOptions = optionsFor(variants, variant, "colour");
  const { isSaved, toggleSaved } = useAccount();
  const saved = isSaved(product.slug);

  function choose(axis: Axis, value: string) {
    const next = closestVariant(variants, variant, axis, value);
    if (next) onVariantChange(next.id);
  }

  const cart = useGetCart();
  const addCartItem = useAddCartItem();
  const updateCartItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();
  const cartLoading = cart.isPending;
  /** Bumped on each successful add: plays the confetti. */
  const [celebrate, setCelebrate] = useState(0);
  /** Briefly true after an add: rings the add-ons the page scrolled to. */
  const [highlightAddOns, setHighlightAddOns] = useState(false);
  const addOnsRef = useRef<HTMLDivElement>(null);
  const addInFlight = useRef(false);

  // The line for THIS variant, if any — drives the stepper and the
  // add-on checkboxes. Add-ons ticked before the line exists live in
  // local state; once it exists the line's own set is the source of
  // truth and a toggle mutates it directly.
  const [pendingAddOns, setPendingAddOns] = useState<string[]>([]);
  const line = cart.data?.items.find((item) => item.variantId === variant.id);
  const offeredAddOnIds = line
    ? new Set(line.offeredAddOns.map((addOn) => addOn.id))
    : null;
  const selectedAddOns = line
    ? line.addOns.map((addOn) => addOn.id).filter((id) => offeredAddOnIds!.has(id))
    : pendingAddOns;

  function toggleAddOn(id: string) {
    if (line) {
      const current = line.addOns
        .map((addOn) => addOn.id)
        .filter((entry) => offeredAddOnIds!.has(entry) || entry === id);
      const next = current.includes(id)
        ? current.filter((entry) => entry !== id)
        : [...current, id];
      updateCartItem.mutate({ id: line.id, addOnIds: next });
    } else {
      const next = pendingAddOns.includes(id)
        ? pendingAddOns.filter((entry) => entry !== id)
        : [...pendingAddOns, id];
      setPendingAddOns(next);
    }
  }

  const inCartQty = line?.quantity ?? 0;
  const warrantyMonths = addOns
    .filter((addOn) => selectedAddOns.includes(addOn.id))
    .reduce((months, addOn) => months + addOn.extraWarrantyMonths, product.warrantyMonths);

  const price = variant.price;
  const originalPrice = variant.compareAtPrice ?? undefined;
  const saving = originalPrice ? savingsPercent(price, originalPrice) : 0;

  const availability = availabilityFromStock(variant.stock);
  const soldOut = availability === "sold-out";
  const comingSoon = availability === "coming-soon";
  const low = availability === "low-stock";

  const purchasable = !soldOut && !comingSoon;
  const cta = soldOut
    ? AVAILABILITY_LABELS[availability]
    : comingSoon
      ? "Join waitlist"
      : "Add to Cart";

  /**
   * On the product page an add is confirmed in place, not by the "Added to
   * cart" popup: a confetti pop from the button, then a smooth scroll to
   * "Add to your order" with a brief highlight, so the shopper sees the
   * extras next. Products without add-ons only get the confetti.
   */
  function handleAddToCart() {
    if (!purchasable || addInFlight.current) return;
    addInFlight.current = true;
    addCartItem.mutate(
      { variantId: variant.id, quantity: 1, addOnIds: pendingAddOns },
      {
        onSuccess: (nextCart) => {
          if (!nextCart.items.some((item) => item.variantId === variant.id)) return;
          setPendingAddOns([]);
          setCelebrate((count) => count + 1);
          if (addOns.length > 0 && addOnsRef.current) {
            addOnsRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
            setHighlightAddOns(true);
            window.setTimeout(() => setHighlightAddOns(false), ADD_ONS_HIGHLIGHT_MS);
          }
        },
        onSettled: () => {
          addInFlight.current = false;
        },
      },
    );
  }

  const maxQuantity = line?.maxQuantity ?? Math.min(variant.stock || 0, CART_MAX_LINE_QUANTITY);

  const trustItems = TRUST_ITEMS.flatMap((item) => {
    if (item.icon === ReturnIcon) {
      return returnWindowDays > 0 ? [{ ...item, title: `${returnWindowDays}-day returns` }] : [];
    }
    return [item];
  });

  // Taps show at once; the quantity is saved after a short pause.
  const stepper = useDebouncedQuantity(inCartQty, (quantity) =>
    updateCartItem.mutateAsync({ id: line!.id, quantity }),
  );

  function handleIncrement() {
    if (!line || stepper.quantity >= maxQuantity) return;
    stepper.set(stepper.quantity + 1);
  }
  function handleDecrement() {
    if (!line || removeCartItem.isPending) return;
    if (stepper.quantity <= 1) {
      stepper.cancel();
      removeCartItem.mutate(line.id);
    } else stepper.set(stepper.quantity - 1);
  }

  const cartError =
    addCartItem.error?.message ?? updateCartItem.error?.message ?? removeCartItem.error?.message;

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
          {formatMoney(price)}
        </span>
        {originalPrice && originalPrice > price && (
          <>
            <s className="font-mono text-sm tabular-nums text-ink-muted">
              {formatMoney(originalPrice)}
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
      <dl className="mt-8 grid grid-cols-2 gap-6 border-y border-line py-6 sm:grid-cols-3">
        <div>
          <dt className="eyebrow">Condition</dt>
          <dd className="mt-2 text-base font-medium text-ink">
            {CONDITION_META[variant.condition].label}
          </dd>
        </div>
        {variant.grade && (
          <div>
            <dt className="eyebrow">Grade</dt>
            <dd className="mt-2 text-base font-medium text-ink">{GRADE_META[variant.grade].label}</dd>
          </div>
        )}
        {variant.batteryHealth !== null && (
          <div>
            <dt className="eyebrow">Battery health</dt>
            <dd className="mt-2 text-base font-medium tabular-nums text-ink">{variant.batteryHealth}%</dd>
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
      </div>

      {stateOptions.length > 1 && (
        <OptionGroup
          label="Condition"
          value={stateLabel(variant)}
          options={stateOptions}
          onSelect={(option) => choose("state", option.value)}
          renderOption={(option, selected) => (
            <span
              className={cn(
                "flex h-11 items-center justify-center rounded-lg border px-4 text-sm font-medium transition-colors duration-(--duration-fast)",
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

      {/* ---------- Storage ---------- */}
      {storageOptions.length > 0 && (
        <OptionGroup
          label="Storage"
          value={variant.storage ?? undefined}
          options={storageOptions}
          onSelect={(option) => choose("storage", option.value)}
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
      {colorOptions.length > 0 && (
        <OptionGroup
          label="Colour"
          value={variant.colour ?? undefined}
          options={colorOptions}
          onSelect={(option) => choose("colour", option.value)}
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

      {/* ---------- CTA ----------
          The page's one primary action, so it comes before the extras on
          every width: full width and 64px (`xl`), with the warranty line
          under it. One button until the item is added, then the same
          footprint becomes a trash / qty / plus stepper (à la noon) at the
          same height, so the row never jumps. The heart gets its own row
          below, as a labelled "Save to wishlist". */}
      <div className="relative mt-10 flex flex-col gap-2.5">
        <ConfettiBurst trigger={celebrate} />
        {cartLoading ? (
          <Skeleton className="h-16 w-full rounded-full" />
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {purchasable && inCartQty > 0 && !removeCartItem.isPending ? (
              <motion.div key="stepper" variants={controlSwap} initial="hidden" animate="visible" exit="exit">
                <QuantityStepper
                  value={stepper.quantity}
                  max={maxQuantity}
                  disabled={removeCartItem.isPending}
                  onIncrement={handleIncrement}
                  onDecrement={handleDecrement}
                  groupLabel={`${product.name} in cart`}
                  variant="filled"
                  size="xl"
                  className="w-full"
                />
              </motion.div>
            ) : (
              <motion.div key="add" variants={controlSwap} initial="hidden" animate="visible" exit="exit">
                <Button
                  size="xl"
                  variant="primary"
                  onClick={handleAddToCart}
                  loading={addCartItem.isPending}
                  className={cn("w-full", purchasable && "bg-accent text-white hover:bg-accent-hover")}
                  disabled={soldOut}
                >
                  {cta}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        <p className="flex items-center justify-center gap-1.5 text-[0.8125rem] text-ink-secondary">
          <ShieldIcon />
          {warrantyMonths} months warranty
        </p>
      </div>

      {cartError && (
        <p role="alert" className="mt-3 text-[0.8125rem] text-danger">
          {cartError}
        </p>
      )}

      <button
        type="button"
        onClick={() => toggleSaved(product.slug)}
        aria-pressed={saved}
        className={cn(
          "mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full border text-sm font-medium transition-colors duration-(--duration-fast)",
          saved
            ? "border-love/50 text-ink"
            : "border-line text-ink-secondary hover:border-line-strong hover:text-ink",
        )}
      >
        <HeartIcon saved={saved} className="size-5" />
        {saved ? "Saved to wishlist" : "Save to wishlist"}
      </button>

      {/* ---------- Add to your order ----------
          The fourth axis after Storage / Colour / Grade: category-scoped
          extras (charger, sleeve, warranty extension, …) shown as
          checkbox rows with their own prices. Silently absent for
          categories with no add-ons defined (accessories). See
          `product-add-ons.tsx` for the two rules the panel enforces
          (every row states its price; the total appears only after
          something is ticked). */}
      <div
        ref={addOnsRef}
        className={cn(
          "mt-10 scroll-mt-24 rounded-2xl transition-shadow duration-(--duration-slow)",
          highlightAddOns && "ring-2 ring-accent ring-offset-4 ring-offset-void",
        )}
      >
        <ProductAddOns
          addOns={addOns}
          selected={selectedAddOns}
          onToggle={toggleAddOn}
          basePrice={price}
          currency={CURRENCY}
          locale={LOCALE}
        />
      </div>


      {/* ---------- Trust row ----------
          Rewritten to earn attention: two-column card grid on mobile,
          four across from sm. Each cell carries a distinct outlined
          icon in an accent-tinted tile, a bold label, and a one-line
          reassurance — the promise is scannable, not a whisper. */}
      <ul className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {trustItems.map(({ title, sub, icon: Icon }) => (
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

const TRUST_ITEMS: { title: string; sub: string; icon: () => React.JSX.Element }[] = [
  { title: "Free delivery", sub: "On every order", icon: TruckIcon },
  { title: "Warranty", sub: "Rewire-backed", icon: ShieldIcon },
  { title: "Returns", sub: "No questions asked", icon: ReturnIcon },
  { title: "Secure checkout", sub: "Encrypted payment", icon: LockIcon },
];
