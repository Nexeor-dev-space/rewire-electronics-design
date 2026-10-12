import { randomInt } from "node:crypto";
import { REFERENCE_NUMBER_DIGITS } from "@/lib/constants";

const REFERENCE_NUMBER_BASE = 10;

export function formatReference(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(REFERENCE_NUMBER_DIGITS, "0")}`;
}

export function generateReference(prefix: string): string {
  return formatReference(prefix, randomInt(0, REFERENCE_NUMBER_BASE ** REFERENCE_NUMBER_DIGITS));
}
