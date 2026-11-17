"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useGetCart, useUpdateCartItem } from "@/hooks/use-cart";
import { CART_PAGE_PATH } from "@/lib/constants";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import type { CartLine } from "@/types/cart";
import { useCartFeedback } from "./cart-feedback-provider";
import { LineAddOns, toggledAddOnIds } from "./cart-line";

/**
 * AddToCartModal — the cart extensions shown after Add to cart on a product
 * card or the product page, when that product offers add-ons.
 *
 * Mounted once at the root of the tree. Reads the last `notifyAdded` line
 * id off the CartFeedbackProvider and that line live from `useGetCart`:
 * the confirmation, the line's add-ons as the same "Complete the setup"
 * chips the cart page shows (ticking one updates the line at once), the
 * running cart summary, and Continue Shopping / View Cart.
 *
 * The panel adopts the user-specified dark palette by scoping the
 * design-token CSS variables inside its own subtree — every Tailwind
 * class inside the modal (`bg-surface`, `text-ink`, `border-line`, …)
 * resolves to the palette the brief calls for, without disturbing the
 * light-first tokens the rest of the site sits on.
 *
 * On phones it is a bottom sheet that covers at most half the screen and
 * slides up, so the page the shopper was on stays in view above it. From
 * `sm` up it is a full height side panel from the right, the same shape
 * and motion as the shop's filter drawer (`filter-drawer.tsx`). Either
 * way the add-on list scrolls between a fixed header and footer.
 */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Tailwind's `sm` breakpoint: from here up the panel slides in from the side. */
const SIDE_PANEL_QUERY = "(min-width: 40rem)";

/** Where the panel slides from: the right edge, or the bottom on phones. */
function hiddenOffset() {
  const sidePanel = typeof window !== "undefined" && window.matchMedia(SIDE_PANEL_QUERY).matches;
  return sidePanel ? { x: "100%" } : { y: "100%" };
}

