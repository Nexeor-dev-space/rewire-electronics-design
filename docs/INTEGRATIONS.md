# Environment and email

Every deployment value the app reads (database, signing secret, SMTP, sender
address, site address, the test mode switch), how it is validated, and how to
set up email.

Read this before adding an env var, reading one in code, or setting up an
environment. The auth flows that use these values are in [AUTH.md](AUTH.md).

---

## 1. What lives where

1. **Env** (`.env` locally, the Coolify environment in deployment) holds every
   value in section 3. They differ per environment and include secrets, so they
   are deployment values, not admin settings.
2. **No secret is read from the database.** Until 2026-10-12 SMTP, `EMAIL_FROM`,
   `APP_URL` and a DEV / LIVE mode were stored encrypted in the database and
   edited on an admin API Credentials screen. Staging never had them set, so
   every email was printed to the log instead of sent. The screen, its API and
   the `integration_settings` and `integration_credentials` tables were
   removed (migration `drop_integration_settings`).
3. **Public IDs are read from the database.** The GA4 measurement ID, the
   Microsoft Clarity project ID, the Google Search Console token and the Meta
   Pixel ID are saved in the `integrations` table on the admin Integrations,
   API Keys screen. They are not secrets: every storefront page prints them.
4. **Email and Stripe stay in env.** Their values are secrets and differ per
   environment, so by project rule they are deployment values. The same
   screen shows their status read only and tests them, without showing any
   secret. See [INTEGRATIONS-ADMIN.md](INTEGRATIONS-ADMIN.md).
5. A change to any env value needs a restart (Coolify redeploys on save).

Do not add a new env var without asking first (`CLAUDE.md`). A value an admin
should change belongs in the database instead.

---

## 2. Files

| File | Purpose |
| --- | --- |
| `src/lib/env.ts` | Zod schemas and readers: `databaseEnv()`, `authEnv()`, `emailEnv()`, `stripeEnv()`, `stripeWebhookEnv()`, `optionalDatabaseUrl()`, and the pure `parseDatabaseEnv`, `parseAuthEnv`, `parseEmailEnv`, `parseStripeEnv`, `parseStripeWebhookEnv` (tested in `env.test.ts`). Also the test mode switch: `testModeEnv()`, `isTestMode()` and the pure `parseTestModeEnv`, which never throw (section 3a) |
| `src/lib/stripe.ts` | `stripeClient()`: the Stripe SDK with `STRIPE_SECRET_KEY`. `describeStripe(env)`: configured or not, live or test mode, webhook secret set or not, never echoing a value (tested in `stripe.test.ts`). `checkStripeKey()`: asks Stripe whether it accepts the key |
| `src/lib/integration-config.ts` | `resolveIntegrationConfig(env, nodeEnv)`, `describeEmailTransport(config)`, `describeTestMode(env)`, `getIntegrationConfig()` (tested in `integration-config.test.ts`) |
| `src/lib/email/send-email.ts` | `sendEmail`: sends, prints or refuses per the transport |
| `src/lib/app-url.ts` | `appUrl(path)`: absolute links for emails, and the homepage address the integration Tests open |
| `src/services/integration.service.ts` | The Email and Stripe status and Tests on the Integrations, API Keys screen, through `getIntegrationConfig()`, `describeStripe(process.env)` and `checkStripeKey()` ([INTEGRATIONS-ADMIN.md](INTEGRATIONS-ADMIN.md)) |
| `src/lib/db.ts`, `prisma/seed.ts`, `prisma7.config.ts` | Read `DATABASE_URL` through `env.ts` |
| `src/lib/auth/sign.ts` | Reads `AUTH_SECRET` through `authEnv()` |

There are five validating readers, not one, on purpose: the Docker build has only
`DATABASE_URL`, a bad SMTP or Stripe value must not stop the database client or
sign in, and a missing webhook secret must not stop card payments. Readers do not cache; parsing costs microseconds and secret rotation
tests change `AUTH_SECRET` at runtime. `testModeEnv()` is a sixth reader that
validates nothing and cannot fail (section 3a).

---

## 3. Keys

Empty strings count as unset. A value that breaks a rule throws
`Invalid environment:` with every problem listed, the first time that reader
runs. `TEST_MODE` is the exception: it never throws (section 3a).

| Key | Reader | Rule | Default |
| --- | --- | --- | --- |
| `DATABASE_URL` | `databaseEnv()` | Required | none |
| `AUTH_SECRET` | `authEnv()` | Required, at least `AUTH_SECRET_MIN_LENGTH` (32) characters | none |
| `SMTP_HOST` | `emailEnv()` | Hostname | `smtp.gmail.com` |
| `SMTP_PORT` | `emailEnv()` | Positive integer; 465 switches to implicit TLS | 587 (STARTTLS) |
| `SMTP_USER` | `emailEnv()` | Set together with `SMTP_PASS` and `EMAIL_FROM`, or none of them | none |
| `SMTP_PASS` | `emailEnv()` | As above | none |
| `EMAIL_FROM` | `emailEnv()` | As above; `name@domain` or `Name <name@domain>` (so `mailto:` fails) | none |
| `APP_URL` | `emailEnv()` | A full URL, for example `https://rewire.ae` | `http://localhost:3000` outside production |
| `STRIPE_SECRET_KEY` | `stripeEnv()` | Starts with `sk_` (or `rk_`); a `pk_` publishable key is refused. Needed only for card and Apple Pay ([PAYMENTS.md](PAYMENTS.md) §8) | none |
| `STRIPE_WEBHOOK_SECRET` | `stripeWebhookEnv()` | Starts with `whsec_`; the signing secret of the Stripe webhook destination. Needed only for `POST webhooks/stripe` ([PAYMENTS.md](PAYMENTS.md) §6) | none |
| `TEST_MODE` | `testModeEnv()`, `isTestMode()` | Optional. Only the exact value `true` turns it on; anything else is off and never throws (section 3a) | off |

