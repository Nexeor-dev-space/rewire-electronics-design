import { STORE_TIME_ZONE } from "@/lib/constants";
import { formatPhoneDisplay } from "@/lib/contact";
import { DELIVERY_METHOD_LABELS, formatEta } from "@/lib/delivery";
import { emirateLabel } from "@/lib/emirates";
import { formatMoney, LOCALE } from "@/lib/money";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_PENDING_NOTICE,
  PAYMENT_STATUS_LABELS,
  paysOnline,
} from "@/lib/orders";
import { POLICY_NAV_LABELS, POLICY_ROUTES, type PolicySlug } from "@/lib/policy-types";
import { CONDITION_META, GRADE_META, gradeApplies } from "@/lib/shop";
import { siteConfig } from "@/lib/site";
import { unitLabel } from "@/lib/warranty";
import type { OrderDetail, OrderLine } from "@/types/order";
import type { ContactDetails } from "@/types/contact";
import type { EmailContent } from "./email-outcome";
import {
  EMAIL_ICONS,
  renderOrderEmail,
  type EmailIcon,
  type EmailLegal,
  type OrderEmailDetails,
  type OrderEmailLine,
  type OrderEmailSummary,
} from "./order-layout";
import { orderConfirmationMessage } from "./templates";

/**
 * The order confirmation email: what the storefront order success page shows,
 * read from the placed order and laid out by `renderOrderEmail`.
 */

export const BRAND_IMAGE_PATHS = {
  logo: "/images/brand/email-logo-on-dark.png",
  font: "/fonts/Geist-VariableFont_wght.ttf",
} as const;

const FOOTER_POLICIES: PolicySlug[] = ["terms-and-conditions", "privacy-policy", "returns-refunds-cancellation"];
const SEPARATOR = " · ";
const MINUS = "− ";
const FREE = "Free";
const CTA_NOTE = "Keep this email: the link above shows the latest status of your order.";

export interface OrderEmailContext {
  /** The site origin, for images and links. */
  siteUrl: string;
  /** The button: Track my order for a guest, View my order for an account holder. */
  cta: { label: string; url: string };
  contact: ContactDetails;
  legal: EmailLegal;
  year: number;
  /**
   * Where each image comes from: a `cid:` image sent with the email, which
   * shows wherever the email is opened, or the public address as a fallback.
   * Keyed by order line id.
   */
  images?: { logo: string | undefined; lines: Record<string, string> };
}

const absolute = (path: string, siteUrl: string) => new URL(path, siteUrl).toString();

function dateLabel(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric", timeZone: STORE_TIME_ZONE }).format(
    new Date(iso),
  );
}

function toLine(line: OrderLine, siteUrl: string, source: string | undefined): OrderEmailLine {
  const grade = line.grade && gradeApplies(line.condition) ? GRADE_META[line.grade].label : null;
  return {
    productName: line.productName,
    imageUrl: source ?? (line.imageUrl ? absolute(line.imageUrl, siteUrl) : null),
    imageAlt: line.imageAlt,
    detail: [line.brand, line.storage, line.colour].filter(Boolean).join(SEPARATOR),
    badges: [CONDITION_META[line.condition].label, grade, line.quantity > 1 ? `Qty ${line.quantity}` : null]
      .filter(Boolean)
      .join(SEPARATOR),
    rows: [
      { label: "Item", price: formatMoney(line.unitPrice) },
      ...line.addOns.map((addOn) => ({ label: addOn.name, price: formatMoney(addOn.price) })),
    ],
    lineTotal: formatMoney(line.lineTotal),
  };
}

