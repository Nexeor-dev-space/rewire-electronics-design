"use client";

import Link from "next/link";
import { getProductBySlug } from "@/lib/catalog";
import { projectFromCatalog } from "@/lib/products";
import { useAccount } from "@/components/providers/account-provider";
import type { Product as CatalogProduct } from "@/types";
import { WishlistCard } from "@/components/wishlist/wishlist-card";
import { AccountShell } from "./account-shell";

/**
 * AccountWishlist — the /account/wishlist surface.
 *
 * Reuses the site's WishlistCard so the tile looks and behaves exactly
 * the same as on the standalone /wishlist page. State is shared via
 * `useAccount` — adding, removing, moving to cart all synchronise
 * across both pages instantly.
 */
export function AccountWishlist() {
  const { ready, wishlistSlugs } = useAccount();

  const resolved: CatalogProduct[] = wishlistSlugs
    .map((slug) => getProductBySlug(slug))
    .filter((product): product is CatalogProduct => Boolean(product));

  if (!ready) return <AccountShell title="Wishlist" />;

  return (
    <AccountShell
      title="Wishlist"
      subtitle="Everything you have saved for later — moves cleanly to cart when you're ready."
    >
      {resolved.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong bg-surface/60 p-12 text-center">
          <p className="text-[1.0625rem] font-medium text-ink">Nothing saved yet</p>
          <p className="mx-auto mt-2 max-w-md text-[0.875rem] text-ink-secondary">
            Tap the heart on any product to keep it here — it stays until you
            move it to your cart or take it off the list.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-line-strong px-4 py-2 text-[0.8125rem] font-medium text-ink hover:border-accent hover:text-accent"
          >
            Browse the shop
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {resolved.map((product, index) => (
            <li key={product.slug}>
              <WishlistCard
                product={projectFromCatalog(product)}
                catalogProduct={product}
                priority={index < 3}
              />
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
