# Catalogue

How products get into the database, how the admin manages them, and how the
storefront and other teams read them through the Product API.

Read this before you change a product model, the public product endpoints, the
shop pages or the product page. [DATA-LAYER.md](DATA-LAYER.md) covers the
general conventions; this document covers what is specific to the catalogue.

---

## 1. What this module covers

| Area | What exists |
| --- | --- |
| Database | Categories, products, variants, images, specs, add-ons |
| Admin | Categories, Products and Add-ons screens under Catalogue. Stock is managed on the product edit form |
| Product API | `GET /api/v1/products` and `GET /api/v1/products/[slug]` |
| Storefront | `/`, `/collection`, `/collection/[category]`, `/search`, `/product/[slug]`, and the header, mega menus, mobile drawer, home category strip and search panel |
| SEO | `/sitemap.xml`, `/robots.txt`, product JSON-LD, canonical URLs |

The Product API is the one product source for the whole storefront. Issue #30
requires that no second product or variant API is created, so new screens that
need product data call these endpoints or `src/services/catalogue.service.ts`.

---

## 2. Data model

All models live in `prisma/schema/catalogue.prisma`. Money is an `Int` in minor
units (fils), like every other price in the project.

| Model | Holds |
| --- | --- |
| `Category` | Name, slug, description, image, parent, status, `showInNav`, `sortOrder` |
| `Product` | Slug, name, description, brand, category, warranty months, highlights, what is included, status, `publishedAt`, `minPrice`, `deletedAt`, the SEO fields (section 7) |
| `ProductVariant` | SKU, condition, grade, battery health, storage, colour, colour hex, price, compare at price, stock, sort order |
| `ProductImage` | A `MediaAsset`, alt text, an optional `colour`, sort order |
| `ProductSpec` | Group, label, value, sort order |
| `AddOn` | Name, note, kind (protection, accessory, service), price, popular, active, applies to all |
| `AddOnCategory` | Which categories an add-on is offered on |

Rules the model encodes:

1. **Condition, grade and battery health belong to the variant.** One product
   can offer the same phone as Refurbished Excellent and Pre-Owned Good, each
   with its own price, stock and battery reading. Grade only applies to
   pre-owned and refurbished variants; the validator refuses it on anything
   else.
2. **Status** is `DRAFT`, `PUBLISHED` or `ARCHIVED`. Only `PUBLISHED` products
   reach the storefront. `publishedAt` is set the first time a product is
   published and never cleared, so "Newest" stays stable across unpublish and
   republish.
3. **`minPrice`** is the lowest variant price, written on every save. It exists
   so the list can sort and filter by price without joining variants. Never
   write it by hand.
4. **Saving is derived**, never stored: `compareAtPrice` minus `price`, and only
   when the compare at price is higher.
5. **Availability is derived from stock.** `availabilityFromStock` in
   `src/types/commerce.ts` turns a stock count into in stock, low stock or sold
   out. Low stock is below `LOW_STOCK_THRESHOLD` (4).
6. **Image colour** is optional. An image with a colour belongs to every variant
   of that colour; an image without one belongs to all variants. See section 6.
7. **Category status** is `DRAFT`, `PUBLISHED` or `ARCHIVED`, and new and
   existing categories default to `PUBLISHED`. A category is visible when it is
   published and, for a child, its parent is published too. Products in a
   hidden category disappear from every storefront list, search and product
   page, and the category page answers 404.
8. **`showInNav`** decides whether a published top level category appears in
   the header, menus, mobile drawer and home strip. A hidden one stays
   browsable at `/collection/[slug]` and in the shop filters.
9. **`sortOrder`** orders categories everywhere: lower first, then by name.

### Migrations

| Migration | Change |
| --- | --- |
| `add_products` | Products, variants, images, specs, add-ons |
| `add_category_slug_and_min_price` | `Category.slug`, `Product.minPrice` |
| `add_product_image_colour` | Nullable `colour` on `product_images` |
| `add_category_cms_fields` | `CategoryStatus` enum; `description`, `status` (default `PUBLISHED`), `showInNav` (default true) and `sortOrder` (default 0) on `categories` |
| `move_condition_to_variants` | Adds `condition`, `grade` and `batteryHealth` to `product_variants`, copies each product's values onto its variants, then drops the three columns from `products` |

---

## 3. Admin

Four screens under Catalogue in the admin sidebar. Each page checks its own
permission, and every route starts with `authorizeApi`.

