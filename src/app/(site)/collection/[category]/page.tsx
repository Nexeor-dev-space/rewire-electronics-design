import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ShopCatalogue } from "@/components/shop/shop-catalogue";
import { shopFiltersFromParams } from "@/lib/catalogue";
import { SHOP_PAGE_SIZE } from "@/lib/constants";
import { resolveCategory } from "@/lib/shop";
import { findShopCategory, listShopProducts } from "@/services/catalogue.service";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const getCategory = cache((segment: string) => findShopCategory(resolveCategory(segment)));

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const category = await getCategory((await params).category);
  if (!category) return { title: "Shop" };

  return {
    title: category.name,
    description:
      category.description ||
      `${category.name} at Rewire — refurbished, pre-owned, open box and new. Inspected, graded, and covered by a 12-month warranty.`,
  };
}

export default async function CollectionCategoryPage({ params, searchParams }: PageProps) {
  const category = await getCategory((await params).category);
  if (!category) notFound();

  const filters = { ...shopFiltersFromParams(await searchParams), category: [category.slug] };
  const listing = await listShopProducts({ ...filters, page: 1, pageSize: SHOP_PAGE_SIZE });

  return (
    <div className="pb-(--spacing-section) pt-24 lg:pt-32">
      <div className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter) pb-8 lg:pb-10">
        <p className="eyebrow">{category.parent?.name ?? "Shop"}</p>
        <h1 className="mt-3 max-w-3xl text-[clamp(1.5rem,2.4vw,2rem)] font-light leading-[1.1] tracking-[-0.03em] text-ink">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-secondary">
            {category.description}
          </p>
        )}
      </div>
      <ShopCatalogue
        key={JSON.stringify(filters)}
        initialFilters={filters}
        initialListing={listing}
      />
    </div>
  );
}
