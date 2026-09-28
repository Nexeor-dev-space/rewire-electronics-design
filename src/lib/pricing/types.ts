export interface PricingLine {
  key: string;
  productId: string;
  categoryIds: string[];
  unitPrice: number;
  addOnUnitPrice: number;
  quantity: number;
  purchasable: boolean;
}

export type CouponType = "PERCENT" | "FIXED";

export interface CouponRule {
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  redemptionCount: number;
  appliesToAll: boolean;
  productIds: string[];
  categoryIds: string[];
}

export interface CouponContext {
  lines: PricingLine[];
  subtotal: number;
  customerRedemptions: number;
  now: Date;
}

export type CouponRejection =
  | "DISABLED"
  | "NOT_STARTED"
  | "EXPIRED"
  | "USAGE_LIMIT_REACHED"
  | "CUSTOMER_LIMIT_REACHED"
  | "NOT_APPLICABLE"
  | "MINIMUM_NOT_MET";

export type CouponResult =
  | { ok: true; discount: number; eligibleSubtotal: number }
  | { ok: false; reason: CouponRejection };

export type CouponStatus = "ACTIVE" | "SCHEDULED" | "EXPIRED" | "DISABLED" | "USED_UP";

export interface PriceCartInput {
  lines: PricingLine[];
  coupon: { rule: CouponRule; customerRedemptions: number } | null;
  deliveryFee: number | null;
  now: Date;
}

export interface CartPricing {
  lines: { key: string; lineTotal: number }[];
  subtotal: number;
  discount: number;
  delivery: number | null;
  total: number;
  vatIncluded: number;
  vatRatePercent: number;
  coupon: CouponResult | null;
}
