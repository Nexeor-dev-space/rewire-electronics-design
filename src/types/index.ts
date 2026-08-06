/**
 * Domain types — shaped to mirror future Payload CMS collections
 * (products, drops, media, categories) so the frontend can swap
 * mock data for CMS data without refactoring.
 */

export interface Media {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
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
}
