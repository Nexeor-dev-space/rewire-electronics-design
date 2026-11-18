import { formatPhoneDisplay, hoursLines, mailtoHref, telHref, whatsappHref } from "@/lib/contact";
import type { ContactDetails } from "@/types/contact";
import type { EmailContent } from "./email-outcome";
import { escapeHtml } from "./templates";

/**
 * The branded layout for order emails (from the design in
 * Downloads/email-template). It only lays out data the caller already read
 * from the live order and the saved store settings: no database, no env here.
 * Colours, spacing and the dark mode rules follow the storefront tokens.
 */

const FONT = "'Geist','Helvetica Neue',Helvetica,Arial,sans-serif";
/* The storefront's own dark tokens (globals.css): void, surface, surface-2, ink, ink-secondary, accent. */
const CANVAS = "#282929";
const CARD = "#21252a";
const PANEL = "#181c20";
const INK = "#f5f5f2";
const INK2 = "#a7aaad";
const MUTED = "#8a8e93";
const LINE = "#33373b";
const PILL = "#404448";
const BUTTON = "#3b404b";
const PLATE = "#ffffff";
const NB_HYPHEN = "‑";

export interface EmailBrand {
  name: string;
  tagline: string;
  homeUrl: string;
  /** The logo for the dark page: an https address or a `cid:` image sent with the email. */
  logoUrl: string;
  fontUrl: string;
  year: number;
  /** Why the customer is getting this email, for the foot of the page. */
  reason: string;
}

export interface EmailLegal {
  name: string;
  address: string;
  trn: string;
}

export interface EmailLink {
  label: string;
  url: string;
}

export interface OrderEmailLine {
  productName: string;
  imageUrl: string | null;
  imageAlt: string;
  /** Brand, storage and colour, already joined with a middle dot and empty parts skipped. */
  detail: string;
  /** Condition and grade, with "Qty n" when more than one. */
  badges: string;
  /** Item and each add-on with its price, as shown in the line breakdown. */
  rows: { label: string; price: string }[];
  lineTotal: string;
}

export interface OrderEmailSummary {
  placedAt: string;
  lines: OrderEmailLine[];
  deliverTo: string[];
  contact: string[];
  deliveryMethod: string;
  deliveryEta: string;
  trackingNumber: string;
  payment: string;
  paymentStatus: string;
  rows: { label: string; value: string; accent?: boolean }[];
  total: string;
}

/** The round badge above the heading: a tick for good news, a cross or a warning otherwise. */
export interface EmailIcon {
  symbol: string;
  color: string;
  background: string;
}

export const EMAIL_ICONS = {
  success: { symbol: "&#10003;", color: "#7fb391", background: "#2f3a39" },
  warning: { symbol: "!", color: "#e0a45c", background: "#3a3328" },
  danger: { symbol: "&#10005;", color: "#d1706a", background: "#3a2b2b" },
} as const satisfies Record<string, EmailIcon>;

/** A list shown above the order summary: the devices, add-ons or cover an email is about. */
export interface OrderEmailDetails {
  title: string;
  rows: { label: string; value: string; note?: string }[];
}

export interface OrderEmailInput {
  details?: OrderEmailDetails;
  icon: EmailIcon;
  subject: string;
  preheader: string;
  eyebrow: string;
  heading: string;
  greeting: string;
  /** The first paragraph is the summary line; a second one, if any, is the emphasised notice. */
  paragraphs: string[];
  orderNumber: string;
  cta: EmailLink;
  ctaNote: string;
  summary: OrderEmailSummary;
  brand: EmailBrand;
  contact: ContactDetails;
  legal: EmailLegal;
  policyLinks: EmailLink[];
}

/** A paragraph with the template's inline styles. */
function para(cls: string, css: string, html: string): string {
  return `<p class="${cls}" style="margin:0; font-family:${FONT}; ${css}">${html}</p>`;
}

const lines = (values: string[]) => values.map(escapeHtml).join("<br>");

/* ---------- styles ---------- */

