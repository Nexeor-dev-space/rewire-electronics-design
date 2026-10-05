# Homepage CMS

The storefront homepage, stored and published through a CMS API instead of
written into source. This document covers the shape of the data, the
publishing model, the API, what each section can hold, and what the Products
and Releases modules will change later.

Read this before adding a section type, touching the homepage's data, or
changing how publishing works.

---

## 1. What this is

The homepage used to be a fixed list of components whose copy was written
inline. It is now a list of **sections** stored in the database, changed
through the admin API under `/api/v1/admin/homepage`, and rendered by
`src/app/(site)/page.tsx` from whatever was last published. Changing a heading,
hiding a section, reordering the page or adding a promotional banner is a
publish, not a deployment.

Permission key: `storefront.homepage` (`PERMISSIONS.homepage`), checked by every
route.

**Scope.** This module is the backend, the storefront's consumption of it, and
the editing screen: Storefront → Homepage Builder, `/admin/storefront/homepage`
(§9). Staff preview the draft at `/preview/homepage` before publishing.

### Files

| File | Purpose |
| --- | --- |
| `prisma/schema/homepage.prisma` | `HomepageSection`, `HomepageState`, the stage and type enums |
| `src/lib/homepage-sections.ts` | The rules table — which fields each type carries — plus limits, `isSafeHref`, `headingLines`. Client-safe |
| `src/validators/homepage.validator.ts` | Zod schemas for a section body, a new section and a reorder |
| `src/types/homepage.ts` | Admin API and storefront response types |
| `src/services/homepage.service.ts` | Draft reads and writes, publish, discard, the cached storefront read |
| `src/app/api/v1/admin/homepage/` | The admin API — see below |
| `src/lib/api/api-endpoints.ts` | `API_ENDPOINTS.admin.homepage`, for the Page Builder's hooks |
| `src/hooks/use-homepage.ts` | React Query hooks for the admin API. Key `["homepage"]`; a successful mutation writes the returned draft into the cache with no refetch, a failed one reloads the draft |
| `src/lib/homepage-builder.ts` | Pure helpers for the builder: `swapItems`, `sectionToInput`, `emptySectionInput`, `validateSection`, `firstLine`, `flattenCategoryRefs`. Client-safe, unit tested |
| `src/components/admin/homepage/` | The builder screen, the section form and the brand and category picker |
| `src/app/admin/storefront/homepage/page.tsx` | The builder route, guarded by `storefront.homepage` |
| `src/app/(site)/preview/homepage/page.tsx` | The staff draft preview |
| `src/components/home/homepage-sections.tsx` | Renders a list of sections with the FAQ and product data they share. Used by `/` and the preview |
| `src/components/home/homepage-section.tsx` | Section type → storefront component |
| `src/components/home/{promo-banner,featured-brands,featured-categories}/` | The three section types staff can add |
| `src/components/home/shared/section-header.tsx` | Header and closing link those three share |
| `prisma/seed.ts` | The default homepage |

### Admin API

Every route answers with the whole draft (`HomepageDraft` in
`src/types/homepage.ts`): the draft sections in order, `hasUnpublishedChanges`
and `publishedAt`.

| Route | Does |
| --- | --- |
| `GET /api/v1/admin/homepage` | The draft |
| `POST /api/v1/admin/homepage/sections` | Add a `PROMO_BANNER`, `FEATURED_BRANDS` or `FEATURED_CATEGORIES`, appended last (201) |
| `PUT /api/v1/admin/homepage/sections/[id]` | Replace a draft section's fields and `visible` |
| `DELETE /api/v1/admin/homepage/sections/[id]` | Delete an added section; 409 for a fixed one |
| `PUT /api/v1/admin/homepage/order` | `{ ids }` — exactly the draft's ids, each once, in the new order |
| `POST /api/v1/admin/homepage/publish` | Draft → live |
| `POST /api/v1/admin/homepage/discard` | Live → draft |

Signed out → 401; without `storefront.homepage` → 403; a body that breaks a
type's rules → 422 with field errors.

---

## 2. Draft and live

Every section exists **twice**: a `DRAFT` row, which the admin API edits, and a
`LIVE` row, which the storefront reads. Every write — edit, show/hide, reorder,
add, delete — changes the draft immediately. Nothing reaches shoppers
until **Publish**, which in one transaction deletes the `LIVE` rows and copies
every `DRAFT` row as `LIVE`, then revalidates `/`.
**Discard draft** does the reverse: the draft goes back to exactly what is live.

A section is "unpublished" by hiding it and publishing. There is no
per-section publish state, so a half-finished rearrangement can never reach the
storefront piece by piece.

`HomepageState` (one row, id `homepage`) holds `draftUpdatedAt`, bumped by every
draft write, and `publishedAt`. The API's `hasUnpublishedChanges` is
`publishedAt === null || draftUpdatedAt > publishedAt`.

