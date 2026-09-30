"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAcknowledgeCart, useGetCart, useRemoveCartItem, useUpdateCartItem } from "@/hooks/use-cart";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { SHOP_INDEX_HREF } from "@/lib/route-map";
import { fadeUp, staggerChildren, viewportOnce } from "@/lib/motion";
import { CartLine } from "./cart-line";
import { CartSummary } from "./cart-summary";
import { CartEmpty } from "./cart-empty";
import { CartSkeleton } from "./cart-skeleton";

/**
 * Cart page — the review-and-commit surface.
 *
 * Reads and mutates the real cart through `use-cart.ts`; every figure on
 * the page — lines, totals, issues — is priced by the server on every
 * request, so nothing here is derived from stale client state.
 */
export function CartView() {
  const cart = useGetCart();
  const updateCartItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();
  const acknowledgeCart = useAcknowledgeCart();

  if (cart.isPending) {
    return (
      <div className="bg-void pt-14 pb-(--spacing-section) md:pt-20">
        <Container width="wide">
          <CartHeader count={0} />
          <CartSkeleton />
        </Container>
      </div>
    );
  }

  if (cart.isError) {
    return (
      <div className="bg-void pt-14 pb-(--spacing-section) md:pt-20">
        <Container width="wide">
          <CartHeader count={0} />
          <div
            role="alert"
            className="mt-12 rounded-2xl border border-line bg-surface p-8 text-center"
          >
            <p className="text-sm text-ink-secondary">{cart.error.message}</p>
            <Button variant="outline" size="sm" className="mt-5" onClick={() => cart.refetch()}>
              Try again
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  const data = cart.data;

  if (data.items.length === 0) {
    return (
      <div className="bg-void pt-14 pb-(--spacing-section) md:pt-20">
        <Container width="wide">
          <CartHeader count={0} />
          <CartEmpty />
        </Container>
      </div>
    );
  }

  const hasPriceChange = data.items.some((item) => item.issues.includes("PRICE_CHANGED"));
  const mutationError =
    updateCartItem.error?.message ?? removeCartItem.error?.message ?? acknowledgeCart.error?.message;

  return (
    <div className="bg-void pt-14 pb-(--spacing-section) md:pt-20">
      <Container width="wide">
        <CartHeader count={data.itemCount} />

        {mutationError && (
          <p role="alert" className="mt-6 text-[0.875rem] text-danger">
            {mutationError}
          </p>
        )}

        {/* ---------- Price-changed notice ----------
            Cleared by "Got it" (acknowledgeCart) or by editing the
            affected line, which refreshes its seen price on the next
            mutation response. */}
        {hasPriceChange && (
          <div
            role="status"
            className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-surface-2 px-5 py-4"
          >
            <p className="text-[0.875rem] text-ink-secondary">
              The price changed on one or more items since you added them. The
              current price is shown below.
            </p>
            <Button
              variant="outline"
              size="sm"
              loading={acknowledgeCart.isPending}
              onClick={() => acknowledgeCart.mutate()}
            >
              Got it
            </Button>
          </div>
        )}

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
              {data.items.map((line) => (
                <li key={line.id} className="border-b border-line">
                  <CartLine
                    line={line}
                    busy={
                      (updateCartItem.isPending && updateCartItem.variables?.id === line.id) ||
                      (removeCartItem.isPending && removeCartItem.variables === line.id)
                    }
                    onQuantityChange={(quantity) => {
                      if (quantity <= 0) removeCartItem.mutate(line.id);
                      else updateCartItem.mutate({ id: line.id, quantity });
                    }}
                    onRemove={() => removeCartItem.mutate(line.id)}
                    onToggleAddOn={(addOnId) => {
                      const offeredIds = new Set(
                        line.offeredAddOns.map((addOn) => addOn.id),
                      );
                      const current = line.addOns
                        .map((addOn) => addOn.id)
                        .filter((id) => offeredIds.has(id) || id === addOnId);
                      const next = current.includes(addOnId)
                        ? current.filter((id) => id !== addOnId)
                        : [...current, addOnId];
                      updateCartItem.mutate({ id: line.id, addOnIds: next });
                    }}
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
              totals={data.totals}
              itemCount={data.itemCount}
              canCheckout={data.canCheckout}
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