| Screen | Route | Permission |
| --- | --- | --- |
| Categories | `/admin/categories` | `catalogue.categories` |
| Products | `/admin/products` | `catalogue.products` |
| Add-ons | `/admin/add-ons` | `catalogue.add-ons` |

| Endpoint | Methods |
| --- | --- |
| `/api/v1/admin/categories` | `GET` list, `POST` create |
| `/api/v1/admin/categories/[id]` | `GET`, `PUT`, `DELETE` |
| `/api/v1/admin/categories/[id]/status` | `PATCH` publish, unpublish or archive |
| `/api/v1/admin/products` | `GET` list, `POST` create |
| `/api/v1/admin/products/[id]` | `GET`, `PUT`, `DELETE` |
| `/api/v1/admin/products/[id]/status` | `PATCH` publish, unpublish or archive |
| `/api/v1/admin/add-ons` | `GET` list, `POST` create |
| `/api/v1/admin/add-ons/[id]` | `GET`, `PUT`, `DELETE` |

Files follow the usual chain: `src/app/admin/...` page, `src/components/admin/{products,add-ons}`,
`src/hooks/use-{product,add-on}.ts`, the routes above,
`src/services/{product,add-on}.service.ts` and
`src/validators/{product,add-on}.validator.ts`.

### Category rules

1. The form sets name, slug, type and parent, image, description (up to 300
   characters), status, position (`sortOrder`, 0 to 999) and, for a parent,
   "Show in the storefront menus and home page" (`showInNav`).
2. The list shows categories in storefront order, with a status select on
   every row, like the product list.
3. A category with children or products can't be deleted. Archive it to hide it
   and keep the record.
4. The product form's Category select is one flat list in storefront order:
   each parent, then its children named "Parent › Child" (`flattenCategoryRefs`
   in `src/lib/homepage-builder.ts`, shared with the homepage picker). Archived
   categories are left out, except the one the product already uses.

### Product rules

1. **Slug and SKU are unique.** A clash answers 409 on the `slug` or
   `variants` field.
2. **At least one variant.** Two variants may not share the same condition,
   grade, storage and colour. Condition, grade and battery health are set on
   each variant row; "Add variant" copies the previous row's condition and
   grade.
3. **Variants keep their id on save.** Variants sent with an `id` are updated,
   variants without one are created, and variants left out are deleted. This
   keeps a variant's identity stable for the cart and orders later. A deleted
   variant disappears from every cart that held it, without a notice; archive
   the product instead and carts flag the line as unavailable.
4. **Images and specs are replaced on save.** An image dropped from a product
   releases its `MediaAsset` once nothing else uses it.
5. **Publishing needs at least one image** (409 otherwise).
6. **An image colour must match a variant colour.** The admin picks it from a
   list built from the variants in the form; "All colours" leaves it empty.
7. **Deleting** a product moves it to Trash: `deletedAt` is set and the status
   becomes Draft, and its variants, images and specs are kept. Every admin
   product query filters `deletedAt: null`, and the storefront's `PUBLISHED`
   filter includes it too. Trash can restore it (as a Draft) or delete it
   permanently; see [TRASH-AUDIT.md](TRASH-AUDIT.md). A product in Trash still
   holds its slug and SKUs, and the 409 for a clash says so.
8. Categories and brands with products can't be deleted; the message names the
   count, products in Trash included.
9. **The edit form always loads fresh.** `useGetProduct` sets `gcTime: 0`, so
   closing the modal drops the cached product and the next open fetches it
   again, and a save never writes back stock older than the database.
10. **Stock is managed on the product edit form only.** Each variant row has a
    Stock field, and `ProductVariant.stock` is the single stock record; there
    is no separate inventory table or screen. Saving the product
    (`PUT /api/v1/admin/products/[id]`, Products Edit permission) updates each
    variant by its id, records the change under Products in the change log and
    calls `refreshStorefrontCatalogue()`, so the Products list total, the
    product page and storefront availability all read the new count. Above
    the variant rows the form shows the product's total stock and its
    availability label (`availabilityFromStock`), worked out from the values
    being edited.

    The separate Inventory screen (`/admin/products/inventory`), its API
    (`/api/v1/admin/inventory`), its `catalogue.inventory` permission and the
    `["inventory"]` query key were removed. Staff roles may still hold a saved
    `catalogue.inventory` row; `gridFromLevels` ignores keys it does not know,
    so the row does nothing. Change log entries recorded under it keep the
    "Inventory" label through `RETIRED_MODULE_LABELS` in `src/lib/audit.ts`.

