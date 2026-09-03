import type { Metadata } from "next";
import { ShopCatalogue } from "@/components/shop/shop-catalogue";
import { brandsFromParam, conditionsFromParam } from "@/lib/shop";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Every Rewire device in one place — refurbished, pre-owned, open box and new. Inspected, graded, and covered by a 12-month warranty.",
};

/**
 * The shop — one page, filtered.
 *
 * A restrained head, then the catalogue. The head is a server component
 * and the catalogue owns all the interactive state, so the page ships as
 * static markup with one client island rather than turning the whole
 * route into a client tree.
 *
 * `/collection/[category]` renders exactly this with the rail pre-set;
 * there is no second layout, because there is no second page.
 */
export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{
    brand?: string | string[];
    condition?: string | string[];
  }>;
}) {
  const query = await searchParams;
  const brands = brandsFromParam(query.brand);
  // `?condition=refurbished` is how the homepage's "What you have"
  // legend hands a shopper straight to the shelf for one condition.
  const conditions = conditionsFromParam(query.condition);

  return (
    // Header is `fixed top-0` at 64px / 80px, so `pt-10 lg:pt-14`
    // (40/56px) left the top row tucked *under* the masthead —
    // "4 products" and the Recommended sort trigger collided with the
    // main nav. `pt-24 lg:pt-32` clears the header (64/80px) with a
    // 32px/48px breathing gap on top so the first row does not read as
    // flush against the nav.
    <div className="pb-(--spacing-section) pt-24 lg:pt-32">
      <ShopCatalogue
        initialCategory={null}
        initialBrands={brands}
        initialConditions={conditions}
      />
    </div>
  );
}
