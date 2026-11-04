import type { z } from "zod";
import type { ReleaseSort, ReleaseStateAction, ReleaseStatus } from "@/lib/releases";
import type { releaseAllocationsSchema, releaseSchema } from "@/validators/release.validator";
import type { ProductCondition } from "@/validators/product.validator";
import type { NamedRef } from "./product";

export interface ReleaseTotals {
  productCount: number;
  allocated: number;
  sold: number;
  remaining: number;
}

export interface AdminReleaseRow extends ReleaseTotals {
  id: string;
  slug: string | null;
  title: string;
  edition: string;
  startsAt: string;
  endsAt: string | null;
  publishedAt: string | null;
  hidden: boolean;
  maxPerCustomer: number;
  status: ReleaseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReleaseAllocationRow {
  id: string;
  variantId: string;
  sku: string;
  storage: string | null;
  colour: string | null;
  condition: ProductCondition;
  price: number;
  stock: number;
  product: NamedRef;
  allocated: number;
  available: number;
  reserved: number;
  sold: number;
  returned: number;
}

export interface AdminReleaseDetail extends AdminReleaseRow {
  description: string;
  completedAt: string | null;
  allocations: ReleaseAllocationRow[];
}

export interface LiveRelease extends ReleaseTotals {
  id: string;
  title: string;
  edition: string;
  startsAt: string;
  endsAt: string | null;
  otherLive: number;
}

export type ReleaseFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ReleaseStatus;
  sort?: ReleaseSort;
};

export type ReleaseInput = z.input<typeof releaseSchema>;
export type ReleaseAllocationsInput = z.input<typeof releaseAllocationsSchema>;
export type ReleaseStateInput = { action: ReleaseStateAction };
