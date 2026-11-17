import { RESET_TOKEN_TTL_SECONDS, VERIFY_TOKEN_TTL_SECONDS, WAITLIST_CONFIRM_LINK_TTL_SECONDS } from "@/lib/constants";
import { formatPhoneDisplay, mailtoHref, telHref, whatsappHref } from "@/lib/contact";
import { formatMoney } from "@/lib/money";
import { PAYMENT_METHOD_LABELS, PAYMENT_PENDING_NOTICE, paysOnline, type PaymentMethod } from "@/lib/orders";
import { siteConfig } from "@/lib/site";
import type { ContactDetails } from "@/types/contact";
import type { EmailContent } from "./email-outcome";

interface LinkEmailInput {
  name: string;
  url: string;
}

interface OrderConfirmationInput extends LinkEmailInput {
  number: string;
  total: number;
  paymentMethod: PaymentMethod;
}

interface TicketNoticeInput {
  name: string;
  number: string;
  subject: string;
}

interface WaitlistConfirmInput {
  title: string;
  url: string;
  leaveUrl: string;
  confirmUrl: string;
}

const SECONDS_PER_HOUR = 60 * 60;
const WAITLIST_GREETING_NAME = "there";

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

export function hoursLabel(seconds: number): string {
  const hours = Math.round(seconds / SECONDS_PER_HOUR);
  return hours === 1 ? "1 hour" : `${hours} hours`;
}

/**
 * Adds the saved support details to the foot of an email: the support email
 * and, when set, the phone and WhatsApp numbers. With nothing saved the
 * email is returned as it is.
 */
export function withContactFooter<T extends EmailContent>(message: T, contact: ContactDetails): T {
  const rows: { label: string; value: string; href: string }[] = [];
  if (contact.email) rows.push({ label: "Email", value: contact.email, href: mailtoHref(contact.email) });
  if (contact.phone) rows.push({ label: "Phone", value: formatPhoneDisplay(contact.phone), href: telHref(contact.phone) });
  if (contact.whatsapp) {
    rows.push({ label: "WhatsApp", value: formatPhoneDisplay(contact.whatsapp), href: whatsappHref(contact.whatsapp) });
  }
  if (rows.length === 0) return message;

  const html = [
    "<hr>",
    `<p>${rows
      .map((row) => `${row.label}: <a href="${escapeHtml(row.href)}">${escapeHtml(row.value)}</a>`)
      .join("<br>")}</p>`,
  ].join("\n");
  const text = ["--", ...rows.map((row) => `${row.label}: ${row.value}`)].join("\n");
  return { ...message, html: `${message.html}\n${html}`, text: `${message.text}\n\n${text}` };
}

function linkEmail(
  subject: string,
  { name, url }: LinkEmailInput,
  intro: string,
  action: string,
  outro: string,
): EmailContent {
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(url);
  const html = [
    `<p>Hi ${safeName},</p>`,
    `<p>${escapeHtml(intro)}</p>`,
    `<p><a href="${safeUrl}">${escapeHtml(action)}</a></p>`,
    `<p>If that doesn't open, paste this address into your browser:<br>${safeUrl}</p>`,
    `<p>${escapeHtml(outro)}</p>`,
    `<p>${escapeHtml(siteConfig.name)}</p>`,
  ].join("\n");
  const text = [
    `Hi ${name},`,
    "",
    intro,
    "",
    `${action}: ${url}`,
    "",
    outro,
    "",
    siteConfig.name,
  ].join("\n");
  return { subject, html, text };
}

export function verifyEmailMessage(input: LinkEmailInput): EmailContent {
  return linkEmail(
    `Welcome to ${siteConfig.name}: confirm your email`,
    input,
    `Welcome to ${siteConfig.name}. With your account you can track your orders, keep a wishlist, request returns and see your warranty details. Please confirm this is your email address to get started.`,
    "Confirm my email",
    `This link expires in ${hoursLabel(VERIFY_TOKEN_TTL_SECONDS)}. If you didn't create an account, you can ignore this email.`,
  );
}

export function resetPasswordMessage(input: LinkEmailInput): EmailContent {
  return linkEmail(
    `Reset your ${siteConfig.name} password`,
    input,
    "We received a request to reset the password for your account.",
    "Choose a new password",
    `This link expires in ${hoursLabel(RESET_TOKEN_TTL_SECONDS)} and can be used once. If you didn't ask to reset your password, you can ignore this email.`,
  );
}

