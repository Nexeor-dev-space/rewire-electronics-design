import { z } from "zod";
import { SHOP_MAX_FILTER_VALUES, SHOP_MAX_PAGE_SIZE, SHOP_PAGE_SIZE } from "@/lib/constants";
import {
  conditions,
  grades,
  priceBands,
  sortOptions,
  type Condition,
  type Grade,
  type SortId,
} from "@/lib/shop";

const CONDITION_VALUES = conditions.map((condition) => condition.value);
const GRADE_VALUES = grades.map((grade) => grade.value);
const PRICE_BAND_IDS = priceBands.map((band) => band.id);
const SORT_IDS = sortOptions.map((option) => option.id);

const csv = z
  .string()
  .trim()
  .max(1000)
  .optional()
  .transform((value) =>
    [...new Set((value ?? "").split(",").map((entry) => entry.trim()).filter(Boolean))].slice(
      0,
      SHOP_MAX_FILTER_VALUES,
    ),
  );

const csvOf = <T extends string>(allowed: readonly T[]) =>
  csv.transform((list) => list.filter((entry): entry is T => (allowed as readonly string[]).includes(entry)));

export const shopQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(SHOP_MAX_PAGE_SIZE).default(SHOP_PAGE_SIZE),
  q: z.string().trim().max(100).optional(),
  category: csv,
  condition: csvOf<Condition>(CONDITION_VALUES),
  grade: csvOf<Grade>(GRADE_VALUES),
  brand: csv,
  storage: csv,
  price: csvOf(PRICE_BAND_IDS),
  sort: z
    .string()
    .optional()
    .transform((value): SortId =>
      SORT_IDS.includes(value as SortId) ? (value as SortId) : "recommended",
    ),
});
