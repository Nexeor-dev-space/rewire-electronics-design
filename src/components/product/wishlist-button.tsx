"use client";

import { useAccount } from "@/components/providers/account-provider";
import { cn } from "@/lib/utils";
import { HeartIcon } from "./heart-icon";

/**
 * Structural minimum needed to wishlist an item. Both `Product` (the
 * homepage catalogue) and `ShopProduct` (the shop listing) satisfy it,
 * so the same button works from either source without a shared type.
 */
export interface WishlistTarget {
  slug: string;
  name: string;
}

/**
 * WishlistButton — save for later, from anywhere a product appears.
 *
 * Reads and writes the shared account provider so the heart, the /wishlist
 * page, and the account nav all agree on what is saved. The button itself
 * remains a pure visual toggle: no confirmation, no toast — the
 * consequence is visible immediately on the same icon that was clicked.
 */
export function WishlistButton({
  product,
  className,
}: {
  product: WishlistTarget;
  className?: string;
}) {
  const { isSaved, toggleSaved } = useAccount();
  const saved = isSaved(product.slug);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleSaved(product.slug);
      }}
      aria-pressed={saved}
      aria-label={
        saved
          ? `Remove ${product.name} from wishlist`
          : `Save ${product.name} to wishlist`
      }
      className={cn(
        className,
        "flex size-9 items-center justify-center rounded-full",
        "border border-line bg-surface/90 backdrop-blur-sm",
        "transition-[color,border-color,opacity] duration-(--duration-fast)",
        saved
          ? "border-love/50 opacity-100"
          : "text-ink-muted opacity-100 hover:border-line-strong hover:text-ink lg:opacity-0 lg:group-hover/card:opacity-100 lg:focus-visible:opacity-100",
      )}
    >
      <HeartIcon saved={saved} className="size-4" />
    </button>
  );
}