export function orderConfirmationMessage({ number, total, paymentMethod, ...link }: OrderConfirmationInput): EmailContent {
  const online = paysOnline(paymentMethod);
  const payment = online
    ? `You chose ${PAYMENT_METHOD_LABELS[paymentMethod]}. Your order is not confirmed until your payment completes. ${PAYMENT_PENDING_NOTICE}`
    : `You chose ${PAYMENT_METHOD_LABELS[paymentMethod]}.`;
  const received = online ? "We have received your order request." : "Thanks for your order.";
  return linkEmail(
    online ? `${siteConfig.name} order ${number} received` : `Your ${siteConfig.name} order ${number}`,
    link,
    `${received} Your order number is ${number} and the total is ${formatMoney(total)}, VAT included. ${payment}`,
    "Track my order",
    `Keep this email: the link above shows the latest status of your order.`,
  );
}

/* ---------- customer updates (orders, returns, warranty) ---------- */

interface UpdateEmailInput {
  name: string;
  /** Short subject after the store name, for example "order RW-1234 dispatched". */
  subject: string;
  paragraphs: string[];
  action: { label: string; url: string };
}

/** One layout for every customer update: greeting, paragraphs, one link, the support address. */
function updateEmail({ name, subject, paragraphs, action }: UpdateEmailInput): EmailContent {
  const html = [
    `<p>Hi ${escapeHtml(name)},</p>`,
    ...paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
    `<p><a href="${escapeHtml(action.url)}">${escapeHtml(action.label)}</a></p>`,
    `<p>${escapeHtml(siteConfig.name)}</p>`,
  ].join("\n");
  const text = [
    `Hi ${name},`,
    ...paragraphs.flatMap((paragraph) => ["", paragraph]),
    "",
    `${action.label}: ${action.url}`,
    "",
    siteConfig.name,
  ].join("\n");
  return { subject: `${siteConfig.name}: ${subject}`, html, text };
}

interface CustomerLink {
  name: string;
  url: string;
  linkLabel: string;
}

interface OrderUpdateInput extends CustomerLink {
  number: string;
}

function orderUpdate(input: OrderUpdateInput, subject: string, paragraphs: string[]): EmailContent {
  return updateEmail({
    name: input.name,
    subject: `order ${input.number} ${subject}`,
    paragraphs,
    action: { label: input.linkLabel, url: input.url },
  });
}

export function orderPaymentReceivedMessage(
  input: OrderUpdateInput & { total: number; paymentMethod: PaymentMethod; confirmed: boolean },
): EmailContent {
  const { number, total, paymentMethod, confirmed } = input;
  const received = `We have received your payment of ${formatMoney(total)} for order ${number} (${PAYMENT_METHOD_LABELS[paymentMethod]}).`;
  return orderUpdate(input, "payment received", [
    confirmed ? `${received} Your order is confirmed and we will start preparing it.` : received,
  ]);
}

export function orderDispatchedMessage(
  input: OrderUpdateInput & { trackingNumber: string; carrier: string },
): EmailContent {
  const carrier = input.carrier ? ` Carrier: ${input.carrier}.` : "";
  const tracking = input.trackingNumber ? ` Tracking number: ${input.trackingNumber}.` : "";
  return orderUpdate(input, "dispatched", [`Order ${input.number} is on its way to you.${carrier}${tracking}`]);
}

export function orderDeliveredMessage(input: OrderUpdateInput): EmailContent {
  return orderUpdate(input, "delivered", [
    `Order ${input.number} has been delivered. Your warranty starts from today. You can see the dates on your order page.`,
  ]);
}

export function orderCancelledMessage(input: OrderUpdateInput & { refundApplies: boolean }): EmailContent {
  const refund = input.refundApplies
    ? "As you had paid, a refund applies and we will process it to your original payment method."
    : "No payment was taken, so no refund is due.";
  return orderUpdate(input, "cancelled", [`Order ${input.number} has been cancelled. ${refund}`]);
}

interface ReturnUpdateInput extends CustomerLink {
  number: string;
  orderNumber: string;
}

function returnUpdate(input: ReturnUpdateInput, subject: string, paragraphs: string[]): EmailContent {
  return updateEmail({
    name: input.name,
    subject: `return ${input.number} ${subject}`,
    paragraphs,
    action: { label: input.linkLabel, url: input.url },
  });
}

function withNote(note: string): string[] {
  return note ? [`Note from our team: ${note}`] : [];
}