function toSummary(order: OrderDetail, siteUrl: string, images: Record<string, string>): OrderEmailSummary {
  const { address, contact, totals } = order;
  const rows: OrderEmailSummary["rows"] = [{ label: "Subtotal", value: formatMoney(totals.subtotal) }];
  if (totals.discount > 0) {
    rows.push({
      label: order.couponCode ? `Discount${SEPARATOR}${order.couponCode}` : "Discount",
      value: `${MINUS}${formatMoney(totals.discount)}`,
      accent: true,
    });
  }
  rows.push(
    { label: "Delivery", value: totals.delivery === 0 ? FREE : formatMoney(totals.delivery) },
    { label: `Includes VAT ${totals.vatRatePercent}%`, value: formatMoney(totals.vatIncluded) },
  );

  return {
    placedAt: dateLabel(order.placedAt),
    lines: order.lines.map((line) => toLine(line, siteUrl, images[line.id])),
    deliverTo: [
      `${contact.firstName} ${contact.lastName}`.trim(),
      address.address1,
      address.address2,
      `${address.city}, ${emirateLabel(address.emirate)}`,
      address.postalCode,
    ].filter(Boolean),
    contact: [contact.email, contact.phone ? formatPhoneDisplay(contact.phone) : ""].filter(Boolean),
    deliveryMethod: DELIVERY_METHOD_LABELS[order.deliveryMethod],
    deliveryEta: formatEta(order.etaMinDays, order.etaMaxDays),
    trackingNumber: order.trackingNumber ? `${order.trackingNumber}${order.carrier ? ` (${order.carrier})` : ""}` : "",
    payment: PAYMENT_METHOD_LABELS[order.paymentMethod],
    paymentStatus: PAYMENT_STATUS_LABELS[order.paymentStatus],
    rows,
    total: formatMoney(totals.total),
  };
}

/** Which order email to write. The wording follows the order's status. */
export type OrderEmailKind =
  | { type: "PLACED" }
  | { type: "PAYMENT_RECEIVED" }
  | { type: "DISPATCHED" }
  | { type: "DELIVERED" }
  | { type: "CANCELLED" }
  | { type: "DELIVERY_FAILED"; note: string }
  | { type: "DEVICE_RECORD" }
  | { type: "ADDON_SUMMARY" }
  | { type: "REVIEW_REQUEST" }
  | { type: "ENTITLEMENT_REMINDER"; lineId: string }
  | { type: "WARRANTY_EXPIRY"; lineId: string; daysLeft: number };

interface Copy {
  /** The end of the subject, after "order {number}"; empty for the plain "received" subject. */
  subjectSuffix: string;
  /** A whole subject, when it does not read "order {number} …". */
  subject?: string;
  details?: OrderEmailDetails;
  eyebrow: string;
  heading: string;
  /** Starts with a lower case letter: it follows "Hi {name}," in the same sentence. */
  summary: string;
  notice: string;
  icon: EmailIcon;
  ctaNote: string;
}

const CTA_NOTE_VIEW = "The link above shows the latest status of your order.";

function placedCopy(order: OrderDetail): Copy {
  const online = paysOnline(order.paymentMethod);
  const awaitingPayment = online && order.paymentStatus === "UNPAID";
  const method = PAYMENT_METHOD_LABELS[order.paymentMethod];
  const total = formatMoney(order.totals.total);
  return {
    subjectSuffix: "",
    eyebrow: `Order ${ORDER_STATUS_LABELS[order.status].toLowerCase()}`,
    heading: "Thank you for your order.",
    summary: `${online ? "we have received your order request." : "thanks for your order."} Your order number is ${order.number} and the total is ${total}, VAT included.`,
    notice: awaitingPayment ? `You chose ${method}. ${PAYMENT_PENDING_NOTICE}` : `You chose ${method}.`,
    icon: EMAIL_ICONS.success,
    ctaNote: CTA_NOTE,
  };
}

const WARRANTY_DATE_PENDING = "a date to be confirmed";
const SERIAL_PENDING = "not recorded yet";

function endDate(line: OrderLine): string {
  return line.warrantyEndsAt ? dateLabel(line.warrantyEndsAt) : WARRANTY_DATE_PENDING;
}

function addOnLabel(addOn: OrderLine["addOns"][number]): string {
  return addOn.extraWarrantyMonths > 0 ? `${addOn.name} (+${addOn.extraWarrantyMonths} months cover)` : addOn.name;
}

