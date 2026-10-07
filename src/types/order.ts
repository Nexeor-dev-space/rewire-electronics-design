import type { z } from "zod";
import type { DeliveryMethod } from "@/lib/delivery";
import type { Emirate } from "@/lib/emirates";
import type {
  FulfilmentQueueStatus,
  ManualPaymentStatus,
  OrderStatus,
  OrderTimelineStep,
  PaymentMethod,
  PaymentStatus,
} from "@/lib/orders";
import type { ReturnStatus } from "@/lib/returns";
import type { Condition, Grade } from "@/lib/shop";
import type { AddOnKind } from "@/validators/add-on.validator";
import type { placeOrderSchema } from "@/validators/checkout.validator";
import type {
  fulfilmentUpdateSchema,
  orderPaymentSchema,
  orderStatusChangeSchema,
  trackOrderSchema,
  updateOrderSchema,
} from "@/validators/order.validator";

export interface OrderLineAddOn {
  id: string | null;
  name: string;
  kind: AddOnKind;
  price: number;
}

export interface OrderLine {
  id: string;
  variantId: string | null;
  productName: string;
  productSlug: string;
  brand: string;
  sku: string;
  imageUrl: string | null;
  imageAlt: string;
  condition: Condition;
  grade: Grade | null;
  storage: string | null;
  colour: string | null;
  warrantyMonths: number;
  quantity: number;
  returnableQuantity: number;
  unitPrice: number;
  addOnUnitPrice: number;
  lineTotal: number;
  addOns: OrderLineAddOn[];
}

export interface OrderContact {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
}

export interface OrderAddress {
  address1: string;
  address2: string;
  city: string;
  postalCode: string;
  emirate: Emirate;
}

export interface OrderTotals {
  subtotal: number;
  discount: number;
  delivery: number;
  total: number;
  vatIncluded: number;
  vatRatePercent: number;
  refunded: number;
}

export interface OrderDetail {
  number: string;
  placedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  etaMinDays: number;
  etaMaxDays: number;
  deliveredAt: string | null;
  returnableUntil: string | null;
  trackingNumber: string;
  contact: OrderContact;
  address: OrderAddress;
  lines: OrderLine[];
  totals: OrderTotals;
  couponCode: string | null;
  timeline: OrderTimelineStep[];
}

export interface OrderSummaryLine {
  productName: string;
  imageUrl: string | null;
  imageAlt: string;
  condition: Condition;
  grade: Grade | null;
  storage: string | null;
  colour: string | null;
  quantity: number;
}

export interface OrderSummary {
  number: string;
  placedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  etaMinDays: number;
  etaMaxDays: number;
  total: number;
  lineCount: number;
  firstLine: OrderSummaryLine | null;
}

export interface AdminOrderRow {
  number: string;
  placedAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  deliveryMethod: DeliveryMethod;
  customerName: string;
  email: string;
  phone: string;
  emirate: Emirate;
  city: string;
  total: number;
  lineCount: number;
  trackingNumber: string;
  placedAsGuest: boolean;
}

export interface AdminOrderCustomer {
  id: string;
  fullName: string;
  email: string;
  isGuest: boolean;
}

export interface AdminOrderEvent {
  id: string;
  status: OrderStatus;
  note: string;
  at: string;
  actorName: string | null;
}

export interface AdminOrderReturn {
  number: string;
  status: ReturnStatus;
}

export interface AdminOrderDetail extends OrderDetail {
  customer: AdminOrderCustomer | null;
  placedAsGuest: boolean;
  staffNote: string;
  events: AdminOrderEvent[];
  nextStatuses: OrderStatus[];
  paymentActions: ManualPaymentStatus[];
  returns: AdminOrderReturn[];
}

export type AdminOrderFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
};

export type FulfilmentFilters = {
  page?: number;
  pageSize?: number;
  status?: FulfilmentQueueStatus;
};

export type PlaceOrderInput = z.input<typeof placeOrderSchema>;
export type TrackOrderInput = z.input<typeof trackOrderSchema>;
export type UpdateOrderInput = z.input<typeof updateOrderSchema>;
export type OrderStatusChangeInput = z.input<typeof orderStatusChangeSchema>;
export type OrderPaymentInput = z.input<typeof orderPaymentSchema>;
export type FulfilmentUpdateInput = z.input<typeof fulfilmentUpdateSchema>;
