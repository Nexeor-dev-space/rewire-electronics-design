"use client";

import { ShopProductCard } from "@/components/shop/product-card";
import { useAccount } from "@/components/providers/account-provider";
import { useToast } from "@/components/ui/toast";
import { TOAST_MESSAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ShopCard } from "@/types/catalogue";

/**
 * WishlistCard — the wishlist page's row.
 *
 * The card is the shop grid's own `ShopProductCard`, so a saved device
 * looks and behaves exactly as it does in the shop: same image, price,
 * condition, Add to Cart, and the heart in the corner (which removes it,
 * since every card here is saved). Below it, a labelled Remove link for
 * shoppers scanning by text.
 */
export function WishlistCard({ product, priority }: { product: ShopCard; priority?: boolean }) {
  const { removeSaved } = useAccount();
  const { showToast } = useToast();

  return (
    <div className="flex h-full flex-col">
      <ShopProductCard product={product} priority={priority} />
      <div className="mt-4 flex flex-col">
        <button
          type="button"
          onClick={() => {
            removeSaved(product.slug);
            showToast(TOAST_MESSAGES.removedFromWishlist, "heart-outline");
          }}
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
