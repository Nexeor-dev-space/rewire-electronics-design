"use client";

import Image from "next/image";
import Link from "next/link";
import type { CartLine as CartLineData, CartLineIssue } from "@/types/cart";
import { BLOCKING_CART_LINE_ISSUES } from "@/types/cart";
import { CONDITION_META, GRADE_META } from "@/lib/shop";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

interface CartLineProps {
  line: CartLineData;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  /** Add or remove one of this line's offered add-ons. */
  onToggleAddOn: (addOnId: string) => void;
  /** True while a mutation targeting this line is in flight. */
  busy?: boolean;
}

const ISSUE_MESSAGES: Record<CartLineIssue, string> = {
  UNAVAILABLE: "No longer available. Remove it to continue.",
  OUT_OF_STOCK: "Out of stock. Remove it to continue.",
  INSUFFICIENT_STOCK: "Only a few left — lower the quantity to continue.",
  PRICE_CHANGED: "The price changed since you added this.",
  ADD_ON_UNAVAILABLE: "One of the add-ons on this line is no longer available.",
};

/**
 * CartLine — one row in the review list.
 *
 * Composition, top to bottom on mobile, left-to-right from `sm`:
 *   Plate     Identity + condition + grade + variant     Price
 *             Quantity stepper                            Remove
 *
 * Every fact — price, stock, add-on availability — comes from the API's
 * re-priced line, so a row can never show a number the server would
 * disagree with. Issues surface as a banner rather than being hidden:
 * a blocking one (unavailable, out of stock, insufficient stock) keeps
 * checkout disabled until the shopper resolves it; price and add-on
 * changes are informational.
 */
