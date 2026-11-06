"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount } from "@/components/providers/account-provider";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { useGetWishlistProducts } from "@/hooks/use-catalogue";
import { fadeUp, staggerChildren, viewportOnce } from "@/lib/motion";
import { WishlistCard } from "./wishlist-card";
import { WishlistEmpty } from "./wishlist-empty";
import { WishlistSkeleton } from "./wishlist-skeleton";

/**
 * Wishlist page — "Saved for later".
 *
 * The saved slugs live in the browser (`useAccount`); the cards come from
 * `GET /api/v1/wishlist`, so they show current prices and stock. States:
 * loading (skeleton), error (retry), empty, populated. `ready` gates the
 * switch so the empty state never flashes before the slugs are read.
 *
 * A slug the server no longer returns (product deleted or unpublished) is
 * forgotten through `retainSaved`, so the tab bar badge stays honest.
 */
export function WishlistView() {
  const { ready, wishlistSlugs, retainSaved } = useAccount();
  const products = useGetWishlistProducts(wishlistSlugs);

  /* Only a fresh answer for the current slugs may prune the list. */
  const fresh = products.isSuccess && !products.isPlaceholderData;
  useEffect(() => {
    if (fresh) retainSaved(products.data.map((product) => product.slug));
  }, [fresh, products.data, retainSaved]);

  const loading = !ready || (wishlistSlugs.length > 0 && products.isPending);
  const cards = (products.data ?? []).filter((product) => wishlistSlugs.includes(product.slug));

  return (
    <div className="bg-void pt-14 pb-(--spacing-section) md:pt-20">
      <Container width="wide">
        <WishlistHeader count={loading ? 0 : cards.length} />

        {loading ? (
          <WishlistSkeleton />
        ) : products.isError && wishlistSlugs.length > 0 ? (
          <div role="alert" className="mt-14 rounded-2xl border border-line bg-surface p-8 text-center">
            <p className="text-sm text-ink-secondary">{products.error.message}</p>
            <Button variant="outline" size="sm" className="mt-5" onClick={() => products.refetch()}>
              Try again
            </Button>
          </div>
        ) : cards.length === 0 ? (
          <WishlistEmpty />
        ) : (
          <motion.ul
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerChildren(0.06)}
            aria-label="Saved products"
            // Same grid rhythm as the Featured rail so this page reads as
            // the shop it came from rather than a separate module.
            className="mt-14 grid grid-cols-1 gap-x-4 gap-y-10 min-[360px]:grid-cols-2 sm:gap-x-6 sm:gap-y-14 lg:grid-cols-3 xl:grid-cols-5 xl:gap-x-6"
          >
            {cards.map((product, index) => (
              <motion.li key={product.slug} variants={fadeUp}>
                <WishlistCard product={product} priority={index < 4} />
              </motion.li>
            ))}
          </motion.ul>
        )}
      </Container>
    </div>
  );
}

function WishlistHeader({ count }: { count: number }) {
  return (
    <header>
      <p className="eyebrow">
        {count > 0
          ? `${count} ${count === 1 ? "device" : "devices"}`
          : "Nothing yet"}
      </p>
      <h1 className="mt-4 text-display-lg font-light leading-[1.02] tracking-[-0.03em] text-ink">
        Saved for later
      </h1>
    </header>
  );
}
