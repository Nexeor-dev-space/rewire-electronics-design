import { siteConfig } from "@/lib/site";
import type { EmailContent } from "./email-outcome";
import { updateEmail, type ClaimUpdateInput, type CustomerLink, type OrderUpdateInput } from "./templates";

/**
 * Email content for the automated messages in docs/MESSAGING.md. Every
 * function takes data already read from the live order, release, warranty or
 * entitlement, and only lays it out. The order, return and claim updates that
 * existed before stay in `templates.ts`.
 */

const WAITLIST_GREETING_NAME = "there";
const LEAVE_HINT = "To stop these updates, leave the waitlist here:";

/* ---------- releases and waitlists ---------- */

export interface ReleaseEmailInput {
  title: string;
  /** The release page. */
  url: string;
  leaveUrl: string;
}

function waitlistEmail(subject: string, input: ReleaseEmailInput, paragraphs: string[]): EmailContent {
  return updateEmail({
    name: WAITLIST_GREETING_NAME,
    subject,
    paragraphs: [...paragraphs, `${LEAVE_HINT} ${input.leaveUrl}`],
    action: { label: "View the release", url: input.url },
  });
}

export function waitlistWelcomeMessage(
  input: ReleaseEmailInput & { opensAt: string; started: boolean },
): EmailContent {
  return waitlistEmail(`you're on the ${input.title} waitlist`, input, [
    `Welcome. You're confirmed for the ${input.title} waitlist at ${siteConfig.name}.`,
    input.started
      ? "The release is already open, so don't wait."
      : `The release opens ${input.opensAt}. We'll email you as it gets closer, and again when it goes live.`,
  ]);
}

export function releaseCountdownMessage(input: ReleaseEmailInput & { timeLeft: string; opensAt: string }): EmailContent {
  return waitlistEmail(`${input.title} opens in ${input.timeLeft}`, input, [
    `${input.title} opens in ${input.timeLeft}, on ${input.opensAt}.`,
  ]);
}

export function dropReminderMessage(input: ReleaseEmailInput & { timeLeft: string; opensAt: string }): EmailContent {
  return waitlistEmail(`${input.title} opens soon`, input, [
    `Reminder: ${input.title} opens in ${input.timeLeft}, at ${input.opensAt}.`,
    "Units are limited, so be ready when it opens.",
  ]);
}

export function dropLiveMessage(input: ReleaseEmailInput): EmailContent {
  return waitlistEmail(`${input.title} is live`, input, [`${input.title} is live now. Units are limited.`]);
}

export function backInStockMessage(input: ReleaseEmailInput): EmailContent {
  return waitlistEmail(`${input.title} is back in stock`, input, [
    `More units of ${input.title} are available again. They may go quickly.`,
  ]);
}

export function campaignMessage(
  input: ReleaseEmailInput & { campaign: string; content: string; ctaLabel: string },
): EmailContent {
  return updateEmail({
    name: WAITLIST_GREETING_NAME,
    subject: input.campaign,
    paragraphs: [...(input.content ? [input.content] : [input.campaign]), `${LEAVE_HINT} ${input.leaveUrl}`],
    action: { label: input.ctaLabel, url: input.url },
  });
}

/* ---------- accounts and carts ---------- */

export function accountReactivatedMessage(input: CustomerLink): EmailContent {
  return updateEmail({
    name: input.name,
    subject: "your account is active again",
    paragraphs: [
      `Your ${siteConfig.name} account has been reactivated. Your orders, addresses and warranty details are all still there.`,
      "For your security you'll need to sign in again.",
    ],
    action: { label: input.linkLabel, url: input.url },
  });
}

export interface CartLine {
  name: string;
  quantity: number;
}

export function abandonedCheckoutMessage(input: CustomerLink & { lines: CartLine[] }): EmailContent {
  const items = input.lines.map((line) => `${line.quantity} x ${line.name}`).join(", ");
  return updateEmail({
    name: input.name,
    subject: "you left something in your cart",
    paragraphs: [`You left these in your cart: ${items}.`, "They're still waiting if you'd like to finish your order."],
    action: { label: input.linkLabel, url: input.url },
  });
}

/* ---------- orders and delivery ---------- */

