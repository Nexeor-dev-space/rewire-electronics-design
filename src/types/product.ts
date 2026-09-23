import type { z } from "zod";
import type {
  ProductCondition,
  ProductGrade,
  ProductStatus,
  productSchema,
} from "@/validators/product.validator";

export interface NamedRef {
  id: string;
  name: string;
}

export interface ProductListItem {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  condition: ProductCondition;
  grade: ProductGrade | null;
  brand: NamedRef;
  category: NamedRef;
  imageUrl: string | null;
  variantCount: number;
  totalStock: number;
  priceFrom: number | null;
  updatedAt: string;
}

export interface ProductVariantDetail {
  id: string;
  sku: string;
  storage: string | null;
  colour: string | null;
  colourHex: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
}

export interface ProductImageDetail {
  mediaId: string;
  url: string;
  alt: string;
  colour: string | null;
}

export interface ProductSpecDetail {
  group: string;
  label: string;
  value: string;
}

export interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: ProductStatus;
  condition: ProductCondition;
  grade: ProductGrade | null;
  batteryHealth: number | null;
  warrantyMonths: number;
  highlights: string[];
  included: string[];
  brandId: string;
  categoryId: string;
  brand: NamedRef;
  category: NamedRef;
  publishedAt: string | null;
  updatedAt: string;
  variants: ProductVariantDetail[];
  images: ProductImageDetail[];
  specs: ProductSpecDetail[];
}

export type ProductFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
  brandId?: string;
};

export type ProductInput = z.input<typeof productSchema>;
