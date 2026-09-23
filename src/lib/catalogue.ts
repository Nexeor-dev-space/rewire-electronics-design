import { CONDITION_META, GRADE_META, type Condition, type Grade } from "@/lib/shop";
import type { ShopFilterState } from "@/types/catalogue";
import type { AddOnKind } from "@/validators/add-on.validator";
import { shopQuerySchema } from "@/validators/catalogue.validator";
import type {
  ProductCondition,
  ProductGrade,
  ProductStatus,
} from "@/validators/product.validator";

export const toShopCondition = (condition: ProductCondition) =>
  condition.toLowerCase().replace("_", "-") as Condition;

export const toShopGrade = (grade: ProductGrade) =>
  grade.toLowerCase().replace("_", "-") as Grade;

export const fromShopCondition = (condition: Condition) =>
  condition.toUpperCase().replace("-", "_") as ProductCondition;

export const fromShopGrade = (grade: Grade) => grade.toUpperCase().replace("-", "_") as ProductGrade;

export const conditionLabel = (condition: ProductCondition) =>
  CONDITION_META[toShopCondition(condition)].label;

export const gradeLabel = (grade: ProductGrade) => GRADE_META[toShopGrade(grade)].label;

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  DRAFT: "Draft",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export const ADD_ON_KIND_LABELS: Record<AddOnKind, string> = {
  PROTECTION: "Protection",
  ACCESSORY: "Accessory",
  SERVICE: "Service",
};

const shopFilterSchema = shopQuerySchema.omit({ page: true, pageSize: true });

export function shopFiltersFromParams(
  params: Record<string, string | string[] | undefined>,
): ShopFilterState {
  const flat = Object.fromEntries(
    Object.entries(params).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value]),
  );
  const parsed = shopFilterSchema.safeParse(flat);
  return parsed.success ? parsed.data : shopFilterSchema.parse({});
}
