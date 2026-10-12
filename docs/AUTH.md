# Authentication

How customers, staff and admins sign in, how the session works, and the rules
behind sign-up, email verification and password reset.

Read this before touching a route under `src/app/api/v1/auth/`, anything in
`src/lib/auth/`, the `(auth)` pages, the account gate, or code that reads the
session. Credentials for email live in the database, not `.env`;
see [INTEGRATIONS.md](INTEGRATIONS.md).

---

## 1. What exists

1. Email and password sign-in for every role, with a rate limit and a
   constant time answer for unknown emails.
2. Customer sign-up, email verification, and forgot / reset password.
3. A signed session cookie with no session table. A password reset signs the
   customer out on every device.
4. Storefront auth pages in a chrome-less `(auth)` route group, a server gate
   on every `/account` page, and a client rule that sends any `401` back to
   sign-in.

`.env` holds only `DATABASE_URL` and `AUTH_SECRET`. Everything else auth needs
(SMTP, sender, site address) is an admin setting.

There is no social sign-in (section 8).

---

## 2. Files

| File | Purpose |
| --- | --- |
| `src/lib/auth/session.ts` | `getSession`, `startSession`, `endSession`, `hasSessionCookie`, `authorizeApi` |
| `src/lib/auth/session-token.ts` | `createSessionToken`, `readSessionToken` (pure, tested) |
| `src/lib/auth/sign.ts` | HMAC helpers `sign`, `signed`, `verifySigned` |
| `src/lib/auth/auth-secret.ts` | `readAuthSecret()`: the one reader of `AUTH_SECRET` (set and at least 32 characters) |
| `src/lib/auth/password.ts` | scrypt `hashPassword`, `verifyPassword` |
| `src/lib/auth/tokens.ts` | Emailed one-time tokens |
| `src/lib/auth/next-path.ts` | `safeNextPath`, `signInHref` (client safe) |
| `src/lib/rate-limit.ts` | `limitByIp`, `limitByUser`, `clientIp` |
| `src/lib/email/` | `sendEmail`, templates, the SMTP / console / off decision |
| `src/lib/app-url.ts` | `appUrl(path)`: absolute links for emails, from the `APP_URL` setting |
| `src/services/auth.service.ts` | `registerCustomer`, `sendVerificationEmail`, `verifyEmail`, `resendVerification`, `requestPasswordReset`, `resetPassword` |
| `src/validators/auth.validator.ts` | Every auth input schema |
| `src/types/auth.ts` | `SessionUser`, `Me`, `SignInResult`, input types |
| `src/app/api/v1/auth/` | The routes in section 5 |
| `src/hooks/use-auth.ts` | `useGetMe` and the auth mutations |
| `src/app/(auth)/` | `/sign-in`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` |
| `src/app/(site)/account/layout.tsx` | The account gate |
| `src/components/auth/` | Forms, `SignInRedirect`, `AccessDenied` |
| `src/components/account/verify-email-banner.tsx` | The resend banner on account pages |
| `src/components/providers/query-provider.tsx` | The 401 redirect rule |

Tunables (`SESSION_MAX_AGE_SECONDS`, token lifetimes, `RATE_LIMITS`, page
paths) are in `src/lib/constants.ts`.

---

## 3. Data model

`prisma/schema/user.prisma`, migration `add_customer_auth`.

1. `User.phone` is nullable. The admin Users form accepts a blank phone and
   the list shows a dash.
2. `User.emailVerifiedAt` is set by the verify link, a password reset, or
   account creation in the admin console. The migration backfilled it to `createdAt` for every row
   that existed before it, so existing accounts count as verified.
3. `User.sessionVersion` (default 0) is carried in the cookie. Incrementing it
   signs the user out everywhere.
4. `AuthToken` holds `VERIFY` and `RESET` tokens: SHA-256 hash only, at most
   one row per user and type, `usedAt` marks a spent token.
5. `User.isGuest` (default false) marks a **shadow user**: the owner row
   checkout creates for a guest order. It has no password, no verified email
   and role `CUSTOMER`. Every path that sets a password also sets `isGuest`
   false. See [ORDERS.md](ORDERS.md) §6.
6. `OAuthAccount` (`provider` enum `GOOGLE | APPLE`) is left over from the
   removed social sign-in. No code reads or writes it (section 8).

---

## 4. Sessions

**Cookie.** `rewire_session` = `<userId>.<sessionVersion>.<expiresAt>.<sig>`.
The signature is HMAC-SHA256 with `AUTH_SECRET` over the first three parts,
base64url, compared in constant time. httpOnly, `Secure` in production,
SameSite `Lax`, path `/`.

**Lifetime.** `SESSION_MAX_AGE_SECONDS` (7 days), fixed, not sliding. The
cookie `maxAge` and the signed `expiresAt` match.

**Reading it.** `getSession()` parses and verifies the cookie, checks expiry,
then runs one query: the user by id with `state: "ACTIVE"` and the cookie's
`sessionVersion`. No row means signed out. That single primary key lookup is
the only cost per authenticated request; no cookie means no query. React
`cache` dedupes it within one server render.

**What each event does.**

1. Sign-in and sign-up call `startSession(userId, sessionVersion)`.
2. Sign-out deletes this browser's cookie only. Other devices stay signed in.
3. A password reset increments `sessionVersion`, so every existing cookie for
   that user stops resolving on its next request.
4. A soft delete (`INACTIVE`) and a role change apply on the next request,
   because role and state are read from the row, not the cookie.
5. Setting a user's password in the admin console does **not** bump the
   version; their other sessions survive.

**Deploy effect.** The cookie format went from three parts to four, so
everyone (admins, staff and customers) was signed out once when this shipped.

**AUTH_SECRET.** Changing it signs everyone out and also makes every stored
integration credential unreadable ([INTEGRATIONS.md](INTEGRATIONS.md) §4).

**`SessionUser`.** `{ id, fullName, email, phone: string | null, role,
emailVerified: boolean, createdAt: Date, permissions }`. `permissions` is the
role's console grid (module key to actions, see [PERMISSIONS.md](PERMISSIONS.md)):
every action for Admin, the levels of the account's Staff role for Staff
(nothing without a role), `{}` for Customers. The role's levels are read in
the same query as the user, so there is no extra query and no cache.
`Me`, returned by `auth.me`, is the same with `createdAt` as an ISO string.

---

## 5. Routes

All paths are in `API_ENDPOINTS.auth` (`src/lib/api/api-endpoints.ts`). JSON
routes answer through `apiSuccess` / `apiError` / `apiErrorFrom`, and any of
them may answer `500 INTERNAL`.

| Route | Session | Rate limit | Success | Errors |
| --- | --- | --- | --- | --- |
| `POST auth/sign-in` | no | `signIn` by IP | 200 `{ redirectTo }`: `/admin` for Admin and Staff, `/account` for customers | 422, 401, 429 |
| `POST auth/sign-out` | no | none | 200 `{ signedOut: true }` | none |
| `POST auth/sign-up` | no (replaces one) | `signUp` by IP | 201 `{ redirectTo: "/account" }` | 422, 409 `fields.email`, 429 |
| `GET auth/me` | no | none | 200 `Me` or `null` | none |
| `POST auth/verify-email` | no | none | 200 `{ verified: true }` | 422 `fields.token` |
| `POST auth/resend-verification` | required | `resendVerification` per user | 200 `{ sent: true }` | 401, 409, 429, 500, 503 |
| `POST auth/forgot-password` | no | `forgotPassword` by IP | 200 `{ sent: true }`, always | 422, 429 |
| `POST auth/reset-password` | no | none | 200 `{ reset: true }` | 422 `fields.token` or `fields.password` |

Route by route:

1. **sign-in.** The rate limit runs before anything else. An unknown email, an
   inactive account, an account with no password (including every shadow
   user, which is refused without any change here) and a wrong
   password all answer the same 401 "That email and password don't match an
   account.", and all run one scrypt verify: an unknown email is checked
   against a dummy hash made once per process, so response time does not
   reveal which emails have accounts. Email verification is not required to
   sign in. On success the guest cart is adopted.
2. **sign-out.** Stateless; deletes the cookie.
3. **sign-up.** Input `{ fullName, email, password, phone? }`. Creates a
   `CUSTOMER` with `emailVerifiedAt: null`, issues a `VERIFY` token, starts the
   session and adopts the guest cart, then sends the email in `after()` so the
   response does not wait on SMTP. A failed send is logged only; the account
   exists either way. A taken email (including inactive accounts and
   other accounts with no password, but not shadow users) is 409. This does reveal that an email has an account; accepted,
   because sign-up signs in at once and the `signUp` limit bounds probing.
   **A shadow user's email is not taken:** sign-up upgrades that row instead
   (`accountForSignUp`): it sets the name, password and `isGuest: false`,
   clears the phone, sets `emailVerifiedAt: null`, increments
   `sessionVersion`, then issues the VERIFY token as usual. The new account
   sees the guest orders on that email only after it verifies
   (`accountOrdersWhere`).
4. **me.** Never 401, so the header can call it without tripping the 401
   redirect. If a cookie is present but no longer resolves (expired, version
   bumped, deleted user), the route deletes it.
5. **verify-email.** Consumes a `VERIFY` token and sets `emailVerifiedAt` if
   null. It does not start a session, because the link may open on another
   device. Reusing a spent link whose user is already verified still answers
   200. Invalid, expired or used tokens, and inactive users, answer 422 "This
   link has expired or was already used." Not rate limited: the token is 256
   bits.
6. **resend-verification.** 409 if already verified. Issues a fresh token
   (the old one dies) and awaits the send: 500 "We couldn't send the email.
   Please try again." on an SMTP failure, 503 `NOT_CONFIGURED` when email is
   off in LIVE mode.
7. **forgot-password.** Always 200 for valid input. A token and email go out
   only for an `ACTIVE` `CUSTOMER`; staff reset through an Admin. The lookup
   and send happen in `after()`, so timing does not reveal whether the account
   exists, and failures (including email being off) are logged only.
8. **reset-password.** One transaction: consume the `RESET` token, set the new
   password hash, increment `sessionVersion`, set `emailVerifiedAt` if null
   (the link proves the inbox), and set `isGuest` false, so a reset claims a
   shadow row left by a guest checkout; the `sessionVersion` bump also signs
   out anyone who signed up on that email first. A token belonging to a non customer or an
   inactive user answers the same 422 as an invalid one. It does not start a
   session; the page links to sign-in.

---

## 6. Emailed tokens

`src/lib/auth/tokens.ts`.

1. `createRandomToken()`: `AUTH_TOKEN_BYTES` (32) random bytes, base64url, 43
   characters.
2. `hashToken(raw)`: SHA-256 hex. Only the hash is stored, so a database leak
   does not yield usable links.
3. `issueAuthToken(tx, userId, type)`: deletes that user's tokens of that
   type, creates one, returns the raw token. One live token per user and type,
   so the table stays bounded with no cleanup job.
4. `consumeAuthToken(tx, raw, type)`: a guarded `updateMany` on hash, type,
   `usedAt: null` and `expiresAt > now`. Exactly one row must change; returns
   the `userId` or null. Two concurrent uses cannot both succeed.
5. Lifetimes: `VERIFY_TOKEN_TTL_SECONDS` (24 hours), `RESET_TOKEN_TTL_SECONDS`
   (1 hour).

Links are built with `appUrl()` from the `APP_URL` setting, never from the
request `Host` header, which an attacker controls (reset link poisoning).

---

## 7. Rate limits

`src/lib/rate-limit.ts`, rules in `RATE_LIMITS` (`src/lib/constants.ts`).

| Name | Limit | Window | Keyed on |
| --- | --- | --- | --- |
| `signIn` | 10 | 15 minutes | IP |
| `signUp` | 5 | 1 hour | IP |
| `forgotPassword` | 5 | 1 hour | IP |
| `resendVerification` | 3 | 1 hour | per user (session user id) |

`applyCoupon` and `guestCart` in the same object belong to the cart; see
[CART.md](CART.md) §10.

How it works:

1. A fixed window per key (`<name>:<ip>` or `<name>:user:<id>`) in an
   in-memory `Map`. Every request counts, successful ones included.
2. Over the limit, routes answer `429 RATE_LIMITED` "Too many attempts.
   Please wait a few minutes and try again." with a `Retry-After` header in
   seconds.
3. The map is capped at `RATE_LIMIT_MAX_KEYS` (10,000). When full, expired
   windows are dropped first, then the oldest keys. No timers.
4. `clientIp(req)` reads the first `x-forwarded-for` hop, then `x-real-ip`,
   else `"unknown"`.

Limits of this design are in section 11.

---

## 8. Social sign-in

Social sign-in: removed; the `OAuthAccount` table and hidden keys are kept for
a possible return. Google and Apple sign-in, their routes, the `arctic`
dependency and their validators are gone. The database still has the
`OAuthAccount` model, the `OAuthProvider` enum and the six `GOOGLE_*` /
`APPLE_*` `IntegrationKey` values; in code the keys are
`HIDDEN_INTEGRATION_KEYS` ([INTEGRATIONS.md](INTEGRATIONS.md) §5). A customer
who only ever signed in with Google has no password; they sign in again by
setting one through forgot password.

---

## 9. Storefront

### 9.1 Pages

All five live in `src/app/(auth)/`, a route group with no header, footer or
tab bar, on storefront tokens. Every page sets `robots: noindex, nofollow`.

1. `/sign-in?next=`: `SignInForm`, links to register and forgot password. On success it goes to
   `safeNextPath(next)` or the returned `redirectTo`. A signed-in visitor is
   not redirected away, so "Use a different account" keeps working.
2. `/register?next=`: name, email, password, confirm (client only), optional
   phone. Success goes to `next` or `/account`.
3. `/forgot-password`: always ends on "If an account exists for that email,
   we've sent a link."
4. `/reset-password?token=`: new password and confirm; success links to
   sign-in; no token links to forgot password.
5. `/verify-email?token=`: a "Confirm my email" button, not an auto submit, so
   email link scanners cannot spend the token.

`/reset-password` and `/verify-email` also set `referrer: "no-referrer"`, so
the token in the URL never leaks through the `Referer` header.

### 9.2 `next` paths

`safeNextPath(raw)` in `src/lib/auth/next-path.ts` accepts only a same-site
path: it must start with `/`, not `//` or `/\`, contain no whitespace or
control characters, stay on our origin when resolved, be at most
`NEXT_PATH_MAX_LENGTH` (512) characters, and not be an auth page. Anything else
is `null`. `signInHref(next)` builds `/sign-in?next=<encoded>` from it. Use
these two everywhere a sign-in link or post sign-in redirect is built; never
redirect to a raw `next`.