### Add-on rules

An add-on is offered on every product (`appliesToAll`) or on the categories it
lists, and at least one of the two is required. A product shows add-ons
attached to its own category or to that category's parent. Inactive add-ons are
never shown. The product page shows at most `MAX_PRODUCT_ADD_ONS` (4),
protection first, then popular, then cheapest.

### Shared with the cart

The cart must apply exactly the storefront's visibility and add-on rules, so
`src/services/catalogue.service.ts` exports them rather than letting
`cart.service.ts` copy them:

1. `VISIBLE_CATEGORY` and `PUBLISHED`: the Prisma filters for a visible
   category and a published product in one.
2. `offeredAddOnWhere(categoryIds)` and `OFFERED_ADD_ON_ORDER`: the add-on
   filter and order above.
3. `shopAddOnSelect` and `toShopAddOn`: the add-on select and its mapping to
   `ShopAddOn`.

Changing any of these changes the cart too: which lines are flagged
unavailable, and which add-ons a cart row offers and accepts. See
[CART.md](CART.md) §7.

---

## 4. Product API

Public, no session. Both routes read only `PUBLISHED` products and answer in
the standard envelope.

### `GET /api/v1/products`

Query parameters, validated by `shopQuerySchema` in
`src/validators/catalogue.validator.ts`:

| Parameter | Meaning |
| --- | --- |
| `page`, `pageSize` | Default page size `SHOP_PAGE_SIZE` (12), maximum `SHOP_MAX_PAGE_SIZE` (48) |
| `q` | Text search, up to `SEARCH_QUERY_MAX_LENGTH` (100) characters; see "Search" below |
| `category` | Comma separated category slugs. A parent slug also matches its children |
| `condition` | `new`, `open-box`, `pre-owned`, `refurbished` |
| `grade` | `premium`, `excellent`, `very-good`, `good` |
| `brand` | Brand names, matched without case |
| `storage` | Storage labels, for example `256GB` |
| `price` | Price band ids from `priceBands` in `src/lib/shop.ts` |
| `sort` | `newest` (default), `price-asc`, `price-desc` |

Condition, grade and storage are variant level filters, and all of them must
match on the same variant: "Excellent" and "256GB" together only match a
product that has an Excellent 256GB variant.

Every list parameter keeps at most `SHOP_MAX_FILTER_VALUES` (50) values.
Unknown condition, grade, price and sort values are dropped rather than
refused, so an old link falls back to a broader result.

Response:

```json
{
  "items": [ShopCard],
  "page": 1,
  "pageSize": 12,
  "total": 32,
  "facets": {
    "categories": [{ "slug": "laptops", "name": "Laptops", "parentSlug": null, "count": 6 }],
    "conditions": { "refurbished": 14 },
    "grades": { "premium": 5 },
    "brands": [{ "value": "Apple", "count": 17 }],
    "storage": [{ "value": "256GB", "count": 8 }],
    "priceBands": { "under-500": 2 }
  }
}
```

A facet count says how many products ticking that option would leave. Each
axis is counted with every other filter applied but its own, which is what lets
the filter panel disable a zero option instead of hiding it. `total` counts
products, not variants.

A `ShopCard` shows one variant: the cheapest one that matches the condition,
grade and storage filters, or the cheapest overall when none are set. The card
carries that variant's id (`variantId`), condition, grade, storage, colour,
price and compare at price, plus total stock across variants, the first image
and `optionCount` (the number of variants). The card's Add to cart adds
`variantId`, the variant it displays, with no add-ons. Types are in
`src/types/catalogue.ts`.

### `GET /api/v1/products/[slug]`

Returns a `ShopProductPage`: the product with its variants (each with `sku`,
condition, grade, battery health, storage, colour, price, compare at price and
stock), images (each with its `colour`), grouped specs, highlights, what is
included and warranty months, plus:

1. `addOns`: the add-ons offered on this product, as described in section 3.
2. `related`: up to `RELATED_PRODUCTS_LIMIT` (5) other published products in the
   same category, newest first.

The product page calls the same `findShopProductPage` service function, so the
page and the API cannot disagree.

### Search

There is one search, end to end. `searchWhere(q)` in
`src/services/catalogue.service.ts` is the only product text filter: both
`/search` (through `listShopProducts`) and the suggestions API use it, so a
suggestion and the full results never disagree.

