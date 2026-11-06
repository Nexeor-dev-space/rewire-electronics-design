"use client";

import Link from "next/link";
import { useAccount } from "@/components/providers/account-provider";
import { Button } from "@/components/ui/button";
import { WishlistCard } from "@/components/wishlist/wishlist-card";
import { WishlistSkeleton } from "@/components/wishlist/wishlist-skeleton";
import { useGetWishlistProducts } from "@/hooks/use-catalogue";
import { AccountShell } from "./account-shell";

/**
 * AccountWishlist — the /account/wishlist surface.
 *
 * Reuses the site's WishlistCard so the tile looks and behaves exactly
 * the same as on the standalone /wishlist page. State is shared via
 * `useAccount` — adding, removing, moving to cart all synchronise
 * across both pages instantly. Cards come from `GET /api/v1/wishlist`
 * (docs/WISHLIST.md).
 */
export function AccountWishlist() {
  const { ready, wishlistSlugs } = useAccount();
  const products = useGetWishlistProducts(wishlistSlugs);
  const resolved = wishlistSlugs.length > 0 ? (products.data ?? []) : [];

  if (!ready || (wishlistSlugs.length > 0 && products.isPending)) {
    return (
      <AccountShell title="Wishlist">
        <WishlistSkeleton />
      </AccountShell>
    );
  }

  if (products.isError && wishlistSlugs.length > 0) {
    return (
      <AccountShell title="Wishlist">
        <div role="alert" className="rounded-2xl border border-line bg-surface p-8 text-center">
          <p className="text-sm text-ink-secondary">{products.error.message}</p>
          <Button variant="outline" size="sm" className="mt-5" onClick={() => products.refetch()}>
            Try again
          </Button>
        </div>
      </AccountShell>
    );
  }

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
        <ul className="grid grid-cols-1 gap-x-4 gap-y-6 min-[360px]:grid-cols-2 sm:gap-6 xl:grid-cols-3">
          {resolved.map((product, index) => (
            <li key={product.slug}>
              <WishlistCard product={product} priority={index < 3} />
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