### 9.3 Account gate

`src/app/(site)/account/layout.tsx` is a Server Component that calls
`getSession()`. Signed out, it renders `SignInRedirect` instead of `children`,
so no account content is ever rendered for a visitor. `SignInRedirect` calls
`router.replace(signInHref(pathname + search))` on the client, because a
layout cannot read the request path and a server `redirect()` would lose deep
links such as `/account/orders/123`.

Signed in with an unverified email, the layout renders `VerifyEmailBanner`
(a resend button on `useResendVerification`) above the page. Unverified
customers can still browse, check out and use their account.

Known limit: a layout does not re-run on client navigation between account
pages, so a session that expires mid-visit is caught by the next API 401
(below).

### 9.4 The 401 rule

`src/components/providers/query-provider.tsx` gives the `QueryClient` a
`QueryCache` and `MutationCache` whose `onError` sends the browser to
`signInHref(current path)` when an `ApiError` has code `UNAUTHENTICATED`. It
applies to every API, admin included. It skips when already on `/sign-in`,
and when the query or mutation sets `meta: { authRedirect: false }`.
`useSignIn` sets it, because a wrong password is not an expired session. Use
the same opt-out for any future call where a 401 is an expected answer.

### 9.5 Hooks

`src/hooks/use-auth.ts`, keys `["auth"]` and `["auth", "me"]`.

