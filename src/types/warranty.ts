import type { z } from "zod";
import type { OrderStatus } from "@/lib/orders";
import type { WarrantyClaimStatus, WarrantyStatus } from "@/lib/warranty";
import type {
  claimStatusChangeSchema,
  createClaimSchema,
  updateWarrantySchema,
} from "@/validators/warranty.validator";

export interface AdminWarrantyRow {
  /** The device's id: one warranty record per unit sold. */
  id: string;
  serialNumber: string | null;
  /** Which unit of its order line this is, out of `quantity`. */
  unitNumber: number;
  quantity: number;
  productName: string;
  variantLabel: string;
  customerName: string;
  email: string;
  orderNumber: string;
  warrantyStartsAt: string | null;
  warrantyEndsAt: string | null;
  status: WarrantyStatus;
  claimInProgress: boolean;
}

export interface WarrantyCoverAddOn {
  name: string;
  extraWarrantyMonths: number;
}

export interface WarrantyClaimSummary {
  number: string;
  serialNumber: string;
  status: WarrantyClaimStatus;
  raisedAt: string;
}

export interface AdminWarrantyDetail {
  id: string;
  serialNumber: string | null;
  unitNumber: number;
  quantity: number;
  productName: string;
  brand: string;
  sku: string;
  variantLabel: string;
  imageUrl: string | null;
  imageAlt: string;
  status: WarrantyStatus;
  warrantyStartsAt: string | null;
  warrantyEndsAt: string | null;
  /** The product's own warranty at the time of sale. */
  baseMonths: number;
  /** Base months plus every extended cover add-on on the line. */
  totalMonths: number;
  coverAddOns: WarrantyCoverAddOn[];
  order: {
    number: string;
    status: OrderStatus;
    placedAt: string;
    dispatchedAt: string | null;
    deliveredAt: string | null;
  };
  contact: { name: string; email: string; phone: string };
  customer: { id: string; fullName: string; email: string } | null;
  claims: WarrantyClaimSummary[];
  claimInProgress: boolean;
  /** Active warranty, a recorded serial and no open claim. */
  canRaiseClaim: boolean;
}

export interface AdminWarrantyClaimEvent {
  status: WarrantyClaimStatus;
  note: string;
  actorName: string | null;
  at: string;
}

export interface AdminWarrantyClaimDetail {
  number: string;
  status: WarrantyClaimStatus;
  serialNumber: string;
  issue: string;
  raisedAt: string;
  nextStatuses: WarrantyClaimStatus[];
  events: AdminWarrantyClaimEvent[];
  device: {
    id: string;
    unitNumber: number;
    quantity: number;
    productName: string;
    variantLabel: string;
    warrantyStatus: WarrantyStatus;
    warrantyEndsAt: string | null;
  };
  orderNumber: string;
  customerName: string;
  email: string;
}

export type AdminWarrantyFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: WarrantyStatus;
};

export type UpdateWarrantyInput = z.input<typeof updateWarrantySchema>;
export type CreateClaimInput = z.input<typeof createClaimSchema>;
export type ClaimStatusChangeInput = z.input<typeof claimStatusChangeSchema>;
