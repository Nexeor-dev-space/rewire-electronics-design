import type { z } from "zod";
import type { DropStatus } from "@/lib/drops";
import type { HomepageSectionType } from "@/lib/homepage-sections";
import type { ShopCard } from "@/types/catalogue";
import type {
  createHomepageSectionSchema,
  homepageSectionItemSchema,
  homepageSectionSchema,
  homepageSeoSchema,
} from "@/validators/homepage.validator";

export interface SectionRef {
  id: string;
  name: string;
}

/** The product a drop or Just Listed pick points at, as the builder shows it. */
export interface SectionItemProduct {
  id: string;
  name: string;
  imageUrl: string | null;
  /** False when the storefront would skip it: unpublished, in Trash, or under a hidden category. */
  onStorefront: boolean;
  onSale: boolean;
}

export interface SectionItemCategory {
  id: string;
  name: string;
  imageUrl: string | null;
  onStorefront: boolean;
}

/** One item of a draft section, as the admin API returns it. */
export interface HomepageSectionItem {
  id: string;
  visible: boolean;
  productId: string | null;
  /** Null when there is no product, or it was deleted. */
  product: SectionItemProduct | null;
  categoryId: string | null;
  category: SectionItemCategory | null;
  title: string | null;
  body: string | null;
  author: string | null;
  rating: number | null;
  /** ISO string. */
  releaseAt: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageId: string | null;
  imageUrl: string | null;
}

/** A draft section as the admin API returns it. */
export interface HomepageSection {
  id: string;
  type: HomepageSectionType;
  visible: boolean;
  seasonal: boolean;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  /** Submitted back unchanged when the modal leaves the image alone. */
  imageId: string | null;
  /** `/api/v1/media/<id>`, or null. */
  imageUrl: string | null;
  mobileImageId: string | null;
  mobileImageUrl: string | null;
  /** ISO string. */
  startsAt: string | null;
  /** ISO string. */
  endsAt: string | null;
  /** Chosen brands or categories that still exist, in display order. */
  refs: SectionRef[];
  /** Drops, Just Listed picks or reviews, in display order. */
  items: HomepageSectionItem[];
  /** ISO string. */
  updatedAt: string;
}

export interface HomepageSeo {
  seoTitle: string | null;
  metaDescription: string | null;
  ogImageId: string | null;
  ogImageUrl: string | null;
}

export type HomepageSeoInput = z.input<typeof homepageSeoSchema>;

export interface HomepageDraft {
  sections: HomepageSection[];
  hasUnpublishedChanges: boolean;
  /** ISO string, or null when the homepage has never been published. */
  publishedAt: string | null;
}

export type HomepageSectionInput = z.input<typeof homepageSectionSchema>;
export type HomepageSectionItemInput = z.input<typeof homepageSectionItemSchema>;
export type CreateHomepageSectionInput = z.input<typeof createHomepageSectionSchema>;

/** A brand or category inside a live featured section. */
export interface PublishedItem {
  id: string;
  name: string;
  imageUrl: string | null;
  href: string;
}

/** A drop card on the storefront, built from its product or its own fields. */
export interface PublishedDrop {
  id: string;
  /** For the wishlist; null for a release not in the catalogue yet. */
  slug: string | null;
  name: string;
  brand: string | null;
  /** Finish and capacity, e.g. "Graphite · 512GB". */
  variant: string | null;
  status: DropStatus;
  /** Minor units; null without a product. */
  price: number | null;
  originalPrice: number | null;
  unitsLeft: number | null;
  /** ISO string. */
  releaseAt: string | null;
  /**
   * "14 Nov, 6:00 pm GST" while the drop is still to open, else null.
   * Formatted on the server in the store's time zone, so the page never
   * reformats it in the shopper's.
   */
  opensAt: string | null;
  imageUrl: string | null;
  imageAlt: string;
  /** The product page, or null without a product. */
  href: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
}

export type PublishedDeal =
  | { kind: "product"; id: string; card: ShopCard }
  | { kind: "promo"; id: string; title: string; imageUrl: string | null; href: string };

export interface PublishedReview {
  id: string;
  quote: string;
  author: string;
  /** The product bought, as written in. */
  product: string | null;
  rating: number | null;
  avatarUrl: string | null;
}

/** A visible live section, ready for the storefront. */
export interface PublishedSection {
  id: string;
  type: HomepageSectionType;
  seasonal: boolean;
  eyebrow: string | null;
  /** Required by every type, so never null once published. */
  title: string;
  subtitle: string | null;
  description: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  mobileImageUrl: string | null;
  /** Featured brands or categories. */
  items: PublishedItem[];
  /** Upcoming Drops. */
  drops: PublishedDrop[];
  /** Just Listed picks that can be bought; empty means "the newest products". */
  products: ShopCard[];
  /** Reviews. */
  reviews: PublishedReview[];
  deals: PublishedDeal[];
}
