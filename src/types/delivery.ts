import type { z } from "zod";
import type { Emirate } from "@/lib/emirates";
import type { deliveryZoneSchema } from "@/validators/delivery-zone.validator";

export interface DeliveryZoneRow {
  emirate: Emirate;
  label: string;
  configured: boolean;
  standardFee: number | null;
  expressFee: number | null;
  standardMinDays: number | null;
  standardMaxDays: number | null;
  expressMinDays: number | null;
  expressMaxDays: number | null;
  updatedAt: string | null;
}

export type DeliveryZoneInput = z.input<typeof deliveryZoneSchema>;
