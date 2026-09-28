import type { z } from "zod";
import type { CouponStatus, CouponType } from "@/lib/pricing/types";
import type { couponSchema } from "@/validators/coupon.validator";
import type { NamedRef } from "./product";

export interface AdminCoupon {
  id: string;
  code: string;
  description: string;
  type: CouponType;
  value: number;
  minOrderAmount: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  usageLimit: number | null;
  perCustomerLimit: number | null;
  redemptionCount: number;
  appliesToAll: boolean;
  products: NamedRef[];
  categories: NamedRef[];
  status: CouponStatus;
  createdAt: string;
  updatedAt: string;
}

export type CouponFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  active?: "true" | "false";
};

export type CouponInput = z.input<typeof couponSchema>;