1. The query is lowercased and split on spaces, keeping the first
   `SEARCH_MAX_WORDS` (5) words.
2. **Every word must match somewhere** on the product, partially and without
   case: product name, description, brand name, category name, or any
   variant's SKU, storage or colour. "iphone 128" finds an iPhone with a 128GB
   variant; "A2848" finds the variant with that SKU.
3. Only `PUBLISHED` products in visible categories are searched, as everywhere
   else on the storefront. There is no separate search table or index; the
   matches are `ILIKE` queries on the catalogue tables.

### `GET /api/v1/search?q=`

Public, no session. Feeds the header search panel while the shopper types.

| Part | Rule |
| --- | --- |
| `q` | Validated by `searchSuggestionsQuerySchema`. Missing, blank, shorter than `SEARCH_MIN_QUERY_LENGTH` (2) or longer than `SEARCH_QUERY_MAX_LENGTH` (100) answers 200 with empty lists, never an error |
| `products` | Up to `SEARCH_SUGGESTION_LIMITS.products` (5) `ShopCard`s matching `searchWhere`, newest first |
| `brands` | Up to 4 brands with at least one published product whose name contains any word, as `{ name }` |
| `categories` | Up to 4 visible categories whose name contains any word, as `{ name, slug }` |

Three small bounded queries per request. The panel links a product to
`/product/[slug]`, a brand to `/collection?brand=<name>` and a category to
`/collection/[slug]`.

```json
{
  "products": [ShopCard],
  "brands": [{ "name": "Apple" }],
  "categories": [{ "name": "Smartphones", "slug": "smartphones" }]
}
```

---

## 5. Storefront

| Route | Source |
| --- | --- |
| `/` | The "Just listed" shelf: `listNewestShopProducts(FEATURED_PRODUCTS_LIMIT)`, newest products with stock |
| `/collection` | Every published product |
| `/collection/[category]` | The same page, with the category filter set |
| `/category/[slug]` | Permanent redirect to `/collection/[slug]` (`next.config.ts`) |
| `/search?q=` | The same page, with the text search set, a "Clear search" link and a "No results found" empty state. Not indexed |
| `/product/[slug]` | `findShopProductPage` |

All of these render per request (`force-dynamic`), because they read the
database. The `(site)` layout is `force-dynamic` too, since it loads the
storefront categories for every page in the group. Without it, `next build`
prerenders the static pages under `(site)` across several worker processes,
each opening its own connection pool, and a small Postgres answers `P2037:
too many clients already`.

**The shop pages** (`collection`, `collection/[category]`, `search`) parse the
URL with `shopFiltersFromParams` in `src/lib/catalogue.ts`, load the first page
on the server, and pass it to `ShopCatalogue`. From there `useGetShopProducts`
in `src/hooks/use-catalogue.ts` fetches every later filter change and every
"Load more" page from `/api/v1/products`. The server page is keyed by its
filters, so following a menu link to the same route with other filters starts
fresh.

**Category segments** go through `resolveCategory` in `src/lib/shop.ts` first,
so older links keep working: `phones` becomes `smartphones`, `wearables`
becomes `smartwatches`, and so on. A segment that matches no category in the
database answers 404.

**Categories in the chrome.** The `(site)` layout loads
`listStorefrontCategories()` once and hands it to `StorefrontCategoriesProvider`
(`src/components/providers/storefront-categories-provider.tsx`). The category
bar, mega menus, Shop menu, mobile drawer, home category strip and the About
page read it with `useStorefrontCategories()`. It returns the
published, `showInNav` top level categories in order, up to
`NAV_CATEGORY_LIMIT` (8), each with its description, image, in stock product
count and brand counts (children included). The home strip shows the first
`HOME_CATEGORY_LIMIT` (4); a category without an image shows as a plain card.

The list is cached with `unstable_cache` under the tag `catalogue`
(`CATALOGUE_CACHE_TAG`). Every admin write to categories, products, product
status, brands and stock calls `refreshStorefrontCatalogue()`, so the menus
change on the next request. The cache also expires after
`STOREFRONT_CATEGORIES_REVALIDATE_SECONDS` (300) as a safety net.

**The category page** shows the category name, its parent as the eyebrow and
its description, and uses the description as the meta description when set.

**The product card** is `ShopProductCard` in `src/components/shop/product-card.tsx`,
used by the shop and the homepage shelf. It links to `/product/[slug]` through
`productHref`.

---

## 6. Variant images