function styles(fontUrl: string): string {
  return `
  @media screen {
    @font-face { font-family: 'Geist'; font-style: normal; font-weight: 100 900; font-display: swap; src: url('${escapeHtml(fontUrl)}') format('truetype'); }
  }
  :root { color-scheme: dark; supported-color-schemes: dark; }
  html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
  body { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; word-spacing: normal; }
  table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  a[x-apple-data-detectors], #MessageViewBody a { color: inherit !important; text-decoration: inherit !important; font-size: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
  u + #body a { color: inherit; text-decoration: none; font-size: inherit; font-weight: inherit; line-height: inherit; }
  @media only screen and (max-width: 620px) {
    .rw-shell { padding: 24px 8px !important; }
    .rw-px { padding-left: 20px !important; padding-right: 20px !important; }
    .rw-h1 { font-size: 28px !important; line-height: 32px !important; }
    .rw-col { max-width: 100% !important; }
    .rw-col-gap { padding-left: 0 !important; padding-top: 20px !important; }
    .rw-stack-head { display: block !important; width: 100% !important; }
    .rw-stack { display: block !important; width: 100% !important; padding: 6px 0 0 0 !important; text-align: left !important; }
    .rw-thumb-cell { width: 48px !important; }
    .rw-thumb { width: 48px !important; height: 48px !important; border-radius: 12px !important; }
    .rw-thumb img { width: 40px !important; height: 40px !important; }
    .rw-line-body { padding-left: 12px !important; }
    .rw-logo-cell { padding-left: 8px !important; padding-right: 8px !important; }
  }
  .rw-btn:hover { background-color: #4a5060 !important; }
`;
}

/* ---------- sections ---------- */

function header(brand: EmailBrand): string {
  return `
        <tr>
          <td class="rw-px rw-logo-cell" style="padding:0 20px 16px 20px;">
            <a href="${escapeHtml(brand.homeUrl)}" style="text-decoration:none;">
              <img src="${escapeHtml(brand.logoUrl)}" width="180" height="60" alt="${escapeHtml(brand.name)}" style="display:block; width:180px; height:60px; border:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:16px; line-height:60px; font-weight:700; letter-spacing:0.2em; color:${INK};">
            </a>
          </td>
        </tr>`;
}

function hero(input: OrderEmailInput): string {
  const [summary, notice] = input.paragraphs;
  return `
              <tr>
                <td align="center" class="rw-px" style="padding:44px 32px 0 32px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                    <tr>
                      <td class="rw-check" width="56" height="56" align="center" valign="middle" bgcolor="${input.icon.background}" style="width:56px; height:56px; border-radius:9999px; background-color:${input.icon.background}; color:${input.icon.color}; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:24px; line-height:56px; font-weight:400;" aria-hidden="true">${input.icon.symbol}</td>
                    </tr>
                  </table>
                  ${para("rw-muted", `margin:24px 0 0 0; font-size:12px; line-height:16px; letter-spacing:0.18em; text-transform:uppercase; color:${MUTED};`, escapeHtml(input.eyebrow))}
                  <h1 class="rw-ink rw-h1" style="margin:12px 0 0 0; font-family:${FONT}; font-size:32px; line-height:36px; font-weight:300; letter-spacing:-0.02em; color:${INK};">${escapeHtml(input.heading)}</h1>
                  ${para("rw-ink2", `margin:16px 0 0 0; font-size:16px; line-height:25px; color:${INK2};`, escapeHtml(`${input.greeting} ${summary}`).replaceAll(input.orderNumber, input.orderNumber.replaceAll("-", NB_HYPHEN)))}
                  ${notice ? para("rw-ink", `margin:8px 0 0 0; font-size:16px; line-height:25px; color:${INK};`, escapeHtml(notice)) : ""}
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-top:24px; border-collapse:separate;">
                    <tr>
                      <td class="rw-ink rw-pill" style="border:1px solid ${PILL}; border-radius:9999px; padding:7px 16px; font-family:${FONT}; font-size:12px; line-height:14px; letter-spacing:0.18em; text-transform:uppercase; color:${INK};">Order ${escapeHtml(input.orderNumber.replaceAll("-", NB_HYPHEN))}</td>
                    </tr>
                  </table>
                </td>
              </tr>`;
}

function cta({ label, url }: EmailLink, note: string): string {
  const href = escapeHtml(url);
  return `
              <tr>
                <td align="center" class="rw-px" style="padding:32px 32px 0 32px;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px; v-text-anchor:middle; width:220px;" arcsize="50%" stroke="f" fillcolor="${BUTTON}">
                    <w:anchorlock/>
                    <center style="color:#ffffff; font-family:Arial,sans-serif; font-size:16px; font-weight:bold;">${escapeHtml(label)} &#8594;</center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <a href="${href}" class="rw-btn" style="display:inline-block; background-color:${BUTTON}; color:#ffffff; font-family:${FONT}; font-size:16px; line-height:48px; font-weight:500; letter-spacing:-0.01em; text-decoration:none; padding:0 28px; border-radius:9999px; mso-hide:all;">${escapeHtml(label)}&nbsp;&#8594;</a>
                  <!--<![endif]-->
                  ${para("rw-muted", `margin:16px 0 0 0; font-size:13px; line-height:19px; color:${MUTED};`, escapeHtml(note))}
                </td>
              </tr>`;
}

