import type { Metadata } from "next";
import { ShopCatalogue } from "@/components/shop/shop-catalogue";
import { hasShopQuery, shopFiltersFromParams } from "@/lib/catalogue";
import { SHOP_PAGE_SIZE } from "@/lib/constants";
import { SHOP_INDEX_HREF } from "@/lib/route-map";
import { pageMetadata } from "@/lib/seo";
import { listShopProducts } from "@/services/catalogue.service";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  return pageMetadata({
    title: "Shop",
    description:
      "Every Rewire device in one place — refurbished, pre-owned, open box and new. Inspected, graded, and covered by a 12-month warranty.",
    path: SHOP_INDEX_HREF,
    noindex: hasShopQuery(await searchParams),
  });
}

export default async function CollectionPage({ searchParams }: PageProps) {
  const filters = shopFiltersFromParams(await searchParams);
  const listing = await listShopProducts({ ...filters, page: 1, pageSize: SHOP_PAGE_SIZE });

  return (
    <div className="pb-(--spacing-section) pt-24 lg:pt-32">
      <ShopCatalogue
        key={JSON.stringify(filters)}
        initialFilters={filters}
        initialListing={listing}
      />
    </div>
  );
}
