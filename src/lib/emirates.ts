/**
 * The seven emirates, as stored (`Emirate` enum in prisma/schema/user.prisma)
 * and as shown. Client-safe — no Prisma import.
 */

export const EMIRATES = [
  { value: "ABU_DHABI", label: "Abu Dhabi" },
  { value: "AJMAN", label: "Ajman" },
  { value: "DUBAI", label: "Dubai" },
  { value: "FUJAIRAH", label: "Fujairah" },
  { value: "RAS_AL_KHAIMAH", label: "Ras Al Khaimah" },
  { value: "SHARJAH", label: "Sharjah" },
  { value: "UMM_AL_QUWAIN", label: "Umm Al Quwain" },
] as const;

export type Emirate = (typeof EMIRATES)[number]["value"];

export const EMIRATE_VALUES = EMIRATES.map((emirate) => emirate.value) as [Emirate, ...Emirate[]];

export function emirateLabel(value: Emirate): string {
  return EMIRATES.find((emirate) => emirate.value === value)?.label ?? value;
}