**Why rows and not a JSON snapshot of the draft.** Banner images must be real
foreign keys. The upload sweep deletes any `MediaAsset` nothing references once
it is a day old (`image-storage.ts`), so an image id held only inside JSON
would be collected and the live banner would lose its picture.

Only draft rows are ever addressed by id. A live id answers 404. Draft ids are
stable across publishes; Discard recreates the draft with new ids, which the
response carries.

Refusals: Publish with an empty draft is 409 (it would blank the storefront);
Discard before anything has been published is 409 (there is no live version to
return to).

---

## 3. Section types

`SECTION_RULES` in `src/lib/homepage-sections.ts` is the one place a type's
fields are defined. The service checks every write against it, and it is
client-safe so the Page Builder's form can read the same table to decide which
inputs to show.

| Type | Items come from | Editable fields | |
| --- | --- | --- | --- |
| `HERO` | live drop — `drops.ts` | title\*, eyebrow, subtitle, description | fixed |
| `UPCOMING_DROPS` | `drops.ts` | title\*, eyebrow, subtitle, button | fixed |
| `BEST_SELLERS` | catalogue — newest products | title\*, eyebrow, subtitle, button | fixed |
| `CONDITIONS` | `CONDITION_META` | title\*, eyebrow, subtitle | fixed |
| `TESTIMONIALS` | `testimonials.ts` | title\*, subtitle | fixed |
| `FAQ` | the `faq` policy | title\*, subtitle | fixed |
| `INVITATION` | next drop — `drops.ts` | title\*, button label\*, subtitle | fixed |
| `PROMO_BANNER` | the CMS | title\*, image, eyebrow, subtitle, description, button, seasonal | added |
| `FEATURED_BRANDS` | `Brand` table | title\*, eyebrow, subtitle, button, brands\* | added |
| `FEATURED_CATEGORIES` | `Category` table | title\*, eyebrow, subtitle, button, categories\* | added |

\* required.

- **Fixed** sections are part of the page: they can be moved and hidden, never
  added or deleted (a delete is 409). **Added** types can be created and
  deleted, up to 30 sections in all.
- A fixed type exposes exactly the slots its component used to hard-code. The
  Hero has no button; the Invitation's button opens the waitlist, so it has a
  label and no link.
- A **new line in a title** starts a new line of the heading
  (`headingLines`). That is how "Refurbished. / Ready to ship." keeps its break.
- A **button** is `ctaLabel` + `ctaHref`, filled together or not at all. With
  neither, the section renders without one.
- `ctaHref` accepts a site path starting with a single `/`, or an `https:`
  URL. `//host` is refused, and so is any link containing whitespace, a
  control character or a backslash anywhere: browsers strip tabs and newlines
  and read `\` as `/`, so `/\t/host` and `/\host` would both become `//host`.
  (The policy rich-text link rule doesn't yet check embedded tabs — a known
  follow-up.)
- Fields a type doesn't carry are **refused** with a field error, not silently
  dropped.
- **Seasonal** is a label on a promo banner (it shows a "Seasonal" badge), not
  a schedule.

---

## 4. Products (P2) and Releases (P3)

The CMS owns each section's copy, order and visibility. It stores no product,
price, stock or release data:

- **The product shelf** (`BEST_SELLERS`, set as "Just listed.") takes its
  products from the catalogue — `listNewestShopProducts(FEATURED_PRODUCTS_LIMIT)`
  in `src/services/catalogue.service.ts`, fetched by `src/app/(site)/page.tsx`
  and rendered with the shop's `ShopProductCard`. Name, image, price, stock and
  condition are the catalogue's. With no published products the shelf is left
  out.
- **The Hero, Upcoming drops and the Invitation** still read `src/lib/drops.ts`.
  Releases belong to P3, which replaces that source inside the components; the
  section rows don't change.
- **Curated product sections** (staff picking specific products) aren't built:
  they need a product reference in `refIds` and a picker in the Page Builder.

**Item links.** A brand opens `/collection?brand=<name>` — the shop matches
brands by name. A category opens `/collection/<slug>` using its catalogue slug.
Categories the shop wouldn't show (draft, archived, or under an unpublished
parent — the catalogue's `VISIBLE_CATEGORY`) are left out of the storefront.

---

## 5. Images and references

- `HomepageSection.imageId` is a relation to `MediaAsset`. Both the upload
  sweep and `releaseImage` count homepage sections of **either** stage as a
  reference, so a banner image replaced in the draft survives until a publish
  replaces the live row too. Publish and Discard release the images only the
  replaced rows used, after the copy.
- `refIds` holds brand or category ids in display order, checked to exist on
  save (422 on the field otherwise), at most 12. A brand or category deleted
  later is **skipped** when the section renders; a featured section with
  nothing left is not rendered at all. Brand and category deletes are not
  blocked by homepage use.