function detailsSection({ title, rows }: OrderEmailDetails): string {
  const body = rows
    .map(
      (row, index) => `
                    <tr>
                      <td valign="top" style="padding:12px 0; ${index > 0 ? `border-top:1px solid ${LINE};` : ""}">
                        ${para("rw-ink", `font-size:15px; line-height:20px; font-weight:500; color:${INK};`, escapeHtml(row.label))}
                        ${row.note ? para("rw-muted", `margin:2px 0 0 0; font-size:13px; line-height:18px; color:${MUTED};`, escapeHtml(row.note)) : ""}
                      </td>
                      <td class="rw-ink2" align="right" valign="top" style="padding:12px 0 12px 12px; ${index > 0 ? `border-top:1px solid ${LINE};` : ""} font-family:${FONT}; font-size:14px; line-height:20px; color:${INK2};">${escapeHtml(row.value)}</td>
                    </tr>`,
    )
    .join("");
  return `
              <tr>
                <td class="rw-px" style="padding:36px 32px 0 32px;">
                  ${para("rw-ink", `margin:0 0 12px 0; font-size:16px; line-height:20px; font-weight:500; letter-spacing:-0.01em; color:${INK};`, escapeHtml(title))}
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="rw-panel" bgcolor="${PANEL}" style="background-color:${PANEL}; border-radius:16px;">
                    <tr>
                      <td style="padding:8px 20px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${body}
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`;
}

