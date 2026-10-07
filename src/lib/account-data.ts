import type { Address } from "@/types";

const ADDRESSES_KEY = "rewire.account.addresses.v1";

const seededAddresses: Address[] = [
  {
    id: "addr-1",
    label: "Home",
    name: "Alex Mercer",
    line1: "Sky Loft 21B, Marina Gate 2",
    line2: "Al Marsa Street",
    city: "Dubai",
    emirate: "Dubai",
    postalCode: "00000",
    phone: "+971 50 214 8837",
    isDefault: true,
  },
  {
    id: "addr-2",
    label: "Office",
    name: "Alex Mercer",
    line1: "Nexeor, One Central, Office 812",
    city: "Dubai",
    emirate: "Dubai",
    postalCode: "00000",
    phone: "+971 50 214 8837",
  },
];

function readAddresses(): Address[] {
  if (typeof window === "undefined") return seededAddresses;
  try {
    const raw = window.localStorage.getItem(ADDRESSES_KEY);
    if (!raw) return seededAddresses;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seededAddresses;
    return parsed as Address[];
  } catch {
    return seededAddresses;
  }
}

function writeAddresses(next: Address[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ADDRESSES_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
}

export function getSeededAddresses(): Address[] {
  return seededAddresses;
}

export function loadAddresses(): Address[] {
  return readAddresses();
}

export function saveAddresses(next: Address[]) {
  writeAddresses(next);
}
