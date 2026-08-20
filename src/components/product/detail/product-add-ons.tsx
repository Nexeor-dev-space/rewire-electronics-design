"use client";

import { addOnsTotal, type AddOn } from "@/lib/add-ons";
import { cn, formatPrice } from "@/lib/utils";

interface Props {
  addOns: AddOn[];
  selected: string[];
  onToggle: (id: string) => void;
  /** The configured device price, so the block can show a bag total. */
  basePrice: number;
  currency: string;
  locale?: string;
  className?: string;
}

/**
 * ProductAddOns — the fourth axis, kept visibly apart from the other three.
 *
 * Storage and Colour decide *which device* is being bought and are drawn
 * as pills and swatches. These decide *what else ships with it*, so they
 * are drawn as checkbox rows with their own prices — the same control the
 * shop's filter panel uses, which is already the site's vocabulary for
 * "several independent yes/no choices".
 *
 * Two rules the layout enforces:
 *
 *  1. **Every row states its price.** An add-on whose cost only appears in
 *     the bag is a surprise, and surprises at checkout are what make
 *     people abandon one.
 *  2. **The total only appears once something is ticked.** At rest the
 *     block is a quiet list; it starts doing arithmetic at you only after
 *     you have opted in, so the default state stays editorial rather than
 *     turning the panel into an order form.
 */
export function ProductAddOns({
  addOns,
  selected,
  onToggle,
  basePrice,
  currency,
  locale,
  className,
}: Props) {
  if (!addOns.length) return null;

  const extras = addOnsTotal(addOns, selected);

  return (
    <section
      aria-labelledby="add-ons-heading"
      className={cn("mt-10 border-t border-line pt-8", className)}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="add-ons-heading" className="eyebrow text-ink">
          Add to your order
        </h2>
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-muted">
          Optional
        </span>
      </div>

      <ul className="mt-5 space-y-2.5">
        {addOns.map((addOn) => {
          const checked = selected.includes(addOn.id);

          return (
            <li key={addOn.id}>
              <label
                className={cn(
                  "group/addon flex cursor-pointer items-start gap-3.5 rounded-xl border p-4",
                  "transition-[border-color,background-color] duration-(--duration-fast)",
                  checked
                    ? "border-ink bg-surface-2"
                    : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={checked}
                  onChange={() => onToggle(addOn.id)}
                />

                <span
                  aria-hidden
                  className={cn(
                    "mt-0.5 flex size-[1.125rem] shrink-0 items-center justify-center rounded-xs border",
                    "transition-[background-color,border-color] duration-(--duration-fast)",
                    checked
                      ? "border-ink bg-ink"
                      : "border-line-strong bg-surface group-hover/addon:border-ink-muted",
                    "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                  )}
                >
                  {checked && (
                    <svg
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-2.5 text-surface"
                    >
                      <path d="M2.5 6.5l2.5 2.5 4.5-5" />
                    </svg>
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <span className="text-[0.9375rem] font-medium leading-snug text-ink">
                      {addOn.label}
                    </span>
                    {addOn.popular && (
                      <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-accent">
                        Most chosen
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-[0.8125rem] leading-snug text-ink-secondary">
                    {addOn.note}
                  </span>
                </span>

                <span className="shrink-0 pl-2 font-mono text-[0.8125rem] tabular-nums text-ink">
                  +{formatPrice(addOn.price, currency, locale)}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {/* Arithmetic only once there is arithmetic to do. */}
      {extras > 0 && (
        <dl className="mt-5 space-y-2 border-t border-line pt-5">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[0.8125rem] text-ink-secondary">Device</dt>
            <dd className="font-mono text-[0.8125rem] tabular-nums text-ink-secondary">
              {formatPrice(basePrice, currency, locale)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-[0.8125rem] text-ink-secondary">
              Add-ons
              <span className="ml-1.5 text-ink-muted">
                ({selected.length})
              </span>
            </dt>
            <dd className="font-mono text-[0.8125rem] tabular-nums text-ink-secondary">
              {formatPrice(extras, currency, locale)}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 pt-1">
            <dt className="text-[0.9375rem] font-medium text-ink">Bag total</dt>
            <dd className="font-mono text-base font-medium tabular-nums text-ink">
              {formatPrice(basePrice + extras, currency, locale)}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
