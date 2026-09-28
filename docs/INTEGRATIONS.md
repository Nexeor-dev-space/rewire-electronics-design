# Integration credentials

Where the credentials for third party services live, how they are protected,
and how to set up email.

Read this before adding a third party service, reading a credential in code,
or setting up an environment. The auth flows that use these values are in
[AUTH.md](AUTH.md).

---

## 1. What lives where

1. **`.env`** holds `DATABASE_URL` and `AUTH_SECRET` only. The app needs both
   before it can read the database, so they cannot live in it.
2. **The database** holds every third party credential (SMTP, sender address,
   site address), encrypted. An Admin adds, replaces and
   deletes them at **Governance → API Credentials**
   (`/admin/settings/integrations`). A change applies on the next request: no
   redeploy, no restart.
3. **The DEV / LIVE mode** is in the database too, default DEV.

Do not add an env var for a new third party credential. Add a key to the
`IntegrationKey` enum (a migration) and follow the same pattern.

---

## 2. Files

| File | Purpose |
| --- | --- |
| `prisma/schema/settings.prisma` | `IntegrationMode`, `IntegrationKey`, `IntegrationSettings`, `IntegrationCredential` |
| `src/lib/crypto/secret-box.ts` | `sealSecret`, `openSecret` (AES-256-GCM) |
| `src/lib/auth/auth-secret.ts` | `readAuthSecret()` |
| `src/lib/integration-keys.ts` | Key list, `HIDDEN_INTEGRATION_KEYS`, labels, help text, groups, secret and multiline keys, defaults (client safe) |
| `src/lib/integration-config.ts` | `resolveIntegrationConfig`, `integrationFeatures`, `hintOf`, config types (pure, tested) |
| `src/services/integration.service.ts` | Admin reads and writes, `getIntegrationConfig` (server only) |
| `src/validators/integration.validator.ts` | One value schema per key |
| `src/types/integration.ts` | `IntegrationStatus`, `IntegrationCredentialStatus`, `IntegrationCredentialInput` |
| `src/app/api/v1/admin/integrations/` | The routes in section 9, and the shared `authorize.ts` |
| `src/hooks/use-integrations.ts` | Query and mutations for the screen |
| `src/app/admin/settings/integrations/page.tsx` | The page and its Admin only check |
| `src/components/admin/integrations/` | `IntegrationSettings`, `CredentialFormModal` |

Migration: `add_integration_settings`. It has no backfill: no settings row
reads as DEV with nothing set.

---

## 3. Modes

| | DEV | LIVE |
| --- | --- | --- |
| Email with SMTP user, password and sender set | Sent over SMTP | Sent over SMTP |
| Email without them | Printed to the server log | Off: sends fail with `503 NOT_CONFIGURED` |
| Site address (`APP_URL`) unset | `http://localhost:3000` (`DEV_APP_URL`) | None: email turns off |

Switching to LIVE with credentials missing is allowed; the screen's feature
line shows what is off.

When DEV prints an email in a production build (`NODE_ENV=production`), only
`to` and `subject` are logged and the body, which carries the link, is
withheld. So a production server left in DEV never writes account takeover
links to its log. Development builds print the whole text, link included.

---

## 4. Encryption

1. Each value is sealed with AES-256-GCM, a random 12 byte IV per seal and a
   16 byte tag. Stored format: `v1.<iv>.<tag>.<ciphertext>`, each part
   base64url.
2. The key is derived from `AUTH_SECRET` with HKDF-SHA256 (info
   `rewire:integration-credentials:v1`, 32 bytes) and held in memory.
3. The credential's key name (for example `SMTP_PASS`) is authenticated data,
   so a ciphertext copied into another key's row does not open.
4. Values are **write-only**. No response, log line or error message carries a
   value. The screen shows only whether a key is set, when, and a hint: the
   last 4 characters of values of 8 or more characters.

