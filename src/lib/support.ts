import { policyLink, type PolicySlug } from "./policy-types";

export type SupportChannelIcon = "mail" | "chat" | "track";

export interface SupportChannel {
  id: string;
  icon: SupportChannelIcon;
  label: string;
  action: string;
  href: string;
  note: string;
  external?: boolean;
}

export interface SupportPolicy {
  slug: PolicySlug;
  figure: string;
  unit: string;
}

export const supportContact = {
  heading: "Need help?",
  email: "support@rewire-electronics.com",
  chat: { label: "Live Chat", href: "/support/chat" },
  hours: [
    "Monday – Friday, 9:00 – 18:00 GMT",
    "Weekend cover during a live drop",
  ],
} as const;

const channels: SupportChannel[] = [
  {
    id: "email",
    icon: "mail",
    label: "Email us",
    action: supportContact.email,
    href: `mailto:${supportContact.email}`,
    note: "Every message reaches a person. Include your order number and we can answer in one reply rather than three.",
    external: true,
  },
  {
    id: "chat",
    icon: "chat",
    label: "Live chat",
    action: supportContact.chat.label,
    href: supportContact.chat.href,
    note: "Open during working hours, and through the weekend whenever a drop is live.",
  },
  {
    id: "orders",
    icon: "track",
    label: "Track an order",
    action: "Open my orders",
    href: "/account/orders",
    note: "Tracking goes live the moment a device leaves us — usually the fastest answer to where is it.",
  },
];

const policies: SupportPolicy[] = [
  { slug: "warranty", figure: "12", unit: "months" },
  { slug: "shipping", figure: "2–4", unit: "working days" },
  { slug: "returns-refunds-cancellation", figure: "30", unit: "days" },
];

export function getSupportChannels(): SupportChannel[] {
  return channels;
}

export function getSupportPolicies(): SupportPolicy[] {
  return policies;
}

export const supportSections: { label: string; href: string }[] = [
  ...(["warranty", "shipping", "returns-refunds-cancellation", "faq"] as const).map(
    policyLink,
  ),
  { label: "Contact", href: "/support#contact" },
];
