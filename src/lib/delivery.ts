export const DELIVERY_METHODS = ["STANDARD", "EXPRESS"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number];

export const DELIVERY_METHOD_LABELS: Record<DeliveryMethod, string> = {
  STANDARD: "Standard delivery",
  EXPRESS: "Express delivery",
};

export function formatEta(minDays: number, maxDays: number): string {
  if (maxDays === 0) return "Same working day";
  if (minDays === 1 && maxDays === 1) return "Next working day";
  if (minDays === maxDays) return `${maxDays} working days`;
  return `${minDays} to ${maxDays} working days`;
}
