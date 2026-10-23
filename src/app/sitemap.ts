import type { MetadataRoute } from "next";
import { ABOUT_PAGE_PATH, SUPPORT_PAGE_PATH } from "@/lib/constants";
import { listPolicies } from "@/lib/policies";
import { POLICY_ROUTES } from "@/lib/policy-types";
import { productHrefForCategory, SHOP_INDEX_HREF } from "@/lib/route-map";
import { absoluteUrl, isSelfCanonical } from "@/lib/seo";
import { productHref } from "@/lib/shop";
import { listSitemapEntries } from "@/services/catalogue.service";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ products, categories }, policies] = await Promise.all([listSitemapEntries(), listPolicies()]);

  return [
    { url: absoluteUrl("/") },
    { url: absoluteUrl(SHOP_INDEX_HREF) },
    { url: absoluteUrl(ABOUT_PAGE_PATH) },
    { url: absoluteUrl(SUPPORT_PAGE_PATH) },
    ...policies
      .filter((policy) => policy.published)
      .map((policy) => ({
        url: absoluteUrl(POLICY_ROUTES[policy.slug]),
        lastModified: new Date(policy.updatedAt),
      })),
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