Images are tagged by colour, not by variant id. Storage never changes how a
device looks, and variant ids change when an admin recreates a variant, so a
colour is the stable and meaningful link.

On the product page `SelectedVariantProvider`
(`src/components/product/detail/selected-variant.tsx`) holds the selected
variant. The gallery, the buy panel and the condition explainer lower down all
read it, so changing an option updates price, saving, stock, availability,
condition, grade, battery health and the gallery together.

The buy panel offers three option rows: Condition (condition and grade, shown
only when the product has more than one), Storage and Colour. An option is
struck through when no in stock variant has it together with the options
chosen above it. Picking an option selects the exact match if one exists,
otherwise the closest in stock variant.

The gallery follows the selected colour. The gallery shows the images tagged with the
selected colour plus every untagged image. If that leaves nothing, it shows all
images, so a product is never shown without a picture.

Renaming a variant colour leaves images tagged with the old name. They then
count as belonging to no variant and only appear through the fallback, until
the admin picks the new colour on them.

---

## 7. SEO

| Piece | File |
| --- | --- |
| Sitemap | `src/app/sitemap.ts`. Home, the shop, every category with published products, and up to `SITEMAP_PRODUCT_LIMIT` (1000) products, most recently updated first. A product whose canonical points to another page is left out (`isSelfCanonical`) |
| Robots | `src/app/robots.ts`. Keeps `/admin`, `/api`, `/account`, `/cart` and `/checkout` out, except `/api/v1/media/` so product images stay crawlable, and points to the sitemap |
| Product JSON-LD | `productJsonLd` in `src/lib/seo.ts`, rendered on the product page |
| Product title, description, keywords, Open Graph, Twitter card, canonical | `generateMetadata` on the product page, values from `productSeo` in `src/lib/seo.ts` |
| Product SEO fields in the admin | The "SEO and sharing" section of the product form, `src/components/admin/products/product-seo-fields.tsx` |

Absolute URLs come from `siteConfig.url` in `src/lib/site.ts`; relative ones
(images, a canonical path) resolve against `metadataBase` in the root layout.

### Product SEO fields

Seven optional columns on `Product`, edited in the product form and saved with
the rest of the product (`POST` / `PUT /api/v1/admin/products`). They are
returned by the admin product `GET` and, as `seo`, in the storefront product
detail. There is no separate endpoint or permission: Products Edit covers
them, and the change log records them like any other product field.

| Field | Limit (constant) | Notes |
| --- | --- | --- |
| `seoTitle` | 70 (`SEO_TITLE_MAX_LENGTH`) | Used exactly as written, without the " — Rewire Electronics" suffix |
| `metaDescription` | 160 (`SEO_DESCRIPTION_MAX_LENGTH`) | |
| `metaKeywords` | 10 (`SEO_KEYWORDS_MAX`), 40 characters each (`SEO_KEYWORD_MAX_LENGTH`) | Comma separated in the form |
| `ogTitle` | 95 (`OG_TITLE_MAX_LENGTH`) | |
| `ogDescription` | 200 (`OG_DESCRIPTION_MAX_LENGTH`) | |
| `ogImageId` | | A `MediaAsset` from the shared upload, ideally 1200 × 630. Set null if the asset goes |
| `canonicalUrl` | 512 (`CANONICAL_URL_MAX_LENGTH`) | A site path (`/product/x`, not `//host`) or an `https://` URL; anything else is 422 |

Blank fields are stored as null (keywords as an empty list).

**Fallbacks.** `productSeo(product)` decides what the page renders, taking the
first value that is set:

| Rendered | Order |
| --- | --- |
| `<title>` | `seoTitle` (as written) → "Brand Name" plus the site suffix |
| meta description | `metaDescription` → the description, else the first highlight, else the site description, clipped to 160 characters at a word |
| keywords | `metaKeywords`; none rendered when empty |
| `og:title`, `twitter:title` | `ogTitle` → the title above |
| `og:description`, `twitter:description` | `ogDescription` → the description above |
| `og:image`, `twitter:image` | the OG image → the first product image → `siteConfig.ogImage` |
| canonical, `og:url` | `canonicalUrl` → `/product/<slug>` |

The form shows the same fallbacks as placeholders, so a blank field reads as
"this is what will be used".

**The OG image** counts as a reference in `releaseImage` and the orphan sweep
(`productOgImages` on `MediaAsset`). Replacing or clearing it releases the old
asset once nothing else uses it; deleting a product permanently releases it too.

