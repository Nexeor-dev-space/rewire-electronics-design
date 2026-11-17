# VAT Rate and Configuration

How the VAT rate is stored, edited and applied. Issue #99.

## 1. What changed and why

The VAT rate used to be the constant `VAT_RATE_PERCENT` (5), read directly by
`priceCart`. It is now a saved setting that an authorised admin edits in
Governance, VAT & Configuration (`/admin/settings/vat`), so a rate change needs
no code change or redeploy.

## 2. Where the rate lives

| Item | Detail |
| --- | --- |
| Table | `StoreSettings` (singleton, id 1), column `vatRatePercent Int @default(5)` |
| Default | `VAT_RATE_PERCENT` (5) in `src/lib/constants.ts`, used when no row exists |
| Bounds | A whole number from 0 to `VAT_RATE_MAX_PERCENT` (100) |
| Env vars | None. The value is a business setting, so it lives in the database |

## 3. Code map

| File | Role |
| --- | --- |
| `src/validators/vat.validator.ts` | `vatSettingsSchema`, shared by the form and the API |
| `src/services/store-settings.service.ts` | `getStoreSettings` (now includes `vatRatePercent`), `getVatRatePercent`, `updateVatSettings` |
| `src/app/api/v1/admin/vat-settings/route.ts` | `GET` and `PUT` |
| `src/lib/api/api-endpoints.ts` | `API_ENDPOINTS.admin.vatSettings` |
| `src/hooks/use-vat-settings.ts` | `useGetVatSettings`, `useUpdateVatSettings` |
| `src/components/admin/vat/vat-configuration.tsx` | The screen, in sections, VAT rate first |
| `src/app/admin/settings/vat/page.tsx` | The page and its permission gate |
| `src/lib/pricing/price-cart.ts` | `priceCart` takes `vatRatePercent` as input |
| `src/services/cart.service.ts` | Reads the rate and passes it to `priceCart` |

## 4. API

`GET /api/v1/admin/vat-settings` needs View on `PERMISSIONS.vat`. It returns
`{ returnWindowDays, vatRatePercent, updatedAt }`.

`PUT /api/v1/admin/vat-settings` needs Edit. Body: `{ "vatRatePercent": 5 }`.
An invalid value answers 422 `VALIDATION` with field errors. A save is written
to the Change Log with the before and after rate.

## 5. How the rate is applied

1. `loadPricedCart` reads the rate with the same database client as the cart
   load. At checkout that is the checkout transaction, so the rate stored on
   the order always matches the total the customer paid.
2. `getCart` and `applyCartCoupon` read the rate the same way.
3. The order stores `vatIncluded` and `vatRatePercent` at placement. Every
   order screen, the account order screens and the emails read that stored
   snapshot, never the live setting. Changing the rate does not alter any
   placed order.
4. Prices are VAT inclusive. A new rate changes the VAT portion recorded in a
   total, not the amount the customer pays.
5. Net amount is `total − vatIncluded`. It is derived, not stored.

## 6. Permission

`PERMISSIONS.vat` (`governance.vat`) offers View and Edit and can be granted to
a Staff role. See [PERMISSIONS.md](PERMISSIONS.md).

## Contact & invoice details

Issue #155. The same screen has a **Contact & invoice details** section. It
used to be called Invoice details. It is now the single place for the store's
contact information, and the seller block printed on every tax invoice. It
uses the same permission as the VAT rate, with no new role.

| Field | Where it shows |
| --- | --- |
| Legal name | Tax invoice (Sold by, footer) |
| TRN | Tax invoice |
| Address | Tax invoice |
| Support email | Header support menu, Support page, footer, product page trust block, policy pages (draft note), account order screen, Track Order, every email footer, tax invoice |
| Phone number | Header support menu, Support page, footer, product page trust block, account order screen, Track Order, email footers. A tap to call link on mobile |
| WhatsApp number | Live Chat in the header support menu and on the Support page, plus the footer, product page, order screens and email footers. Opens a WhatsApp chat with a short prefilled greeting |
| Support hours | Header support menu, Support page, footer, product page trust block, order screens. Free text in Gulf time, one line per row |
| Terms & Conditions | Tax invoice |

