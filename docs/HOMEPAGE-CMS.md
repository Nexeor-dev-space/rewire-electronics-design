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
| `prisma/schema/homepage.prisma` | `HomepageSection`, `HomepageSectionItem`, `HomepageState`, the stage and type enums |
| `src/lib/homepage-sections.ts` | The rules tables — which fields each section type and each item kind carries (`SECTION_RULES`, `ITEM_RULES`) — plus limits, `isSafeHref`, `headingLines`. Client-safe, unit tested |
| `src/validators/homepage.validator.ts` | Zod schemas for a section body (with its items), a new section and a reorder; `sectionIssueErrors` keys schema errors by path (`items.2.ctaHref`) |
| `src/types/homepage.ts` | Admin API and storefront response types |
| `src/services/homepage.service.ts` | Draft reads and writes, publish, discard, the cached storefront read |
| `src/app/api/v1/admin/homepage/` | The admin API — see below |
| `src/lib/api/api-endpoints.ts` | `API_ENDPOINTS.admin.homepage`, for the Page Builder's hooks |
| `src/hooks/use-homepage.ts` | React Query hooks for the admin API. Key `["homepage"]`; a successful mutation writes the returned draft into the cache with no refetch, a failed one reloads the draft |
| `src/lib/homepage-builder.ts` | Pure helpers for the builder: `swapItems`, `sectionToInput`, `itemToInput`, `emptySectionInput`, `emptyItemInput`, `validateSection`, `firstLine`, `flattenCategoryRefs`. Client-safe |
| `src/lib/homepage-sections.test.ts` | Unit tests for the deals item rule, the Season deals schedule and the one per homepage rule |
| `src/lib/dates.ts` | Store time helpers for drop release times and Season deals dates: `toStoreDateTimeInput`, `fromStoreDateTimeInput`, `formatStoreDateTime` (§4) |
| `src/components/admin/homepage/` | The builder screen, the section form, the brand picker, the items editor, the product picker and the category picker |
| `src/app/admin/storefront/homepage/page.tsx` | The builder route, guarded by `storefront.homepage` |
| `src/app/(site)/preview/homepage/page.tsx` | The staff draft preview |
| `src/components/home/homepage-sections.tsx` | Renders a list of sections with the FAQ and product data they share. Used by `/` and the preview |
| `src/components/home/homepage-section.tsx` | Section type → storefront component |
| `src/components/home/{hero,upcoming-drops,featured,stories}/` | The Hero, Upcoming drops, Just listed and Reviews sections |
| `src/components/home/{promo-banner,featured-brands,featured-categories}/` | The three section types staff can add |
| `src/components/home/deals/` | Best deals and Season deals (`DealsSection`), and the promo tile (`DealTile`) |
| `src/components/home/shared/section-header.tsx` | Header, closing link and product grid classes (`SHELF_GRID_CLASS`) the added sections share |
| `src/app/admin/storefront/{best-deals,season-deals}/page.tsx` | Redirect to the builder with that section's form open (§10) |
| `prisma/seed.ts` | The default homepage |

### Admin API

Every route answers with the whole draft (`HomepageDraft` in
`src/types/homepage.ts`): the draft sections in order, `hasUnpublishedChanges`
and `publishedAt`.

| Route | Does |
| --- | --- |
| `GET /api/v1/admin/homepage` | The draft |
| `POST /api/v1/admin/homepage/sections` | Add a `PROMO_BANNER`, `FEATURED_BRANDS`, `FEATURED_CATEGORIES`, `BEST_DEALS` or `SEASON_DEALS`, appended last (201). 409 for a second `BEST_DEALS` or `SEASON_DEALS` |
| `PUT /api/v1/admin/homepage/sections/[id]` | Replace a draft section's fields, `visible` and its `items` (§4) |
| `DELETE /api/v1/admin/homepage/sections/[id]` | Delete an added section; 409 for a fixed one |
| `PUT /api/v1/admin/homepage/order` | `{ ids }` — exactly the draft's ids, each once, in the new order |
| `POST /api/v1/admin/homepage/publish` | Draft → live |
| `POST /api/v1/admin/homepage/discard` | Live → draft |

