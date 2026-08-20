"use client";

import Image from "next/image";
import Link from "next/link";
import {
  availabilityLabel,
  commerceCta,
  productHref,
  savingPercent,
  type Product,
} from "@/lib/products";
import { cn, formatPrice } from "@/lib/utils";
import { WishlistButton } from "./wishlist-button";

/**
 * StorefrontCard — the catalogue's unit of stock.
 *
 * Distinct from `DropCard`, which sells an event and therefore leads with
 * an edition and a countdown. This one answers the four questions a
 * shopper asks of ordinary stock — what is it, what does it cost, what
 * does that save, can I have it — and nothing else.
 *
 * The whole card is the link (a stretched pseudo-element over the plate
 * and copy) so the hit target is the card rather than the small text CTA.
 * The wishlist control sits above that overlay on its own z-layer,
 * because a secondary action inside a link is otherwise unreachable.
 */
export function StorefrontCard({
  product,
  priority,
  className,
}: {
  product: Product;
  priority?: boolean;
  className?: string;
}) {
  const saving = savingPercent(product);
  const cta = commerceCta(product.availability);
  const soldOut = product.availability === "sold-out";
  const low = product.availability === "low-stock";

  return (
    <article
      className={cn("group/card relative flex h-full flex-col", className)}
    >
      {/* ---------- Plate ---------- */}
      <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface">
        <Image
          src={product.image.url}
          alt={product.image.alt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 78vw, (max-width: 1024px) 45vw, 23vw"
          className={cn(
            "object-contain p-8 transition-transform duration-(--duration-slow) ease-(--ease-out-expo)",
            "group-hover/card:scale-[1.04]",
            // A sold-out product should look unavailable before the label
            // is read, but must stay identifiable.
            soldOut && "opacity-45 grayscale",
          )}
        />

        {/* Both pills share one flex row so a long availability label
            ("Only 2 left") cannot overrun the fixed-position OFF pill.
            `ml-auto` on the OFF pill keeps it flush right whether or
            not the availability chip is rendered. */}
        {((low || soldOut) || (saving > 0 && !soldOut)) && (
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start gap-2">
            {(low || soldOut) && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1",
                  "bg-surface/90 font-mono text-[0.5625rem] uppercase tracking-[0.16em] backdrop-blur-sm",
                  soldOut ? "text-ink-muted" : "text-urgent",
                )}
              >
                {availabilityLabel(product)}
              </span>
            )}

            {saving > 0 && !soldOut && (
              <span className="ml-auto rounded-full bg-ink px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-surface">
                {saving}% off
              </span>
            )}
          </div>
        )}

        <WishlistButton
          product={product}
          className="absolute bottom-3 right-3 z-20"
        />
      </div>

      {/* ---------- Copy ---------- */}
      <div className="flex flex-1 flex-col pt-5">
        <h3 className="text-[1.0625rem] font-medium leading-tight tracking-[-0.015em] text-ink">
          <Link
            href={productHref(product)}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 text-[0.8125rem] text-ink-secondary">
          {product.variant}
        </p>

        <p className="mt-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="text-[1.0625rem] font-medium tabular-nums text-ink">
            {formatPrice(product.price, product.currency, product.locale)}
          </span>
          <span className="sr-only">was </span>
          <s className="font-mono text-[0.75rem] tabular-nums text-ink-muted">
            {formatPrice(
              product.originalPrice,
              product.currency,
              product.locale,
            )}
          </s>
        </p>

        <p className="mt-4 inline-flex items-center gap-2 text-[0.8125rem] font-medium text-ink">
          {cta.label}
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3 transition-transform duration-(--duration-fast) ease-(--ease-out-quart) group-hover/card:translate-x-1"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </p>
      </div>
    </article>
  );
}