`prisma7.config.ts` uses `optionalDatabaseUrl()`, which never throws, so
`prisma generate` runs in the Docker deps stage without a database.

---

## 3a. `TEST_MODE`

A switch for staging, so testers can check timed features in minutes instead
of days. The owner approved it on 3 November 2026 for issue #118.

1. **Optional.** A deployment that does not set it behaves like production.
2. **On only for `true`.** The value must be exactly `true` (`TEST_MODE_ON_VALUE`
   in `src/lib/constants.ts`), in lower case; spaces around it are ignored.
3. **Anything else is off and never stops startup.** Missing, blank, `TRUE`,
   `1`, `yes`, `on` and `false` all mean off. Unlike the other keys, a wrong
   value throws nothing, so a mistake in the environment can never take the
   site down or switch test behaviour on in production.
4. **An odd value is reported.** `getIntegrationConfig()` logs the mode once
   per process, right after the email transport line (section 4). A value
   that was set but ignored is logged as a warning.
5. **What it changes today.** One thing: a release created while it is on
   starts with reminders 10 and 5 minutes before the opening
   (`RELEASE_TEST_REMINDER_DEFAULTS_MINUTES`) instead of 48 hours and 1 hour.
   Releases that already exist keep their times. The message timer, the batch
   size and the number of emails a customer gets do not change
   ([RELEASES.md](RELEASES.md) §13).
6. **Where to set it.** On staging only. Never set it in production.
7. **The name is generic on purpose.** A later feature that needs a test
   switch reads `isTestMode()` instead of adding its own env var. Document
   what it changes here when it does.

| Line | When |
| --- | --- |
| `test mode: ON (new releases default to 10 and 5 minute reminders)` | `TEST_MODE=true` |
| `test mode: OFF` | Missing or blank |
| `test mode: OFF (TEST_MODE="..." ignored; only "true" turns it on)` | Any other value; logged as a warning |

Code reads it only through `isTestMode()` in `src/lib/env.ts`, on the server.
A client component that needs it gets it as a prop from a server page.

---

## 4. Email transport

`getIntegrationConfig()` resolves the transport once per process and logs one
line, so the server log shows which one is in use. The test mode line
(section 3a) follows it.

| Line | When |
| --- | --- |
| `email transport: SMTP (host:port, from ...)` | `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` set and a site address known |
| `email transport: CONSOLE (...)` | Not production and the SMTP login is not set: emails print to the log, link included |
| `email transport: OFF (...)` | Production (`NODE_ENV=production`) and the SMTP login or `APP_URL` is missing |

What "email off" means for customers:

1. Sign up still creates the account and signs in; the verification email
   fails and is logged.
2. The account banner's "Resend email" shows "Email isn't set up yet. Please
   try again later." (503 `NOT_CONFIGURED`).
3. Forgot password still answers "we've sent a link", and nothing is sent.

---

## 5. Setup

### 5.1 Gmail for development

1. On the Google account that will send, turn on 2 Step Verification.
2. Create an app password at Google Account, Security, App passwords.
3. In `.env` set `SMTP_USER` to the Gmail address, `SMTP_PASS` to the app
   password (no spaces), and `EMAIL_FROM` to `Rewire <that-address@gmail.com>`.
   Leave `SMTP_HOST` and `SMTP_PORT` unset.
4. Leave `APP_URL` unset for `http://localhost:3000`.

Gmail rewrites the sender to the signed in account unless the address is a
verified "Send mail as" alias.

### 5.2 Resend for staging and production

1. In Resend, add and verify the sending domain (SPF, DKIM, optionally DMARC).
2. Create an API key with sending access.
3. Set `SMTP_HOST=smtp.resend.com`, `SMTP_USER=resend`, `SMTP_PASS` to the API
   key, and `EMAIL_FROM` to an address **on the verified domain**, for example
   `Rewire <no-reply@rewire-electronics.com>`. Resend refuses `gmail.com`
   senders.
4. Set `APP_URL` to the public origin, for example
   `https://rewire-electronics.com`.
5. Redeploy, check the log shows `email transport: SMTP`, then sign up with a
   real inbox (or use Forgot password) and confirm the link opens on the public
   domain.

Quote values with spaces in `.env` to be safe:
`EMAIL_FROM="Rewire <no-reply@rewire-electronics.com>"`.

---

## 5a. Contact details and email footers

Issue #155. The support email, phone number and WhatsApp number are not env
values. Staff save them in Governance, VAT & Configuration, under Contact &
invoice details, so a change needs no deploy. See [VAT.md](VAT.md). No env var
was added.

`sendEmail` in `src/lib/email/send-email.ts` reads the saved details
(`getContactDetails`) and adds them to the foot of every email through
`withContactFooter`: the support email and, when set, the phone and WhatsApp
numbers. The text version gets the same lines. With nothing saved the email is
unchanged. If the settings cannot be read, the email is still sent without the
footer and the error is logged. The branded template in issue #154 only needs to
keep calling `sendEmail` to get the footer.

## 6. Known limits

1. **Restart to change.** Every value is read from the process environment.
2. **`AUTH_SECRET` is a single point.** Rotating it signs everyone out
   ([AUTH.md](AUTH.md) §4).
3. **Social sign in** is removed; the `OAuthAccount` table is kept for a
   possible return. Its credentials would be new env vars.
