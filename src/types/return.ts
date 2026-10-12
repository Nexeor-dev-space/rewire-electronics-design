import type { z } from "zod";
import type { PaymentMethod, PaymentStatus } from "@/lib/orders";
import type { ReturnReason, ReturnStateFilter, ReturnStatus } from "@/lib/returns";
import type {
  createReturnSchema,
  recordRefundSchema,
  returnStatusChangeSchema,
  storeSettingsSchema,
} from "@/validators/return.validator";

export interface ReturnLine {
  orderItemId: string;
  productName: string;
  variantLabel: string;
  imageUrl: string | null;
  imageAlt: string;
  quantity: number;
  unitPrice: number;
}

export interface ReturnTimelineEntry {
  status: ReturnStatus;
  label: string;
  note: string;
  at: string;
}

export interface CustomerReturn {
  number: string;
  orderNumber: string;
  status: ReturnStatus;
  reason: ReturnReason;
  detail: string;
  requestedAt: string;
  refundAmount: number | null;
  refundedAt: string | null;
  items: ReturnLine[];
  timeline: ReturnTimelineEntry[];
}

export interface EligibleReturnLine {
  orderItemId: string;
  productName: string;
  variantLabel: string;
  imageUrl: string | null;
  imageAlt: string;
  quantity: number;
  returnableQuantity: number;
}

export interface EligibleReturnOrder {
  orderNumber: string;
  deliveredAt: string | null;
  returnableUntil: string;
  lines: EligibleReturnLine[];
}

export interface AdminReturnRow {
  number: string;
  orderNumber: string;
  customerName: string;
  email: string;
  status: ReturnStatus;
  reason: ReturnReason;
  itemCount: number;
  requestedAt: string;
  refundAmount: number | null;
}

export interface AdminReturnCustomer {
  id: string;
  fullName: string;
  email: string;
}

export interface AdminReturnOrder {
  number: string;
  total: number;
  refundedAmount: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  refundable: number;
}

export interface AdminReturnEvent {
  status: ReturnStatus;
  note: string;
  actorName: string | null;
  at: string;
}

export interface AdminReturnDetail extends CustomerReturn {
  customer: AdminReturnCustomer | null;
  order: AdminReturnOrder;
  suggestedRefund: number;
  refundReference: string;
  nextStatuses: ReturnStatus[];
  canRefund: boolean;
  events: AdminReturnEvent[];
}

export interface StoreSettingsView {
  returnWindowDays: number;
  updatedAt: string | null;
}

export type AccountReturnFilters = {
  page?: number;
  state?: ReturnStateFilter;
};

export type AdminReturnFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ReturnStatus;
};

export type CreateReturnInput = z.input<typeof createReturnSchema>;
export type ReturnStatusChangeInput = z.input<typeof returnStatusChangeSchema>;
export type RecordRefundInput = z.input<typeof recordRefundSchema>;
export type StoreSettingsInput = z.input<typeof storeSettingsSchema>;