- The storefront read (`getPublishedHomepage`, which is
  `getHomepageSections("LIVE")`; the preview calls it with `"DRAFT"`, with
  the same skipping rules) is **not cached**: the
  homepage renders per request (`force-dynamic`), so it reads the live rows
  each time. A renamed, unpublished or deleted brand or category leaves the
  homepage immediately, and a seed shows up without clearing anything. (An
  earlier cached version outlived the seed and served an empty homepage.)

---

## 6. Limits

- **30 sections**, so `GET /api/v1/admin/homepage` returns one bounded list
  rather than a paginated one (see DATA-LAYER §4). **12** brands or categories
  per featured section. Text: eyebrow 60, title 120, subtitle 300,
  description 600, button label 40, button link 300 characters.
- **Writes run one at a time.** Every homepage write first locks the
  `homepage_state` row (`lockHomepage`), so two publishes can't both copy the
  draft and double the live page, and an edit can't slip in mid-publish and be
  marked as published.
- **No optimistic concurrency.** Two people editing the draft at once
  overwrite each other's field edits. A reorder sent from a stale tab (the set
  of sections changed) is refused with "The page changed since you loaded it".
- **Choosing brands and categories.** The Page Builder's picker reads the
  catalogue list endpoints, which check the
  `catalogue.brands` / `catalogue.categories` permissions. Today every console
  role holds all of them; a role narrowed later needs those two as well as
  `storefront.homepage`.
- **Promo images are decorative** (`alt=""`); there is no alt-text field yet.

---

## 7. Seed

`npm run db:seed` replaces the whole homepage — draft and live — with the copy
the sections carried before the CMS, and publishes it. Like the policy seed, it
overwrites anything changed through the API since. Images only the old rows
referenced are collected by the upload sweep. Because the storefront read
isn't cached, the seeded homepage shows up on the next page load.

The app itself holds no fallback copy. On a database with nothing published,
the homepage renders the header and footer only.

---

## 8. Adding a section type

1. Add the value to `HomepageSectionType` in `prisma/schema/homepage.prisma`
   and run a migration.
2. Add it to `HOMEPAGE_SECTION_TYPES` and `SECTION_RULES` in
   `src/lib/homepage-sections.ts` — and to `ADDABLE_SECTION_TYPES` if staff
   should be able to add it.
3. Build its component taking `{ section: PublishedSection }`.
4. Add a case to `src/components/home/homepage-section.tsx`. The switch is
   exhaustive, so the type-check fails until you do.
5. If it is fixed, add its default row to `homepage` in `prisma/seed.ts`.

---

## 9. Homepage Builder

Storefront → Homepage Builder, `/admin/storefront/homepage`. Signed out
redirects to sign in; a role without `storefront.homepage` sees "Access
denied". Everything on the screen edits the draft; shoppers see nothing until
Publish.

**Toolbar.**

1. Status: "Unpublished changes", "Never published", or "Published" with the
   date.
2. **Preview** opens `/preview/homepage` in a new tab.
3. **Discard draft** asks first. Disabled when there is nothing unpublished or
   nothing has ever been published.
4. **Publish** asks first. Disabled when there is nothing unpublished or the
   draft is empty.

**Section list**, in draft order. Each row shows the type, the first line of
its title, Seasonal and Hidden badges, a Visible checkbox, move up and down
buttons, Edit, and Delete for added types only. **Add section** offers the
addable types and is disabled at 30 sections. A note links to Content &
Policies, where the FAQ section's questions are edited.

**Section form.** One modal for every type. It shows only the fields
`SECTION_RULES` gives the type, with their length limits; the title is a
textarea because a new line starts a new heading line. Promo banners get the
shared image upload and a Seasonal checkbox; featured sections get the
picker. Before sending, `validateSection` runs the same schema and type rules
as the API, so most mistakes show without a round trip; the API's 422 field
errors land on the same inputs.

**Picker.** Searches brands or categories through the catalogue list
endpoints, one page of results (`PICKER_PAGE_SIZE`). Chosen items keep their
order, can be moved and removed, up to 12.

**Preview.** `/preview/homepage` renders the draft's visible sections with the
real header and footer through the same `HomepageSections` component as `/`.
Only staff with `storefront.homepage` can open it; anyone else gets a 404. It
is marked noindex. A bar at the bottom links back to the builder.

**Known edges.**

1. A featured section whose brands or categories were all deleted can't be
   shown or hidden from the list: the API asks for at least one item. The
   error names the section; choose new items in Edit.
2. Moving a section from a stale tab (a section was added or deleted
   elsewhere) is refused with "The page changed since you loaded it", and
   the list reloads.
3. No locking between editors: two people saving the same section overwrite
   each other (§6).
