/**
 * Assurance data adapter — the "Why Rewire" standards.
 * Mock for now, Payload CMS later: swap the bodies of getAssurances() /
 * getAssuranceHighlights() for CMS queries without touching the UI.
 */

/** Icon key — resolved to a drawn mark in `assurance-icons.tsx`. */
export type AssuranceIcon =
  | "certified"
  | "battery"
  | "warranty"
  | "tested"
  | "payments"
  | "delivery";

export interface Assurance {
  id: string;
  icon: AssuranceIcon;
  title: string;
  description: string;
}

const assurances: Assurance[] = [
  {
    id: "certified-refurbished",
    icon: "certified",
    title: "Certified Refurbished",
    description:
      "Every device undergoes a rigorous multi-point inspection before approval.",
  },
  {
    id: "battery-health-verified",
    icon: "battery",
    title: "Battery Health Verified",
    description:
      "Battery performance is professionally tested and verified before every sale.",
  },
  {
    id: "warranty-included",
    icon: "warranty",
    title: "Warranty Included",
    description:
      "Every purchase includes warranty coverage for additional confidence.",
  },
  {
    id: "professionally-tested",
    icon: "tested",
    title: "Professionally Tested",
    description:
      "Display, camera, speakers, ports, Face ID, buttons, and hardware are thoroughly inspected.",
  },
  {
    id: "secure-payments",
    icon: "payments",
    title: "Secure Payments",
    description:
      "Encrypted payment processing with trusted payment gateways.",
  },
  {
    id: "fast-reliable-delivery",
    icon: "delivery",
    title: "Fast & Reliable Delivery",
    description:
      "Carefully packaged products with secure shipping and order tracking.",
  },
];

export function getAssurances(): Assurance[] {
  return assurances;
}

/** Condensed guarantees for the closing callout. */
const assuranceHighlights: string[] = [
  "Certified Devices",
  "Battery Health Verified",
  "Warranty Included",
  "Trusted Quality",
];

export function getAssuranceHighlights(): string[] {
  return assuranceHighlights;
}