1. `useGetMe()`: the header, drawer, tab bar, account pages and checkout all
   read the signed-in user from here. React Query keeps it 60 seconds; client
   navigation does not refetch.
2. `useSignIn()`, `useSignUp()`, `useSignOut()`: `onSuccess` clears the whole
   query cache, because every cached response belonged to the previous user.
   After sign-out the caller does `window.location.assign("/")`, so Back
   cannot show account data.
3. `useVerifyEmail()` invalidates the auth keys.
4. `useResendVerification()`, `useForgotPassword()`, `useResetPassword()`.

Do not call `getSession()` in `(site)/layout.tsx`: it would add a query to
every storefront render, crawlers included. The header reads the session from
the client through `auth.me` instead.

---

## 10. Admin console

1. Staff and admins sign in at the same `/sign-in`; the response sends them to
   `/admin`.
2. The `signIn` rate limit applies to them too.
3. They cannot use forgot password. An Admin sets their
   password in the Users screen.
4. Accounts created in the console are marked verified.
5. An expired session on an admin screen now lands on `/sign-in?next=` through
   the 401 rule instead of showing an error.

---

## 11. Known risks and limits

1. **Spoofable rate limit key.** `clientIp` trusts `x-forwarded-for`. Behind a
   reverse proxy that overwrites the header (nginx, Caddy, a load balancer)
   this is the real client IP. Without one, a client can send any value and
   get a fresh window per request. Production must run behind a proxy that
   sets `X-Forwarded-For` itself.