export function CartLine({
  line,
  onQuantityChange,
  onRemove,
  onToggleAddOn,
  busy,
}: CartLineProps) {
  const grade = line.grade ? GRADE_META[line.grade].label : undefined;
  const conditionLabel = CONDITION_META[line.condition].label;
  const blocking = line.issues.some((issue) => BLOCKING_CART_LINE_ISSUES.includes(issue));

  return (
    <article className="flex flex-col gap-6 py-8 sm:flex-row sm:gap-8">
      {/* ---------- Plate ---------- */}
      <Link
        href={`/product/${line.productSlug}`}
        aria-label={`Open ${line.productName}`}
        className={cn(
          "relative block w-full shrink-0 overflow-hidden rounded-xl border border-line bg-surface",
          "aspect-square sm:size-32 md:size-36",
        )}
      >
        {line.imageUrl && (
          <Image
            src={line.imageUrl}
            alt={line.imageAlt}
            fill
            sizes="(max-width: 640px) 100vw, 9rem"
            className={cn(
              "object-contain p-4",
              "transition-transform duration-(--duration-slow) ease-(--ease-out-expo) hover:scale-[1.03]",
            )}
          />
        )}
      </Link>

      {/* ---------- Copy ---------- */}
      <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{line.brand}</p>
          <h3 className="mt-2 text-lg font-medium leading-tight tracking-[-0.015em] text-ink sm:text-xl">
            <Link
              href={`/product/${line.productSlug}`}
              className="transition-colors duration-(--duration-fast) hover:text-ink-secondary"
            >
              {line.productName}
            </Link>
          </h3>

          {/* Condition · Grade — two facts, one line. */}
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

          {(line.storage || line.colour) && (
            <p className="mt-1 text-[0.875rem] text-ink-secondary">
              {[line.storage, line.colour].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* ---------- Issue banners ---------- */}
          {line.issues.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5">
              {line.issues.map((issue) => (
                <li
                  key={issue}
                  role={BLOCKING_CART_LINE_ISSUES.includes(issue) ? "alert" : "status"}
                  className={cn(
                    "flex items-start gap-1.5 text-[0.8125rem]",
                    BLOCKING_CART_LINE_ISSUES.includes(issue) ? "text-danger" : "text-warn",
                  )}
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mt-0.5 size-3.5 shrink-0"
                  >
                    <path d="M8 5.5v3.5M8 11.25h.008" />
                    <circle cx="8" cy="8" r="6.5" />
                  </svg>
                  <span>{ISSUE_MESSAGES[issue]}</span>
                </li>
              ))}
            </ul>
          )}

          {/* ---------- Mobile price ---------- */}
          <p className="mt-4 flex items-baseline gap-3 sm:hidden">
            <span className="text-lg font-medium tabular-nums text-ink">
              {formatMoney(line.lineTotal)}
            </span>
            {line.quantity > 1 && (
              <span className="font-mono text-[0.75rem] tabular-nums text-ink-muted">
                {formatMoney(line.unitPrice)} each
              </span>
            )}
          </p>

          {/* ---------- Quantity + Remove ---------- */}
          <div className="mt-5 flex items-center gap-5">
            <QuantityStepper
              value={line.quantity}
              max={line.maxQuantity}
              disabled={busy}
              onChange={onQuantityChange}
              productName={line.productName}
            />

            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className={cn(
                "text-[0.8125rem] font-medium text-ink-secondary underline-offset-4",
                "transition-colors duration-(--duration-fast) hover:text-ink hover:underline",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
              aria-label={`Remove ${line.productName} from cart`}
            >
              Remove
            </button>
          </div>

          {/* ---------- Add-ons ---------- */}
          {(line.offeredAddOns.length > 0 || line.addOns.length > 0) && (
            <LineAddOns
              offered={line.offeredAddOns}
              chosen={line.addOns}
              onToggle={onToggleAddOn}
              disabled={busy}
              productName={line.productName}
            />
          )}
        </div>

        {/* ---------- Desktop price ---------- */}
        <div className="hidden shrink-0 text-right sm:block">
          {blocking ? (
            <p className="text-lg font-medium tabular-nums text-ink-muted">—</p>
          ) : (
            <p className="text-lg font-medium tabular-nums text-ink">
              {formatMoney(line.lineTotal)}
            </p>
          )}
          {!blocking && line.quantity > 1 && (
            <p className="mt-1 font-mono text-[0.75rem] tabular-nums text-ink-muted">
              {formatMoney(line.unitPrice)} each
            </p>
          )}
          {line.previousUnitPrice !== null && (
            <p className="mt-1 font-mono text-[0.75rem] tabular-nums text-ink-muted">
              was {formatMoney(line.previousUnitPrice)}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

/* ============================================================
   Local: per-line add-ons — the site's offered set, ticked to match
   what the line has actually chosen.
   ============================================================ */

function LineAddOns({
  offered,
  chosen,
  onToggle,
  disabled,
  productName,
}: {
  offered: CartLineData["offeredAddOns"];
  chosen: CartLineData["addOns"];
  onToggle: (addOnId: string) => void;
  disabled?: boolean;
  productName: string;
}) {
  const chosenIds = new Set(chosen.map((addOn) => addOn.id));
  // An add-on the line already has, but that fell out of what's offered
  // (deactivated, no longer applicable) still needs a row so the
  // shopper can see and remove it — see `ADD_ON_UNAVAILABLE`.
  const rows = [
    ...offered,
    ...chosen
      .filter((addOn) => !offered.some((entry) => entry.id === addOn.id))
      .map((addOn) => ({ id: addOn.id, label: addOn.label, price: addOn.price })),
  ];

  if (rows.length === 0) return null;

  return (
    <div className="mt-6 border-t border-line pt-5">
      <p className="flex items-baseline gap-2.5 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">
        Complete the setup
        {chosenIds.size > 0 && <span className="text-accent">{chosenIds.size} added</span>}
      </p>

      <ul className="mt-3.5 flex flex-wrap gap-2">
        {rows.map((addOn) => {
          const checked = chosenIds.has(addOn.id);
          return (
            <li key={addOn.id}>
              <button
                type="button"
                onClick={() => onToggle(addOn.id)}
                disabled={disabled}
                aria-pressed={checked}
                aria-label={`${addOn.label}, ${checked ? "remove from" : "add to"} ${productName} for ${formatMoney(addOn.price)}`}
                className={cn(
                  "group/chip inline-flex h-9 items-center gap-2 rounded-full border pl-2.5 pr-3.5",
                  "text-[0.8125rem] tracking-tight",
                  "transition-[border-color,background-color,color] duration-(--duration-fast) ease-(--ease-out-quart)",
                  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
                  checked
                    ? "border-accent/60 bg-accent/10 text-ink"
                    : "border-line bg-surface-2/60 text-ink-secondary hover:border-line-strong hover:text-ink",
                )}
              >
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
                  +{formatMoney(addOn.price)}
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
   ============================================================ */

function QuantityStepper({
  value,
  max,
  disabled,
  onChange,
  productName,
}: {
  value: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
  productName: string;
}) {
  return (
    <div className="flex h-10 items-center rounded-full border border-line px-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
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
        disabled={disabled || value >= max}
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
