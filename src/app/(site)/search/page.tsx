import type { Metadata } from "next";
import { ShopCatalogue } from "@/components/shop/shop-catalogue";
import { shopFiltersFromParams } from "@/lib/catalogue";
import { SHOP_PAGE_SIZE } from "@/lib/constants";
import { listShopProducts } from "@/services/catalogue.service";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const { q } = shopFiltersFromParams(await searchParams);
  return {
    title: q ? `Search: ${q}` : "Search",
    robots: { index: false },
  };
}

export default async function SearchPage({ searchParams }: PageProps) {
  const filters = shopFiltersFromParams(await searchParams);
  const listing = await listShopProducts({ ...filters, page: 1, pageSize: SHOP_PAGE_SIZE });

  return (
    <div className="pb-(--spacing-section) pt-24 lg:pt-32">
      <div className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter) pb-8 lg:pb-10">
        <p className="eyebrow">Search</p>
        <h1 className="mt-3 max-w-3xl text-[clamp(1.5rem,2.4vw,2rem)] font-light leading-[1.1] tracking-[-0.03em] text-ink">
          {filters.q ? <>Results for &ldquo;{filters.q}&rdquo;</> : "Every device we stock"}
        </h1>
      </div>
      <ShopCatalogue
        key={JSON.stringify(filters)}
        initialFilters={filters}
        initialListing={listing}
      />
    </div>
  );
}
