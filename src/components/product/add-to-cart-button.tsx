"use client";

import Link from "next/link";
import { useRef, useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAddCartItem, useGetCart, useRemoveCartItem, useUpdateCartItem } from "@/hooks/use-cart";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { useCartFeedback } from "@/components/cart/cart-feedback-provider";
import { ConfettiBurst } from "@/components/ui/confetti-burst";
import { useDebouncedQuantity } from "@/hooks/use-debounced-quantity";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { controlSwap } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { AVAILABILITY_LABELS } from "@/types";

const OUT_OF_STOCK_LABEL = AVAILABILITY_LABELS["sold-out"];

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
  const updateCartItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();
  const cart = useGetCart();
  const { notifyAdded } = useCartFeedback();
  const soldOut = product.soldOut === true;
  const addInFlight = useRef(false);

  const line = product.variantId
    ? cart.data?.items.find((item) => item.variantId === product.variantId)
    : undefined;
  const inCartQty = line?.quantity ?? 0;
  /** Bumped on each successful add: plays the confetti. */
  const [celebrate, setCelebrate] = useState(0);
  // Taps show at once; the quantity is saved after a short pause.
  const stepper = useDebouncedQuantity(inCartQty, (quantity) =>
    updateCartItem.mutateAsync({ id: line!.id, quantity }),
  );

  function handleIncrement() {
    if (!line || stepper.quantity >= line.maxQuantity) return;
    stepper.set(stepper.quantity + 1);
  }
  function handleDecrement() {
    if (!line || removeCartItem.isPending) return;
    if (stepper.quantity <= 1) {
      stepper.cancel();
      removeCartItem.mutate(line.id);
    } else stepper.set(stepper.quantity - 1);
  }

  if (!product.variantId) {
    return (
      <Link
        href={`/product/${product.slug}`}
        aria-label={soldOut ? `${product.name} is out of stock` : `View ${product.name}`}
        onClick={(event) => {
          if (soldOut) event.preventDefault();
          event.stopPropagation();
        }}
        aria-disabled={soldOut || undefined}
        className={cn(className, BUTTON_CLASS, soldOut && "pointer-events-none opacity-40")}
      >
        <CartIcon />
        {soldOut ? OUT_OF_STOCK_LABEL : "View & Buy"}
      </Link>
    );
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (soldOut || addInFlight.current) return;
    addInFlight.current = true;
    addCartItem.mutate(
      { variantId: product.variantId!, quantity: 1, addOnIds: [] },
      {
        onSuccess: (next) => {
          setCelebrate((count) => count + 1);
          // Cart extensions: offer this product's add-ons in the modal.
          const added = next.items.find((item) => item.variantId === product.variantId);
          if (added && added.offeredAddOns.length > 0) notifyAdded(added.id);
        },
        onSettled: () => {
          addInFlight.current = false;
        },
      },
    );
  }

  if (cart.isPending) {
    return <Skeleton className={cn(className, "h-11 rounded-full")} />;
  }

  const stepperLine = soldOut ? undefined : line;
  const adding = addCartItem.isPending;
  const error = stepperLine
    ? (updateCartItem.error?.message ?? removeCartItem.error?.message)
    : addCartItem.error?.message;

  return (
    <div className="relative">
      <AnimatePresence initial={false} mode="popLayout">
        {stepperLine ? (
          <motion.div key="stepper" variants={controlSwap} initial="hidden" animate="visible" exit="exit">
            <QuantityStepper
              value={stepper.quantity}
              max={stepperLine.maxQuantity}
              disabled={removeCartItem.isPending}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              groupLabel={`${product.name} in cart`}
              variant="filled"
              size="md"
              className={className}
            />
          </motion.div>
        ) : (
          <motion.div key="add" variants={controlSwap} initial="hidden" animate="visible" exit="exit">
            <button
              type="button"
              onClick={handleClick}
              disabled={soldOut}
              aria-disabled={adding || undefined}
              aria-busy={adding || undefined}
              aria-label={
                soldOut
                  ? `${product.name} is out of stock`
                  : `Add ${product.name} to cart`
              }
              className={cn(className, BUTTON_CLASS, "relative")}
            >
              {adding && <Spinner className="absolute size-4" />}
              <span className={cn("inline-flex items-center gap-2", adding && "opacity-0")}>
                <CartIcon />
                {soldOut ? OUT_OF_STOCK_LABEL : "Add to cart"}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfettiBurst trigger={celebrate} />
      {error && (
        <span
          role="alert"
          className="absolute inset-x-0 top-full z-30 mt-1.5 truncate text-center font-mono text-[0.625rem] text-danger"
        >
          {error}
        </span>
      )}
    </div>
  );
}
