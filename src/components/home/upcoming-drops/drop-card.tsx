"use client";

import Image from "next/image";
import Link from "next/link";
import type { DropStatus, UpcomingDrop } from "@/lib/drops";
import { productHrefForDrop } from "@/lib/route-map";
import { cn, formatPrice, savingsPercent } from "@/lib/utils";
import { Countdown } from "@/components/ui/countdown";
import { WishlistButton } from "@/components/product/wishlist-button";
import { AddToCartButton } from "@/components/product/add-to-cart-button";

interface DropCardProps {
  drop: UpcomingDrop;
  /** First card above the fold gets eager loading. */
  priority?: boolean;
  /** Opens the section's waitlist dialog — used by the unbuyable states. */
  onJoinWaitlist: () => void;
}

/**
 * Availability facts specific to each drop state. The reference card
 * treats availability as a small top-left mono note; a drop's states
 * carry more information than an ordinary product's, so this maps each
 * to a concrete row rather than reusing the shop's `availabilityLabel`.
 */
function availabilityFor(drop: UpcomingDrop): string | null {
  switch (drop.status) {
    case "available":
      return `${drop.unitsLeft} units left`;
    case "almost-gone":
      return `LOW STOCK — ${drop.unitsLeft} LEFT`;
    case "sold-out":
      return "SOLD OUT";
    case "coming-soon":
      return null; // countdown carries this state's information
  }
}

/**
 * DropCard — a release calendar entry, in the site's one product-card
 * shape.
 *
 * Same plate / brand / name / variant / price / actions layout as
 * `StorefrontCard`, so a shopper reads the same object whether they
 * are in the release calendar or the shop. What is drop-specific is
 * *what fills each slot*, not the slots themselves:
 *
 *   corner text      → units left / LOW STOCK / SOLD OUT / (countdown)
 *   coming-soon      → countdown chip bottom-left of the plate
 *   primary action   → Add to cart (buyable) or Join Waitlist (not)
 *
 * The whole plate is a link to the PDP (or drop page for unlaunched
 * releases); the wishlist and cart controls sit above the stretched
 * pseudo-element on `z-20` and cancel the navigation on click.
 */
