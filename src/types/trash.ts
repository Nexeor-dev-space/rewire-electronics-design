import type { ProductListItem } from "@/types/product";

/** A product in Trash: the Products list row plus when it was deleted (ISO). */
export interface TrashProduct extends ProductListItem {
  deletedAt: string;
}

export type TrashFilters = { page?: number; pageSize?: number; search?: string };