/** One row per unit sold: its product, unit and serial or IMEI, and the warranty end. */
function deviceRows(order: OrderDetail): OrderEmailDetails["rows"] {
  return order.lines.flatMap((line) =>
    Array.from({ length: line.quantity }, (_, index) => ({
      label: line.quantity > 1 ? `${line.productName} (${unitLabel(index + 1, line.quantity)})` : line.productName,
      value: `Serial or IMEI: ${line.serials[index] || SERIAL_PENDING}`,
      note: `Warranty until ${endDate(line)}`,
    })),
  );
}

function addOnRows(lines: OrderLine[]): OrderEmailDetails["rows"] {
  return lines
    .filter((line) => line.addOns.length > 0)
    .map((line) => ({ label: line.productName, value: line.addOns.map(addOnLabel).join(", "), note: `Cover until ${endDate(line)}` }));
}

function lineById(order: OrderDetail, lineId: string): OrderLine {
  const line = order.lines.find((candidate) => candidate.id === lineId);
  if (!line) throw new Error(`order ${order.number} has no line ${lineId}`);
  return line;
}

function copyFor(order: OrderDetail, kind: OrderEmailKind): Copy {
  const { number } = order;
  switch (kind.type) {
    case "PLACED":
      return placedCopy(order);
    case "PAYMENT_RECEIVED":
      return {
        subjectSuffix: "payment received",
        eyebrow: "Payment received",
        heading: "We have your payment.",
        summary: `we have received your payment of ${formatMoney(order.totals.total)} for order ${number} (${PAYMENT_METHOD_LABELS[order.paymentMethod]}).`,
        notice: order.status === "CONFIRMED" ? "Your order is confirmed and we will start preparing it." : "",
        icon: EMAIL_ICONS.success,
        ctaNote: CTA_NOTE_VIEW,
      };
    case "DISPATCHED":
      return {
        subjectSuffix: "dispatched",
        eyebrow: "Order dispatched",
        heading: "Your order is on its way.",
        summary: `order ${number} is on its way to you.`,
        notice: order.trackingNumber ? "Use the tracking number below to follow your delivery." : "",
        icon: EMAIL_ICONS.success,
        ctaNote: CTA_NOTE_VIEW,
      };
    case "DELIVERED":
      return {
        subjectSuffix: "delivered",
        eyebrow: "Order delivered",
        heading: "Your order has arrived.",
        summary: `order ${number} has been delivered.`,
        notice: "Your warranty starts from today. You can see the dates on your order page.",
        icon: EMAIL_ICONS.success,
        ctaNote: CTA_NOTE_VIEW,
      };
    case "CANCELLED":
      return {
        subjectSuffix: "cancelled",
        eyebrow: "Order cancelled",
        heading: "Your order was cancelled.",
        summary: `order ${number} has been cancelled.`,
        notice:
          order.paymentStatus === "UNPAID"
            ? "No payment was taken, so no refund is due."
            : "As you had paid, a refund applies and we will process it to your original payment method.",
        icon: EMAIL_ICONS.danger,
        ctaNote: CTA_NOTE_VIEW,
      };
    case "DEVICE_RECORD":
      return {
        subjectSuffix: "device record",
        eyebrow: "Device record",
        heading: "Your device record.",
        summary: `here is the record of the devices in order ${number}.`,
        notice: "Keep it for any warranty claim.",
        icon: EMAIL_ICONS.success,
        ctaNote: CTA_NOTE_VIEW,
        details: { title: "Your devices", rows: deviceRows(order) },
      };
    case "ADDON_SUMMARY":
      return {
        subjectSuffix: "add-ons and cover",
        eyebrow: "Add-ons and cover",
        heading: "Your add-ons are active.",
        summary: `order ${number} included add-ons. Here is what you are entitled to.`,
        notice: "",
        icon: EMAIL_ICONS.success,
        ctaNote: CTA_NOTE_VIEW,
        details: { title: "Your add-ons", rows: addOnRows(order.lines) },
      };
    case "REVIEW_REQUEST":
      return {
        subjectSuffix: "",
        subject: `${siteConfig.name}: how is your order ${number}?`,
        eyebrow: "How is your order?",
        heading: "How is it going?",
        summary: `you received order ${number} a little while ago.`,
        notice: "If anything isn't right, reply to this email or open a support ticket from your account.",
        icon: EMAIL_ICONS.success,
        ctaNote: CTA_NOTE_VIEW,
      };
    case "ENTITLEMENT_REMINDER": {
      const line = lineById(order, kind.lineId);
      return {
        subjectSuffix: "add-on cover",
        eyebrow: "Add-on cover",
        heading: "Your add-on cover ends soon.",
        summary: `a reminder that the add-on cover on order ${number} is still active, and ends soon.`,
        notice: "If something is wrong with a device, raise a warranty claim before the cover ends.",
        icon: EMAIL_ICONS.warning,
        ctaNote: CTA_NOTE_VIEW,
        details: { title: "Your add-ons", rows: addOnRows([line]) },
      };
    }
    case "WARRANTY_EXPIRY": {
      const line = lineById(order, kind.lineId);
      return {
        subjectSuffix: "",
        subject: `${siteConfig.name}: warranty on your ${line.productName} ends soon`,
        eyebrow: "Warranty",
        heading: "Your warranty ends soon.",
        summary: `the warranty on your ${line.productName} (order ${number}) ends on ${endDate(line)}, in about ${kind.daysLeft} days.`,
        notice: "If the device has a fault, raise a warranty claim before then.",
        icon: EMAIL_ICONS.warning,
        ctaNote: CTA_NOTE_VIEW,
      };
    }
    case "DELIVERY_FAILED":
      return {
        subjectSuffix: "delivery attempt failed",
        eyebrow: "Delivery attempt failed",
        heading: "We couldn't deliver your order.",
        summary: `the courier couldn't deliver order ${number}.${kind.note ? ` Note from our team: ${kind.note}${/[.!?]$/.test(kind.note) ? "" : "."}` : ""}`,
        notice: "We'll arrange another attempt. If your address or phone number has changed, please contact us.",
        icon: EMAIL_ICONS.warning,
        ctaNote: CTA_NOTE_VIEW,
      };
  }
}

