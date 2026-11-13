# Phone numbers

How phone numbers are entered, checked and stored. Added for issue #133.

## 1. Rules

The rules live in `src/lib/phone.ts`, which is safe on both client and server.

| Country | Selector | Accepted after the country code | Stored as |
| --- | --- | --- | --- |
| UAE | `+971 UAE` | 9 digit mobile (`50`, `52`, `54`, `55`, `56`, `58`) or 8 digit landline (`2`, `3`, `4`, `6`, `7`, `9`) | `+971501234567` |
| Saudi Arabia | `+966 KSA` | 9 digit mobile starting with `5` | `+966501234567` |

Issue #133 asks for an 8 digit UAE number. Real UAE mobiles have 9 digits after
+971, so the owner decided to keep 9 digit mobiles and 8 digit landlines.

## 2. Validators

Both are in `src/validators/common/primitives.validator.ts` and return the
number in `+<country code><number>` form.

1. `phoneValidator` is the required phone, used by checkout. It replaces
   `uaePhoneValidator`.
2. `optionalPhoneValidator` turns a blank value into null and otherwise applies
   the same rules. It is used by sign up, Account Settings, both waitlist forms
   and the admin Users form. It used to accept any 7 to 20 digits.

A local number starting with `0` is read as UAE. `+971`, `00971` and `971` are
all read as the country code, and the same for Saudi Arabia. A second country
code is refused. A number starting with any other `+` or `00` code is refused
with "Only UAE (+971) and Saudi (+966) numbers are accepted."
(`OTHER_COUNTRY_MESSAGE`). Every write of a phone goes through these two
validators, so the API refuses it as well.

## 3. The field

`PhoneField` in `src/components/ui/phone-field.tsx` is the only phone input.
It shows a country select and a number box, and hands its form one string, in
the stored form.

1. **One country code.** The code is the select, so the number box never holds
   one. Typing or pasting `+971 50 123 4567` moves the code into the select,
   and a doubled code is removed. Pasting `+966…` switches the select.
2. **Messages before submit.** A field that opens with a number checks it at
   once. An empty field checks itself after the first blur or country change,
   and again on every change after that. Changing the country rechecks the
   number under the new country's rule. Until then it shows the `error` its
   form passes.
3. **Forms that read `FormData`** pass `name`, which adds a hidden input holding
   the full number. Checkout is the only one.

| Form | File |
| --- | --- |
| Checkout | `src/components/checkout/checkout-view.tsx` |
| Sign up | `src/components/auth/register-form.tsx` |
| Account Settings (`PATCH account/profile`, see [AUTH.md](AUTH.md)) | `src/components/account/account-settings.tsx` |
| Join a waitlist | `src/components/home/hero/waitlist-modal.tsx` |
| Account waitlists | `src/components/account/account-waitlists.tsx` |
| Admin Users | `src/components/admin/users/user-form-modal.tsx` |

## 4. Existing data

No migration. Phone columns stay plain strings. A saved number in another
format still loads and is rewritten in the stored form on the next save. A
number from another country saved before this rule stays in the database. Its
form shows the message as soon as it opens, and cannot be saved until the
number is replaced or, where the phone is optional, cleared.

Delivery is still UAE only, so a Saudi number can sit on a UAE address.

## 5. Admin search

The admin Users search (`listUsers` in `src/services/user.service.ts`) matches
the text as typed, and also its stored form from `phoneSearchTerms` in
`src/lib/phone.ts`. Searching `0501234567` or `050 123 4567` finds
`+971501234567`. A local number does not say which country it belongs to, so it
is looked for under both. A search holding anything other than digits,
separators and a leading plus adds nothing.

An older number saved with spaces is only found by typing it as it was saved.
