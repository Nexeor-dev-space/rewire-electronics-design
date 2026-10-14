import type { z } from "zod";
import type { Emirate } from "@/lib/emirates";
import type { deliveryAreaSchema, deliveryZoneSchema } from "@/validators/delivery-zone.validator";

export interface DeliveryZoneRow {
  emirate: Emirate;
  label: string;
  configured: boolean;
  enabled: boolean;
  standardFee: number | null;
  expressFee: number | null;
  standardMinDays: number | null;
  standardMaxDays: number | null;
  expressMinDays: number | null;
  expressMaxDays: number | null;
  updatedAt: string | null;
}

export type DeliveryZoneInput = z.input<typeof deliveryZoneSchema>;

/** Null fees and days inherit the emirate's `DeliveryZone`. */
export interface AdminDeliveryArea {
  id: string;
  emirate: Emirate;
  emirateLabel: string;
  area: string;
  enabled: boolean;
  standardFee: number | null;
  expressFee: number | null;
  standardMinDays: number | null;
  standardMaxDays: number | null;
  expressMinDays: number | null;
  expressMaxDays: number | null;
  updatedAt: string;
}

export type DeliveryAreaInput = z.input<typeof deliveryAreaSchema>;
export type DeliveryAreaFilters = {
  page?: number;
  pageSize?: number;
  emirate?: Emirate;
  search?: string;
};

export interface DeliveryAreaOption {
  id: string;
  area: string;
}

/**
 * The checkout's area dropdown. `required` is true once the emirate has any
 * area configured, enabled or not: the customer must then pick one of `areas`.
 */
export interface DeliveryAreaOptions {
  required: boolean;
  areas: DeliveryAreaOption[];
}
