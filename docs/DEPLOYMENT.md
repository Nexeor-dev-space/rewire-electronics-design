# Deployment

How the app is packaged and deployed on Coolify.

Read this before changing the `Dockerfile`, `.dockerignore`, the `output`
setting in `next.config.ts`, the Node version, or the Coolify build settings.

---

## 1. Why a Dockerfile instead of Nixpacks

Nixpacks builds a single stage image. The final image keeps everything the
build needed: the Node toolchain, devDependencies, the source tree,
`.next/cache` and the npm cache. Our Nixpacks image measured **2.53 GB**.

The `Dockerfile` builds in stages and ships only what the server loads, using
Next's standalone output. It also gives:

1. Faster builds, pulls and deploys, and less disk use on the server.
2. A smaller attack surface: no dev tools, compilers or source in production.
3. A non root runtime user (`node`).
4. Reproducible builds: Node pinned to the `.nvmrc` major, `npm ci` against the
   lockfile.

---

## 2. Files

| File | Purpose |
| --- | --- |
| `Dockerfile` | Stage build: `deps`, `build`, `runtime` |
| `.dockerignore` | Keeps `node_modules`, `.next`, `.git`, logs and every `.env*` file out of the build |
| `next.config.ts` | `output: "standalone"` |
| `.nvmrc` | Node major version; the `Dockerfile` base image must match it |

---

## 3. How the image is built

| Stage | What it does | In the final image |
| --- | --- | --- |
| `base` | `node:24-alpine`, working folder `/app` | Yes, as the base |
| `deps` | Copies `package.json`, `package-lock.json`, the Prisma config and `prisma/`, runs `npm ci` (which runs `prisma generate`) | No |
| `build` | Copies the source, applies pending migrations with `npm run db:deploy`, then runs `npm run build` | No |
| `runtime` | Copies `.next/standalone`, `.next/static` and `public/`, runs `node server.js` as `node` | Yes |

The `postinstall` script runs `prisma generate`, so three things are copied
before `npm ci`:

1. `prisma7.config.ts`, which tells Prisma the schema is the `prisma/schema`
   folder.
2. `src/lib/env.ts`, which that config imports, and `src/lib/constants.ts`,
   which `env.ts` imports.
3. `prisma/`, the schema itself.

If `prisma7.config.ts` gains another import, copy that file in the `deps`
stage too.

### Standalone output

With `output: "standalone"`, `next build` writes `.next/standalone/`: a
`server.js` and a trimmed `node_modules` holding only the files Next traced as
imported at runtime. Nothing is installed in the runtime stage.

The standalone folder leaves out `public/` and `.next/static/`, so the
`Dockerfile` copies them in.

Tracing only finds imported files. A file the server reads from disk at
runtime must be added with `outputFileTracingIncludes` in `next.config.ts`.

### Build memory

The `build` stage sets `NODE_OPTIONS=--max-old-space-size=2048`. Without it the
build failed on Coolify with `JavaScript heap out of memory` at about 768 MB.
Type checking the project alone uses about 785 to 935 MB.

1. The value is a ceiling, not a reservation. The build only uses what it needs.
2. It applies to the `build` stage only and does not reach the runtime image.
3. Next removes this flag from its static page workers, so it only raises the
   limit for the main build process and the type checking worker. If the heap
   error returns after this, look at the static page workers first.
4. If the build is killed with exit code `137` instead of a heap error, the
   server itself ran out of memory, and a higher value will not help.

### Runtime settings

| Variable | Value | Why |
| --- | --- | --- |
| `PORT` | `3000` | The port the server listens on; `EXPOSE 3000` matches it |
| `HOSTNAME` | `0.0.0.0` | Docker sets `HOSTNAME` to the container id and `server.js` binds to it. Without this the server does not answer on `localhost`, so the healthcheck fails |
| `NODE_ENV` | `production` | |
| `NEXT_TELEMETRY_DISABLED` | `1` | |

Set these in the Coolify environment (see [INTEGRATIONS.md](INTEGRATIONS.md)):
`DATABASE_URL` (also as a build variable), `AUTH_SECRET`, `SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` and `APP_URL`. Without the
SMTP login and `APP_URL`, production email is off and the log says
`email transport: OFF`.

### Media storage (MinIO)

Uploaded images live in a MinIO bucket, under `media/<id>`. Pages link straight
to the bucket; the MinIO keys never leave the server.

| Variable | Required | Build variable too | Meaning |
| --- | --- | --- | --- |
| `MINIO_ENDPOINT` | yes | yes | Host only, e.g. `minio.example.com` (no `https://`, no path) |
| `MINIO_ACCESS_KEY` | yes | **no** | Server-only |
| `MINIO_SECRET_KEY` | yes | **no** | Server-only |
| `MINIO_BUCKET` | yes | yes | e.g. `rewire-media`: lowercase letters, numbers, dots and hyphens |

MinIO is always reached over HTTPS on the default port, and image links are
`https://MINIO_ENDPOINT/MINIO_BUCKET/media/<id>`.

`MINIO_ENDPOINT` and `MINIO_BUCKET` are needed at **build** time as well, because
`next.config.ts` allows the image optimiser to fetch from that host when the
app is built. The `Dockerfile` receives them as `ARG`s. Without them, product
cards and the hero (which go through the optimiser) show broken images.

**Bucket.** The first upload creates the bucket if it is missing and, if the
bucket has no policy yet, makes `media/*` publicly readable (read only; nobody
anonymous can list or write). If the keys aren't allowed to set a policy, the
log says so; set it by hand once:

```sh
mc anonymous set download myminio/rewire-media/media
```

**One bucket per environment.** Staging and production must not share a
bucket. Uploads clean up after themselves: once an hour the app removes
objects under `media/` that are over a day old and have no row in *its own*
database. A shared bucket would let staging delete production's images.

Without MinIO settings, uploads answer "Image storage isn't set up yet" and
image links fall back to `/api/v1/media/<id>`.

### Moving existing images to MinIO

Images uploaded before MinIO sit in the database (`media_assets.data`).
`npm run db:media-to-minio` copies them to the bucket. It only reads, can run
again safely, and skips anything already copied. Run it from a machine with
the repo, with `DATABASE_URL` and the `MINIO_*` variables of the target
environment (the runtime image has no `tsx`).

1. Run `npm run db:media-to-minio` **before** deploying, so every existing
   image is in the bucket when pages start linking there.
2. Deploy. The migration makes `data` optional.
3. Run `npm run db:media-to-minio` again straight away, for anything uploaded
   between step 1 and the deploy.
4. Once the site shows images from MinIO, run
   `npm run db:media-to-minio -- --clear`. It empties `data` on every copied
   row, which frees the database space.

Old `/api/v1/media/<id>` links (order emails, search results) keep working:
they redirect to the bucket. After `npm run db:seed`, run the script too,
because the seed writes catalogue images straight into the database.

---

## 4. Coolify settings

1. **Build pack:** Dockerfile.
2. **Ports exposes:** `3000`.
3. **`DATABASE_URL`:** must be available at build time ("Build Variable"),
   because `next build` checks it while collecting page data. The `Dockerfile`
   receives it as `ARG DATABASE_URL`. It is used by the `build` stage only and
   is not copied into the runtime image.
4. **Healthcheck (optional):** HTTP `GET`, host `localhost`, port `3000`,
   path `/`, expected code `200`. Interval 30, timeout 5, retries 3, start
   period 30. Alpine ships `wget`, which Coolify uses to run the check.

---

## 5. Migrations

Migrations apply automatically on every deploy. The `build` stage runs
`npm run db:deploy` (`prisma migrate deploy`) before `npm run build`, against
the database in that app's build `DATABASE_URL`. This is the order in
[COMMANDS.md](COMMANDS.md) §6, and the Next.js convention of migrating in the
build step.

Staging and production are two Coolify apps that both deploy the `current`
branch, each with its own database. Each app migrates its own database when it
builds, so no one runs migrations by hand.

The step only applies committed migrations. It never creates a migration,
resets, pushes the schema or seeds.

Conditions:

1. The build must reach the database through the build `DATABASE_URL`. If it
   cannot connect, the build fails at the migration step and Coolify keeps the
   previous version running. Point the build variable at a host the build can
   reach.
2. A push to `current` migrates staging and production in the same round of
   deploys. A broken migration fails both deploys, and both keep their
   previous version.
3. Migrations run while the old version still serves traffic, so keep them
   additive: add columns and tables rather than renaming or dropping in the
   same release.
4. If the build fails after the migration applied, the database is ahead of
   the running code. The additive rule keeps that safe.
5. Rolling back to an older image in Coolify does not roll back the database.
6. With the Docker build cache on, the step reruns whenever a source file
   changes, which every commit does. Redeploying an identical commit from cache
   may skip it, which is harmless because nothing is pending.

To check or apply by hand, run `npx prisma migrate status` (read only) or
`npm run db:deploy` from a machine with the repo and that environment's
`DATABASE_URL`.

The runtime image does not contain the `prisma` CLI, so migrations cannot run
inside the running container.

---

## 5a. Go live checklist

Before the first customer:

1. Deploy once. The build applies every migration (section 5); check the
   build log for the `prisma migrate deploy` output.
2. Sign in to the admin and open Governance, VAT & Configuration. Fill
   **Contact & invoice details**: legal name, TRN, address, support email,
   phone number, WhatsApp number and support hours (in Gulf time). Until they
   are filled the storefront, emails and invoices show no contact at all, and
   Live Chat is hidden. See [VAT.md](VAT.md).
3. Check the VAT rate on the same screen.
4. Place a test order and open the support menu, Support page, footer, a
   product page and the order email to confirm the contact details show.

---

## 6. Build and measure locally

From the repo root (in WSL on Windows):

```bash
docker build -t rewire-standalone --build-arg DATABASE_URL=postgresql://x:x@localhost:5432/x .
docker images rewire-standalone
docker run --rm -p 3000:3000 -e DATABASE_URL=<real url> -e AUTH_SECRET=<secret> rewire-standalone
```

Always compare sizes with the same measure. The baseline above is the
`docker images` size of the Nixpacks image built locally with
`nixpacks build . --name rewire-nixpacks`.

| Image | Size (`docker images`) |
| --- | --- |
| Nixpacks | 2.53 GB |
| Dockerfile (standalone) | to be measured |

---

## 7. Go live checklist

After the first production deploy, on the admin Integrations, API Keys
screen:

1. Enter and save the GA4, Microsoft Clarity and Google Search Console values.
2. Press Test on each of them; each should find its tag on the homepage.
3. Verify the site in Google Search Console.
4. Test Email and Stripe. Both read their values from the Coolify environment
   (section 3 and [PAYMENTS.md](PAYMENTS.md) §8).

Nothing on that screen is required for the site to run. The full steps are in
[INTEGRATIONS-ADMIN.md](INTEGRATIONS-ADMIN.md) §14.
