# Commands

How to install, configure, run, check and deploy the app. Script names are
the ones in `package.json`.

Read this before you set up a machine, touch `.env`, run a database command or
deploy.

---

## 1. Install

Node 22.12 or later (`engines` in `package.json`).

```bash
npm install
```

`npm install` (and `npm ci`) also runs `prisma generate` through the
`postinstall` script, so the Prisma client in `src/generated/prisma` matches
the schema after every install. `npx prisma generate` regenerates it by hand.

---

## 2. Environment

`.env` at the repo root holds deployment values: secrets, credentials and
values that differ per environment. The app reads them through
`src/lib/env.ts`, which validates them with Zod.

| Variable | Read by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | App, Prisma CLI, seed | PostgreSQL URL. No quotes, no space after `=` ([POLICY-CMS.md](POLICY-CMS.md) §7) |
| `AUTH_SECRET` | App | At least 32 characters. Signs sessions and the guest cart cookie. Changing it signs everyone out |
| `SMTP_HOST`, `SMTP_PORT` | App, optional | Default `smtp.gmail.com`, 587 |
| `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | App | All three or none. Without them, emails print to the log in development and are off in production |
| `APP_URL` | App | Public origin for email links and Stripe return links. Default `http://localhost:3000` outside production; required in production for email and card payments |
| `STRIPE_SECRET_KEY` | App | Stripe secret key (`sk_test_…` locally, `sk_live_…` in production). Without it card and Apple Pay answer 503; cash on delivery works ([PAYMENTS.md](PAYMENTS.md)) |
| `STRIPE_WEBHOOK_SECRET` | App | Signing secret (`whsec_…`) of the Stripe webhook destination for this environment. Without it `POST /api/v1/webhooks/stripe` answers 503 ([PAYMENTS.md](PAYMENTS.md) §8) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Seed only | The first Admin. The seed refuses a password under 8 characters, and skips the Admin when either is unset |
| `SEED_ADMIN_NAME`, `SEED_ADMIN_PHONE` | Seed only, optional | Default "Administrator" and "+971 00 000 0000" |

Rules, defaults and the Gmail and Resend setup are in
[INTEGRATIONS.md](INTEGRATIONS.md).

Do not add an env var without approval. Settings an admin may change belong in
the database.

---

## 3. Run locally

```bash
npm run dev          # Next dev server with Turbopack, http://localhost:3000
```

---

## 4. Database

| Command | What it does | Where |
| --- | --- | --- |
| `npx prisma migrate status` | Lists applied and pending migrations. Read only; run it first | Any |
| `npm run db:deploy` | `prisma migrate deploy`: applies the committed migrations that are pending. Never creates one | Any, including production |
| `npm run db:migrate -- --name <snake_case>` | `prisma migrate dev`: creates a migration from schema changes and applies it | Local development database only, after the change is approved |
| `npm run db:seed` | `prisma db seed`, which runs `tsx prisma/seed.ts` | See the warning below |
| `npm run db:seed:areas` | `tsx prisma/seed-areas-only.ts`: loads `prisma/data/delivery-areas.xlsx` into `delivery_areas`, adding only missing areas ([CART.md](CART.md) §5.1) | Any, after the `add_delivery_area` migration; touches no other data |
| `npm run db:cleanup:dummy -- --sheet <xlsx>` | Dry run of the dummy data cleanup: lists every product not in the Rewire product sheet and every saved address it would delete. Add `--apply` to delete them. See the section below | Any, dry run first, after a backup |
| `npm run db:studio` | Prisma Studio, a browser view of the data | Local |

Commit a new migration folder in the same commit as its model change, and never
edit a merged migration ([DATA-LAYER.md](DATA-LAYER.md)).

