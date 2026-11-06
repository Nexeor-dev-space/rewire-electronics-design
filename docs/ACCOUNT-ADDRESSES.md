# Account Saved Addresses

How the storefront account screen `/account/addresses` reads and saves the
signed in shopper's own addresses.

Read this before changing `AccountAddresses`, `use-address.ts` or the
`account/addresses` route.

---

## 1. What changed and why

The screen used to read a hardcoded pair of sample addresses from
`src/lib/account-data.ts` and save edits to `localStorage`. Every shopper saw
the same two addresses, and nothing reached the database (issue #122).

It now reads and writes the existing `Address` table through a session
checked API. `src/lib/account-data.ts` and the unused `Address` type in
`src/types/commerce.ts` were removed.

No database change: the `Address` model (emirate, street, landmark,
isPrimary) already existed and is the same one the console's Users modal
edits.

## 2. API

| Method and path | Auth | Body | Returns |
| --- | --- | --- | --- |
| `GET /api/v1/account/addresses` | session | none | `UserAddress[]`, oldest first |
| `PUT /api/v1/account/addresses` | session | `{ addresses: AddressInput[] }` | the saved `UserAddress[]` |

`PUT` replaces the whole list, the same contract the console uses:

* an address with an `id` is updated, one without is created;
* an address left out of the list is deleted;
* exactly one address ends up primary: the one marked, or the first.

Errors: 401 without a session, 422 for an invalid body (missing street or
landmark, unknown emirate, more than 10 addresses, two primaries), 409 when an
`id` does not belong to the signed in user.

Ownership: every query filters by the session's user id, so one shopper's
addresses are never read or changed by another.

The list is bounded by `addressListSchema` (10 addresses), so it is not
paginated.

## 3. Code

| File | What |
| --- | --- |
| `src/validators/user.validator.ts` | `addressListSchema` (shared with the console's `userSchema`) and `myAddressesSchema` |
| `src/services/user.service.ts` | `listMyAddresses(userId)`, `saveMyAddresses(userId, list)`; both reuse the private `saveAddresses` |
| `src/app/api/v1/account/addresses/route.ts` | `GET` and `PUT` |
| `src/lib/api/api-endpoints.ts` | `API_ENDPOINTS.account.addresses` |
| `src/hooks/use-address.ts` | `useGetMyAddresses()`, `useSaveMyAddresses()` |
| `src/types/user.ts` | `MyAddressesInput` |
| `src/components/account/account-addresses.tsx` | The screen |

## 4. Screen behaviour

* Loading shows the empty account shell; an error shows the message and a
  Try again button.
* No addresses: an empty state with an Add an address button that opens the
  form.
* Each card shows the account's full name and phone (from `useGetMe`), the
  street, the landmark and the emirate.
* Add, edit, delete and set as default each send the full list; buttons are
  disabled while a save is in flight and a failed save shows its message
  above the list.

## 5. Usage

```ts
const addresses = useGetMyAddresses();
const save = useSaveMyAddresses();

save.mutate({
  addresses: [
    ...(addresses.data ?? []),
    { emirate: "DUBAI", street: "Marina Gate 2", landmark: "Dubai Marina Mall", isPrimary: false },
  ],
});
```
