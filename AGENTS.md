# AGENTS.md

Instructions for AI coding agents working in this repository.

Rewire Electronics — a Next.js 15 (App Router) storefront and admin console.
TypeScript, Tailwind v4, Prisma 7 on PostgreSQL, Zod, React Query.

## Read before you change code

The docs in `docs/` are the contract. Read the one that matches the task
**before** writing code, and follow it over your own defaults.

| If the task touches… | Read |
| --- | --- |
| Prisma models, migrations, API routes, `api-endpoints.ts`, React Query hooks, or any component that loads or saves data | [docs/DATA-LAYER.md](docs/DATA-LAYER.md) |
| Pages, components, styling, motion, loading states | [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) |
| Admin console, sidebar, admin routes | [docs/ADMIN-PANEL.md](docs/ADMIN-PANEL.md) |
| Policy pages, rich text, the policy editor | [docs/POLICY-CMS.md](docs/POLICY-CMS.md) |
| Header, footer, menus, storefront routes | [docs/STOREFRONT-NAVIGATION.md](docs/STOREFRONT-NAVIGATION.md) |
| Products, the Product API, shop and product pages, catalogue admin | [docs/CATALOGUE.md](docs/CATALOGUE.md) |

If a task spans several areas, read each matching doc.

## Data layer — the rules that matter most

Full detail and a worked example are in [docs/DATA-LAYER.md](docs/DATA-LAYER.md).

1. **Model** — create or update it in `prisma/schema/<module>.prisma`.
2. **Migration** — run `npm run db:migrate -- --name <change>` and commit the
   migration folder **in the same commit** as the model change. Never edit a
   merged migration.
3. **API** — `src/app/api/v1/<module>/…/route.ts`. Validate every input with a
   Zod schema from `src/validators/`, check the session and ownership, and
   return only through `apiSuccess` / `apiError`.
4. **Endpoint path** — add it to `src/lib/api/api-endpoints.ts`. No path
   strings inside hooks or components.
5. **Hook** — add queries and mutations to `src/hooks/use-<module>.ts`, calling
   `apiRequest`. Mutations invalidate the module's query keys.
6. **UI** — call the hook; handle loading, error, empty and data states.

Never:

- call `fetch` or load data in a `useEffect` inside a component;
- return `NextResponse.json` directly from an API route;
- import Prisma or `@/generated/prisma` into client code;
- return an unbounded list — paginate;
- store money as anything other than an `Int` in minor units.

## General conventions

- Server Components by default; add `"use client"` only for state, effects or
  animation.
- Colours, spacing, radius, easings and durations come from `globals.css` and
  `src/lib/motion.ts` — no magic values.
- Import with the `@/` alias (`@/*` → `src/*`).
- Match the style of the surrounding code and existing docs.

## Keep the docs true

If a change makes a doc wrong — a new convention, a renamed file, a changed
rule — update that doc in the same PR. If a doc's rule doesn't fit the task,
say so rather than silently working around it.

## Commands

```bash
npm run dev          # dev server (Turbopack)
npm run build        # production build
npm run lint         # ESLint
npm run db:migrate   # create + apply a migration locally
npm run db:deploy    # apply migrations in deployment
npm run db:seed      # seed the database
npm run db:studio    # Prisma Studio
```
