import type { z } from "zod";
import type { DeliveryMethod } from "@/lib/delivery";
import type { Emirate } from "@/lib/emirates";
import type { Condition, Grade } from "@/lib/shop";
import type { ShopAddOn } from "@/types/catalogue";
import type {
  addCartItemSchema,
  applyCouponSchema,
  cartQuoteQuerySchema,
  updateCartItemSchema,
} from "@/validators/cart.validator";

export const CART_LINE_ISSUES = [
  "UNAVAILABLE",
  "OUT_OF_STOCK",
  "INSUFFICIENT_STOCK",
  "PRICE_CHANGED",
  "ADD_ON_UNAVAILABLE",
] as const;

export type CartLineIssue = (typeof CART_LINE_ISSUES)[number];

export const BLOCKING_CART_LINE_ISSUES: readonly CartLineIssue[] = [
  "UNAVAILABLE",
  "OUT_OF_STOCK",
  "INSUFFICIENT_STOCK",
];

export interface CartLineAddOn {
  id: string;
  label: string;
  price: number;
  available: boolean;
}

export type OfferedAddOn = Omit<ShopAddOn, "popular">;

export interface CartLine {
  id: string;
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  brand: string;
  imageUrl: string | null;
  imageAlt: string;
  condition: Condition;
  grade: Grade | null;
  storage: string | null;
  colour: string | null;
  quantity: number;
  maxQuantity: number;
  unitPrice: number;
  compareAtPrice: number | null;
  previousUnitPrice: number | null;
  addOns: CartLineAddOn[];
  offeredAddOns: OfferedAddOn[];
  lineTotal: number;
  issues: CartLineIssue[];
}

export interface AppliedCoupon {
  code: string;
  description: string;
  valid: boolean;
  message: string | null;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  delivery: number | null;
  total: number;
  vatIncluded: number;
  vatRatePercent: number;
}

export interface Cart {
  id: string | null;
  items: CartLine[];
  itemCount: number;
  coupon: AppliedCoupon | null;
  totals: CartTotals;
  canCheckout: boolean;
  couponsAllowed: boolean;
}

export interface DeliveryOption {
  method: DeliveryMethod;
  label: string;
  fee: number;
  etaMinDays: number;
  etaMaxDays: number;
}

export interface CartQuote {
  cart: Cart;
  emirate: Emirate;
  method: DeliveryMethod;
  options: DeliveryOption[];
}

export type AddCartItemInput = z.input<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.input<typeof updateCartItemSchema>;
export type ApplyCouponInput = z.input<typeof applyCouponSchema>;
export type CartQuoteQuery = z.input<typeof cartQuoteQuerySchema>;
