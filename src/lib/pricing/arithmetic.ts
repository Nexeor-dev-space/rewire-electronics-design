import type { PricingLine } from "@/lib/pricing/types";

export const PERCENT_BASE = 100;

export function lineTotal(line: PricingLine): number {
  return (line.unitPrice + line.addOnUnitPrice) * line.quantity;
}

export function assertMinorUnits(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer, got ${value}.`);
  }
}
