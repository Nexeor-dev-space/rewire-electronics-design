"use client";

import type { MouseEvent } from "react";
import { useAccount } from "@/components/providers/account-provider";
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
 */
/**
 * Structural minimum needed to add a line item. Availability collapses
 * to the one thing this button cares about — whether it can be bought
 * — so the callers derive it (from `availability`, from `stock`, from
 * a drop status) rather than teaching this button every data model.
 */
export interface CartTarget {
  slug: string;
  name: string;
  soldOut?: boolean;
}

export function AddToCartButton({
  product,
  className,
}: {
  product: CartTarget;
  className?: string;
}) {
  const { addItem } = useAccount();
  const soldOut = product.soldOut === true;

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (soldOut) return;
    addItem(product.slug);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={soldOut}
      aria-label={
        soldOut
          ? `${product.name} is sold out`
          : `Add ${product.name} to cart`
      }
      className={cn(
        className,
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5",
        "bg-accent text-[0.8125rem] font-medium tracking-tight text-white",
        "transition-[background-color,transform,opacity] duration-(--duration-fast)",
        "hover:bg-accent-hover active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[0.9375rem]"
      >
        {/* A shopping bag — softer than a trolley, matches the header cart glyph */}
        <path d="M4.75 6.75h10.5l-.9 10a1.5 1.5 0 0 1-1.5 1.35H7.15a1.5 1.5 0 0 1-1.5-1.35Z" />
        <path d="M7.5 6.75V5.5a2.5 2.5 0 0 1 5 0v1.25" />
      </svg>
      {soldOut ? "Sold out" : "Add to cart"}
    </button>
  );
}