2. **Shared IPs.** Everyone behind one office or mobile carrier NAT shares a
   window; ten sign-ins in 15 minutes from the shop floor locks the next
   attempt out for the rest of the window.
3. **Single instance only.** The rate limit map and the integration config
   cache live in process memory. They reset on restart, and a second instance
   would keep separate counts and a stale config.
4. **Sign-out is per browser.** There is no "sign out everywhere" except a
   password reset. A stolen cookie stays valid until it expires (7 days) or
   the password is reset.
5. **Console password changes keep sessions.** Setting a password in the admin
   Users screen does not bump `sessionVersion`.
6. **Sign-up reveals registered emails** through its 409; forgot password and
   sign-in do not. Guest checkout reveals them too: a registered email answers
   409 "An account with this email already exists. Sign in to continue." on
   the email field.
7. **Email in DEV mode.** With no SMTP set, verify and reset emails print to
   the server log. In production (`NODE_ENV=production`) the body, which holds
   the link, is withheld; only `to` and `subject` are logged.
8. **scrypt cost.** Each sign-in, sign-up and reset hashes once (about 16 MB
   and tens of milliseconds). The rate limits bound it.

---

## 12. Adding to it

1. A new rate limited route: add a rule to `RATE_LIMITS`, then call
   `limitByIp(req, name)` first thing in the handler (or `limitByUser` after
   `authorizeApi` when the user is the natural key).
2. A new emailed link: reuse `issueAuthToken` / `consumeAuthToken` if it fits
   a user, or `createRandomToken` / `hashToken` for anything else; build the
   URL with `appUrl()`.
3. A route that must know the email is proven: check
   `session.user.emailVerified` in that route; `authorizeApi` does not.