The product JSON-LD keeps the product's own name and description, but its
`url` is the same canonical the page declares, and the sitemap lists only
products whose canonical is their own page (`isSelfCanonical` in
`src/lib/seo.ts`; an override equal to `/product/<slug>`, relative or absolute,
still counts as their own). So the page, the JSON-LD and the sitemap never
disagree. Because the sitemap filters after taking the newest
`SITEMAP_PRODUCT_LIMIT` products, it can list slightly fewer than the limit.

The JSON-LD is a `Product` with an `AggregateOffer`: lowest and highest variant
price and variant count, plus one `Offer` per variant with its SKU, price,
condition and availability. Condition maps to schema.org the way Google
Merchant defines it:

| Condition | schema.org |
| --- | --- |
| New | `NewCondition` |
| Open Box | `UsedCondition`, because the packaging has been opened |
| Pre-Owned | `UsedCondition` |
| Refurbished | `RefurbishedCondition` |

`toJsonLd` escapes `<` so a product name can't close the script tag. The home
FAQ uses the same helper.

---

## 8. Constants

All in `src/lib/constants.ts`.

| Constant | Value | Used by |
| --- | --- | --- |
| `SHOP_PAGE_SIZE` | 12 | Shop page size |
| `SHOP_MAX_PAGE_SIZE` | 48 | Largest page the API serves |
| `SHOP_MAX_FILTER_VALUES` | 50 | Values kept per filter |
| `RELATED_PRODUCTS_LIMIT` | 5 | Related products |
| `MAX_PRODUCT_ADD_ONS` | 4 | Add-ons on the product page |
| `FEATURED_PRODUCTS_LIMIT` | 4 | Homepage shelf |
| `SITEMAP_PRODUCT_LIMIT` | 1000 | Products in the sitemap |
| `NAV_CATEGORY_LIMIT` | 8 | Categories in the header, menus and drawer |
| `HOME_CATEGORY_LIMIT` | 4 | Categories in the home strip |
| `STOREFRONT_CATEGORIES_REVALIDATE_SECONDS` | 300 | Longest the cached menu categories live |
| `SEARCH_QUERY_MAX_LENGTH` | 100 | Longest search query (`q`) |
| `SEARCH_MIN_QUERY_LENGTH` | 2 | Shortest query that gets suggestions |
| `SEARCH_MAX_WORDS` | 5 | Words of a query that are matched |
| `SEARCH_SUGGESTION_LIMITS` | 5, 4, 4 | Products, brands and categories in the search panel |
| `SEARCH_DEBOUNCE_MS` | 300 | Pause in typing before the panel asks for suggestions |
| `SEO_TITLE_MAX_LENGTH`, `SEO_DESCRIPTION_MAX_LENGTH`, `OG_TITLE_MAX_LENGTH`, `OG_DESCRIPTION_MAX_LENGTH`, `SEO_KEYWORDS_MAX`, `SEO_KEYWORD_MAX_LENGTH`, `CANONICAL_URL_MAX_LENGTH` | 70, 160, 95, 200, 10, 40, 512 | Product SEO fields (section 7) |

---

## 9. Known limits

1. **Resolved in Phase 4: the cart is on the server.** Add to cart on the
   product page and on cards now calls the cart API with a real variant id
   ([CART.md](CART.md)). What still reads the mock catalogue
   (`src/lib/catalog.ts`) is the add to cart modal's cross sell rail, the home
   setup kit and the drop cards; all three link to product pages instead of
   adding.
2. **Filters are not written to the URL.** A shared or reloaded shop URL keeps
   the filters it arrived with, but ticks made on the page are lost on reload
   or Back.
3. **Every "Load more" recomputes the facets**, about ten small count queries.
   A later change could skip facets after the first page.
4. **The sitemap is capped** at `SITEMAP_PRODUCT_LIMIT`. Past that, split it
   with `generateSitemaps`.
5. **No product feed** (Google Merchant or Meta) is generated yet.
6. **Drop links** in `src/lib/route-map.ts` point at the product slugs the
   sample seed creates. If those products are deleted, the links fall back to a
   404 until the drops have their own pages.
7. **The sample catalogue** comes from `prisma/seed-catalogue.ts`, run through
   `npm run db:seed`. Staging has no products until it is run. Each sample
   product has one variant carrying its condition.
8. **`src/lib/categories.ts` is no longer read.** It held the old hardcoded
   menu categories and their studio photos; category images now come from the
   admin.
