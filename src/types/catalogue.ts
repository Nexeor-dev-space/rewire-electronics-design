import type { z } from "zod";
import type { Paginated } from "@/lib/api/api-response";
import type { Condition, Grade, SortId } from "@/lib/shop";
import type { SpecGroup } from "@/types/commerce";
import type { shopQuerySchema } from "@/validators/catalogue.validator";

export interface ShopCard {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  condition: Condition;
  grade: Grade | null;
  keySpec: string;
  storage: string | null;
  variant: string | null;
  price: number;
  originalPrice: number | null;
  imageUrl: string | null;
  imageAlt: string;
  stock: number;
  optionCount: number;
  listedAt: string | null;
}

export interface CategoryFacet {
  slug: string;
  name: string;
  parentSlug: string | null;
  count: number;
}

export interface NamedCount {
  value: string;
  count: number;
}

export interface ShopFacets {
  categories: CategoryFacet[];
  conditions: Partial<Record<Condition, number>>;
  grades: Partial<Record<Grade, number>>;
  brands: NamedCount[];
  storage: NamedCount[];
  priceBands: Record<string, number>;
}

export interface ShopListing extends Paginated<ShopCard> {
  facets: ShopFacets;
}

export interface ShopVariant {
  id: string;
  storage: string | null;
  colour: string | null;
  colourHex: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
}

export interface ShopImage {
  id: string;
  url: string;
  alt: string;
  colour: string | null;
}

export interface ShopCategoryRef {
  id: string;
  name: string;
  slug: string;
  parent: { id: string; name: string; slug: string } | null;
}

export interface ShopAddOn {
  id: string;
  label: string;
  note: string;
  price: number;
  kind: "protection" | "accessory" | "service";
  popular: boolean;
}

export interface ShopProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  brand: string;
  category: ShopCategoryRef;
  condition: Condition;
  grade: Grade | null;
  batteryHealth: number | null;
  warrantyMonths: number;
  highlights: string[];
  included: string[];
  images: ShopImage[];
  specs: SpecGroup[];
  variants: ShopVariant[];
  listedAt: string | null;
}

export interface ShopProductPage extends ShopProductDetail {
  addOns: ShopAddOn[];
  related: ShopCard[];
}

export type ShopQuery = z.input<typeof shopQuerySchema>;

export type ShopFilterState = {
  q?: string;
  category: string[];
  condition: Condition[];
  grade: Grade[];
  brand: string[];
  storage: string[];
  price: string[];
  sort: SortId;
};