Rules:

1. Email is empty or a valid address. Phone and WhatsApp are empty or follow the
   shared phone rules in [PHONE-NUMBERS.md](PHONE-NUMBERS.md) (UAE +971 and
   Saudi +966), and are saved as `+971501234567`.
2. A field left empty is not shown. Nothing falls back to a value in code. With
   everything empty there is no contact anywhere, and Live Chat is not shown.
3. Live Chat is a link to `https://wa.me/<number>?text=<greeting>`, not a chat
   widget. The base address and greeting are `WHATSAPP_CHAT_BASE_URL` and
   `WHATSAPP_GREETING` in `src/lib/constants.ts`.
4. Phone numbers always show as `+971 50 123 4567`
   (`formatPhoneDisplay` in `src/lib/contact.ts`).
5. The storefront layout is ``force-dynamic``, so a saved change shows on the next
   page load with no deploy.
6. Each save is written to the Change Log as "Contact & invoice details" with
   the before and after values, who changed it and when.

Code map:

| File | Role |
| --- | --- |
| `src/validators/invoice.validator.ts` | `invoiceSettingsSchema` with `phone`, `whatsapp`, `supportHours` |
| `src/services/store-settings.service.ts` | `getContactDetails` (customer safe view, cached per request), `getInvoiceSettings`, `updateInvoiceSettings` |
| `src/types/contact.ts` | `ContactDetails` |
| `src/lib/contact.ts` | `formatPhoneDisplay`, `telHref`, `mailtoHref`, `whatsappHref`, `hoursLines`, `hasContact`, `NO_CONTACT` |
| `src/components/providers/contact-provider.tsx` | `ContactProvider` and `useContact` for client components. Mounted in `src/app/(site)/layout.tsx` |
| `src/components/contact/contact-links.tsx` | `ContactLinks`, the shared list of email, phone, Live Chat and hours |
| `src/components/contact/order-help.tsx` | `OrderHelp`, shown on the account order screen and Track Order through `OrderDetailBody` |
| `src/lib/support.ts` | `getSupportChannels(contact)` builds the Support page cards from the saved details |
| `src/lib/email/templates.ts` | `withContactFooter`, applied to every email by `sendEmail` |
| `src/components/admin/vat/invoice-details-section.tsx` | The admin form |

The tax invoice still reads the legal name, TRN, address and support email from
the same settings. See [INVOICES.md](INVOICES.md).

Go live: fill this section before the first customer. See the go live checklist
in [DEPLOYMENT.md](DEPLOYMENT.md).

## 7. Database change

One column on `StoreSettings`: `vatRatePercent Int @default(5)`. The migration
is `20261030140000_add_vat_rate_percent`. Existing rows take the default 5.
Apply it with `npm run db:deploy`. Do not run `prisma db pull` against a database
that has not had it applied, because the pull removes the column from the schema.

## 7a. Database change for contact details

The phone number, WhatsApp number and support hours are three columns on
`StoreSettings` in `prisma/schema/settings.prisma`, all `String @default("")`:

| Column | Holds |
| --- | --- |
| `contactPhone` | Phone number in stored form |
| `contactWhatsapp` | WhatsApp number in stored form |
| `contactSupportHours` | Support hours, free text |

The migration is `20261113071918_add_contact_details`, additive only. Existing
rows take the empty default, so nothing shows until staff fill the fields.
Apply it with `npm run db:deploy` before running this code against any other
database. The Prisma client expects these columns, so any read of the settings
row fails on a database that does not have them yet.

## 8. Not covered

1. Decimal rates. `Order.vatRatePercent` is an `Int`, so rates are whole
   percentages.
2. Social media links and a chat widget. Live Chat only opens WhatsApp.
3. Per language or per page contact details.

## 9. Tests

`src/lib/pricing/price-cart.test.ts` covers pricing with a given rate, a 0%
rate and bad rates. `src/validators/vat.validator.test.ts` covers the bounds.
`src/lib/contact.test.ts` covers phone display, the call and WhatsApp links,
the hours rows, the email footer and the contact field validation.
