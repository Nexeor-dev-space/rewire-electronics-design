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

`.env` at the repo root is for values the app needs before it can reach the
database, and for the seed. Nothing else.

| Variable | Read by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | App, Prisma CLI, seed | PostgreSQL URL. No quotes, no space after `=` ([POLICY-CMS.md](POLICY-CMS.md) §7) |
| `AUTH_SECRET` | App | At least 32 characters. Signs sessions and the guest cart cookie, and derives the key that encrypts stored credentials. Changing it signs everyone out and makes every stored credential unreadable |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Seed only | The first Admin. The seed refuses a password under 8 characters, and skips the Admin when either is unset |
| `SEED_ADMIN_NAME`, `SEED_ADMIN_PHONE` | Seed only, optional | Default "Administrator" and "+971 00 000 0000" |

`SMTP_*`, `EMAIL_FROM` and `APP_URL` are **not** read from `.env`; setting
them there does nothing. An Admin sets them at Governance → **API
Credentials** (`/admin/settings/integrations`), where they are stored
encrypted. See [INTEGRATIONS.md](INTEGRATIONS.md).

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
| `npm run db:studio` | Prisma Studio, a browser view of the data | Local |

Commit a new migration folder in the same commit as its model change, and never
edit a merged migration ([DATA-LAYER.md](DATA-LAYER.md)).

**One setting per database, outside the migrations.** Catalogue search needs
`pg_trgm`, which the migrations install, and one threshold that `ALTER DATABASE`
owns rather than the schema, because setting it per request would leak across
the connection pool:

```sql
ALTER DATABASE <database> SET pg_trgm.word_similarity_threshold = 0.3;
```

Run it once per database, including every new one, and restart the app so new
connections pick it up. Check it with `SHOW pg_trgm.word_similarity_threshold`
after a `SELECT similarity('x','x')` to load the module. Miss it and search
still works but stops tolerating typos — see
[CATALOGUE.md](CATALOGUE.md) "Search".

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
