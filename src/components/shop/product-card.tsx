"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CONDITION_META,
  GRADE_META,
  productHref,
  savingPercent,
  type ShopProduct,
} from "@/lib/shop";
import { cn, formatPrice } from "@/lib/utils";

/** Units at or below this earn the scarcity line on the plate. */
const LOW_STOCK = 4;

function Arrow() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "size-3.5 shrink-0",
        // 5px shift — the same figure the drop cards and the `View device →`
        // links use, so every arrow on the site moves by the same amount.
        "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
        "group-hover:translate-x-[5px] group-focus-within:translate-x-[5px]",
        "motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-within:translate-x-0",
      )}
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

/**
 * ShopProductCard — the catalogue's unit of stock.
 *
 * Deliberately the same object as the homepage's `DropCard`: same 3:4
 * plate, same `glass-strong` chip in the top corner, same scarcity line
 * in the bottom corner, same name-and-CTA header row, same oversized
 * light price in the urgent tone with the struck original beneath it. A
 * shopper arriving from the homepage should not be able to name what
 * changed, only that there are now filters beside the grid.
 *
 * What it does *not* borrow is the drop vocabulary — no edition, no
 * countdown, no allocation. Ordinary stock is either there or it is not.
 *
 * The three axes land in three different places on purpose:
 *
 *   condition → the chip on the plate     (how it is sold)
 *   grade     → the line under the name   (what state it is in)
 *   category  → not shown at all          (the rail above already said it)
 *
 * Putting condition and grade in the same pill is the shortcut that makes
 * a catalogue like this unreadable; keeping them in different *kinds* of
 * element is what stops a reader conflating them.
 */
export function ShopProductCard({
  product,
  priority,
}: {
  product: ShopProduct;
  priority?: boolean;
}) {
  const condition = CONDITION_META[product.condition];
  const grade = product.grade ? GRADE_META[product.grade] : null;
  const saving = savingPercent(product);
  const low = product.stock > 0 && product.stock <= LOW_STOCK;

  /* Cutouts float inside the plate; photographs fill it. */
  const contain = product.image.fit === "contain";

  return (
    <article className="group relative flex h-full w-full flex-col">
      {/* ---------- The plate ---------- */}
      <div
        className={cn(
          "relative aspect-3/4 overflow-hidden rounded-xl",
          "surface-gradient edge-light border border-line",
          "transition-colors duration-(--duration-base) ease-(--ease-out-expo)",
          "group-hover:border-line-strong",
        )}
      >
        <Image
          src={product.image.url}
          alt={product.image.alt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 46vw, (max-width: 1024px) 45vw, (max-width: 1280px) 30vw, 22vw"
          className={cn(
            contain
              ? "object-contain p-8 drop-shadow-[0_24px_48px_rgb(20_20_25/0.18)] sm:p-10"
              : "object-cover",
            // Lift and zoom from anywhere on the card — the whole plate is
            // one link, so it behaves like one.
            "transition-transform duration-(--duration-slow) ease-(--ease-out-expo)",
            "group-hover:-translate-y-1 group-hover:scale-[1.04]",
            "group-focus-within:-translate-y-1 group-focus-within:scale-[1.04]",
            "motion-reduce:group-hover:scale-100 motion-reduce:group-hover:translate-y-0",
            "motion-reduce:group-focus-within:scale-100 motion-reduce:group-focus-within:translate-y-0",
          )}
        />

        {/* Condition chip — top-left, where a scanning eye lands first.
            `New` is the one state that takes the accent dot: it is the
            only condition that is a claim about the product rather than a
            description of its history. */}
        <span
          className={cn(
            "glass-strong absolute left-3 top-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 sm:left-4 sm:top-4",
            "font-mono text-[0.625rem] uppercase leading-none tracking-[0.14em] text-ink sm:text-[0.6875rem]",
          )}
        >
          {product.condition === "new" && (
            <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          )}
          <span className="sr-only">Condition: </span>
          {condition.short}
        </span>

        {/* The one live fact, bottom-left — same material and shadow as the
            drop cards' scarcity pill, so the two systems read as one
            badge family. Urgent tone is reserved for exactly this. */}
        {low && (
          <span
            className={cn(
              "glass-strong absolute bottom-3 left-3 inline-flex items-center rounded-full px-3.5 py-1.5 sm:bottom-4 sm:left-4",
              "font-mono text-[0.625rem] uppercase leading-none tracking-[0.14em] text-urgent sm:text-[0.6875rem]",
              "shadow-(--shadow-soft)",
            )}
          >
            {product.stock} left
          </span>
        )}
      </div>

      {/* ---------- Identity and action ---------- */}
      <div className="flex flex-1 flex-col px-1 pt-5 sm:pt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[1.0625rem] font-medium leading-tight tracking-[-0.02em] text-ink sm:text-[1.25rem]">
            {/* The brand sits above the model rather than inside the
                sentence: two dozen listings from eight makers are far
                easier to scan when the maker is its own column. */}
            <span className="mb-1 block font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
              {product.brand}
            </span>
            <Link
              href={productHref(product)}
              // Whole plate is one link.
              className="after:absolute after:inset-0 after:content-['']"
            >
              {product.name}
            </Link>
          </h3>

          <Link
            href={productHref(product)}
            aria-label={`View Product — ${product.brand} ${product.name}`}
            className={cn(
              "hidden shrink-0 items-center gap-1.5 self-end text-[0.8125rem] font-medium sm:inline-flex",
              "text-ink transition-colors duration-(--duration-fast) hover:text-ink-hover",
              // Invisible tap padding: the text stays 13px, the target ~36px.
              "-my-2 py-2",
            )}
          >
            View
            <Arrow />
          </Link>
        </div>

        {/* Key specification — the one line worth scanning in a grid. */}
        <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-snug text-ink-secondary sm:text-sm">
          {product.keySpec}
        </p>

        {/* Storage · finish, then grade. Grade is text rather than a badge
            precisely so it cannot be mistaken for the condition chip. */}
        <p className="mt-1.5 truncate font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-ink-muted">
          {[product.storage, product.variant].filter(Boolean).join(" · ")}
          {grade && (
            <>
              {(product.storage || product.variant) && (
                <span aria-hidden className="mx-1.5 text-ink-faint">
                  |
                </span>
              )}
              <span className="text-ink-secondary">
                <span className="sr-only">Grade: </span>
                {grade.label}
              </span>
            </>
          )}
        </p>

        {/* ---------- What it costs ---------- */}
        <div className="mt-auto pt-4 sm:pt-5">
          <p className="font-sans text-[1.625rem] font-light leading-none tracking-[-0.035em] tabular-nums text-urgent sm:text-[2rem]">
            {formatPrice(product.price, product.currency, product.locale)}
          </p>

          {product.originalPrice && (
            <p className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 font-mono text-[0.75rem] tabular-nums sm:mt-2.5">
              <span className="sr-only">Was </span>
              <s className="text-ink-muted">
                {formatPrice(product.originalPrice, product.currency, product.locale)}
              </s>
              {saving > 0 && (
                <span className="font-medium uppercase tracking-[0.14em] text-urgent">
                  {saving}% off
                </span>
              )}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