Signed out → 401; without `storefront.homepage` → 403; a body that breaks a
type's rules → 422 with field errors. An item's errors are keyed by its
position: `items.2.title`.

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
storefront piece by piece. A section's items belong to its row, so Publish and
Discard copy them with it, and an item hidden in the draft stays on the
storefront until the next publish.

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

| Type (label) | Items come from | Editable fields | |
| --- | --- | --- | --- |
| `HERO` (Hero) | — | title\*, eyebrow, subtitle, description, button, image, mobile image | fixed |
| `UPCOMING_DROPS` (Upcoming drops) | drop items → catalogue products (§4) | title\*, eyebrow, subtitle, button, drops | fixed |
| `BEST_SELLERS` (Just listed) | product picks, else the newest products (§4) | title\*, eyebrow, subtitle, button, products | fixed |
| `CONDITIONS` (Conditions) | `CONDITION_META` | title\*, eyebrow, subtitle | fixed |
| `TESTIMONIALS` (Reviews) | review items (§4) | title\*, subtitle, reviews | fixed |
| `FAQ` | the `faq` policy | title\*, subtitle | fixed |
| `INVITATION` | next drop — `drops.ts` | title\*, button label\*, subtitle | fixed |
| `PROMO_BANNER` | the CMS | title\*, image, eyebrow, subtitle, description, button, seasonal | added |
| `FEATURED_BRANDS` | `Brand` table | title\*, eyebrow, subtitle, button, brands\* | added |
| `FEATURED_CATEGORIES` | category items (§4) | title\*, eyebrow, subtitle, button, categories\* | added |
| `BEST_DEALS` (Best deals) | product items (§4) | title\*, eyebrow, subtitle, description, button, image, products | added, one |
| `SEASON_DEALS` (Season deals) | deal items (§4) | title\*, eyebrow, subtitle, description, button, image, starts\*, ends\*, deals | added, one |

\* required.

**One of each.** `SECTION_RULES[type].singleton` marks Best deals and Season
deals. A second one is refused with 409, and the builder disables its Add
button while one exists.

**Season deals dates.** `startsAt` and `endsAt` on `HomepageSection` (migration
`20261021081013_add_deal_sections`), set only for types with
`SECTION_RULES[type].schedule`. Both are required and the end must be after
the start; other types refuse them. The live homepage shows the section only
from `startsAt` up to, not including, `endsAt` (`isWithinSchedule`), decided on
the server per request. The preview ignores the dates so staff can check a
campaign before it starts. The dates are typed in Dubai time, like drop
release times (§4).

- **Fixed** sections are part of the page: they can be moved and hidden, never
  added or deleted (a delete is 409). **Added** types can be created and
  deleted, up to 30 sections in all.
- A fixed type exposes exactly the slots its component renders. The
  Invitation's button opens the waitlist, so it has a label and no link.
- **Two enum values keep old names.** `BEST_SELLERS` is shown everywhere as
  "Just listed" and `TESTIMONIALS` as "Reviews" (`SECTION_RULES[type].label`).
  Renaming a Postgres enum value that rows already use needs a hand-edited
  migration, and nothing outside the database sees the value.
- **The Hero** shows the uploaded image as its centrepiece, the mobile image
  below `md` (falling back to the main one), and its button under the copy.
  With no image the centrepiece is left out. It no longer reads `drops.ts`.
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

## 4. Items — drops, Just Listed picks, reviews and featured categories

`HomepageSectionItem` rows hang off a section, in `sortOrder`, each with its
own `visible`. What they hold is the section's `SECTION_RULES[type].items`, and
which fields a kind may fill is `ITEM_RULES` — the same refuse-don't-drop rule
as sections. At most **12** per section.

| Kind | Section | Fields | Required |
| --- | --- | --- | --- |
| `drops` | Upcoming drops | product, title, release date, button, image | a product, **or** title + image + release date |
| `products` | Just listed, Best deals | product | product |
| `deals` | Season deals | product, title, image, link (`ctaHref`) | a product alone, **or** title + image + link |
| `reviews` | Reviews | quote (`body`), customer (`author`), product bought (`title`), rating 1–5, avatar (`image`) | quote, customer |
| `categories` | Featured categories | category, title, image, link (`ctaHref`) | category; at least one per section |

**Saving.** The section `PUT` carries `items`, and that array **replaces** the
section's items, like a product's images and specs. There are no item routes.
A product must exist (422 on `items` otherwise). A draft, archived or Trashed
product can be kept: it stays off the storefront until it is listed again, and
the builder badges it "Not on storefront".
The same product can't be picked twice in one section.

