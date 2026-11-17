import { WHATSAPP_CHAT_BASE_URL, WHATSAPP_GREETING } from "@/lib/constants";
import { splitPhone } from "@/lib/phone";
import type { ContactDetails } from "@/types/contact";

/** Shown when staff have filled nothing yet; no surface falls back to a value in code. */
export const NO_CONTACT: ContactDetails = { email: "", phone: "", whatsapp: "", hours: "" };

const LAST_GROUP = 4;
const MIDDLE_GROUP = 3;

/** `+971501234567` becomes `+971 50 123 4567`; the same format everywhere. */
export function formatPhoneDisplay(stored: string): string {
  if (!stored) return "";
  const { country, number } = splitPhone(stored);
  const groups: string[] = [];
  let rest = number;
  for (const size of [LAST_GROUP, MIDDLE_GROUP]) {
    if (rest.length > size) {
      groups.unshift(rest.slice(-size));
      rest = rest.slice(0, -size);
    }
  }
  return [country.dialCode, rest, ...groups].filter(Boolean).join(" ");
}

export const mailtoHref = (email: string) => `mailto:${email}`;

export const telHref = (stored: string) => `tel:${stored}`;

/** Opens a WhatsApp chat with the number and a short prefilled greeting. */
export function whatsappHref(stored: string, greeting: string = WHATSAPP_GREETING): string {
  return `${WHATSAPP_CHAT_BASE_URL}${stored.replace(/^\+/, "")}?text=${encodeURIComponent(greeting)}`;
}

/** The hours as the rows staff typed them. */
export function hoursLines(hours: string): string[] {
  return hours
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function hasContact(contact: ContactDetails): boolean {
  return Boolean(contact.email || contact.phone || contact.whatsapp || contact.hours);
}