**Changing `AUTH_SECRET`** makes every stored value unreadable (and signs
everyone out, [AUTH.md](AUTH.md) §4). The runtime treats an unreadable value
as unset and logs its key name only: "integration credential SMTP_PASS
unreadable; re-enter it (AUTH_SECRET changed?)". The screen marks the row
"Unreadable, re-enter it". Re-enter each value to recover.

Skipped on purpose: an audit log of changes, key rotation, an external vault.

---

## 5. Keys

Every value is trimmed, must not be empty, and may not contain control
characters (which also blocks header injection through the sender).

| Key | What it is | Rule |
| --- | --- | --- |
| `SMTP_HOST` | SMTP server | Hostname only, no scheme or port. Default `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | 1 to 65535. Default 587 (STARTTLS); 465 switches to implicit TLS |
| `SMTP_USER` | SMTP username | No spaces. Not required to be an email (Resend's is `resend`) |
| `SMTP_PASS` | SMTP password | All spaces removed (Gmail shows app passwords in groups of four) |
| `EMAIL_FROM` | Sender customers see | `name@domain` or `Name <name@domain>` |
| `APP_URL` | Public site address for email links | `https://` any host, or `http://` for `localhost` / `127.0.0.1`; no path, query or credentials; stored without a trailing slash |

`SMTP_PASS` is the only secret key; it uses a masked input.

**Social sign-in: removed; the `OAuthAccount` table and hidden keys are kept
for a possible return.** The six `GOOGLE_*` / `APPLE_*` values stay in the
`IntegrationKey` enum (the migration is applied) and are listed in code as
`HIDDEN_INTEGRATION_KEYS`. They are not in `INTEGRATION_KEYS`, so the screen
does not show them, the credential routes answer 404 for them, and any stored
row is ignored when the config loads. Such a row cannot be deleted through
the API.

---

## 6. What a missing key turns off

A missing key turns off only the feature that reads it.

1. `SMTP_HOST`, `SMTP_PORT`: nothing; the defaults apply.
2. `SMTP_USER`, `SMTP_PASS` or `EMAIL_FROM`: email. In DEV emails print to the
   log; in LIVE email is off.
3. `APP_URL`: in DEV nothing (localhost is used). In LIVE, email, because
   it needs absolute links.

What "email off" means for customers:

1. Sign-up still creates the account and signs in; the verification email
   fails and is logged.
2. The account banner's "Resend email" shows "Email isn't set up yet. Please
   try again later." (503).
3. Forgot password still answers "we've sent a link", and nothing is sent.

---

## 7. Setup

Each environment has its own database, so each is configured on its own
screen.

### 7.1 Gmail for development

1. On the Google account that will send, turn on 2-Step Verification.
2. Create an app password at Google Account → Security → App passwords.
3. On the API Credentials screen set `SMTP_USER` to the Gmail address,
   `SMTP_PASS` to the app password, and `EMAIL_FROM` to
   `Rewire <that-address@gmail.com>`. Leave host and port unset
   (`smtp.gmail.com`, 587).
4. Leave `APP_URL` unset for `http://localhost:3000`, or set it to the port
   you run on.
5. Mode can stay DEV; SMTP is used whenever it is fully set.

Gmail rewrites the sender to the signed-in account unless the address is a
verified "Send mail as" alias, so do not expect a custom domain sender here.

### 7.2 Resend for production

1. In Resend, add and verify the sending domain (the DNS records Resend lists:
   SPF, DKIM and optionally DMARC).
2. Create an API key with sending access.
3. Set `SMTP_HOST` to `smtp.resend.com`, `SMTP_USER` to `resend`,
   `SMTP_PASS` to the API key, and `EMAIL_FROM` to an address on the verified
   domain, for example `Rewire <no-reply@rewire-electronics.com>`. Port 587
   is the default; 465 also works.
4. Set `APP_URL` to the public origin, for example
   `https://rewire-electronics.com`.
