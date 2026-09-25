import { z } from "zod";
import { paginationQueryValidator } from "./common/primitives.validator";
import { stockValidator } from "./product.validator";

export const STOCK_FILTERS = ["all", "low", "out"] as const;
export type StockFilter = (typeof STOCK_FILTERS)[number];

export const inventoryListQuerySchema = paginationQueryValidator.extend({
  search: z.string().trim().max(100).optional(),
  stock: z.enum(STOCK_FILTERS).default("all"),
});

export const stockUpdateSchema = z.object({
  stock: stockValidator,
});
