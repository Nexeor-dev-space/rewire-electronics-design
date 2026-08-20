"use client";

import { StorefrontCard } from "@/components/product/storefront-card";
import { Button } from "@/components/ui/button";
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
 * Beneath the card sit two actions the wishlist page owns explicitly:
 * an Add-to-Cart primary button and a Remove-from-Wishlist text link.
 * The heart handles the same remove, but shoppers scanning by copy
 * expect a labelled "Remove" — the two are redundant on purpose.
 *
 * Moving a device to the cart also removes it from the wishlist, since
 * a saved product that is already in the bag has finished being saved.
 */
export function WishlistCard({
  product,
  catalogProduct,
  priority,
}: WishlistCardProps) {
  const { addItem, removeSaved } = useAccount();
  const soldOut = catalogProduct.availability === "sold-out";
  const comingSoon = catalogProduct.availability === "coming-soon";
  const grade = catalogProduct.condition
    ? CONDITION_LABELS[catalogProduct.condition]
    : undefined;

  function handleAddToCart() {
    addItem(product.slug, 1);
    // A saved product that has moved into the bag has served its purpose.
    removeSaved(product.slug);
  }

  const cta = soldOut
    ? "Sold out"
    : comingSoon
      ? "Notify me"
      : "Add to Cart";

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

      {/* ---------- Actions ---------- */}
      <div className="mt-5 flex flex-col gap-3">
        <Button
          type="button"
          onClick={handleAddToCart}
          variant="primary"
          size="md"
          disabled={soldOut || comingSoon}
          className="w-full"
          aria-label={`${cta} — ${product.name}`}
        >
          {cta}
        </Button>

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