**No copied product data.** A drop or pick stores only `productId`. Name,
picture, price and stock are read from the catalogue when the page renders,
through `findShopCards` in `catalogue.service.ts` — the shop's own card, so
only products the shop would list (published, not in Trash, visible category,
at least one variant) come back. Replacing a product's photos in Catalogue
changes the homepage with no homepage edit. Deleting a product for good (from
Trash) deletes the items that point at it, in both stages (`Cascade`) — an
item left without its product would fail its kind's rules and block saving
the section.

**Drops.** A drop's status is worked out per request: `coming-soon` while its
release date is in the future (countdown, waitlist), then `sold-out` /
`almost-gone` / `available` from the product's stock (`availabilityFromStock`).
Its title overrides the product's name. A button (label + link) replaces the
card's own action. A drop **without a product** is a teaser for a release not
in the catalogue yet: its own title, uploaded image and date, shown only until
that date. The upload is offered only when there is no product, so a product's
photo is never uploaded twice; it is also the fallback if a product has no
photos, and a card with neither shows its bare plate. A drop whose product the
shop wouldn't list is skipped; Upcoming drops with nothing left is not
rendered.

**Release times are Dubai time.** The release date and time is stored as one
UTC instant (`releaseAt`). Every conversion to or from a clock time goes
through `src/lib/dates.ts` on the store's clock, `STORE_TIME_ZONE`
(`Asia/Dubai`, labelled `STORE_TIME_ZONE_LABEL`, "GST", both in
`src/lib/constants.ts`), never the device's zone:

1. The console's date and time field reads and writes Dubai time
   (`toStoreDateTimeInput`, `fromStoreDateTimeInput`), so 18:00 typed by staff
   anywhere means 18:00 in Dubai. Below the field it repeats the result, for
   example "Opens 14 Nov, 6:00 pm GST".
2. The storefront card shows "Opens 14 Nov, 6:00 pm GST" while the drop is
   still to open. That text (`PublishedDrop.opensAt`) is formatted once on the
   server by `formatStoreDateTime` and sent to the page as finished text, so
   the server and the shopper's browser can never print it differently. After
   the release it is not shown.
3. Whether a drop has opened is decided on the server per request, against the
   real current instant, so it does not depend on any device clock. The
   countdown on the card only counts down to that same instant.

**Just listed.** Picks the shop can sell right now (listed and in stock) show
in the chosen order. With no picks, or none of them sellable, the shelf shows
`listNewestShopProducts(FEATURED_PRODUCTS_LIMIT)` as before. With neither, the
shelf is left out.

**Best deals.** Picks the shop can sell right now (listed and in stock) show
in the chosen order, as the shop's own product cards. There is no fallback:
with nothing sellable the section is left out. Any listed product can be
picked. The card shows the saving when the variant it shows has a "Was" price
(`compareAtPrice`); the builder badges a product without one "No discount".
`onSale` on the admin product list and on an item's product is that same
check (`isOnSale`, on the variant ordered first by `SHOP_VARIANT_ORDER`, both
in `catalogue.service.ts`).

**Season deals.** A deal is a product, shown as its product card on the same
terms as Best deals, or a promo tile with its own title, uploaded image and
link. A product deal may not carry a title, image or link, so a product's
name and photos are never copied. A tile links wherever its link points. With
nothing left to show the section is not rendered.

**Reviews.** Written in by staff. The summary ("4.8/5 · 9 reviews") is derived
from the reviews shown; the rating is dropped when none has one. They are not
tied to an order, so nothing claims a "verified purchase". Reviews with nothing
visible are not rendered.

**Still on `drops.ts`.** The Invitation, Savings, Scarcity and the header's
mega menu still read the mock in `src/lib/drops.ts`. A Releases module (P3)
would replace that; homepage drops would then point at releases instead of, or
as well as, products.

**Featured categories.** Each item stores a `categoryId`, a real relation to
`Category`. Its title, image and link replace the category's name, image and
page when filled; left empty, the category's own are used, read when the page
renders. The link follows the same `ctaHref` rule as a button (§3). Any
category that exists can be chosen (422 on `items` otherwise), and the same
category only once per section. A category the shop wouldn't show is kept and
badged "Not on storefront" in the builder; on the storefront it is skipped,
like a hidden item, and a section with nothing left is not rendered. Deleting
a category deletes its items in both stages (`Cascade`). Category deletes are
still not blocked by homepage use.

