import type { Metadata } from "next";
import { ShopCatalogue } from "@/components/shop/shop-catalogue";
import { ShopHero } from "@/components/shop/shop-hero";
import { brandsFromParam } from "@/lib/shop";

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
  searchParams: Promise<{ brand?: string | string[] }>;
}) {
  const brands = brandsFromParam((await searchParams).brand);

  return (
    <>
      <ShopHero />
      <div className="pb-(--spacing-section) pt-10 lg:pt-14">
        <ShopCatalogue initialCategory={null} initialBrands={brands} />
      </div>
    </>
  );
}
