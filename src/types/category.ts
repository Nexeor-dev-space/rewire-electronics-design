import type { z } from "zod";
import type {
  CategoryStatus,
  CategoryType,
  categorySchema,
} from "@/validators/category.validator";

/**
 * Dates arrive on the client as ISO strings, so `updatedAt` is a `string`
 * here even though the service selects a `Date` — the JSON response does the
 * conversion.
 */
export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
  /** Derived from `parentId`, never stored. */
  type: CategoryType;
  parentId: string | null;
  /** `/api/v1/media/<id>`, or null when the category has no image. */
  imageUrl: string | null;
  description: string;
  status: CategoryStatus;
  showInNav: boolean;
  sortOrder: number;
  /** ISO string — shown as "Last edited". */
  updatedAt: string;
}

export interface CategoryChild extends CategorySummary {
  type: "child";
  parentId: string;
}

/** A parent row in the default list, carrying its children. */
export interface CategoryNode extends CategorySummary {
  type: "parent";
  parentId: null;
  childCount: number;
  children: CategoryChild[];
}

export interface CategoryDetail extends CategorySummary {
  /** Submitted back unchanged when the modal leaves the image alone. */
  imageId: string | null;
  /**
   * Lets the modal disable "Parent → Child" for a category that already has
   * children, rather than waiting for the server to refuse the save.
   */
  childCount: number;
}

/**
 * A plain type rather than `z.input` of the query schema, because `z.coerce`
 * inputs widen to `unknown`.
 */
export type CategoryFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: CategoryType;
  parentId?: string;
};

export type CategoryInput = z.input<typeof categorySchema>;
