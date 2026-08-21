import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopCatalogue } from "@/components/shop/shop-catalogue";
import { ShopHero } from "@/components/shop/shop-hero";
import {
  brandsFromParam,
  CATEGORY_LABELS,
  resolveCategory,
  shopCategories,
} from "@/lib/shop";

/**
 * The shop, entered at a category.
 *
 * This route exists because the header's mega menu and the footer already
 * link to `/collection/phones` and friends. Rather than rewrite the
 * navigation — not this page's job — `resolveCategory` accepts the older
 * segments and maps them onto the shop's own vocabulary, so
 * `/collection/phones` and `/collection/smartphones` both land on
 * Smartphones with the rail already set.
 *
 * The page itself is the same one. Only the starting filter differs.
 */

interface PageProps {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ brand?: string | string[] }>;
}

export function generateStaticParams() {
  return shopCategories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const category = resolveCategory((await params).category);
  if (!category) return { title: "Shop" };

  const label = CATEGORY_LABELS[category];
  return {
    title: label,
    description: `${label} at Rewire — refurbished, pre-owned, open box and new. Inspected, graded, and covered by a 12-month warranty.`,
  };
}

export default async function CollectionCategoryPage({
  params,
  searchParams,
}: PageProps) {
  const category = resolveCategory((await params).category);
  if (!category) notFound();

  const brands = brandsFromParam((await searchParams).brand);

  return (
    <>
      <ShopHero />
      <div className="pb-(--spacing-section) pt-10 lg:pt-14">
        <ShopCatalogue initialCategory={category} initialBrands={brands} />
      </div>
    </>
  );
}
