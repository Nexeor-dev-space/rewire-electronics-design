# syntax=docker/dockerfile:1
# Node version matches .nvmrc. See docs/DEPLOYMENT.md.
FROM node:24-alpine AS base
WORKDIR /app

# ---- deps: full install (dev dependencies are needed to build) ----
FROM base AS deps
COPY package.json package-lock.json ./
# postinstall runs `prisma generate`, which needs the config, what it imports,
# and the schema.
COPY prisma7.config.ts ./
COPY src/lib/db-url.ts ./src/lib/db-url.ts
COPY prisma ./prisma
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# ---- build ----
FROM deps AS build
COPY . .
# Required while collecting page data; set as a build variable in Coolify.
ARG DATABASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