function subjectFor(order: OrderDetail, copy: Copy, context: OrderEmailContext): string {
  if (copy.subject) return copy.subject;
  if (copy.subjectSuffix) return `${siteConfig.name}: order ${order.number} ${copy.subjectSuffix}`;
  // The placed order keeps the wording of the plain confirmation email.
  return orderConfirmationMessage({
    name: order.contact.firstName,
    url: context.cta.url,
    number: order.number,
    total: order.totals.total,
    paymentMethod: order.paymentMethod,
  }).subject;
}

export function orderEmail(order: OrderDetail, context: OrderEmailContext, kind: OrderEmailKind): EmailContent {
  const copy = copyFor(order, kind);
  const summary = toSummary(order, context.siteUrl, context.images?.lines ?? {});
  const host = new URL(context.siteUrl).host;

  return renderOrderEmail({
    icon: copy.icon,
    details: copy.details,
    subject: subjectFor(order, copy, context),
    preheader: `Order ${order.number}${SEPARATOR}${summary.total}. ${copy.notice || copy.summary}`,
    eyebrow: copy.eyebrow,
    heading: copy.heading,
    greeting: `Hi ${order.contact.firstName},`,
    paragraphs: [copy.summary, ...(copy.notice ? [copy.notice] : [])],
    orderNumber: order.number,
    cta: context.cta,
    ctaNote: copy.ctaNote,
    summary,
    brand: {
      name: siteConfig.name,
      tagline: siteConfig.tagline,
      homeUrl: context.siteUrl,
      logoUrl: context.images?.logo ?? absolute(BRAND_IMAGE_PATHS.logo, context.siteUrl),
      fontUrl: absolute(BRAND_IMAGE_PATHS.font, context.siteUrl),
      year: context.year,
      reason: `You're receiving this email because you placed an order at ${host}.`,
    },
    contact: context.contact,
    legal: context.legal,
    policyLinks: FOOTER_POLICIES.map((slug) => ({
      label: POLICY_NAV_LABELS[slug],
      url: absolute(POLICY_ROUTES[slug], context.siteUrl),
    })),
  });
}
