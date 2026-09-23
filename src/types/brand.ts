import type { z } from "zod";
import type { brandSchema } from "@/validators/brand.validator";

export interface BrandListItem {
  id: string;
  name: string;
  /** `/api/v1/media/<id>`, or null when the brand has no image. */
  imageUrl: string | null;
  /** ISO string — shown as "Last edited". */
  updatedAt: string;
}

export interface BrandDetail extends BrandListItem {
  /** Submitted back unchanged when the modal leaves the image alone. */
  imageId: string | null;
}

/** Plain type, not `z.input` — `z.coerce` inputs widen to `unknown`. */
export type BrandFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
};

export type BrandInput = z.input<typeof brandSchema>;
