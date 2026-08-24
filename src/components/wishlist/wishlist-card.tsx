"use client";

import { StorefrontCard } from "@/components/product/storefront-card";
import { useAccount } from "@/components/providers/account-provider";
import { CONDITION_LABELS, type Product as CatalogProduct } from "@/types";
import type { Product } from "@/lib/products";
import { cn } from "@/lib/utils";

interface WishlistCardProps {
  /** Local Product shape — what StorefrontCard speaks. */
  product: Product;
  /** Catalog Product — carries condition + grade the card does not print. */
  catalogProduct: CatalogProduct;
  /** First rows above the fold get eager image loading. */
  priority?: boolean;
}

/**
 * WishlistCard — the wishlist page's row.
 *
 * The visual card itself is the site's own StorefrontCard, unchanged, so
 * every saved device looks and behaves the same as it does on the shop
 * grid — same image treatment, same availability chip, same saving
 * badge, same wishlist heart in the corner (which now acts as an
 * inline Remove because every card here is saved).
 *
 * The Add-to-Cart primary lives inside StorefrontCard itself now, so
 * this row prints the condition line and the one wishlist-specific
 * action StorefrontCard doesn't have: a Remove-from-Wishlist text link.
 * The heart in the card corner triggers the same remove — the labelled
 * link is here for shoppers scanning by copy.
 */
export function WishlistCard({
  product,
  catalogProduct,
  priority,
}: WishlistCardProps) {
  const { removeSaved } = useAccount();
  const grade = catalogProduct.condition
    ? CONDITION_LABELS[catalogProduct.condition]
    : undefined;

  return (
    <div className="flex h-full flex-col">
      <StorefrontCard product={product} priority={priority} />

      {/* ---------- Condition · Grade ----------
          The catalogue prints this on the buy panel; on the wishlist row
          it sits between the card's own price line and the actions,
          because "which grade" is one of the last questions a saved
          shopper asks before committing. */}
      <p className="mt-3 text-[0.8125rem] text-ink-secondary">
        <span>Refurbished</span>
        {grade && (
          <>
            <span aria-hidden className="mx-1.5 text-ink-faint">
              ·
            </span>
            <span>{grade}</span>
          </>
        )}
      </p>

      {/* ---------- Actions ----------
          Add-to-Cart lives inside StorefrontCard already; a second copy
          under it read as a duplicate button. Only the wishlist-specific
          Remove link belongs to this row. */}
      <div className="mt-4 flex flex-col">
        <button
          type="button"
          onClick={() => removeSaved(product.slug)}
          className={cn(
            "self-center text-[0.8125rem] font-medium text-ink-secondary underline-offset-4",
            "transition-colors duration-(--duration-fast) hover:text-ink hover:underline",
          )}
          aria-label={`Remove ${product.name} from wishlist`}
        >
          Remove from wishlist
        </button>
      </div>
    </div>
  );
}
