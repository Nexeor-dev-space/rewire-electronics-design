"use client";

import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import { CONDITION_META, GRADE_META, productHref } from "@/lib/shop";
import { cn, savingsPercent } from "@/lib/utils";
import { availabilityFromStock } from "@/types";
import type { ShopCard } from "@/types/catalogue";
import { WishlistButton } from "@/components/product/wishlist-button";
import { AddToCartButton } from "@/components/product/add-to-cart-button";

export function ShopProductCard({
  product,
  priority,
}: {
  product: ShopCard;
  priority?: boolean;
}) {
  const condition = CONDITION_META[product.condition];
  const grade = product.grade ? GRADE_META[product.grade] : null;
  const saving =
    product.originalPrice !== null ? savingsPercent(product.price, product.originalPrice) : 0;
  const availability = availabilityFromStock(product.stock);
  const low = availability === "low-stock";
  const soldOut = availability === "sold-out";

  return (
    <article className="group/card relative flex h-full w-full flex-col">
      {/* ---------- Plate ----------
          See `drop-card.tsx` for the plate-as-editorial-showcase pattern
          in detail: warm cream ground so the baked-in white studio
          backgrounds on the product photography read as intent, and
          `mix-blend-mode: multiply` so the image's white dissolves into
          the plate and the product itself picks up only a faint warm cast. */}
      {/* 4:3 rather than square — with the grid a column denser, a
          square plate made each card taller than a viewport row could
          comfortably hold. The shorter plate keeps the device legible
          (contain padding trimmed to match) and takes ~25% off every
          card's height, so the catalogue shows more rows per screen. */}
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/[0.04] bg-plate">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt}
            fill
            priority={priority}
            sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, (max-width: 1536px) 22vw, 18vw"
            className={cn(
              "object-contain p-5 sm:p-6",
              "[mix-blend-mode:multiply] transition-transform duration-(--duration-slow) ease-(--ease-out-expo)",
              "group-hover/card:scale-[1.04]",
              soldOut && "opacity-45 grayscale",
            )}
          />
        )}

        {/* Top-left: stock signal, same mono voice as StorefrontCard.
            Sold-out and low-stock share the corner; sold-out wins if
            both are true (a zero-stock listing is never merely low). */}
        {(soldOut || low) && (
          <span
            className={cn(
              "pointer-events-none absolute left-3.5 top-3.5 font-mono text-[0.5625rem] uppercase tracking-[0.18em]",
              soldOut ? "text-ink-muted" : "text-urgent",
            )}
          >
            {soldOut ? "Sold out" : `${product.stock} left`}
          </span>
        )}

        {/* Top-right: saving pill, only where a real discount exists.
            Sealed stock has no `originalPrice`, so `saving` is 0 and
            the pill drops out. */}
        {saving > 0 && !soldOut && (
          <span className="pointer-events-none absolute right-3.5 top-3.5 rounded-full bg-ink px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-void">
            {saving}% OFF
          </span>
        )}

        <WishlistButton
          product={{ slug: product.slug, name: product.name }}
          className="absolute bottom-3 right-3 z-20"
        />
      </div>

      {/* ---------- Copy ---------- */}
      <div className="flex flex-1 flex-col pt-5">
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">
          {product.brand}
        </p>

        <h3 className="mt-2 text-[1.0625rem] font-medium leading-tight tracking-[-0.015em] text-ink">
          <Link
            href={productHref(product)}
            className="after:absolute after:inset-0 after:content-['']"
          >
            {product.name}
          </Link>
        </h3>

        {/* The reference's "Variant · Storage" line, plus condition and
            grade where the catalogue has them. Kept mono because these
            are technical facts about the unit, not marketing copy. */}
        <p className="mt-1 truncate text-[0.8125rem] text-ink-secondary">
          {[product.storage, product.variant].filter(Boolean).join(" · ") ||
            product.keySpec}
        </p>

        <p className="mt-1.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-muted">
          <span className="sr-only">Condition: </span>
          {condition.short}
          {grade && (
            <>
              <span aria-hidden className="mx-1.5 text-ink-faint">
                ·
              </span>
              <span>
                <span className="sr-only">Grade: </span>
                {grade.label}
              </span>
            </>
          )}
        </p>

        <p className="mt-auto flex flex-wrap items-baseline gap-x-2.5 gap-y-1 pt-5">
          <span className="text-[1.0625rem] font-medium tabular-nums text-ink">
            {formatMoney(product.price)}
          </span>
          {product.originalPrice !== null && product.originalPrice > product.price && (
            <>
              <span className="sr-only">was </span>
              <s className="font-mono text-[0.75rem] tabular-nums text-ink-muted">
                {formatMoney(product.originalPrice)}
              </s>
            </>
          )}
        </p>

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