5. Switch the mode to LIVE.
6. Check: sign up with a real inbox (or press "Resend email" on the account
   banner of an unverified account) and confirm the link opens on the public
   domain.

Switching providers later is data only: replace the four values.

---

## 8. The admin screen

Governance → **API Credentials**, `/admin/settings/integrations`.

1. **Admins only.** Staff hold `"*"` in `ROLE_PERMISSIONS`, so a permission
   key alone would let them in. The page and every route also check
   `canManageIntegrations(role)` (`src/lib/auth/permissions.ts`), true for
   Admin only. Staff see the sidebar row (the sidebar does not filter by role)
   and land on "Access denied".
2. **Mode.** A DEV / LIVE switch; each change goes through a confirm dialog.
   In DEV a warning banner explains what is off.
3. **Features line.** Email (On, Logged to the server console, or Off),
   computed from what is stored right now.
4. **Rows**, grouped Email and Site. Each shows its label, help, and
   "Set, ends in …", "Not set" (with the default for host and port) or
   "Unreadable, re-enter it". Unset rows have Add; set rows have Replace and
   Delete (confirmed).
5. **The form** is one field, never prefilled, masked for secrets. The typed
   value is dropped when the dialog closes. A 422 shows under the field.

---

## 9. API

Paths in `API_ENDPOINTS.admin.integrations`. Every route runs
`authorizeIntegrations()` (`authorizeApi(PERMISSIONS.integrations)` then the
Admin check), and answers `401`, `403` "Only Admins can manage integrations.",
or `500 INTERNAL` (which includes a missing or short `AUTH_SECRET`).

| Route | Input | Success | Errors |
| --- | --- | --- | --- |
| `GET admin/integrations` | none | `IntegrationStatus` | 401, 403 |
| `PUT admin/integrations/mode` | `{ mode: "DEV" \| "LIVE" }` | `IntegrationStatus` | 401, 403, 422 `fields.mode` |
| `PUT admin/integrations/credentials/[key]` | `{ value: string }` | `IntegrationStatus` | 401, 403, 404 unknown or hidden key, 422 `fields.value` |
| `DELETE admin/integrations/credentials/[key]` | none | `IntegrationStatus`, also when the key was not set | 401, 403, 404 unknown or hidden key |

`IntegrationStatus` is `{ mode, modeUpdatedAt, credentials, features }`.
`credentials` always lists all 6 keys in `INTEGRATION_KEYS` order, each
`{ key, isSet, readable, hint, updatedAt }`; hidden keys never appear.
`features` is `{ email: "SMTP" | "CONSOLE" | "OFF" }`.

---

## 10. Reading the config in code

Server code calls one function: `getIntegrationConfig()` from
`src/services/integration.service.ts`. It returns the resolved
`IntegrationConfig`: `mode`, `appUrl` and `email` (SMTP settings, CONSOLE or
OFF). Never read the credential table directly.

1. **Cache.** One entry, the promise of the resolved config, on `globalThis`
   (like `src/lib/db.ts`), so every route bundle shares it. The first call
   runs one query for the settings row and one for the credentials (at most
   12 rows; hidden key rows are dropped after reading). Every admin write
   clears it. No TTL, no polling.
2. A failed load is not cached; the next call retries.
3. Never call it at module scope or during static generation, so `next build`
   stays off the database.
4. Consumers today: `sendEmail` (`src/lib/email/send-email.ts`) and
   `appUrl()` (`src/lib/app-url.ts`).

---

## 11. Known limits

1. **One process.** A second instance keeps its cached config until restart.
2. **`AUTH_SECRET` is a single point.** It signs sessions and derives the
   encryption key; rotating it means re-entering every credential.
3. **No history.** Replacing a value overwrites it; `updatedById` records only
   the last Admin who changed each row.
4. **Anyone with database access and `AUTH_SECRET`** can decrypt every value.
   Keep both out of shared places.
