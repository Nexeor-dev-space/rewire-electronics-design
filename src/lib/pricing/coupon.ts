import { PERCENT_BASE, lineTotal } from "@/lib/pricing/arithmetic";
import type {
  CouponContext,
  CouponRejection,
  CouponResult,
  CouponRule,
  CouponStatus,
  PricingLine,
} from "@/lib/pricing/types";

export const COUPON_MINIMUM_TOKEN = "{minimum}";

const INVALID_CODE_MESSAGE = "That code isn't valid.";

export const COUPON_MESSAGES: Record<CouponRejection | "INVALID" | "SIGN_IN_REQUIRED", string> = {
  INVALID: INVALID_CODE_MESSAGE,
  DISABLED: INVALID_CODE_MESSAGE,
  NOT_STARTED: "This code isn't active yet.",
  EXPIRED: "This code has expired.",
  USAGE_LIMIT_REACHED: "This code has been fully redeemed.",
  CUSTOMER_LIMIT_REACHED: "You've already used this code.",
  NOT_APPLICABLE: "This code doesn't apply to the items in your cart.",
  MINIMUM_NOT_MET: `Spend at least ${COUPON_MINIMUM_TOKEN} to use this code.`,
  SIGN_IN_REQUIRED: "Sign in to use a discount code.",
};

const STATUS_REJECTION: Partial<Record<CouponStatus, CouponRejection>> = {
  DISABLED: "DISABLED",
  SCHEDULED: "NOT_STARTED",
  EXPIRED: "EXPIRED",
  USED_UP: "USAGE_LIMIT_REACHED",
};

export function couponStatus(rule: CouponRule, now: Date): CouponStatus {
  if (!rule.active) return "DISABLED";
  if (rule.startsAt && now < rule.startsAt) return "SCHEDULED";
  if (rule.endsAt && now >= rule.endsAt) return "EXPIRED";
  if (rule.usageLimit !== null && rule.redemptionCount >= rule.usageLimit) return "USED_UP";
  return "ACTIVE";
}

export function isLineEligible(rule: CouponRule, line: PricingLine): boolean {
  if (rule.appliesToAll) return true;
  if (rule.productIds.includes(line.productId)) return true;
  return line.categoryIds.some((id) => rule.categoryIds.includes(id));
}

function discountFor(rule: CouponRule, eligibleSubtotal: number): number {
  const raw =
    rule.type === "PERCENT"
      ? Math.round((eligibleSubtotal * rule.value) / PERCENT_BASE)
      : rule.value;
  return Math.max(0, Math.min(raw, eligibleSubtotal));
}

export function evaluateCoupon(rule: CouponRule, context: CouponContext): CouponResult {
  const statusRejection = STATUS_REJECTION[couponStatus(rule, context.now)];
  if (statusRejection) return { ok: false, reason: statusRejection };

  if (rule.perCustomerLimit !== null && context.customerRedemptions >= rule.perCustomerLimit) {
    return { ok: false, reason: "CUSTOMER_LIMIT_REACHED" };
  }

  const eligible = context.lines.filter((line) => line.purchasable && isLineEligible(rule, line));
  if (eligible.length === 0) return { ok: false, reason: "NOT_APPLICABLE" };

  if (context.subtotal < rule.minOrderAmount) return { ok: false, reason: "MINIMUM_NOT_MET" };

  const eligibleSubtotal = eligible.reduce((sum, line) => sum + lineTotal(line), 0);
  return { ok: true, discount: discountFor(rule, eligibleSubtotal), eligibleSubtotal };
}