Until migration `20261020111534_homepage_category_items` featured categories
were a list of ids in `refIds`. The migration moved each section's list, in
both stages, into items in the same order, skipped ids whose category no
longer existed, and emptied `refIds` on those sections.

**Brand and category links.** A brand opens `/collection?brand=<name>` — the shop matches
brands by name. A category opens `/collection/<slug>` using its catalogue slug.
Categories the shop wouldn't show (draft, archived, or under an unpublished
parent — the catalogue's `VISIBLE_CATEGORY`) are left out of the storefront.

---

## 5. Images and references

- `HomepageSection.imageId`, `HomepageSection.mobileImageId` (the Hero's
  phone image) and `HomepageSectionItem.imageId` (a teaser drop's picture, a
  review's avatar, a featured category's replacement image) are relations to `MediaAsset`. Both the upload sweep and
  `releaseImage` count all three, from rows of **either** stage, as a
  reference, so an image replaced in the draft survives until a publish
  replaces the live row too. A save releases every image the old version of
  the section held; any still in use is kept. Publish and Discard release the
  images only the replaced rows used, after the copy.
- An image id that no longer exists is refused on save (422 on that field,
  `items.N.imageId` for an item). A missing image on the storefront drops out
  quietly: the Hero leaves its centrepiece out, a drop card shows its plate.
- `refIds` holds a featured brands section's brand ids in display order,
  checked to exist on save (422 on the field otherwise), at most 12. A brand
  deleted later is **skipped** when the section renders; a section with
  nothing left is not rendered at all. Brand deletes are not blocked by
  homepage use. Featured categories use items (§4), not `refIds`.
- The storefront read (`getPublishedHomepage`, which is
  `getHomepageSections("LIVE")`; the preview calls it with `"DRAFT"`, with
  the same skipping rules) is **not cached**: the
  homepage renders per request (`force-dynamic`), so it reads the live rows
  each time. A renamed, unpublished or deleted brand, category or product
  leaves the homepage immediately, a drop's status follows its stock and date,
  and a seed shows up without clearing anything. (An
  earlier cached version outlived the seed and served an empty homepage.)

---

## 6. Limits

- **30 sections**, so `GET /api/v1/admin/homepage` returns one bounded list
  rather than a paginated one (see DATA-LAYER §4). **12** brands per featured
  brands section, **12** items per section (so 12 featured categories). Text: eyebrow 60, title 120,
  subtitle 300, description 600, button label 40, button link 300 characters.
  Items: title 120, review 600, customer 60, button label 40, button link 300.
- **Writes run one at a time.** Every homepage write first locks the
  `homepage_state` row (`lockHomepage`), so two publishes can't both copy the
  draft and double the live page, and an edit can't slip in mid-publish and be
  marked as published.
- **No optimistic concurrency.** Two people editing the draft at once
  overwrite each other's field edits. A reorder sent from a stale tab (the set
  of sections changed) is refused with "The page changed since you loaded it".
- **Choosing brands and categories.** The Page Builder's picker reads the
  catalogue list endpoints, which check the
  `catalogue.brands` / `catalogue.categories` permissions, and the product
  picker reads `GET /api/v1/admin/products` (`catalogue.products`). Today every
  console role holds all of them; a role narrowed later needs those three as
  well as `storefront.homepage`.
- **Promo images are decorative** (`alt=""`); there is no alt-text field yet.

---

## 7. Seed

`npm run db:seed` replaces the whole homepage — draft and live — with the copy
the sections carried before the CMS, and publishes it. Like the policy seed, it
overwrites anything changed through the API since. Images only the old rows
referenced are collected by the upload sweep. Because the storefront read
isn't cached, the seeded homepage shows up on the next page load.

It runs after the catalogue seed: Upcoming drops gets the four newest
published products, the last two opening 7 and 14 days after the seed. Reviews
start empty — there are no real ones to seed, so the section stays off the
storefront until staff add some. The Hero has no image until one is uploaded.

The app itself holds no fallback copy. On a database with nothing published,
the homepage renders the header and footer only.

---

