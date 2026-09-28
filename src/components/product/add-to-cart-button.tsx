"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useAddCartItem } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";

/**
 * AddToCartButton — the everyday commerce action, present on every card.
 *
 * The whole card is a link to the PDP, so this button is a nested
 * interactive that must not follow the card link. `preventDefault` +
 * `stopPropagation` on click keep the two actions separate: the card
 * navigates, the button drops a line item and stays on the page.
 *
 * Sold-out is a disabled state rather than a hidden button — the shape
 * of the row stays constant, so a grid of cards never staggers on the
 * one that cannot be bought.
 *
 * `variantId` is optional: cards backed by the real catalogue (the shop
 * grid) carry the variant they display and add it directly. Cards still
 * backed by the mock catalogue (`Featured`, `/wishlist`, upcoming drops,
 * the home setup kit) have no real variant to add, so without one this
 * renders as a link to the product page instead — see Q7 in
 * `docs/CART.md`.
 */
/**
 * Structural minimum needed to add a line item. Availability collapses
 * to the one thing this button cares about — whether it can be bought
 * — so the callers derive it (from `availability`, from `stock`, from
 * a drop status) rather than teaching this button every data model.
 */
export interface CartTarget {
  variantId?: string;
  slug: string;
  name: string;
  soldOut?: boolean;
}

const BUTTON_CLASS = cn(
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5",
  "bg-accent text-[0.8125rem] font-medium tracking-tight text-white",
  "transition-[background-color,transform,opacity] duration-(--duration-fast)",
  "hover:bg-accent-hover active:scale-[0.98]",
  "disabled:pointer-events-none disabled:opacity-40",
);

function CartIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[1.05rem]"
    >
      {/* A trolley cart — the bag outline read as a trash bin at button
          scale because the flat top-handle looks like a lid. The trolley
          with two wheels and a hooked handle is unambiguous. */}
      <path d="M2.5 3.5h2.6l2.6 11.4a1.5 1.5 0 0 0 1.47 1.2h8.6a1.5 1.5 0 0 0 1.47-1.2L20.9 7.5H6.5" />
      <circle cx="9.5" cy="19.5" r="1.35" />
      <circle cx="17" cy="19.5" r="1.35" />
    </svg>
  );
}

export function AddToCartButton({
  product,
  className,
}: {
  product: CartTarget;
  className?: string;
}) {
  const addCartItem = useAddCartItem();
  const soldOut = product.soldOut === true;

  if (!product.variantId) {
    return (
      <Link
        href={`/product/${product.slug}`}
        aria-label={soldOut ? `${product.name} is sold out` : `View ${product.name}`}
        onClick={(event) => {
          if (soldOut) event.preventDefault();
          event.stopPropagation();
        }}
        aria-disabled={soldOut || undefined}
        className={cn(className, BUTTON_CLASS, soldOut && "pointer-events-none opacity-40")}
      >
        <CartIcon />
        {soldOut ? "Sold out" : "View & Buy"}
      </Link>
    );
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (soldOut) return;
    addCartItem.mutate({ variantId: product.variantId!, quantity: 1, addOnIds: [] });
  }

  return (
    <span className="relative block">
      <button
        type="button"
        onClick={handleClick}
        disabled={soldOut || addCartItem.isPending}
        aria-busy={addCartItem.isPending || undefined}
        aria-label={
          soldOut
            ? `${product.name} is sold out`
            : `Add ${product.name} to cart`
        }
        className={cn(className, BUTTON_CLASS)}
      >
        <CartIcon />
        {soldOut ? "Sold out" : "Add to cart"}
      </button>
      {addCartItem.isError && (
        <span
          role="alert"
          className="absolute inset-x-0 top-full z-30 mt-1.5 truncate text-center font-mono text-[0.625rem] text-danger"
        >
          {addCartItem.error.message}
        </span>
      )}
    </span>
  );
}
