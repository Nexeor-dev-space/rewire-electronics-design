import { siteConfig } from "@/lib/site";
import type { EmailContent } from "./email-outcome";
import { updateEmail, type ClaimUpdateInput, type CustomerLink } from "./templates";

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

/* ---------- warranty ---------- */

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
