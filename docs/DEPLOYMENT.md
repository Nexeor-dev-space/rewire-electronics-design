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
| `build` | Copies the source and runs `npm run build` | No |
| `runtime` | Copies `.next/standalone`, `.next/static` and `public/`, runs `node server.js` as `node` | Yes |

The `postinstall` script runs `prisma generate`, so three things are copied
before `npm ci`:

1. `prisma7.config.ts`, which tells Prisma the schema is the `prisma/schema`
   folder.
2. `src/lib/db-url.ts`, which that config imports.
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

### Runtime settings

| Variable | Value | Why |
| --- | --- | --- |
| `PORT` | `3000` | The port the server listens on; `EXPOSE 3000` matches it |
| `HOSTNAME` | `0.0.0.0` | Docker sets `HOSTNAME` to the container id and `server.js` binds to it. Without this the server does not answer on `localhost`, so the healthcheck fails |
| `NODE_ENV` | `production` | |
| `NEXT_TELEMETRY_DISABLED` | `1` | |

No new environment variables were added. `DATABASE_URL` and `AUTH_SECRET` are
still set in Coolify as before (see [INTEGRATIONS.md](INTEGRATIONS.md)).

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

The runtime image does not contain the `prisma` CLI, so
`prisma migrate deploy` cannot run inside the container. Until a migration
step is added to the deploy, run `npm run db:deploy` from a machine with the
repo and the production `DATABASE_URL` before deploying a release that
includes a migration.

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
