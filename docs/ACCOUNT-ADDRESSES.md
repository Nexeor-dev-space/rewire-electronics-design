# Account Saved Addresses

How a signed in customer sees and edits their own delivery addresses on
`/account/addresses`.

---

## 1. What changed

The Saved addresses page used to show two made up addresses ("Alex
Mercer", Dubai Marina) from `src/lib/account-data.ts`, kept in the
browser's localStorage. Every visitor saw the same fake data and nothing
reached the database.

The page now reads and saves the customer's own rows in the `Address`
table through a new account API. The mock store and its seed are gone.

| Area | File |
|---|---|
| API route | `src/app/api/v1/account/addresses/route.ts` |
| Service | `listOwnAddresses`, `replaceOwnAddresses` in `src/services/user.service.ts` |
| Validator | `addressListSchema`, `accountAddressesSchema` in `src/validators/user.validator.ts` |
| Endpoint path | `API_ENDPOINTS.account.addresses` in `src/lib/api/api-endpoints.ts` |
| Hooks | `useGetOwnAddresses`, `useSaveOwnAddresses` in `src/hooks/use-user.ts` |
| Type | `AddressInput` in `src/types/user.ts` (the stored shape is `UserAddress`) |
| Page | `src/components/account/account-addresses.tsx` |

**Removed:** `src/lib/account-data.ts` and the old `Address` interface in
`src/types/commerce.ts`. Nothing else used them.

**Database:** no change. The `Address` model in
`prisma/schema/user.prisma` already existed (emirate, street, landmark,
primary flag), and the console's Users screen already edits it.

**Environment:** no change.

---

## 2. The API

Both methods need a session (`authorizeApi()`); without one they answer
401 `UNAUTHENTICATED`. The session's user id is the only owner used, so a
customer can never read or change another account's addresses.

### `GET /api/v1/account/addresses`

Returns the signed in user's addresses, oldest first.

```json
{
  "success": true,
  "data": [
    { "id": "cm…", "emirate": "DUBAI", "street": "Marina Gate 2", "landmark": "Marina Mall", "isPrimary": true }
  ]
}
```

The list is not paginated: `addressListSchema` caps it at 10 addresses,
so it is always small.

### `PUT /api/v1/account/addresses`

Replaces the whole list and returns the saved list in the same shape as
`GET`.

```json
{
  "addresses": [
    { "id": "cm…", "emirate": "DUBAI", "street": "Marina Gate 2", "landmark": "Marina Mall", "isPrimary": false },
    { "emirate": "SHARJAH", "street": "Al Majaz 3", "landmark": "Al Noor Mosque", "isPrimary": true }
  ]
}
```

Rules, all shared with the console's Users screen:

1. An address with `id` is updated; one without `id` is created; any
   stored address missing from the list is deleted.
2. At most 10 addresses, and at most one marked primary (422 otherwise).
3. Exactly one primary is stored whenever the list is not empty. If none
   is marked, the first address becomes primary.
4. `emirate` is one of the seven `Emirate` values; `street` and
   `landmark` are required, up to 200 characters.
5. An `id` that does not belong to this user answers 409 `CONFLICT`.

The write reuses `saveAddresses` in `user.service.ts`, the same function
the console uses, inside one transaction.

---

## 3. The page

`AccountAddresses` reuses the console's `AddressListEditor`
(`src/components/admin/users/address-list-editor.tsx`), so the form,
validation messages and the one primary rule look and behave the same on
both sides.

1. **Loading:** two skeleton cards.
2. **Error:** the server's message with a Try again button.
3. **Empty:** "No saved addresses." with an Add address button.
4. **Data:** one card per address with Edit, Remove and a primary radio.

Every change (add, edit, remove, set primary) saves the full list at once
through `useSaveOwnAddresses`. The edited list shows while the save runs;
if the save fails, the stored list comes back and the error shows under
the list. On success the hook writes the saved list into the query cache,
so no second request is made.

---

## 4. Not done yet

Checkout does not offer saved addresses yet; the delivery form is still
typed in each time ([ORDERS.md](ORDERS.md), "No saved address prefill").
