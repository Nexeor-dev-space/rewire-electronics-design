"use client";

import Image from "next/image";
import Link from "next/link";
import {
  availabilityLabel,
  productHref,
  savingPercent,
  type Product,
} from "@/lib/products";
import { cn, formatPrice } from "@/lib/utils";
import { WishlistButton } from "./wishlist-button";
import { AddToCartButton } from "./add-to-cart-button";

/**
 * StorefrontCard — the site's one product card.
 *
 * One shape, three answers to what a shopper is doing: photograph on
 * top, identity below, action underneath. Every ordinary product card
 * on the site — homepage `Featured`, `/wishlist`, and the shop
 * catalogue via `ShopProductCard` — is this component.
 *
 * The reader's questions in order: what is it (brand line + name +
 * variant), what does it cost (price + strikethrough + saving pill),
 * can I have it (LOW STOCK / SOLD OUT small mono top-left), and what
 * do I do (wishlist as a persistent secondary, add-to-cart as the
 * primary). The whole plate is the PDP link; both actions sit above
 * the stretched pseudo-element and cancel the navigation so they can
 * do their own thing.
 *
 * `brand` is derived from the product name's first word rather than
 * carried as a separate data field — every entry in the catalogue is a
 * "[Brand] [Model]" pair, so the derivation is exact.
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
  const soldOut = product.availability === "sold-out";
  const low = product.availability === "low-stock";
  const brand = product.name.split(" ")[0];

  return (
    <article
      className={cn("group/card relative flex h-full flex-col", className)}
    >
      {/* ---------- Plate ----------
          See `drop-card.tsx` on the plate-as-editorial-showcase pattern:
          warm cream ground + `mix-blend-mode: multiply` on the image so
          baked-in white studio backgrounds dissolve into the plate. */}
      <div className="relative aspect-square overflow-hidden rounded-xl border border-white/[0.04] bg-plate">
        <Image
          src={product.image.url}
          alt={product.image.alt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 85vw, (max-width: 1024px) 45vw, (max-width: 1536px) 30vw, 23vw"
          className={cn(
            "object-contain p-5 sm:p-6 [mix-blend-mode:multiply] transition-transform duration-(--duration-slow) ease-(--ease-out-expo)",
            "group-hover/card:scale-[1.04]",
            // A sold-out product should look unavailable before the label
            // is read, but must stay identifiable.
            soldOut && "opacity-45 grayscale",
          )}
        />

        {/* ---------- Corner chrome ----------
            Top-left: availability *only when it matters*. Small mono
            text rather than a chip — a chip on every card in a grid
            reads as noise; a bare LOW STOCK reads as urgency. Absent for
            in-stock products so the plate stays clean where it can.
            Top-right: saving pill. Solid ink chip because a discount is
            a value claim, not an alarm — the alarm colour is reserved
            for stock. */}
        {(low || soldOut) && (
          <span
            className={cn(
              "pointer-events-none absolute left-3.5 top-3.5 font-mono text-[0.5625rem] uppercase tracking-[0.18em]",
              soldOut ? "text-ink-muted" : "text-urgent",
            )}
          >
            {availabilityLabel(product)}
          </span>
        )}

        {saving > 0 && !soldOut && (
          <span className="pointer-events-none absolute right-3.5 top-3.5 rounded-full bg-ink px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-void">
            {saving}% OFF
          </span>
        )}

        {/* Wishlist floats over the bottom-right of the plate, always
            reachable — see the persistence rules in WishlistButton. */}
        <WishlistButton
          product={product}
          className="absolute bottom-3 right-3 z-20"
        />
      </div>

      {/* ---------- Copy ---------- */}
      <div className="flex flex-1 flex-col pt-5">
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">
          {brand}
        </p>

        <h3 className="mt-2 text-lg font-medium leading-tight tracking-[-0.015em] text-ink sm:text-xl">
          <Link
            href={productHref(product)}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {product.name}
          </Link>
        </h3>

        <p className="mt-1 text-sm text-ink-secondary">{product.variant}</p>

        {/* Price row: current price, then struck original — the same
            order the reference uses. `mt-auto` pushes the row to the
            card foot so a grid of cards with different variant-line
            lengths still aligns the price on the baseline. */}
        <p className="mt-auto flex flex-wrap items-baseline gap-x-2.5 gap-y-1 pt-5">
          <span className="text-xl font-medium tabular-nums text-ink sm:text-2xl">
            {formatPrice(product.price, product.currency, product.locale)}
          </span>
          {product.originalPrice > product.price && (
            <>
              <span className="sr-only">was </span>
              <s className="font-mono text-[0.8125rem] tabular-nums text-ink-muted">
                {formatPrice(
                  product.originalPrice,
                  product.currency,
                  product.locale,
                )}
              </s>
            </>
          )}
        </p>

        {/* Primary action — sits over the card link overlay via z-20. */}
        <div className="relative z-20 mt-4">
          <AddToCartButton
            product={{ slug: product.slug, name: product.name, soldOut }}
            className="w-full"
          />
        </div>
      </div>
    </article>
  );
}