**Never on a shared database** (staging, production, anyone else's):

1. `prisma db push`. It changes the schema without a migration, so the
   migration history and the database drift apart.
2. `prisma migrate reset`. It drops every table and all data.
3. Answering yes when `prisma migrate dev` offers a reset after detecting
   drift. Stop and find the cause instead.

**Seed warning.** `npm run db:seed` runs every seed. It rewrites every policy
page and the whole homepage (draft and live), resets the seeded Admin's
password to `SEED_ADMIN_PASSWORD`, and upserts the sample catalogue; delivery
zones are only added where missing. Run it once on a new database. On a
database with real edits, do not run it again.

### Dummy data cleanup

`prisma/cleanup-dummy-data.ts` removes test data once the real catalogue has
been imported from the Rewire product sheet (the Products tab of the Bulk Upload
workbook, [BULK-UPLOAD.md](BULK-UPLOAD.md)).

```bash
npm run db:cleanup:dummy -- --sheet "C:\path\to\Rewire-Product-Upload-Sheet.xlsx"           # dry run
npm run db:cleanup:dummy -- --sheet "C:\path\to\Rewire-Product-Upload-Sheet.xlsx" --apply   # delete
```

What it does:

1. **Keeps** a product when its slug is in the sheet, or any of its variant SKUs
   is (SKU match ignores case, as the importer does). A kept product is never
   changed, even when it has variants the sheet does not list.
2. **Deletes permanently** every other product, live or in Trash, through
   `deleteProduct` and `purgeProduct` (the same path as Trash, Delete
   permanently, [TRASH-AUDIT.md](TRASH-AUDIT.md)). Cart lines, homepage picks,
   campaign and coupon links go with it; order lines keep their copy and lose
   only the variant link; releases are unlinked, not deleted.
3. A product the purge refuses (in a release with reserved, sold or returned
   units) stays in Trash and is listed under Skipped. The run carries on.
4. **Deletes every saved address.** Orders hold their own copy of the address,
   so no order changes.
5. **Refuses to apply** when the sheet is empty or any sheet product is missing
   from the database. That guard stops a run against the wrong database from
   deleting the whole catalogue.
6. Brands, categories, add-ons, orders and users are not touched.

The dry run prints the database host and name (never the credentials), every
product it would delete or keep, the saved address count, what is linked to the
products being deleted, and the row counts of tables that must not change.
`--apply` then deletes, reads everything again and checks that only sheet
products remain, no sheet product or SKU was lost, no saved address is left and
those row counts are unchanged. It exits with code 1 on a blocker or a failed
check. Running it again is safe: a finished cleanup has nothing left to delete.

Before `--apply`, back up the database (`pg_dump -Fc`). The purge writes no
change log entries, because the script has no signed in admin; the printed
report is the record. The storefront category list is cached for up to five
minutes, so it can show the old counts until then.

The planner is `src/lib/dummy-cleanup.ts` (`sheetCatalogue`,
`planProductCleanup`) and the database side is
`src/services/dummy-cleanup.service.ts` (`loadCleanupSnapshot`, `applyCleanup`,
`verifyCleanup`, `cleanupProblems`). Their tests sit beside them. The npm script
runs tsx with `--conditions=react-server` so the `server-only` services load
outside Next.

---

## 5. Checks

```bash
npm test             # Vitest, src/**/*.test.ts
npx tsc --noEmit     # type check
npm run lint         # ESLint
npm run build        # production build (Turbopack)
```

Run all four before a commit or a pull request. Green checks do not prove a
screen works; open it in the browser as well.

---

## 6. Deploy

In this order:

```bash
npm ci               # clean install from the lockfile; also runs prisma generate
npm run db:deploy    # apply pending migrations
npm run build        # production build
npm run start        # serve on port 3000; npm run start -- -p <port> for another
```

Migrations go before the build so the new code never runs against the old
schema. Keep migrations additive where possible, since the old build serves
traffic against the new schema until the restart.

**On a new database only**, after `npm run db:deploy`:

1. Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`, then run
   `npm run db:seed` once.
2. Sign in as that Admin and set email and the site address on the API
   Credentials screen, then switch the mode to LIVE
   ([INTEGRATIONS.md](INTEGRATIONS.md)).
