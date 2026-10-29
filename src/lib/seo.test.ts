import { describe, expect, it } from "vitest";
import { NOINDEX_ROBOTS, SEO_DESCRIPTION_MAX_LENGTH } from "@/lib/constants";
import { siteConfig } from "@/lib/site";
import type { ShopProductDetail } from "@/types/catalogue";
import { clip, pageMetadata, policySeo, productSeo } from "./seo";

describe("pageMetadata", () => {
  const base = { title: "Shop", description: "Every device.", path: "/collection" };

  it("sets the canonical, Open Graph and Twitter card from one input", () => {
    const metadata = pageMetadata(base);
    expect(metadata.title).toBe("Shop");
    expect(metadata.description).toBe("Every device.");
    expect(metadata.alternates).toEqual({ canonical: "/collection" });
    expect(metadata.openGraph).toMatchObject({
      type: "website",
      url: "/collection",
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      title: "Shop",
      description: "Every device.",
      images: [{ url: siteConfig.ogImage }],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Shop",
      images: [siteConfig.ogImage],
    });
  });

  it("leaves robots and keywords unset so the root layout's values stay", () => {
    const metadata = pageMetadata(base);
    expect("robots" in metadata).toBe(false);
    expect("keywords" in metadata).toBe(false);
  });

  it("marks a page noindex when asked", () => {
    expect(pageMetadata({ ...base, noindex: true }).robots).toEqual(NOINDEX_ROBOTS);
  });

  it("uses an absolute title so the site name is not appended", () => {
    expect(pageMetadata({ ...base, absoluteTitle: true }).title).toEqual({ absolute: "Shop" });
  });

  it("clears the root keywords with an empty list", () => {
    expect(pageMetadata({ ...base, keywords: [] }).keywords).toBeNull();
    expect(pageMetadata({ ...base, keywords: ["phone"] }).keywords).toEqual(["phone"]);
  });

  it("prefers the share title, description and image when given", () => {
    const metadata = pageMetadata({ ...base, ogTitle: "Share", ogDescription: "Card", image: "/x.jpg" });
    expect(metadata.openGraph).toMatchObject({ title: "Share", description: "Card", images: [{ url: "/x.jpg" }] });
  });
});

describe("policySeo", () => {
  const policy = { slug: "warranty" as const, title: "Warranty", lede: "Twelve months on every device." };

  it("falls back to the title, lede and site image", () => {
    expect(policySeo(policy)).toEqual({
      title: "Warranty",
      absoluteTitle: false,
      description: "Twelve months on every device.",
      path: "/warranty",
      image: undefined,
    });
  });

  it("uses the admin fields as written", () => {
    const seo = policySeo({ ...policy, seoTitle: "Rewire warranty", metaDescription: "Cover", ogImageUrl: "/img" });
    expect(seo).toMatchObject({ title: "Rewire warranty", absoluteTitle: true, description: "Cover", image: "/img" });
  });

  it("treats null fields like missing ones", () => {
    const seo = policySeo({ ...policy, seoTitle: null, metaDescription: null, ogImageUrl: null });
    expect(seo).toMatchObject({ title: "Warranty", absoluteTitle: false, image: undefined });
  });

  it("clips a long lede", () => {
    const seo = policySeo({ ...policy, lede: "word ".repeat(100) });
    expect(seo.description.length).toBeLessThanOrEqual(SEO_DESCRIPTION_MAX_LENGTH);
  });
});

describe("productSeo", () => {
  const product = {
    slug: "iphone-15",
    brand: "Apple",
    name: "iPhone 15",
    description: "A phone.",
    highlights: [],
    images: [{ url: "/api/v1/media/first" }],
    seo: {
      seoTitle: null,
      metaDescription: null,
      metaKeywords: [],
      ogTitle: null,
      ogDescription: null,
      ogImageUrl: null,
      canonicalUrl: null,
    },
  } as unknown as ShopProductDetail;

  it("falls back to the brand and name, the description, the first image and its own page", () => {
    expect(productSeo(product)).toMatchObject({
      title: "Apple iPhone 15",
      absoluteTitle: false,
      description: "A phone.",
      image: "/api/v1/media/first",
      path: "/product/iphone-15",
    });
  });
});

describe("clip", () => {
  it("leaves short text alone", () => {
    expect(clip("  short   text ", 20)).toBe("short text");
  });

  it("cuts at a word and adds an ellipsis", () => {
    expect(clip("one two three four", 10)).toBe("one two…");
  });
});
