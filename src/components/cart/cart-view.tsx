"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { getProductBySlug } from "@/lib/catalog";
import { useAccount, type CartItem } from "@/components/providers/account-provider";
import { Container } from "@/components/layout/container";
import { SHOP_INDEX_HREF } from "@/lib/route-map";
import { fadeUp, staggerChildren, viewportOnce } from "@/lib/motion";
import type { Product } from "@/types";
import { CartLine } from "./cart-line";
import { CartSummary } from "./cart-summary";
import { CartEmpty } from "./cart-empty";
import { CartSkeleton } from "./cart-skeleton";

/**
 * Cart page — the review-and-commit surface.
 *
 * Three states live under one route: not-yet-hydrated (skeleton), empty,
 * populated. `ready` from the account provider gates the switch so the
 * page never flashes an empty state before persisted lines have been
 * read from storage.
 *
 * Product data is resolved from the catalogue by slug on every render.
 * Lines whose slug no longer resolves (catalogue removed, renamed) are
 * quietly dropped from the view rather than shown as broken rows — the
 * next cart mutation will let the user reconcile.
 */
export function CartView() {
  const { ready, items, updateQuantity, removeItem, cartCount } = useAccount();

  const resolved = items
    .map((line) => ({ line, product: getProductBySlug(line.productSlug) }))
    .filter((entry): entry is { line: CartItem; product: Product } =>
      Boolean(entry.product),
    );

  const subtotal = resolved.reduce(
    (sum, { line, product }) => sum + product.price * line.quantity,
    0,
  );

  const currency = resolved[0]?.product.currency ?? "AED";
  const locale = resolved[0]?.product.locale ?? "en-AE";

  if (!ready) {
    return (
      <div className="bg-void pt-14 pb-(--spacing-section) md:pt-20">
        <Container width="wide">
          <CartHeader count={0} />
          <CartSkeleton />
        </Container>
      </div>
    );
  }

  if (resolved.length === 0) {
    return (
      <div className="bg-void pt-14 pb-(--spacing-section) md:pt-20">
        <Container width="wide">
          <CartHeader count={0} />
          <CartEmpty />
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-void pt-14 pb-(--spacing-section) md:pt-20">
      <Container width="wide">
        <CartHeader count={cartCount} />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.06)}
          className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-16"
        >
          {/* ---------- Items ---------- */}
          <motion.section
            variants={fadeUp}
            aria-labelledby="cart-items-heading"
            className="lg:col-span-7 xl:col-span-8"
          >
            <h2 id="cart-items-heading" className="sr-only">
              Items in your cart
            </h2>
            <ul className="border-t border-line">
              {resolved.map(({ line, product }) => (
                <li key={line.id} className="border-b border-line">
                  <CartLine
                    line={line}
                    product={product}
                    onQuantityChange={(qty) => updateQuantity(line.id, qty)}
                    onRemove={() => removeItem(line.id)}
                  />
                </li>
              ))}
            </ul>

            {/* Continue Shopping — a secondary route out that keeps the
                cart intact. Ghost link, not a button, so the primary CTA
                in the summary still owns the composition. */}
            <div className="mt-10 flex items-center">
              <Link
                href={SHOP_INDEX_HREF}
                className="inline-flex items-center gap-2 text-sm font-medium text-ink-secondary transition-colors duration-(--duration-fast) hover:text-ink"
              >
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
                  <path d="M13 8H3M7 4 3 8l4 4" />
                </svg>
                Continue shopping
              </Link>
            </div>
          </motion.section>

          {/* ---------- Summary ---------- */}
          <motion.aside
            variants={fadeUp}
            aria-labelledby="cart-summary-heading"
            className="lg:col-span-5 xl:col-span-4"
          >
            <CartSummary
              subtotal={subtotal}
              currency={currency}
              locale={locale}
              itemCount={cartCount}
            />
          </motion.aside>
        </motion.div>
      </Container>
    </div>
  );
}

/* ============================================================
   Local: page header
   ============================================================ */

function CartHeader({ count }: { count: number }) {
  return (
    <header>
      <p className="eyebrow">
        {count > 0
          ? `${count} ${count === 1 ? "item" : "items"}`
          : "Ready when you are"}
      </p>
      <h1 className="mt-4 text-display-lg font-light leading-[1.02] tracking-[-0.03em] text-ink">
        Your Cart
      </h1>
    </header>
  );
}
