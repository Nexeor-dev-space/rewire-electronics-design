/**
 * Support data adapter — the after-the-sale half of the site.
 * Mock for now, Payload CMS later: swap the bodies of the getters for
 * CMS queries without touching the UI, exactly as `faqs.ts` does.
 *
 * Every figure here is already published somewhere else on the site —
 * twelve months of warranty, thirty days to return, two to four working
 * days to arrive — and all three come from the answers in `faqs.ts`.
 * That is deliberate: a support page is the one page a customer will
 * quote back at you, so it may not be the place a new number is
 * invented. If a policy changes, it changes in both places or the site
 * is lying in one of them.
 */

/** Icon key — resolved to a drawn mark in `components/support/icons.tsx`. */
export type SupportChannelIcon = "mail" | "chat" | "track";

export interface SupportChannel {
  id: string;
  icon: SupportChannelIcon;
  /** What the channel is. */
  label: string;
  /** The address, destination or instruction, rendered as the action. */
  action: string;
  href: string;
  /** One line on when to reach for this one rather than the others. */
  note: string;
  /** `mailto:` and `tel:` links must not be routed through next/link. */
  external?: boolean;
}

export interface SupportPolicy {
  /** Doubles as the in-page anchor: `/support#warranty`. */
  id: string;
  eyebrow: string;
  /** The headline number, kept as a string — "2–4" is not an integer. */
  figure: string;
  unit: string;
  title: string;
  body: string;
  /** Two or three specifics. Never a paragraph each. */
  points: string[];
}

/**
 * Where support actually happens. Ordered by how a customer reaches for
 * them: write to us, catch us live, or answer the question yourself by
 * looking at the order.
 */
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

/**
 * The three policies worth a section of their own. Each is one promise
 * with its number stated first, because the number is the thing being
 * looked up — a customer on this page is checking whether they are
 * still inside a window, not reading prose.
 */
const policies: SupportPolicy[] = [
  {
    id: "warranty",
    eyebrow: "Warranty",
    figure: "12",
    unit: "months",
    title: "Covered from the day it arrives.",
    body: "Twelve months from the day it arrives, covering parts and labour on any hardware fault. Return shipping is on us, and a device we cannot repair is replaced or refunded in full.",
    points: [
      "Parts and labour on any hardware fault",
      "Return shipping paid both ways",
      "Replaced or refunded in full if it cannot be repaired",
    ],
  },
  {
    id: "shipping",
    eyebrow: "Shipping",
    figure: "2–4",
    unit: "working days",
    title: "Tracked from the moment it leaves.",
    body: "Within two to four working days across the UAE, tracked from the moment it leaves us. Orders placed while a drop is open ship the next working day.",
    points: [
      "Tracked door to door across the UAE",
      "Drop orders ship the next working day",
      "Packed by hand, in the condition it was certified",
    ],
  },
  {
    id: "returns",
    eyebrow: "Returns",
    figure: "30",
    unit: "days",
    title: "For any reason at all.",
    body: "Thirty days, for any reason at all. Send it back in the condition it reached you and we refund the full amount, shipping included.",
    points: [
      "No reason required, and none asked for",
      "Full refund including the shipping you paid",
      "Return it in the condition it reached you",
    ],
  },
];

export function getSupportChannels(): SupportChannel[] {
  return channels;
}

export function getSupportPolicies(): SupportPolicy[] {
  return policies;
}

/**
 * The page's own contents, and the destination of every link in the
 * Support mega menu. Kept here rather than in the components so the
 * menu and the page cannot drift into naming different anchors.
 */
export const supportSections: { label: string; href: string }[] = [
  ...policies.map((policy) => ({
    label: policy.eyebrow,
    href: `/support#${policy.id}`,
  })),
  { label: "FAQ", href: "/support#faq" },
  { label: "Contact", href: "/support#contact" },
];
