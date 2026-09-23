import { CONDITION_META, GRADE_META, type Condition, type Grade } from "@/lib/shop";
import type { AddOnKind } from "@/validators/add-on.validator";
import type {
  ProductCondition,
  ProductGrade,
  ProductStatus,
} from "@/validators/product.validator";

export const toShopCondition = (condition: ProductCondition) =>
  condition.toLowerCase().replace("_", "-") as Condition;

export const toShopGrade = (grade: ProductGrade) =>
  grade.toLowerCase().replace("_", "-") as Grade;

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