export function DropCard({ drop, priority, onJoinWaitlist }: DropCardProps) {
  const isSoldOut = drop.status === "sold-out";
  const isComingSoon = drop.status === "coming-soon";
  const isBuyable = !isSoldOut && !isComingSoon;
  const saving = savingsPercent(drop.price, drop.originalPrice);
  const availability = availabilityFor(drop);
  const brand = drop.name.split(" ")[0];

  return (
    <article className="group/card relative flex h-full w-full flex-col">
      {/* ---------- Plate ----------
          Warm editorial plate (`--color-plate`) rather than the dark
          surface token — product cutouts here ship with white studio
          backgrounds baked in, and setting the plate to a warm cream
          makes those photos read as intentional showcase art rather
          than as bright rectangles punched through a dark grid.
          `mix-blend-mode: multiply` on the image then bleeds the raw
          #FFF background into the plate's cream so the join is invisible;
          the product itself (mostly dark cutouts) multiplies with cream
          to a very slightly warmed version of the same colour. */}
      <div className="relative aspect-square overflow-hidden rounded-xl border border-white/[0.04] bg-plate">
        <Image
          src={drop.image.url}
          alt={drop.image.alt}
          fill
          priority={priority}
          sizes="(max-width: 640px) 86vw, (max-width: 1280px) 46vw, 24vw"
          className={cn(
            "object-cover [mix-blend-mode:multiply] transition-transform duration-(--duration-slow) ease-(--ease-out-expo)",
            "group-hover/card:scale-[1.04]",
            isSoldOut && "opacity-45 grayscale",
          )}
        />

        {/* Top-left: availability signal, small mono like the reference.
            Not rendered for coming-soon — the countdown at the bottom
            of the plate carries that state's information instead. */}
        {availability && (
          <span
            className={cn(
              "pointer-events-none absolute left-3.5 top-3.5 font-mono text-[0.5625rem] uppercase tracking-[0.18em]",
              statusToneClass(drop.status),
            )}
          >
            {availability}
          </span>
        )}

        {/* Top-right: discount pill. Suppressed on sold-out because
            "42% OFF" on an unbuyable line item is misleading. */}
        {saving > 0 && !isSoldOut && (
          <span className="pointer-events-none absolute right-3.5 top-3.5 rounded-full bg-ink px-2.5 py-1 font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-void">
            {saving}% OFF
          </span>
        )}

        {/* Coming-soon: countdown docked bottom-left of the plate. The
            drop card's one drop-specific chrome — every other corner
            behaves like an ordinary product card. */}
        {isComingSoon && (
          <span className="glass-strong pointer-events-none absolute bottom-3.5 left-3.5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 shadow-(--shadow-soft)">
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-ink-muted">
              Opens in
            </span>
            <Countdown
              compact
              target={drop.startsAt}
              label={`${drop.name} drop opens in`}
              className="font-mono text-[0.625rem] leading-none tracking-[0.06em] text-ink"
            />
          </span>
        )}

        <WishlistButton
          product={{ slug: drop.slug, name: drop.name }}
          className="absolute bottom-3 right-3 z-20"
        />
      </div>

      {/* ---------- Copy ---------- */}
      <div className="flex flex-1 flex-col pt-5">
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">
          {brand}
        </p>

        <h3 className="mt-2 text-[1.0625rem] font-medium leading-tight tracking-[-0.015em] text-ink">
          <Link
            href={productHrefForDrop(drop.slug)}
            // Whole plate is one link; the wishlist and cart controls
            // sit above it on `z-20` and stop propagation.
            className="after:absolute after:inset-0 after:content-['']"
          >
            {drop.name}
          </Link>
        </h3>

        <p className="mt-1 text-[0.8125rem] text-ink-secondary">
          {drop.variant}
        </p>

        <p className="mt-auto flex flex-wrap items-baseline gap-x-2.5 gap-y-1 pt-5">
          <span
            className={cn(
              "text-[1.0625rem] font-medium tabular-nums",
              isSoldOut ? "text-ink-muted line-through" : "text-ink",
            )}
          >
            {formatPrice(drop.price, drop.currency, drop.locale)}
          </span>
          {drop.originalPrice > drop.price && !isSoldOut && (
            <>
              <span className="sr-only">was </span>
              <s className="font-mono text-[0.75rem] tabular-nums text-ink-muted">
                {formatPrice(drop.originalPrice, drop.currency, drop.locale)}
              </s>
            </>
          )}
        </p>

        {/* Primary action — Add to cart when the drop is buyable, a
            waitlist button otherwise. Both share the AddToCartButton's
            visual shape so a grid of mixed-state cards has a single
            action bar rhythm. `z-20` keeps the button above the
            stretched plate link. */}
        <div className="relative z-20 mt-4">
          {isBuyable ? (
            <AddToCartButton
              product={{ slug: drop.slug, name: drop.name, soldOut: false }}
              className="w-full"
            />
          ) : (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onJoinWaitlist();
              }}
              aria-haspopup="dialog"
              className={cn(
                "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full",
                "text-[0.8125rem] font-medium tracking-tight",
                isSoldOut
                  ? "border border-line-strong text-ink hover:border-ink"
                  : "bg-accent text-void hover:bg-accent-hover",
                "transition-[background-color,border-color,transform] duration-(--duration-fast)",
                "active:scale-[0.98]",
              )}
            >
              {isSoldOut ? "Notify Me" : "Join Waitlist"}
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function statusToneClass(status: DropStatus): string {
  switch (status) {
    case "almost-gone":
      return "text-urgent";
    case "sold-out":
      return "text-ink-muted";
    case "available":
      return "text-ink-secondary";
    case "coming-soon":
      return "text-ink-muted";
  }
}
