/**
 * Domain types — shaped to mirror future Payload CMS collections
 * (products, drops, media, categories) so the frontend can swap
 * mock data for CMS data without refactoring.
 */

import type {
  Availability,
  InspectionCheck,
  ProductOption,
  Review,
  SpecGroup,
} from "./commerce";

export * from "./commerce";

export interface Media {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  /**
   * How the frame should hold the image. Rewire's product library mixes
   * two kinds of source — transparent studio cutouts, which must float
   * inside a padded stage, and full-bleed photography, which must fill
   * it. Without this the two are indistinguishable to a component and
   * one of them always renders wrong.
   */
  fit?: "contain" | "cover";
}

/** Condition grades for certified-renewed devices. */
export type ConditionGrade = "pristine" | "excellent" | "good";

export const CONDITION_LABELS: Record<ConditionGrade, string> = {
  pristine: "Grade A · Pristine",
  excellent: "Grade B · Excellent",
  good: "Grade C · Good",
};

export type DropStatus = "upcoming" | "live" | "ended";

export interface Drop {
  id: string;
  slug: string;
  title: string;
  /** Editorial subtitle, e.g. "Drop 004 — The Studio Edit". */
  edition: string;
  status: DropStatus;
  startsAt: string; // ISO date
  endsAt: string; // ISO date
  cover?: Media;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  /** Short editorial descriptor, e.g. "Space Black · 1TB". */
  variant: string;
  brand: string;
  category: string;
  condition: ConditionGrade;
  /** Prices in minor units (cents). */
  price: number;
  originalPrice?: number;
  currency: string;
  images: Media[];
  /** Units available in this drop — drives scarcity UI. */
  stock: number;
  /** Numbered edition, e.g. { number: 14, of: 50 }. */
  edition?: { number?: number; of: number };
  drop?: Drop;
  soldOut?: boolean;

  /* ---------- Storefront fields ----------
     Every field below is optional so the drop-era objects that predate
     the shop (see `@/lib/drops`, the styleguide fixtures) still satisfy
     the type. The catalogue in `@/lib/catalog` populates all of them;
     components must therefore treat each as genuinely absent rather
     than assuming the catalogue is the only source of a Product. */

  /** Formatting locale for `price` — "en-AE" across the storefront. */
  locale?: string;
  /** Category route segment, e.g. "phones". */
  categorySlug?: string;
  /** Measured cell capacity as a percentage of new. */
  batteryHealth?: number;
  rating?: number;
  reviewCount?: number;
  /** Overrides the stock-derived state — lets a listing be "coming-soon". */
  availability?: Availability;
  /** Capacity choices. The first entry is the one `variant` describes. */
  storageOptions?: ProductOption[];
  colorOptions?: ProductOption[];
  /** One editorial paragraph. Never a spec dump — that is `specs`. */
  description?: string;
  /** Three or four scannable lines for the buy box. */
  highlights?: string[];
  specs?: SpecGroup[];
  inspection?: InspectionCheck[];
  included?: string[];
  warranty?: string;
  reviews?: Review[];
  /** ISO date the listing went up — powers the "Newest" sort. */
  listedAt?: string;
}
