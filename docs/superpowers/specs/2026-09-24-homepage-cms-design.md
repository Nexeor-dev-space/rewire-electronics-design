# Homepage CMS — design

The storefront homepage rendered from a published, database-managed section
list, and a basic console screen to edit, reorder, show/hide and publish it.
Prisma models, `/api/v1/admin/homepage` endpoints, React Query hooks, the admin
screen and the storefront wiring.

- Route: `/admin/storefront/homepage`
- Branch: `feat-29-Wire-Design,-Homepage,-CM`, based on `main` at `1896ccd`
- Status: implemented without §6. **Scope change (2026-09-25):** the issue's
  §8 gives section editing, ordering, visibility, drafts, preview and publish
  UI to the separate Page Builder issue, so the admin screen (§6) was built
  and then removed. This issue ships the model, the admin API, the storefront
  consumption and permission enforcement; the Page Builder builds on the API.

---

## 1. Scope

In scope — the Homepage CMS section of issue P1 "Wire Design, Homepage, CMS":

- Section model with ordering, visibility, and whole-page draft / publish.
- Admin API, hooks and a basic editing screen (the fuller Page Builder is its
  own issue and builds on these endpoints).
- The homepage renders from the published configuration.

Out of scope:

- **Staff & Roles.** Staff accounts already exist (`/admin/users/staff`).
  Configurable roles/permissions are a separate piece of work.
- **Product and release data.** P2 owns products, P3 owns releases. Sections
  that show products or drops keep their current item source
  (`src/lib/products.ts`, `src/lib/drops.ts`); the CMS owns only their copy,
  order and visibility. P2/P3 rewire the item source later. No product,
  inventory, pricing or availability data is stored here.
- **Curated product sections.** Need P2's product API to pick from. Added
  when it lands.
- **Scheduling** (start/end dates on seasonal content) and **draft preview**.
  Proposed follow-ups.

---

## 2. What this builds on

| Already there | Used for |
| --- | --- |
| `src/lib/api/api-response.ts` | `apiSuccess`, `apiError`, `ServiceError`, `apiErrorFrom` |
| `src/lib/api/api-client.ts`, `api-endpoints.ts` | `apiRequest`; every path in one place |
| `src/lib/auth/session.ts`, `permissions.ts` | `authorizeApi`, `getSession`, `hasPermission`, `PERMISSIONS` |
| `prisma/schema/media.prisma`, `src/lib/storage/image-storage.ts` | Image storage and the orphan sweep |
| `src/components/admin/shared/image-field.tsx` | Banner image upload |
| `src/hooks/use-brand.ts`, `use-category.ts` | Brand and category pickers |
| `src/components/admin/policy/policy-editor.tsx` | Precedent for `Reorder` drag-to-reorder |
| `src/components/ui/dialog.tsx`, `confirm-dialog.tsx` | Edit modal, publish/discard/delete confirms |

The Categories & Brands module is the structural precedent. Where this spec is
silent, follow it.

`src/lib/admin-nav.ts` already declares `/admin/storefront/homepage` (key
`homepage`), so the sidebar row and breadcrumbs exist.

---

## 3. Decisions

### 3.1 Whole-page draft, one Publish

Staff edit a draft of the entire homepage — content, order, visibility.
Shoppers see only the last published version. **Publish** pushes the whole
draft live at once; **Discard draft** resets the draft to what is live.
Unpublishing a section means hiding it in the draft and publishing. A
half-finished rearrangement can never reach shoppers.

### 3.2 Two stages of real rows, not a JSON snapshot

Each section exists twice: a `DRAFT` row and a `LIVE` row. Publish, in one
transaction, deletes the `LIVE` rows and copies every `DRAFT` row as `LIVE`.
Discard does the reverse.

A JSON snapshot was rejected because images must be real foreign keys: the
orphan sweep in `image-storage.ts` deletes any `MediaAsset` nothing references
after 24 hours. An image id held only inside JSON would be swept, and the live
banner would lose its picture a day later.

### 3.3 The CMS owns copy and placement; items keep their source

| Type | Items from | Editable fields | Cardinality |
| --- | --- | --- | --- |
| `HERO` | live drop — `drops.ts` (P3) | title\*, eyebrow, subtitle, description | fixed, one |
| `UPCOMING_DROPS` | `drops.ts` (P3) | title\*, eyebrow, subtitle, ctaLabel, ctaHref | fixed, one |
| `BEST_SELLERS` | `products.ts` (P2) | title\*, eyebrow, subtitle, ctaLabel, ctaHref | fixed, one |
| `CONDITIONS` | `CONDITION_META` | title\*, eyebrow, subtitle | fixed, one |
| `TESTIMONIALS` | `testimonials.ts` | title\*, subtitle | fixed, one |
| `FAQ` | the `faq` policy | title\*, subtitle | fixed, one |
| `INVITATION` | next drop — `drops.ts` (P3) | title\*, ctaLabel\*, subtitle | fixed, one |
| `PROMO_BANNER` | CMS | title\*, image, eyebrow, subtitle, description, ctaLabel, ctaHref, seasonal | 0..n |
| `FEATURED_BRANDS` | `Brand` table | title\*, eyebrow, subtitle, ctaLabel, ctaHref, brands\* (ordered) | 0..n |
| `FEATURED_CATEGORIES` | `Category` table | title\*, eyebrow, subtitle, ctaLabel, ctaHref, categories\* (ordered) | 0..n |

