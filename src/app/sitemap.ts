import type { MetadataRoute } from "next";
import { productHrefForCategory, SHOP_INDEX_HREF } from "@/lib/route-map";
import { absoluteUrl, isSelfCanonical } from "@/lib/seo";
import { productHref } from "@/lib/shop";
import { listSitemapEntries } from "@/services/catalogue.service";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories } = await listSitemapEntries();

  return [
    { url: absoluteUrl("/") },
    { url: absoluteUrl(SHOP_INDEX_HREF) },
    ...categories.map((category) => ({
      url: absoluteUrl(productHrefForCategory(category.slug)),
      lastModified: category.updatedAt,
    })),
    // A product whose canonical points elsewhere is not its own page to index.
    ...products.filter(isSelfCanonical).map((product) => ({
      url: absoluteUrl(productHref(product)),
      lastModified: product.updatedAt,
    })),
  ];
}
