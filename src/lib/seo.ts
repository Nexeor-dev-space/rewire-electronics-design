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