## 8. Adding a section type

1. Add the value to `HomepageSectionType` in `prisma/schema/homepage.prisma`
   and run a migration.
2. Add it to `HOMEPAGE_SECTION_TYPES` and `SECTION_RULES` in
   `src/lib/homepage-sections.ts` — and to `ADDABLE_SECTION_TYPES` if staff
   should be able to add it. If it holds items, set `items` to an existing
   kind or add one to `ITEM_RULES`, then shape them for the storefront in
   `getHomepageSections`. Set `singleton` for at most one per homepage,
   `schedule` for start and end dates, and `discountHint` to flag products
   without a discount in the pickers.
3. Build its component taking `{ section: PublishedSection }`.
4. Add a case to `src/components/home/homepage-section.tsx`. The switch is
   exhaustive, so the type-check fails until you do.
5. If it is fixed, add its default row to `homepage` in `prisma/seed.ts`.

---

## 9. Homepage Builder

Storefront → Homepage Builder, `/admin/storefront/homepage`. The sidebar's
**Banners** (`/admin/storefront/banners`) and **Curated Categories**
(`/admin/storefront/curated-categories`) redirect here: banners are Promo
banner sections and curated categories are Featured categories sections.
Signed out
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
buttons, Edit, and Delete for added types only. Season deals also shows
"Scheduled", "Running" or "Ended" against its dates. **Add section** offers
the addable types and is disabled at 30 sections; Best deals and Season deals
are disabled while the draft has one. A note links to Content &
Policies, where the FAQ section's questions are edited.

**Section form.** One modal for every type. It shows only the fields
`SECTION_RULES` gives the type, with their length limits; the title is a
textarea because a new line starts a new heading line. Promo banners get the
shared image upload and a Seasonal checkbox; the Hero gets a desktop and a
phone image; Featured brands get the brand picker; Upcoming drops, Just
listed, Reviews and Featured categories get the items editor. Before sending, `validateSection` runs the
same schema and type rules as the API, so most mistakes show without a round
trip; the API's 422 field errors land on the same inputs, an item's on its
own card.

**Brand picker.** Searches brands through the catalogue list
endpoints, one page of results (`PICKER_PAGE_SIZE`). Chosen items keep their
order, can be moved and removed, up to 12.

**Items editor.** One card per item with Visible, move up and down, and
remove. Drops and Just listed add products through the **product picker**,
which searches Catalogue → Products (any status; drafts are flagged "hidden on
the storefront"). A drop card adds a title, a release date and time in Dubai time (§4) and a button, and
"Add a release that isn't in the catalogue yet" adds one with its own image.
A review card has the quote, customer, product bought, rating and photo.
Featured categories add categories through the **category picker**, which
searches Catalogue → Categories (any status; subcategories show as
"Parent › Child"). A category card has an optional title, link and image that
replace the category's own. A product or category the storefront would skip is
badged "Not on storefront".
Best deals and Season deals add products through the product picker, which
flags "No discount" on them. A Season deals card for a promo tile, added with
"Add a promo tile", has a title, a link and an image upload. The Season deals
form has Starts and Ends fields in Dubai time.

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
4. An item's field errors are keyed by its position, so moving items after a
   failed save can leave an error on the wrong card until the next save.

---

## 10. Best Deals and Season Deals screens

Storefront → **Best Deals** (`/admin/storefront/best-deals`) and Storefront →
**Season Deals** (`/admin/storefront/season-deals`) are not separate modules.
Each page redirects to the Homepage Builder with `?section=BEST_DEALS` or
`?section=SEASON_DEALS` (`HOMEPAGE_SECTION_PARAM` in `src/lib/constants.ts`).
The builder then opens that section's edit form, or its add form when the
draft has none yet. Both routes are in `BUILT_ROUTES`.

Publishing is the homepage's own Publish, so it also publishes any other
unpublished homepage change.

Both sidebar rows carry `permission: storefront.homepage` in
`src/lib/admin-nav.ts`, so a role without the Homepage Builder doesn't see
them (PERMISSIONS.md §7).

**Example.** To run a Black Friday campaign:

1. Open Storefront → Season Deals; the add form opens.
2. Enter the title, set Starts and Ends, pick products and add a promo tile.
3. Save, then Publish. The section appears on `/` at the start time and leaves
   at the end time with no further publish.
