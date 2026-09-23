import type { StockFilter } from "@/validators/inventory.validator";
import type { ProductStatus } from "@/validators/product.validator";

export interface InventoryItem {
  id: string;
  sku: string;
  storage: string | null;
  colour: string | null;
  price: number;
  stock: number;
  updatedAt: string;
  product: {
    id: string;
    name: string;
    status: ProductStatus;
  };
}

export type InventoryFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  stock?: StockFilter;
};
