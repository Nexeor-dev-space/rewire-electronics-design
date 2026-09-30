import { CART_MAX_LINES, CART_MAX_LINE_QUANTITY } from "@/lib/constants";
import type { CartLineIssue } from "@/types/cart";

const PUBLISHED = "PUBLISHED";

export interface VisibilityInput {
  status: string;
  category: { status: string; parent: { status: string } | null };
}

export function isProductVisible(product: VisibilityInput): boolean {
  return (
    product.status === PUBLISHED &&
    product.category.status === PUBLISHED &&
    (product.category.parent === null || product.category.parent.status === PUBLISHED)
  );
}

export interface LineIssueInput {
  visible: boolean;
  stock: number;
  quantity: number;
  unitPrice: number;
  seenUnitPrice: number;
  addOns: { price: number; seenPrice: number; available: boolean }[];
}

export function lineIssues(line: LineIssueInput): CartLineIssue[] {
  const issues: CartLineIssue[] = [];
  if (!line.visible) issues.push("UNAVAILABLE");
  else if (line.stock <= 0) issues.push("OUT_OF_STOCK");
  else if (line.stock < line.quantity) issues.push("INSUFFICIENT_STOCK");

  const addOnPriceChanged = line.addOns.some((addOn) => addOn.available && addOn.price !== addOn.seenPrice);
  if (line.unitPrice !== line.seenUnitPrice || addOnPriceChanged) issues.push("PRICE_CHANGED");
  if (line.addOns.some((addOn) => !addOn.available)) issues.push("ADD_ON_UNAVAILABLE");
  return issues;
}

export function maxLineQuantity(stock: number): number {
  return Math.max(0, Math.min(stock, CART_MAX_LINE_QUANTITY));
}

export type QuantityProblem = "UNAVAILABLE" | "OUT_OF_STOCK" | "INSUFFICIENT_STOCK" | "LINE_CAP";

export interface QuantityCheck {
  requested: number;
  current: number;
  stock: number;
  visible: boolean;
}

export function quantityProblem({ requested, current, stock, visible }: QuantityCheck): QuantityProblem | null {
  if (requested <= current) return null;
  if (!visible) return "UNAVAILABLE";
  if (stock <= 0) return "OUT_OF_STOCK";
  if (requested > stock) return "INSUFFICIENT_STOCK";
  if (requested > CART_MAX_LINE_QUANTITY) return "LINE_CAP";
  return null;
}

export function unionIds(first: readonly string[], second: readonly string[]): string[] {
  return [...new Set([...first, ...second])];
}

export interface LineImage {
  mediaId: string;
  alt: string;
  colour: string | null;
}

export function pickLineImage<T extends LineImage>(images: readonly T[], colour: string | null): T | null {
  return (
    (colour ? images.find((image) => image.colour === colour) : undefined) ??
    images.find((image) => image.colour === null) ??
    images[0] ??
    null
  );
}

export interface MergeLine {
  id: string;
  variantId: string;
  quantity: number;
  addOnIds: string[];
}

export interface MergeUpdate {
  userLineId: string;
  guestLineId: string;
  quantity: number;
  addOnIds: string[];
}

export interface MergePlan {
  updates: MergeUpdate[];
  moves: string[];
  dropped: string[];
}

export function planCartMerge(userLines: readonly MergeLine[], guestLinesNewestFirst: readonly MergeLine[]): MergePlan {
  const byVariant = new Map(userLines.map((line) => [line.variantId, line]));
  const plan: MergePlan = { updates: [], moves: [], dropped: [] };
  let lineCount = userLines.length;

  for (const guest of guestLinesNewestFirst) {
    const match = byVariant.get(guest.variantId);
    if (match) {
      plan.updates.push({
        userLineId: match.id,
        guestLineId: guest.id,
        quantity: Math.min(match.quantity + guest.quantity, CART_MAX_LINE_QUANTITY),
        addOnIds: guest.addOnIds.filter((id) => !match.addOnIds.includes(id)),
      });
    } else if (lineCount < CART_MAX_LINES) {
      plan.moves.push(guest.id);
      lineCount += 1;
    } else {
      plan.dropped.push(guest.id);
    }
  }
  return plan;
}
