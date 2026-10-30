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

## 7. Database change

One column on `StoreSettings`: `vatRatePercent Int @default(5)`. The schema file
is updated. The migration is not generated yet and needs approval. Existing rows
take the default 5.

## 8. Not covered

1. Invoices and the TRN. No invoice feature exists yet.
2. Decimal rates. `Order.vatRatePercent` is an `Int`, so rates are whole
   percentages.

## 9. Tests

`src/lib/pricing/price-cart.test.ts` covers pricing with a given rate, a 0%
rate and bad rates. `src/validators/vat.validator.test.ts` covers the bounds.