export function returnReceivedMessage(input: ReturnUpdateInput & { items: string[] }): EmailContent {
  return returnUpdate(input, "received", [
    `We have received your return request ${input.number} for order ${input.orderNumber}. You asked to return: ${input.items.join(", ")}.`,
    "Our team will review it and email you with the decision.",
  ]);
}

export function returnDecisionMessage(input: ReturnUpdateInput & { approved: boolean; note: string }): EmailContent {
  const decision = input.approved
    ? `Your return request ${input.number} for order ${input.orderNumber} has been approved. We will email you again when your refund is issued.`
    : `Your return request ${input.number} for order ${input.orderNumber} has been declined.`;
  return returnUpdate(input, input.approved ? "approved" : "declined", [decision, ...withNote(input.note)]);
}

export function refundIssuedMessage(input: ReturnUpdateInput & { amount: number; reference: string }): EmailContent {
  return returnUpdate(input, "refund issued", [
    `We have issued a refund of ${formatMoney(input.amount)} for return ${input.number} on order ${input.orderNumber}. The payment reference is ${input.reference}.`,
  ]);
}

interface ClaimUpdateInput extends CustomerLink {
  number: string;
  device: string;
  orderNumber: string;
}

function claimUpdate(input: ClaimUpdateInput, subject: string, paragraphs: string[]): EmailContent {
  return updateEmail({
    name: input.name,
    subject: `warranty claim ${input.number} ${subject}`,
    paragraphs,
    action: { label: input.linkLabel, url: input.url },
  });
}

export function warrantyClaimOpenedMessage(input: ClaimUpdateInput & { issue: string }): EmailContent {
  return claimUpdate(input, "opened", [
    `We have opened warranty claim ${input.number} for your ${input.device} (order ${input.orderNumber}). Issue reported: ${input.issue}`,
    "Our team will check the device details and email you with each step.",
  ]);
}

export function warrantyClaimDecisionMessage(input: ClaimUpdateInput & { statusLabel: string; note: string }): EmailContent {
  return claimUpdate(input, "update", [
    `Warranty claim ${input.number} for your ${input.device} (order ${input.orderNumber}) is now: ${input.statusLabel}.`,
    ...withNote(input.note),
  ]);
}

export function integrationTestEmail(name: string): EmailContent {
  const lines = [
    `Hi ${name},`,
    `This is a test email from the Integrations, API Keys screen. If you can read it, ${siteConfig.name} can send email.`,
    siteConfig.name,
  ];
  return {
    subject: `Test email from ${siteConfig.name}`,
    html: lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n"),
    text: lines.join("\n\n"),
  };
}

/** One short, automated note about a support ticket. Nothing to reply to or click. */
function ticketNotice(title: string, { name, number, subject }: TicketNoticeInput, message: string): EmailContent {
  const lines = [
    `Hi ${name},`,
    `${message} (Ticket ${number}: ${subject})`,
    "This is an automated message, so please do not reply to it.",
    siteConfig.name,
  ];
  return {
    subject: `Ticket ${number} ${title}`,
    html: lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("\n"),
    text: lines.join("\n\n"),
  };
}

export function ticketReceivedMessage(input: TicketNoticeInput): EmailContent {
  return ticketNotice("raised successfully", input, "Your support ticket was raised successfully. We will look into it.");
}

export function ticketResolvedMessage(input: TicketNoticeInput): EmailContent {
  return ticketNotice(
    "resolved",
    input,
    "Your issue has been resolved, so we are closing this ticket. If you still need help, contact us and we will reopen it.",
  );
}

export function ticketClosedMessage(input: TicketNoticeInput): EmailContent {
  return ticketNotice("closed", input, "Your support ticket has been closed.");
}

export function ticketReopenedMessage(input: TicketNoticeInput): EmailContent {
  return ticketNotice("reopened", input, "Your support ticket has been reopened and we are looking into it again.");
}

export function waitlistConfirmMessage({ title, url, leaveUrl, confirmUrl }: WaitlistConfirmInput): EmailContent {
  return linkEmail(
    `Confirm your place on the ${title} waitlist`,
    { name: WAITLIST_GREETING_NAME, url: confirmUrl },
    `Please confirm you want updates about ${title} from ${siteConfig.name}. The release page is ${url}`,
    "Confirm my place",
    `This link expires in ${hoursLabel(WAITLIST_CONFIRM_LINK_TTL_SECONDS)}. If you didn't ask for this, you can ignore this email. To leave the waitlist, open ${leaveUrl}`,
  );
}
