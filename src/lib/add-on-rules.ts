import { MAX_PRODUCT_ADD_ONS } from "@/lib/constants";

export interface AddOnPick {
  addOnId: string;
  priceOverride: number | null;
}

export interface AddOnScope {
  categoryIds: string[];
  picks: AddOnPick[];
}

export interface OfferableAddOn {
  id: string;
  price: number;
  appliesToAll: boolean;
  categories: { categoryId: string }[];
}

export function addOnScopeOf(product: {
  categoryId: string;
  category: { parentId: string | null };
  addOns: AddOnPick[];
}): AddOnScope {
  return {
    categoryIds: product.category.parentId
      ? [product.categoryId, product.category.parentId]
      : [product.categoryId],
    picks: product.addOns,
  };
}

export function resolveOfferedAddOns<T extends OfferableAddOn>(rows: readonly T[], scope: AddOnScope): T[] {
  if (scope.picks.length > 0) {
    const overrides = new Map(scope.picks.map((pick) => [pick.addOnId, pick.priceOverride]));
    return rows
      .filter((row) => overrides.has(row.id))
      .slice(0, MAX_PRODUCT_ADD_ONS)
      .map((row) => ({ ...row, price: overrides.get(row.id) ?? row.price }));
  }
  return rows
    .filter(
      (row) => row.appliesToAll || row.categories.some((link) => scope.categoryIds.includes(link.categoryId)),
    )
    .slice(0, MAX_PRODUCT_ADD_ONS);
}
