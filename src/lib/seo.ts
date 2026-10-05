import { SEO_DESCRIPTION_MAX_LENGTH } from "@/lib/constants";
import { CURRENCY, fromMinorUnits } from "@/lib/money";
import { productHref, type Condition } from "@/lib/shop";
import { siteConfig } from "@/lib/site";
import type { ShopProductDetail } from "@/types/catalogue";

const SCHEMA_ITEM_CONDITION: Record<Condition, string> = {
  new: "NewCondition",
  "open-box": "UsedCondition",
  "pre-owned": "UsedCondition",
  refurbished: "RefurbishedCondition",
};

export const absoluteUrl = (path: string) => new URL(path, siteConfig.url).toString();

/** Cuts at a word boundary and adds an ellipsis, for a fallback description. */
export function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export interface ProductSeo {
  title: string;
  /** True for an admin SEO title: used as written, without the site name suffix. */
  absoluteTitle: boolean;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  /** Relative URLs resolve against `metadataBase` in the root layout. */
  ogImage: string;
  canonical: string;
}

/**
 * What a product page puts in its <head>: the admin's SEO fields, each
 * falling back to something sensible when left empty (docs/CATALOGUE.md).
 */
export function productSeo(product: ShopProductDetail): ProductSeo {
  const { seo } = product;
  const name = `${product.brand} ${product.name}`;
  const description =
    seo.metaDescription ??
    clip(product.description || product.highlights[0] || siteConfig.description, SEO_DESCRIPTION_MAX_LENGTH);
  const title = seo.seoTitle ?? name;

  return {
    title,
    absoluteTitle: seo.seoTitle !== null,
    description,
    keywords: seo.metaKeywords,
    ogTitle: seo.ogTitle ?? title,
    ogDescription: seo.ogDescription ?? description,
    ogImage: seo.ogImageUrl ?? product.images[0]?.url ?? siteConfig.ogImage,
    canonical: seo.canonicalUrl ?? productHref(product),
  };
}

export function toJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function productJsonLd(product: ShopProductDetail): string {
  const prices = product.variants.map((variant) => variant.price);
  return toJsonLd({
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${product.brand} ${product.name}`,
    description: product.description || product.highlights[0],
    brand: { "@type": "Brand", name: product.brand },
    image: product.images.map((image) => absoluteUrl(image.url)),
    url: absoluteUrl(productHref(product)),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: CURRENCY,
      lowPrice: fromMinorUnits(Math.min(...prices)),
      highPrice: fromMinorUnits(Math.max(...prices)),
      offerCount: product.variants.length,
      offers: product.variants.map((variant) => ({
        "@type": "Offer",
        sku: variant.sku,
        price: fromMinorUnits(variant.price),
        priceCurrency: CURRENCY,
        itemCondition: `https://schema.org/${SCHEMA_ITEM_CONDITION[variant.condition]}`,
        availability: `https://schema.org/${variant.stock > 0 ? "InStock" : "OutOfStock"}`,
      })),
    },
  });
}
