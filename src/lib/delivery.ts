import type { DeliveryOption } from "@/types/cart";

export const DELIVERY_METHODS = ["STANDARD", "EXPRESS"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  STANDARD: "Standard delivery",
  EXPRESS: "Express delivery",
};

export const DELIVERY_MESSAGES = {
  NO_EMIRATE: "We don't deliver to that emirate yet.",
  NO_AREA: "We don't deliver to that area yet.",
  CHOOSE_AREA: "Choose an area.",
} as const;

/** Fees in fils and earliest / latest working day, per method. */
export interface DeliveryRates {
  standardFee: number;
  expressFee: number;
  standardMinDays: number;
  standardMaxDays: number;
  expressMinDays: number;
  expressMaxDays: number;
}

/** An area's own values; null inherits the emirate's. */
export type DeliveryRateOverrides = { [Key in keyof DeliveryRates]: number | null };

export function formatEta(minDays: number, maxDays: number): string {
  if (maxDays === 0) return "Same working day";
  if (minDays === 1 && maxDays === 1) return "Next working day";
  if (minDays === maxDays) return `${maxDays} working days`;
  return `${minDays} to ${maxDays} working days`;
}

/** The rates that apply: the area's value where it has one, otherwise the emirate's. */
export function effectiveRates(zone: DeliveryRates, area: DeliveryRateOverrides | null): DeliveryRates {
  if (!area) return zone;
  return {
    standardFee: area.standardFee ?? zone.standardFee,
    expressFee: area.expressFee ?? zone.expressFee,
    standardMinDays: area.standardMinDays ?? zone.standardMinDays,
    standardMaxDays: area.standardMaxDays ?? zone.standardMaxDays,
    expressMinDays: area.expressMinDays ?? zone.expressMinDays,
    expressMaxDays: area.expressMaxDays ?? zone.expressMaxDays,
  };
}

export function deliveryOptions(rates: DeliveryRates): DeliveryOption[] {
  return [
    {
      method: "STANDARD",
      label: DELIVERY_METHOD_LABELS.STANDARD,
      fee: rates.standardFee,
      etaMinDays: rates.standardMinDays,
      etaMaxDays: rates.standardMaxDays,
    },
    {
      method: "EXPRESS",
      label: DELIVERY_METHOD_LABELS.EXPRESS,
      fee: rates.expressFee,
      etaMinDays: rates.expressMinDays,
      etaMaxDays: rates.expressMaxDays,
    },
  ];
}