export function AddToCartModal() {
  const { latest, isOpen, close } = useCartFeedback();
  const cart = useGetCart();
  const updateCartItem = useUpdateCartItem();
  const prefersReduced = useReducedMotion();

  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // A line removed elsewhere while the modal is open simply closes it.
  const line = latest ? cart.data?.items.find((item) => item.id === latest.lineId) : undefined;

  /* ---------- Focus management + Escape + body lock ---------- */
  useEffect(() => {
    if (!isOpen) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const originalOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    const id = window.setTimeout(() => {
      const panel = panelRef.current;
      const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel)?.focus();
    }, 0);

    return () => {
      window.clearTimeout(id);
      document.documentElement.style.overflow = originalOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes?.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [close],
  );

  const showPanel = isOpen && Boolean(latest && line);
  const transition = { duration: prefersReduced ? 0 : DURATION.base, ease: EASE_OUT_EXPO };
  const hidden = prefersReduced ? { opacity: 0 } : hiddenOffset();
  const shown = prefersReduced ? { opacity: 1 } : { x: 0, y: 0 };

  return (
    <AnimatePresence>
      {showPanel && latest && line && (
        <motion.div key="add-to-cart-panel" className="fixed inset-0 z-[80]">
          {/* ---------- Backdrop ---------- */}
          <motion.button
            type="button"
            aria-label="Close"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* ---------- Panel ---------- */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-to-cart-title"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            initial={hidden}
            animate={shown}
            exit={hidden}
            transition={transition}
            key={latest.nonce}
            className={cn(
              // Scoped commerce dark palette — every token below resolves
              // to the transactional palette defined in globals.css.
              "commerce-dark",
              "absolute bottom-0 right-0 flex w-full flex-col overflow-hidden",
              "pb-[env(safe-area-inset-bottom)]",
              "bg-surface text-ink border-line shadow-[0_24px_48px_rgb(0_0_0/0.45)]",
              // Bottom sheet on phones, at most half the screen tall
              "max-h-[50dvh] rounded-t-3xl border-t",
              // Full height side panel from sm
              "sm:top-0 sm:max-h-none sm:max-w-[26rem] sm:rounded-none sm:border-t-0 sm:border-l",
            )}
          >
            {/* Grabber (phones only) */}
            <div className="pt-2.5 sm:hidden" aria-hidden>
              <span className="mx-auto block h-1 w-10 rounded-full bg-white/15" />
            </div>

            <ModalHeader onClose={close} />

            {/*
              `data-lenis-prevent` stops the page's Lenis driver from
              swallowing wheel/touch events inside the modal body — the
              add-on list needs to scroll on its own when it overflows.
            */}
            <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="px-4 pb-2 max-[22rem]:px-3 sm:px-7">
                <AddedProduct line={line} />

                <LineAddOns
                  offered={line.offeredAddOns}
                  chosen={line.addOns}
                  disabled={updateCartItem.isPending}
                  productName={line.productName}
                  onToggle={(addOnId) =>
                    updateCartItem.mutate({ id: line.id, addOnIds: toggledAddOnIds(line, addOnId) })
                  }
                />
                {updateCartItem.isError && (
                  <p role="alert" className="mt-3 text-[0.8125rem] text-danger">
                    {updateCartItem.error.message}
                  </p>
                )}
              </div>
            </div>

            <ModalFooter
              cartCount={cart.data?.itemCount ?? 0}
              subtotal={cart.data?.totals.subtotal ?? 0}
              onContinue={close}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   Header — title + close
   ============================================================ */

function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <header className="flex items-center justify-between gap-4 px-4 pb-1 pt-1 max-[22rem]:px-3 sm:px-7 sm:pb-4 sm:pt-6">
      <p
        id="add-to-cart-title"
        className="font-mono text-[0.75rem] uppercase tracking-[0.22em] text-ink-secondary"
      >
        Added to your cart
      </p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors duration-(--duration-fast) hover:bg-white/5 hover:text-ink"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <path d="M6 6l12 12M18 6l-6 6-6 6" />
        </svg>
      </button>
    </header>
  );
}

/* ============================================================
   The product that was just added
   ============================================================ */

function AddedProduct({ line }: { line: CartLine }) {
  const { productName, brand, imageUrl, imageAlt, quantity } = line;
  const variantLabel = [line.storage, line.colour].filter(Boolean).join(" · ");
  return (
    // Compact on phones, where the sheet is at most half the screen and
    // the room belongs to the add-ons below.
    <article className="flex items-start gap-3 sm:gap-5">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:size-28">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            sizes="112px"
            className="object-contain p-2 sm:p-3"
          />
        )}
      </div>

      <div className="min-w-0 max-w-full flex-1">
        <p className="break-words font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
          {brand}
        </p>
        <h2 className="mt-0.5 text-base font-medium leading-tight tracking-[-0.01em] text-ink [overflow-wrap:anywhere] sm:mt-1 sm:text-[1.25rem]">
          {productName}
        </h2>
        <p className="mt-0.5 text-[0.8125rem] text-ink-secondary sm:mt-1">
          {variantLabel}
        </p>

        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 sm:mt-3">
          <p className="text-base font-medium tabular-nums text-ink sm:text-[1.125rem]">
            {formatMoney(line.lineTotal)}
          </p>
          {quantity > 1 && (
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
              Qty {quantity}
            </p>
          )}
        </div>

        <AddedBadge />
      </div>
    </article>
  );
}

function AddedBadge() {
  const prefersReduced = useReducedMotion();
  return (
    <motion.p
      role="status"
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: prefersReduced ? 0 : 0.08, duration: 0.22 }}
      // Hidden on phones: the header already says "Added to your cart".
      className="mt-3 hidden items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-live sm:inline-flex"
    >
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-3"
      >
        <path d="m3 8 3.5 3.5L13 4.5" />
      </svg>
      Added to cart
    </motion.p>
  );
}

/* ============================================================
   Footer — running total + primary/secondary actions
   ============================================================ */

function ModalFooter({
  cartCount,
  subtotal,
  onContinue,
}: {
  cartCount: number;
  subtotal: number;
  onContinue: () => void;
}) {
  return (
    <footer className="border-t border-line bg-void/60 px-4 py-3 max-[22rem]:px-3 sm:px-7 sm:pb-7 sm:pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink-secondary">
          {cartCount} {cartCount === 1 ? "item" : "items"} in your cart
        </p>
        <p className="text-[0.9375rem] font-medium tabular-nums text-ink">
          <span className="mr-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
            Subtotal
          </span>
          {formatMoney(subtotal)}
        </p>
      </div>

      {/* Side by side on every width, so the half height sheet on phones
          keeps its room for the add-ons rather than two stacked buttons. */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-[1fr_1.4fr] sm:gap-2.5">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full border border-line-strong px-3 py-1.5 text-center text-[0.8125rem] font-medium text-ink transition-colors duration-(--duration-fast) hover:bg-white/5 sm:min-h-12 sm:px-5 sm:py-2 sm:text-sm"
        >
          Continue Shopping
        </button>
        <Link
          href={CART_PAGE_PATH}
          onClick={onContinue}
          className="inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-3 py-1.5 text-[0.8125rem] font-medium text-white transition-colors duration-(--duration-fast) hover:bg-accent-hover sm:min-h-12 sm:px-5 sm:py-2 sm:text-sm"
        >
          View Cart
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </Link>
      </div>
    </footer>
  );
}