function lineRow(line: OrderEmailLine, last: boolean): string {
  const border = last ? `border-top:1px solid ${LINE}; border-bottom:1px solid ${LINE};` : `border-top:1px solid ${LINE};`;
  const image = line.imageUrl
    ? `<img src="${escapeHtml(line.imageUrl)}" width="52" height="52" alt="${escapeHtml(line.imageAlt)}" style="display:block; width:52px; height:52px; border:0; font-family:Arial,sans-serif; font-size:10px; line-height:12px; color:${MUTED};">`
    : "";
  const breakdown =
    line.rows.length > 1
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">${line.rows
          .map(
            (row) => `
                          <tr>
                            <td class="rw-ink2" style="padding:1px 0; font-family:${FONT}; font-size:12px; line-height:17px; color:${INK2};">${escapeHtml(row.label)}</td>
                            <td class="rw-muted" align="right" style="padding:1px 0; font-family:${FONT}; font-size:12px; line-height:17px; color:${MUTED}; white-space:nowrap;">${escapeHtml(row.price)}</td>
                          </tr>`,
          )
          .join("")}</table>`
      : "";
  return `
                    <tr>
                      <td class="rw-line rw-thumb-cell" width="64" valign="top" style="width:64px; padding:16px 0; ${border}">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
                          <tr>
                            <td class="rw-line rw-thumb" width="64" height="64" align="center" valign="middle" bgcolor="${PLATE}" style="width:64px; height:64px; background-color:${PLATE}; background-image:linear-gradient(${PLATE},${PLATE}); border:1px solid ${LINE}; border-radius:16px;">${image}</td>
                          </tr>
                        </table>
                      </td>
                      <td class="rw-line rw-line-body" valign="top" style="padding:16px 0 16px 16px; ${border}">
                        ${para("rw-ink", `font-size:15px; line-height:20px; font-weight:500; color:${INK};`, escapeHtml(line.productName))}
                        ${line.detail ? para("rw-ink2", `margin:2px 0 0 0; font-size:13px; line-height:18px; color:${INK2};`, escapeHtml(line.detail)) : ""}
                        ${line.badges ? para("rw-muted", `margin:6px 0 0 0; font-size:11px; line-height:15px; letter-spacing:0.14em; text-transform:uppercase; color:${MUTED};`, escapeHtml(line.badges)) : ""}
                        ${breakdown}
                      </td>
                      <td class="rw-ink rw-line" align="right" valign="top" style="padding:16px 0 16px 12px; ${border} font-family:${FONT}; font-size:15px; line-height:20px; font-weight:500; color:${INK}; white-space:nowrap; font-variant-numeric:tabular-nums;">${escapeHtml(line.lineTotal)}</td>
                    </tr>`;
}

function label(value: string): string {
  return para("rw-muted", `margin:0 0 6px 0; font-size:11px; line-height:15px; letter-spacing:0.18em; text-transform:uppercase; color:${MUTED};`, escapeHtml(value));
}

function detailBlock(title: string, body: string, padding: string, cls = ""): string {
  return `
                        <tr>
                          <td${cls ? ` class="${cls}"` : ""} style="${padding}">
                            ${label(title)}
                            ${body}
                          </td>
                        </tr>`;
}

function summarySection(summary: OrderEmailSummary): string {
  const rows = summary.lines.map((line, index) => lineRow(line, index === summary.lines.length - 1)).join("");
  const ink = (value: string) => para("rw-ink", `font-size:14px; line-height:21px; color:${INK};`, escapeHtml(value));
  const ink2 = (html: string) => para("rw-ink2", `font-size:14px; line-height:21px; color:${INK2};`, html);
  const tracking = summary.trackingNumber
    ? para("rw-ink2", `margin:6px 0 0 0; font-size:14px; line-height:21px; color:${INK2};`, `Tracking number <span class="rw-ink" style="color:${INK}; font-weight:500;">${escapeHtml(summary.trackingNumber)}</span>`)
    : "";
  const totals = summary.rows
    .map(
      (row) => `
                          <tr>
                            <td class="rw-ink2" style="padding:3px 0; font-family:${FONT}; font-size:14px; line-height:20px; color:${INK2};">${escapeHtml(row.label)}</td>
                            <td class="${row.accent ? "rw-accent-text" : "rw-ink"}" align="right" style="padding:3px 0; font-family:${FONT}; font-size:14px; line-height:20px; color:${row.accent ? BUTTON : INK}; white-space:nowrap; font-variant-numeric:tabular-nums;">${escapeHtml(row.value)}</td>
                          </tr>`,
    )
    .join("");

  return `
              <tr>
                <td class="rw-px" style="padding:40px 32px 0 32px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td class="rw-ink rw-stack-head" valign="bottom" style="font-family:${FONT}; font-size:16px; line-height:20px; font-weight:500; letter-spacing:-0.01em; color:${INK};">What&rsquo;s in the box</td>
                      <td class="rw-muted rw-stack" align="right" valign="bottom" style="padding-left:12px; font-family:${FONT}; font-size:11px; line-height:16px; letter-spacing:0.16em; text-transform:uppercase; color:${MUTED};">Placed ${escapeHtml(summary.placedAt)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td class="rw-px" style="padding:16px 32px 0 32px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}
                  </table>
                </td>
              </tr>
              <tr>
                <td class="rw-px" style="padding:32px 32px 0 32px;">
                  ${para("rw-ink", `margin:0 0 20px 0; font-size:16px; line-height:20px; font-weight:500; letter-spacing:-0.01em; color:${INK};`, "Order details")}
                  <div style="font-size:0; line-height:0;">
                    <!--[if mso]><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="50%" valign="top"><![endif]-->
                    <div class="rw-col" style="display:inline-block; width:100%; max-width:267px; vertical-align:top;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailBlock("Deliver to", ink2(lines(summary.deliverTo)), "padding:0 16px 20px 0;")}${detailBlock("Contact", ink2(lines(summary.contact)), "padding:0 16px 0 0;")}
                      </table>
                    </div>
                    <!--[if mso]></td><td width="50%" valign="top"><![endif]-->
                    <div class="rw-col" style="display:inline-block; width:100%; max-width:267px; vertical-align:top;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailBlock("Delivery method", ink(summary.deliveryMethod) + ink2(escapeHtml(summary.deliveryEta)) + tracking, "padding:0 0 20px 0;", "rw-col-gap")}${detailBlock(
                        "Payment",
                        ink(summary.payment) +
                          `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px; border-collapse:separate;"><tr><td class="rw-muted rw-pill" style="border:1px solid ${PILL}; border-radius:9999px; padding:4px 10px; font-family:${FONT}; font-size:10px; line-height:12px; letter-spacing:0.18em; text-transform:uppercase; color:${MUTED}; white-space:nowrap;"><span aria-hidden="true">&#9679;&nbsp;</span>${escapeHtml(summary.paymentStatus)}</td></tr></table>`,
                        "padding:0;",
                      )}
                      </table>
                    </div>
                    <!--[if mso]></td></tr></table><![endif]-->
                  </div>
                </td>
              </tr>
              <tr>
                <td class="rw-px" style="padding:28px 32px 0 32px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="rw-panel" bgcolor="${PANEL}" style="background-color:${PANEL}; border-radius:16px;">
                    <tr>
                      <td style="padding:20px 20px 18px 20px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${totals}
                          <tr>
                            <td class="rw-ink rw-line" valign="bottom" style="padding:14px 0 0 0; border-top:1px solid ${LINE}; font-family:${FONT}; font-size:15px; line-height:20px; font-weight:500; color:${INK};">Total</td>
                            <td class="rw-ink rw-line" align="right" valign="bottom" style="padding:14px 0 0 0; border-top:1px solid ${LINE}; font-family:${FONT}; font-size:20px; line-height:24px; font-weight:500; color:${INK}; white-space:nowrap; font-variant-numeric:tabular-nums;">${escapeHtml(summary.total)}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`;
}

function help(contact: ContactDetails): string {
  const rows: string[] = [];
  if (contact.email) {
    rows.push(
      para("rw-ink2", `margin:6px 0 0 0; font-size:14px; line-height:21px; color:${INK2};`, `Email <a href="${escapeHtml(mailtoHref(contact.email))}" class="rw-link" style="color:${INK}; text-decoration:underline;">${escapeHtml(contact.email)}</a> and quote your order number.`),
    );
  }
  const phones: string[] = [];
  if (contact.phone) phones.push(`Phone <a href="${escapeHtml(telHref(contact.phone))}" class="rw-link" style="color:${INK}; text-decoration:underline;">${escapeHtml(formatPhoneDisplay(contact.phone))}</a>`);
  if (contact.whatsapp) phones.push(`WhatsApp <a href="${escapeHtml(whatsappHref(contact.whatsapp))}" class="rw-link" style="color:${INK}; text-decoration:underline;">${escapeHtml(formatPhoneDisplay(contact.whatsapp))}</a>`);
  if (phones.length > 0) rows.push(para("rw-ink2", `margin:4px 0 0 0; font-size:14px; line-height:21px; color:${INK2};`, phones.join(" &middot; ")));
  const hours = hoursLines(contact.hours);
  if (hours.length > 0) rows.push(para("rw-muted", `margin:4px 0 0 0; font-size:13px; line-height:19px; color:${MUTED};`, lines(hours)));
  if (rows.length === 0) return "";

  return `
              <tr>
                <td class="rw-px" style="padding:32px 32px 0 32px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td class="rw-line" style="padding:24px 0 0 0; border-top:1px solid ${LINE};">
                        ${para("rw-ink", `font-size:15px; line-height:20px; font-weight:500; color:${INK};`, "Need help?")}
                        ${rows.join("\n                        ")}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>`;
}

function fallback({ url }: EmailLink): string {
  const href = escapeHtml(url);
  return `
              <tr>
                <td class="rw-px" style="padding:20px 32px 36px 32px;">
                  ${para("rw-muted", `font-size:12px; line-height:18px; color:${MUTED};`, `If the button doesn't open, paste this address into your browser:<br><a href="${href}" class="rw-link" style="color:${INK2}; text-decoration:underline; word-break:break-all;">${href}</a>`)}
                </td>
              </tr>`;
}

function footer(input: OrderEmailInput): string {
  const { brand, legal, policyLinks } = input;
  const links = policyLinks
    .map((link) => `<a href="${escapeHtml(link.url)}" class="rw-link" style="color:${INK2}; text-decoration:underline;">${escapeHtml(link.label)}</a>`)
    .join("&nbsp;&nbsp;&middot;&nbsp;&nbsp;");
  const legalLines = [legal.name || brand.name, legal.address, legal.trn ? `VAT: ${legal.trn}` : ""].filter(Boolean);
  return `
        <tr>
          <td class="rw-px" style="padding:36px 32px 0 32px;">
            <p class="rw-ink" style="margin:0; font-family:${FONT}; font-size:16px; line-height:16px; font-weight:500; letter-spacing:0.32em; color:${INK};">REWIRE<span class="rw-accent-text" style="color:${BUTTON};">.</span></p>
            ${para("rw-muted", `margin:10px 0 0 0; font-size:13px; line-height:19px; color:${MUTED};`, escapeHtml(brand.tagline))}
          </td>
        </tr>
        <tr>
          <td class="rw-px" style="padding:20px 32px 0 32px;">
            ${para("rw-ink2", `font-size:13px; line-height:22px; color:${INK2};`, links)}
          </td>
        </tr>
        <tr>
          <td class="rw-px" style="padding:20px 32px 0 32px;">
            ${para("rw-muted", `font-size:12px; line-height:18px; color:${MUTED};`, lines(legalLines))}
          </td>
        </tr>
        <tr>
          <td class="rw-px" style="padding:16px 32px 8px 32px;">
            ${para("rw-muted", `font-size:12px; line-height:18px; color:${MUTED};`, escapeHtml(brand.reason))}
            ${para("rw-muted", `margin:12px 0 0 0; font-size:11px; line-height:16px; letter-spacing:0.05em; color:${MUTED};`, `&copy; ${brand.year} ${escapeHtml(brand.name)}. All rights reserved.`)}
          </td>
        </tr>`;
}

/* ---------- the email ---------- */

function plainText(input: OrderEmailInput): string {
  const { summary } = input;
  const itemLines = summary.lines.flatMap((line) => [
    `${line.productName}${line.detail ? ` (${line.detail})` : ""}${line.badges ? `, ${line.badges}` : ""}: ${line.lineTotal}`,
    ...(line.rows.length > 1 ? line.rows.map((row) => `   ${row.label}: ${row.price}`) : []),
  ]);
  return [
    input.eyebrow,
    input.heading,
    "",
    `${input.greeting} ${input.paragraphs.join(" ")}`,
    "",
    `${input.cta.label}: ${input.cta.url}`,
    input.ctaNote,
    "",
    ...(input.details ? [input.details.title, ...input.details.rows.map((row) => `${row.label}: ${row.value}${row.note ? ` (${row.note})` : ""}`), ""] : []),
    `What's in the box (placed ${summary.placedAt})`,
    ...itemLines,
    "",
    ...summary.rows.map((row) => `${row.label}: ${row.value}`),
    `Total: ${summary.total}`,
    "",
    `Deliver to: ${summary.deliverTo.join(", ")}`,
    `Contact: ${summary.contact.join(", ")}`,
    `Delivery: ${summary.deliveryMethod}, ${summary.deliveryEta}`,
    ...(summary.trackingNumber ? [`Tracking number: ${summary.trackingNumber}`] : []),
    `Payment: ${summary.payment} (${summary.paymentStatus})`,
    "",
    input.brand.name,
  ].join("\n");
}