export function deliveryAttemptFailedMessage(input: OrderUpdateInput & { note: string }): EmailContent {
  return updateEmail({
    name: input.name,
    subject: `order ${input.number} delivery attempt failed`,
    paragraphs: [
      `The courier couldn't deliver order ${input.number}.`,
      ...(input.note ? [`Note from our team: ${input.note}`] : []),
      "We'll arrange another attempt. If your address or phone number has changed, please contact us.",
    ],
    action: { label: input.linkLabel, url: input.url },
  });
}

export interface DeviceLine {
  product: string;
  /** "Unit 2 of 3", or empty for a single unit. */
  unit: string;
  /** The serial number or IMEI, or empty when none is recorded yet. */
  serial: string;
  warrantyEndsAt: string;
}

const SERIAL_PENDING = "not recorded yet";

export function deviceRecordMessage(input: OrderUpdateInput & { devices: DeviceLine[] }): EmailContent {
  const lines = input.devices.map((device) => {
    const unit = device.unit ? ` (${device.unit})` : "";
    return `${device.product}${unit}: serial or IMEI ${device.serial || SERIAL_PENDING}, warranty until ${device.warrantyEndsAt}`;
  });
  return updateEmail({
    name: input.name,
    subject: `order ${input.number} device record`,
    paragraphs: [
      `Here is the record of the devices in order ${input.number}. Keep it for any warranty claim.`,
      ...lines,
    ],
    action: { label: input.linkLabel, url: input.url },
  });
}

export function reviewRequestMessage(input: OrderUpdateInput & { products: string[] }): EmailContent {
  return updateEmail({
    name: input.name,
    subject: `how is your order ${input.number}?`,
    paragraphs: [
      `You received order ${input.number} a little while ago: ${input.products.join(", ")}.`,
      "We'd love to hear how it's going. If anything isn't right, reply to this email or open a support ticket from your account.",
    ],
    action: { label: input.linkLabel, url: input.url },
  });
}

/* ---------- warranty and entitlements ---------- */

export interface EntitlementLine {
  product: string;
  /** Add-on names with their extra warranty, for example "Screen cover (+6 months)". */
  addOns: string[];
  warrantyEndsAt: string;
}

function entitlementParagraphs(lines: EntitlementLine[]): string[] {
  return lines.map((line) => `${line.product}: ${line.addOns.join(", ")}. Cover runs until ${line.warrantyEndsAt}.`);
}

export function addOnEntitlementSummaryMessage(input: OrderUpdateInput & { lines: EntitlementLine[] }): EmailContent {
  return updateEmail({
    name: input.name,
    subject: `order ${input.number} add-ons and cover`,
    paragraphs: [
      `Your order ${input.number} included add-ons. Here is what you are entitled to:`,
      ...entitlementParagraphs(input.lines),
    ],
    action: { label: input.linkLabel, url: input.url },
  });
}

export function entitlementReminderMessage(input: OrderUpdateInput & { lines: EntitlementLine[] }): EmailContent {
  return updateEmail({
    name: input.name,
    subject: `your add-on cover on order ${input.number}`,
    paragraphs: [
      "A reminder that your add-on cover is still active, and ends soon:",
      ...entitlementParagraphs(input.lines),
      "If something is wrong with a device, raise a warranty claim before the cover ends.",
    ],
    action: { label: input.linkLabel, url: input.url },
  });
}

export function warrantyExpiryNoticeMessage(
  input: OrderUpdateInput & { product: string; warrantyEndsAt: string; daysLeft: number },
): EmailContent {
  return updateEmail({
    name: input.name,
    subject: `warranty on your ${input.product} ends soon`,
    paragraphs: [
      `The warranty on your ${input.product} (order ${input.number}) ends on ${input.warrantyEndsAt}, in about ${input.daysLeft} days.`,
      "If the device has a fault, raise a warranty claim before then.",
    ],
    action: { label: input.linkLabel, url: input.url },
  });
}

export function warrantyFollowUpMessage(input: ClaimUpdateInput): EmailContent {
  return updateEmail({
    name: input.name,
    subject: `warranty claim ${input.number} follow-up`,
    paragraphs: [
      `We returned your ${input.device} after warranty claim ${input.number} (order ${input.orderNumber}).`,
      "How is it working now? If the problem is back, reply to this email or reopen the matter from your account.",
    ],
    action: { label: input.linkLabel, url: input.url },
  });
}