\* required. Fixed sections can be reordered and hidden but not created or
deleted. Each fixed type exposes exactly the slots that hold static copy in its
component today (the Hero has no button; the Invitation's button opens the
waitlist, so it has a label and no link). A heading's line breaks are kept: a
new line in `title` starts a new line of the heading. `ctaLabel` and `ctaHref`
are filled together or not at all.

`seasonal` is a label on a promo banner (for the admin list and a storefront
eyebrow style), not a schedule.

### 3.4 Defaults live only in the seed

Today's hardcoded homepage copy moves into `prisma/seed.ts`, which creates both
the `DRAFT` and `LIVE` rows. The app keeps no fallback copy. With nothing
published the homepage renders header and footer only. Like the policy seed,
re-seeding resets the homepage and overwrites published edits — documented.

### 3.5 Missing brands and categories are skipped, not blocked

`refIds` holds brand or category ids. Ids are validated on save; a brand or
category deleted later is simply skipped when the section renders. Brand and
category deletes are not blocked by homepage usage. Because the storefront read
is cached, brand and category updates and deletes also revalidate the
`homepage` tag, so a renamed or deleted brand never lingers on the homepage
with a broken image.

Item links are best effort until P2 owns listing routes: a brand links to
`/collection?brand=<name>` (the shop ignores names it doesn't know), and a
category links to `/collection/<slug>` only when the shop's `resolveCategory`
recognises it, otherwise to `/collection`.

---

## 4. Data model

`prisma/schema/homepage.prisma`:

```prisma
enum HomepageStage {
  DRAFT
  LIVE
}

enum HomepageSectionType {
  HERO
  UPCOMING_DROPS
  BEST_SELLERS
  CONDITIONS
  TESTIMONIALS
  FAQ
  INVITATION
  PROMO_BANNER
  FEATURED_BRANDS
  FEATURED_CATEGORIES
}

model HomepageSection {
  id          String              @id @default(cuid())
  stage       HomepageStage
  type        HomepageSectionType
  sortOrder   Int
  visible     Boolean             @default(true)
  seasonal    Boolean             @default(false)
  eyebrow     String?
  title       String?
  subtitle    String?
  description String?
  ctaLabel    String?
  ctaHref     String?
  imageId     String?
  image       MediaAsset?         @relation(fields: [imageId], references: [id], onDelete: SetNull)
  /// Brand or Category ids, in display order. Missing ids are skipped on render.
  refIds      String[]
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  @@index([stage, sortOrder])
  @@map("homepage_sections")
}

/// Single row, id "homepage".
model HomepageState {
  id             String    @id
  draftUpdatedAt DateTime
  publishedAt    DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@map("homepage_state")
}
```

`MediaAsset` gains `homepageSections HomepageSection[]`. Both the orphan sweep
(`image-storage.ts`) and the delete-old-image check (`media.service.ts`) add
`homepageSections: { none: {} }`.

`hasUnpublishedChanges` = `publishedAt === null || draftUpdatedAt > publishedAt`.
Every draft mutation bumps `draftUpdatedAt`.

The migration is generated and applied by the repo owner
(`npm run db:migrate -- --name add-homepage-sections`) and committed with the
model change.

---

## 5. API

All under `src/app/api/v1/admin/homepage/`, each starting with
`authorizeApi(PERMISSIONS.homepage)`. Rules in `src/services/homepage.service.ts`,
inputs in `src/validators/homepage.validator.ts`, types in `src/types/homepage.ts`.

| Route | Does |
| --- | --- |
| `GET /admin/homepage` | Draft sections in order, plus `{ hasUnpublishedChanges, publishedAt }` |
| `POST /admin/homepage/sections` | Add a `PROMO_BANNER`, `FEATURED_BRANDS` or `FEATURED_CATEGORIES` (422 for other types); appended last |
| `PUT /admin/homepage/sections/[id]` | Update a draft section's allowed fields and `visible` |
| `DELETE /admin/homepage/sections/[id]` | Delete an added section; 409 for fixed types |
| `PUT /admin/homepage/order` | `{ ids }` — must equal the draft id set exactly (422 otherwise) |
| `POST /admin/homepage/publish` | Draft → live in one transaction; revalidate. 409 when the draft is empty |
| `POST /admin/homepage/discard` | Live → draft in one transaction. 409 when nothing has been published |

- **Bounded.** The draft is capped at 30 sections; adding a 31st is 409. The
  `GET` therefore returns one bounded list, not a paginated one — stated in the
  module doc, per DATA-LAYER §4.
- **Per-type validation.** The update schema is a discriminated union on
  `type`; fields a type doesn't allow are rejected, not silently dropped.
- **Links.** `ctaHref` accepts site-relative paths (`/…`, not `//…`) and
  `https:` URLs only.
- **References.** `refIds` must all exist in `Brand` / `Category` at save
  time (422 on the field); at most 12.
- **Images.** `imageId` must reference an existing `MediaAsset`. Replacing or
  clearing a banner image deletes the old asset once nothing references it
  (existing `media.service.ts` helper).
- **Only draft rows** are ever addressed by id; a `LIVE` id answers 404.

Paths added to `api-endpoints.ts` under `homepage`. Hooks in
`src/hooks/use-homepage.ts`: `useGetHomepageDraft`, `useAddHomepageSection`,
`useUpdateHomepageSection`, `useDeleteHomepageSection`,
`useReorderHomepageSections`, `usePublishHomepage`, `useDiscardHomepageDraft`.
Keys start with `["homepage"]`; every mutation invalidates them.

---

## 6. Admin screen

`src/app/admin/storefront/homepage/page.tsx` — permission check, renders
`HomepageBuilder`. Route added to `BUILT_ROUTES`.

`src/components/admin/homepage/`:

- **Status bar.** "Live · published <date>" or an "Unpublished changes" badge;
  **Discard draft** and **Publish**, each behind a `ConfirmDialog`, disabled
  when there are no unpublished changes.
- **Section list.** Drag handle (framer `Reorder` + `dragControls`, as the
  policy editor), type label, title (or type name when untitled), seasonal tag,
  Visible/Hidden switch, Edit, Delete (added types only). Dropping a row saves
  the new order.
- **Edit modal.** Shows only the type's fields. `ImageField` for banners. For
  brand/category sections, a picker fed by `useGetBrands` / `useGetCategories`
  with search, and a reorderable list of the chosen items.
- **Add section** menu: Promo banner, Featured brands, Featured categories.
- Loading skeleton, error with retry, and mutation loading/error states per
  DATA-LAYER §7.

---

## 7. Storefront

- `src/services/homepage.service.ts` exports `getPublishedHomepage()`: visible
  `LIVE` sections in order, with brand/category refs resolved (missing ones
  dropped). Wrapped in `unstable_cache`, tagged `homepage`.
- Publish calls `revalidateTag("homepage")` and `revalidatePath("/")`.
- `src/app/(site)/page.tsx` maps each section through a `type → component`
  table in `src/components/home/homepage-sections.tsx`.
- Existing sections (`Hero`, `UpcomingDrops`, `Featured`, `WhatYouHave`,
  `Stories`, `Faq`, `Invitation`) take their editable copy as props instead of
  inline strings; item data sources are unchanged.
- New: `PromoBanner`, `FeaturedBrands`, `FeaturedCategories` in
  `src/components/home/`, built on design-system tokens and `src/lib/motion.ts`.
  Images via `/api/v1/media/[id]`. A featured section whose refs all resolve to
  nothing is not rendered.
- A section whose required copy is empty (e.g. a banner with no title) is not
  rendered rather than rendering blank chrome.

---

## 8. Permissions

`PERMISSIONS.homepage = adminPermission("storefront", "homepage")`. Admin and
Staff hold it today through `"*"`.

---

## 9. Docs

- New `docs/HOMEPAGE-CMS.md`: model, stages, publish/discard, section types,
  what P2/P3 rewire later, seed behaviour.
- `docs/ADMIN-PANEL.md`: Homepage module entry and permission key; image
  orphan sweep now counts homepage sections.
- `AGENTS.md` table: add the new doc.

---

## 10. Verification

No test runner exists in the repo. Agents here may not run commands that read
`.env` (`next build`, `next dev`, Prisma CLI).

- Agent: `npm run lint`, `npx tsc --noEmit`.
- Owner: `npm run db:migrate -- --name add-homepage-sections`,
  `npm run db:seed`, `npm run build`, then:
  1. The homepage looks identical to today after seeding.
  2. Edit a title → storefront unchanged → Publish → storefront changes.
  3. Hide and reorder sections → Publish → reflected.
  4. Add a banner with an image, a featured-brands and a featured-categories
     section → Publish → rendered; image still present after 24 h.
  5. Discard draft reverts the console to the live state.
  6. Signed-out and customer requests to `/api/v1/admin/homepage` → 401 / 403.
