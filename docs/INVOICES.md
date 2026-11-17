# Tax Invoices

How Rewire produces the downloadable tax invoice PDF for an order. The
layout follows the Wishmaster invoice format, rebuilt for this Node stack.

---

## 1. What changed and why

Before this change the account order page had a "Download / view invoice"
button that only printed the web page. Rewire had no real invoice, no
sequential invoice numbers and nowhere to store its TRN.

Now:

1. Customers download a PDF tax invoice from their order page, and staff
   download the same PDF from the admin order screen.
2. Each invoice gets a sequential number (`INV-2026-000001`) the first time
   it is downloaded. The number never changes after that.
3. The seller details and the Terms & Conditions are edited by an admin on
   Governance, VAT & Configuration, under **Contact & invoice details**
   (the section was called Invoice details until issue #155).

The Wishmaster kit used Python and WeasyPrint, which this app cannot run.
The same layout is drawn with `@react-pdf/renderer` (pure JavaScript, no
headless browser), so rendering stays light on the small server: about a
second in development, less in production.

---

## 2. Code map

| Area | File |
|---|---|
| Arithmetic (pure, tested) | `src/lib/invoice.ts`: `splitInclusive`, `computeInvoice`, `formatInvoiceNumber`, `isInvoiceable`, `formatInvoiceMoney` |
| Tests | `src/lib/invoice.test.ts` |
| PDF layout | `src/components/invoice/invoice-document.tsx`: `InvoiceDocument` (server only) |
| Service | `src/services/invoice.service.ts`: `renderAccountInvoice`, `renderAdminInvoice` |
| Settings service | `src/services/store-settings.service.ts`: `getInvoiceSettings`, `updateInvoiceSettings`, `nextInvoiceSequence` |
| PDF response helper | `src/lib/api/invoice-response.ts`: `invoiceResponse` |
| Routes | `src/app/api/v1/account/orders/[number]/invoice/route.ts`, `src/app/api/v1/admin/orders/[number]/invoice/route.ts`, `src/app/api/v1/admin/invoice-settings/route.ts` |
| Validator | `src/validators/invoice.validator.ts`: `invoiceSettingsSchema` |
| Types | `src/types/invoice.ts`: `InvoiceSettingsView`, `InvoiceSettingsInput` |
| Hooks | `src/hooks/use-vat-settings.ts`: `useGetInvoiceSettings`, `useUpdateInvoiceSettings` |
| Admin form | `src/components/admin/vat/invoice-details-section.tsx` |
| Buttons | `InvoiceDownloadButton` in `src/components/order/invoice-download-button.tsx`, used by `account-order-detail.tsx` and `admin/orders/order-detail.tsx` |
| Download | `downloadFile` in `src/lib/api/download-client.ts`; `useDownloadInvoice` in `src/hooks/use-order.ts` |
| Constants | `INVOICE_*` in `src/lib/constants.ts`; `formatInvoiceDate` in `src/lib/dates.ts` |
| Logo | `brandLogo.onLight` in `src/lib/site.ts`: a PNG of the logo with black ink, because the PDF draws images, not the site's inline `LogoMark` |

**New dependency:** `@react-pdf/renderer` 4.9.0.

---

## 3. When an order has an invoice

`isInvoiceable(status)`: every status except `PENDING_PAYMENT` (card or
Apple Pay not paid yet) and `CANCELLED`. So a cash on delivery order has an
invoice as soon as it is placed; its Payment Status reads **Unpaid** until
staff mark it paid.

The download buttons only show for these orders. While the PDF is made the
button reads "Preparing invoice…"; if the download fails, the error message
shows under the button and no file is saved. The API answers 409
`CONFLICT` ("The invoice is available once the order is confirmed.") for any
other.

### Numbering

The number is `INV-<year>-<sequence>`, for example `INV-2026-000001`. The
year is the issue year on the store clock (Asia/Dubai); the sequence is one
store wide counter, padded to six digits, that does not reset each year.

The number is assigned the first time anyone (customer or staff) downloads
the invoice, and stored on the order with the issue date. Later downloads
reuse it.

`StoreSettings.lastInvoiceSequence` is the counter. Raising it locks the
settings row until the transaction ends, so two downloads at the same moment
queue: the second sees the number the first committed and rolls back its own
raise. No number is ever skipped or used twice, which is what UAE tax
invoices need.

---

## 4. Calculation

Money is in fils (`Int`), like the rest of the app. The rules match the
Wishmaster spec:

1. Prices are VAT inclusive. Each unit is split once, rounding half up:
   `excl = round(incl × 100 / (100 + rate))`, `vat = incl − excl`.
2. A row's figures are the unit figures times the quantity.
3. Delivery and the coupon discount are split the same way. The discount
   row is negative.
4. The VAT summary adds up the rounded rows, so the printed figures always
   add up: `excl + VAT = Total Payable`.

The rate is the order's own `vatRatePercent`, so a later change to the VAT
setting never changes an old invoice.

Rows come from the stored order, never from the live catalogue:

| Row | Source |
|---|---|
| Product | Brand, product name, then storage, colour, condition and grade; SKU under it |
| Add on | One row per add on, `<name> (add-on)`, same quantity as its product |
| Delivery | `Shipping Charges` and `deliveryFee`, on a tinted row; hidden when free |
| Discount | `Discount (<code>)` and `discount`; hidden when zero |

The template's sample invoice is a test case: `src/lib/invoice.test.ts`
checks it to the fil (AED 1,208.55 + VAT 60.45 = AED 1,269.00).

---

## 5. Layout

Matches the Wishmaster sample invoice (November 2026), top to bottom:

1. The black ink Rewire logo, the customer name in bold capitals and the
   delivery address in capitals, and a "For questions about your order"
   link to `/support`. On the right, the title box in the Rewire slate
   (`#3b404b`, the `--color-accent` token): Tax Invoice, Issue Date,
   Invoice No, Total Payable.
2. Three columns: **Billing Address**, **Delivery Address** and **Sold by**.
   Rewire stores one address per order, so Billing and Delivery show the
   same address. Sold by is the legal name, address, `VAT: <TRN>`, email and
   website, each from the Contact & invoice details settings and hidden when empty.
3. **Order Information**: order date, order number, delivered on (when
   delivered), payment method and payment status.
4. **Invoice Detail** table: the items, then a `Shipping Charges` row when
   delivery was charged and a negative `Discount (<code>)` row when a coupon
   applied. Rows never split across pages; the header row repeats on each
   page.
5. **Total Payable** and the **VAT Summary** (rate, subtotal excluding VAT,
   VAT, and a Total line) in a box on the right. When an admin has set
   Terms & Conditions they sit to its left. This block stays together, so
   on a long invoice it moves to the next page rather than splitting.
6. A footer on every page: seller name and address on the left, `VAT:
   <TRN>` and `email | website` on the right, and "Computer-generated tax
   invoice - No signature required" (`INVOICE_FOOTER_NOTE`).

What changed from the first version (issue #122 follow up): the Billing
column was added, Payment moved from its own box into Order Information,
the delivery row reads `Shipping Charges`, the TRN line reads `VAT:`, the
country line was dropped from the address, and the title box uses the brand
slate instead of near black. Bank details are left out on purpose.

---

## 6. API

All three need a session.

### `GET /api/v1/account/orders/[number]/invoice`

The signed in customer's invoice. Another customer's order answers 404.
Success is the PDF itself, not the JSON envelope:

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="Rewire-INV-2026-000001.pdf"
Cache-Control: private, no-store
```

Errors use the normal envelope: 401, 404, or 409 when the order has no
invoice yet.

### `GET /api/v1/admin/orders/[number]/invoice`

Any order's invoice. Needs View on Orders (`PERMISSIONS.orders`). Same
response as above.

### `GET` and `PUT /api/v1/admin/invoice-settings`

The seller block. View or Edit on VAT & Configuration (`PERMISSIONS.vat`).
Every save is recorded in the change log as "Contact & invoice details".
The same settings also hold the store's phone, WhatsApp number and support
hours, which the storefront and emails show. See [VAT.md](VAT.md). The invoice
keeps reading only the legal name, TRN, address, support email and terms.

```json
{
  "sellerName": "Rewire Electronics Trading LLC",
  "sellerTrn": "100123456700003",
  "sellerAddress": "Office 12, Business Bay, Dubai, UAE",
  "sellerEmail": "support@rewire-electronics.com",
  "phone": "+971501234567",
  "whatsapp": "+971501234567",
  "supportHours": "Sunday to Thursday, 9:00 to 18:00 Gulf time",
  "terms": "Devices can be returned within 30 days of delivery.\nPrices include 5% VAT."
}
```

Rules: legal name required; TRN empty or exactly 15 digits; email empty or
valid; phone and WhatsApp empty or a valid UAE or Saudi number; support hours
up to `CONTACT_HOURS_MAX_LENGTH` (300) characters; each other field up to 200
characters; terms up to 2000 characters, one
point per line. `GET` also returns `updatedAt`.

Until a legal name is saved, invoices show the site name (`Rewire
Electronics`). An empty TRN, address, email or terms hides that line or
section. Changes apply to the next download, including invoices already
issued; the number and amounts never change.

---

## 7. Database change

Migration `20261104120000_add_invoices`, additive only:

| Table | Column | Type |
|---|---|---|
| `store_settings` | `invoiceSellerName`, `invoiceSellerTrn`, `invoiceSellerAddress`, `invoiceSellerEmail`, `invoiceTerms` | `TEXT NOT NULL DEFAULT ''` |
| `store_settings` | `lastInvoiceSequence` | `INTEGER NOT NULL DEFAULT 0` |
| `orders` | `invoiceNumber` | `TEXT`, unique |
| `orders` | `invoiceIssuedAt` | `TIMESTAMP(3)` |

It was first written on the old `feat/#122` branch and is already applied to
the staging database; `prisma migrate status` reports it up to date. **Apply
it with `npm run db:deploy` before running this code against any other
database.** The Prisma client expects these columns, so order screens and
checkout fail on a database that does not have them yet.

---

## 8. Not covered

1. Credit notes and refunds. A refund changes the Payment Status, but no
   refunded amount is printed and no separate credit note is issued.
2. Emailing the invoice. The PDF is only downloaded; attaching it to the
   order email would reuse `renderInvoice`.
3. Guests. Track Order does not offer the invoice.
4. More than one VAT rate per order (the app has one rate).
5. An Arabic version.