/** Branded order email: card with hero, button, items, details and totals, help and footer. */
export function renderOrderEmail(input: OrderEmailInput): EmailContent {
  const { brand } = input;
  const title = escapeHtml(input.subject);
  const html = `<!DOCTYPE html>
<html lang="en" dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${title}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>
  table, td, th, div, p, a, span, h1, h2 { font-family: Arial, Helvetica, sans-serif !important; }
  td { mso-line-height-rule: exactly; }
</style>
<![endif]-->
<style>${styles(brand.fontUrl)}
</style>
</head>
<body id="body" class="rw-canvas" style="margin:0; padding:0; background-color:${CANVAS};">
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${CANVAS}; opacity:0;">${escapeHtml(input.preheader)}${"&#847;&zwnj;&nbsp;".repeat(12)}</div>
<div role="article" aria-roledescription="email" aria-label="${title}" lang="en" dir="ltr" style="font-size:16px; font-family:${FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="rw-canvas" bgcolor="${CANVAS}" style="background-color:${CANVAS};">
  <tr>
    <td align="center" class="rw-shell" style="padding:40px 12px;">
      <!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; margin:0 auto; border-collapse:separate;">
${header(brand)}
        <tr>
          <td class="rw-card" bgcolor="${CARD}" style="background-color:${CARD}; border:1px solid ${LINE}; border-radius:24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${hero(input)}
${cta(input.cta, input.ctaNote)}
${input.details ? detailsSection(input.details) : ""}
${summarySection(input.summary)}
${help(input.contact)}
${fallback(input.cta)}
            </table>
          </td>
        </tr>
${footer(input)}
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</div>
</body>
</html>`;
  return { subject: input.subject, html, text: plainText(input), branded: true };
}
