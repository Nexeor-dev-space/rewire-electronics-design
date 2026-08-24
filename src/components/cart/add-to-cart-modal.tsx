"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getProductBySlug } from "@/lib/catalog";
import { getCrossSell } from "@/lib/cross-sell";
import { useAccount } from "@/components/providers/account-provider";
import { useCartFeedback } from "./cart-feedback-provider";
import { cn, formatPrice } from "@/lib/utils";
import type { Product } from "@/types";

/**
 * AddToCartModal — the confirmation that opens after every Add to Cart.
 *
 * Mounted once at the root of the tree. Reads the last `notifyAdded`
 * signal off the CartFeedbackProvider, resolves the product from the
 * catalogue, and renders the polished dark panel: confirmation, up to
 * three contextual add-ons, running cart summary, and the two
 * decisive actions.
 *
 * The panel adopts the user-specified dark palette by scoping the
 * design-token CSS variables inside its own subtree — every Tailwind
 * class inside the modal (`bg-surface`, `text-ink`, `border-line`, …)
 * resolves to the palette the brief calls for, without disturbing the
 * light-first tokens the rest of the site sits on.
 *
 * Layout adapts by viewport rather than by matchMedia: a centred panel
 * from `sm` up, and a bottom sheet on phones. The same DOM either way —
 * only the wrapper positioning changes.
 */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function AddToCartModal() {
  const { latest, isOpen, close } = useCartFeedback();
  const { items, cartCount } = useAccount();
  const prefersReduced = useReducedMotion();

  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const anchor = useMemo<Product | null>(
    () => (latest ? (getProductBySlug(latest.productSlug) ?? null) : null),
    [latest],
  );

  const addons = useMemo(() => (anchor ? getCrossSell(anchor, 3) : []), [anchor]);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, line) => {
        const product = getProductBySlug(line.productSlug);
        if (!product) return sum;
        return sum + product.price * line.quantity;
      }, 0),
    [items],
  );

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

  const showPanel = isOpen && Boolean(anchor && latest);

  return (
    <AnimatePresence>
      {showPanel && anchor && latest && (
        <motion.div
          aria-hidden={false}
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReduced ? 0 : 0.22, ease: "easeOut" }}
        >
          {/* ---------- Backdrop ---------- */}
          <button
            type="button"
            aria-label="Close"
            onClick={close}
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
            initial={
              prefersReduced
                ? { opacity: 0 }
                : { opacity: 0, y: 24, scale: 0.985 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={
              prefersReduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.99 }
            }
            transition={{ duration: prefersReduced ? 0 : 0.26, ease: [0.16, 1, 0.3, 1] }}
            key={latest.nonce}
            className={cn(
              // Scoped commerce dark palette — every token below resolves
              // to the transactional palette defined in globals.css.
              "commerce-dark",
              "relative z-10 flex w-full flex-col overflow-hidden",
              // Bottom sheet on mobile
              "max-h-[92dvh] rounded-t-3xl pb-[env(safe-area-inset-bottom)] sm:pb-0",
              // Centred panel from sm
              "sm:my-8 sm:max-h-[88dvh] sm:max-w-[560px] sm:rounded-3xl lg:max-w-[640px]",
              // Chrome
              "bg-surface text-ink border border-line shadow-[0_24px_48px_rgb(0_0_0/0.45)]",
            )}
          >
            {/* Grabber (mobile only) */}
            <div className="pt-2.5 sm:hidden" aria-hidden>
              <span className="mx-auto block h-1 w-10 rounded-full bg-white/15" />
            </div>

            <ModalHeader onClose={close} />

            {/*
              `data-lenis-prevent` stops the page's Lenis driver from
              swallowing wheel/touch events inside the modal body — the
              add-on list needs to scroll on its own when it overflows.
            */}
            <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain">
              <div className="px-5 pb-2 sm:px-7">
                <AddedProduct
                  product={anchor}
                  variantLabel={latest.variantLabel}
                  quantity={latest.quantity}
                  unitPrice={latest.unitPrice}
                  currency={latest.currency}
                  locale={latest.locale}
                />

                {addons.length > 0 && (
                  <div className="mt-8 border-t border-line pt-6">
                    <AddonsHeader />
                    <ul className="mt-4 flex flex-col gap-2.5">
                      {addons.map((addon) => (
                        <li key={addon.slug}>
                          <AddonRow addon={addon} />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <ModalFooter
              cartCount={cartCount}
              subtotal={subtotal}
              currency={anchor.currency}
              locale={anchor.locale ?? "en-AE"}
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
    <header className="flex items-center justify-between gap-4 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
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

function AddedProduct({
  product,
  variantLabel,
  quantity,
  unitPrice,
  currency,
  locale,
}: {
  product: Product;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  locale: string;
}) {
  const image = product.images[0];
  return (
    <article className="flex items-start gap-4 sm:gap-5">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:size-28">
        {image && (
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="112px"
            className={
              image.fit === "cover" ? "object-cover" : "object-contain p-3"
            }
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
          {product.brand}
        </p>
        <h2 className="mt-1 text-[1.125rem] font-medium leading-tight tracking-[-0.01em] text-ink sm:text-[1.25rem]">
          {product.name}
        </h2>
        <p className="mt-1 text-[0.8125rem] text-ink-secondary">
          {variantLabel}
        </p>

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[1.125rem] font-medium tabular-nums text-ink">
            {formatPrice(unitPrice * quantity, currency, locale)}
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
      className="mt-3 inline-flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-live"
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
   Add-ons — the Complete Your Setup rail
   ============================================================ */

function AddonsHeader() {
  return (
    <div>
      <p className="font-mono text-[0.75rem] uppercase tracking-[0.22em] text-ink-secondary">
        Complete your setup
      </p>
      <p className="mt-1.5 text-[0.875rem] text-ink-muted">
        Make the most of your new device.
      </p>
    </div>
  );
}

function AddonRow({ addon }: { addon: Product }) {
  const image = addon.images[0];
  const { items, addItem, removeItem } = useAccount();
  const line = items.find((l) => l.productSlug === addon.slug);
  const added = Boolean(line);

  const handleToggle = useCallback(() => {
    if (added && line) {
      removeItem(line.id);
    } else if (!added) {
      addItem(addon.slug, 1);
    }
  }, [added, line, addItem, removeItem, addon.slug]);

  return (
    <label
      className={cn(
        "group/addon flex cursor-pointer items-center gap-3 rounded-2xl border p-3",
        "transition-[background-color,border-color] duration-(--duration-fast)",
        added
          ? "border-line-strong bg-surface-2"
          : "border-line bg-surface-2/60 hover:border-line-strong",
      )}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={added}
        onChange={handleToggle}
        aria-label={added ? `Remove ${addon.name}` : `Add ${addon.name}`}
      />
      <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-3">
        {image && (
          <Image
            src={image.url}
            alt=""
            fill
            sizes="56px"
            className={
              image.fit === "cover" ? "object-cover" : "object-contain p-1.5"
            }
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.875rem] font-medium text-ink">
          {addon.name}
        </p>
        <p className="mt-0.5 truncate text-[0.75rem] text-ink-muted">
          {addon.variant}
        </p>
        <p className="mt-1 font-mono text-[0.8125rem] tabular-nums text-ink">
          {formatPrice(addon.price, addon.currency, addon.locale)}
        </p>
      </div>

      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-md border",
          "transition-[background-color,border-color] duration-(--duration-fast)",
          added
            ? "border-accent bg-accent"
            : "border-line-strong bg-surface group-hover/addon:border-ink-muted",
          "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
        )}
      >
        {added && (
          <svg
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3 text-void"
          >
            <path d="M2.5 6.5l2.5 2.5 4.5-5" />
          </svg>
        )}
      </span>
    </label>
  );
}

/* ============================================================
   Footer — running total + primary/secondary actions
   ============================================================ */

function ModalFooter({
  cartCount,
  subtotal,
  currency,
  locale,
  onContinue,
}: {
  cartCount: number;
  subtotal: number;
  currency: string;
  locale: string;
  onContinue: () => void;
}) {
  return (
    <footer className="border-t border-line bg-void/60 px-5 pb-5 pt-4 sm:px-7 sm:pb-7 sm:pt-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink-secondary">
          {cartCount} {cartCount === 1 ? "item" : "items"} in your cart
        </p>
        <p className="text-[0.9375rem] font-medium tabular-nums text-ink">
          <span className="mr-2 font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-muted">
            Subtotal
          </span>
          {formatPrice(subtotal, currency, locale)}
        </p>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_1.4fr]">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex h-12 items-center justify-center rounded-full border border-line-strong px-5 text-sm font-medium text-ink transition-colors duration-(--duration-fast) hover:bg-white/5"
        >
          Continue Shopping
        </button>
        <Link
          href="/cart"
          onClick={onContinue}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#94b2f3] px-5 text-sm font-medium text-[#0f1419] transition-colors duration-(--duration-fast) hover:bg-[#a8c1f6]"
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
