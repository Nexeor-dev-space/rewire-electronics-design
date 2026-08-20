"use client";

import type { Product } from "@/lib/products";
import { useAccount } from "@/components/providers/account-provider";
import { cn } from "@/lib/utils";

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
  product: Product;
  className?: string;
}) {
  const { isSaved, toggleSaved } = useAccount();
  const saved = isSaved(product.slug);

  return (
    <button
      type="button"
      onClick={() => toggleSaved(product.slug)}
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
        // Quiet until wanted: visible on touch, revealed on hover for
        // pointers, and always visible once it holds a saved state.
        saved
          ? "text-urgent opacity-100"
          : "text-ink-muted opacity-100 hover:border-line-strong hover:text-ink lg:opacity-0 lg:group-hover/card:opacity-100 lg:focus-visible:opacity-100",
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        <path d="M12 20.25S3.75 15.5 3.75 9.6A4.35 4.35 0 0 1 12 7.6a4.35 4.35 0 0 1 8.25 2c0 5.9-8.25 10.65-8.25 10.65Z" />
      </svg>
    </button>
  );
}
