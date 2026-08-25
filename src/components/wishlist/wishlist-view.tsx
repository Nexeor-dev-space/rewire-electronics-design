"use client";

import { motion } from "framer-motion";
import { getProductBySlug } from "@/lib/catalog";
import { projectFromCatalog } from "@/lib/products";
import { useAccount } from "@/components/providers/account-provider";
import { Container } from "@/components/layout/container";
import { fadeUp, staggerChildren, viewportOnce } from "@/lib/motion";
import type { Product as CatalogProduct } from "@/types";
import { WishlistCard } from "./wishlist-card";
import { WishlistEmpty } from "./wishlist-empty";
import { WishlistSkeleton } from "./wishlist-skeleton";

/**
 * Wishlist page — "Saved for later".
 *
 * Three states, same shape as the cart: not-yet-hydrated (skeleton),
 * empty, populated. `ready` gates the switch so we never flash the empty
 * state before persisted slugs have been read.
 *
 * Slugs that no longer resolve in the catalogue are dropped silently
 * rather than shown as broken tiles — the reader can save something new,
 * and a next mutation will let them tidy up.
 */
export function WishlistView() {
  const { ready, wishlistSlugs } = useAccount();

  const resolved: CatalogProduct[] = wishlistSlugs
    .map((slug) => getProductBySlug(slug))
    .filter((product): product is CatalogProduct => Boolean(product));

  if (!ready) {
    return (
      <div className="bg-void pt-14 pb-(--spacing-section) md:pt-20">
        <Container width="wide">
          <WishlistHeader count={0} />
          <WishlistSkeleton />
        </Container>
      </div>
    );
  }

  if (resolved.length === 0) {
    return (
      <div className="bg-void pt-14 pb-(--spacing-section) md:pt-20">
        <Container width="wide">
          <WishlistHeader count={0} />
          <WishlistEmpty />
        </Container>
      </div>
    );
  }

  return (
    <div className="bg-void pt-14 pb-(--spacing-section) md:pt-20">
      <Container width="wide">
        <WishlistHeader count={resolved.length} />

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
          {resolved.map((product, index) => (
            <motion.li key={product.slug} variants={fadeUp}>
              <WishlistCard
                product={projectFromCatalog(product)}
                catalogProduct={product}
                priority={index < 4}
              />
            </motion.li>
          ))}
        </motion.ul>
      </Container>
    </div>
  );
}

/* ============================================================
   Local: page header
   ============================================================ */

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
