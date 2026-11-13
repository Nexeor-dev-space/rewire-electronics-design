import { policyLink, type PolicySlug } from "./policy-types";
import { ORDER_TRACK_PAGE_PATH } from "@/lib/constants";
import { formatPhoneDisplay, mailtoHref, telHref, whatsappHref } from "@/lib/contact";
import type { ContactDetails } from "@/types/contact";

export type SupportChannelIcon = "mail" | "chat" | "phone" | "track";

export interface SupportChannel {
  id: string;
  icon: SupportChannelIcon;
  label: string;
  action: string;
  href: string;
  note: string;
  external?: boolean;
  /** Opens in a new tab (the WhatsApp chat). */
  newTab?: boolean;
}

export interface SupportPolicy {
  slug: PolicySlug;
  figure: string;
  unit: string;
}

/** Wording only. The email, phone, WhatsApp number and hours come from the saved contact settings. */
export const supportContact = {
  heading: "Need help?",
  chatLabel: "Live Chat",
} as const;

/**
 * The ways in that the saved contact details allow. A channel whose detail
 * staff have not filled is left out, and Track an order is always there.
 */
export function getSupportChannels(contact: ContactDetails): SupportChannel[] {
  const channels: SupportChannel[] = [];

  if (contact.email) {
    channels.push({
      id: "email",
      icon: "mail",
      label: "Email us",
      action: contact.email,
      href: mailtoHref(contact.email),
      note: "Every message reaches a person. Include your order number and we can answer in one reply rather than three.",
      external: true,
    });
  }
  if (contact.whatsapp) {
    channels.push({
      id: "chat",
      icon: "chat",
      label: "Live chat",
      action: supportContact.chatLabel,
      href: whatsappHref(contact.whatsapp),
      note: "Opens WhatsApp, so you can message the team straight from your phone.",
      external: true,
      newTab: true,
    });
  }
  if (contact.phone) {
    channels.push({
      id: "phone",
      icon: "phone",
      label: "Call us",
      action: formatPhoneDisplay(contact.phone),
      href: telHref(contact.phone),
      note: "Tap to call from your phone and speak to the team.",
      external: true,
    });
  }
  channels.push({
    id: "orders",
    icon: "track",
    label: "Track an order",
    action: "Track my order",
    href: ORDER_TRACK_PAGE_PATH,
    note: "Tracking goes live the moment a device leaves us — usually the fastest answer to where is it.",
  });

  return channels;
}

const policies: SupportPolicy[] = [
  { slug: "warranty", figure: "12", unit: "months" },
  { slug: "shipping", figure: "2–4", unit: "working days" },
  { slug: "returns-refunds-cancellation", figure: "30", unit: "days" },
];

export function getSupportPolicies(): SupportPolicy[] {
  return policies;
}

export const supportSections: { label: string; href: string }[] = [
  ...(["warranty", "shipping", "returns-refunds-cancellation", "faq"] as const).map(
    policyLink,
  ),
  { label: "Contact", href: "/support#contact" },
];
