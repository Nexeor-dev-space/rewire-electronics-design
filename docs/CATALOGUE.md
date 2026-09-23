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
| Database | Products, variants, images, specs, add-ons |
| Admin | Products, Add-ons and Inventory screens under Catalogue |
| Product API | `GET /api/v1/products` and `GET /api/v1/products/[slug]` |
| Storefront | `/`, `/collection`, `/collection/[category]`, `/search`, `/product/[slug]` |
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
| `Product` | Slug, name, description, brand, category, condition, grade, battery health, warranty months, highlights, what is included, status, `publishedAt`, `minPrice` |
| `ProductVariant` | SKU, storage, colour, colour hex, price, compare at price, stock, sort order |
| `ProductImage` | A `MediaAsset`, alt text, an optional `colour`, sort order |
| `ProductSpec` | Group, label, value, sort order |
| `AddOn` | Name, note, kind (protection, accessory, service), price, popular, active, applies to all |
| `AddOnCategory` | Which categories an add-on is offered on |

Rules the model encodes:

1. **Condition and grade belong to the product, not the variant.** A listing is
   one device in one condition. The same phone in a different condition is a
   separate product. Grade only applies to pre-owned and refurbished products;
   the validator refuses it on anything else.
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

### Migrations

| Migration | Change |
| --- | --- |
| `add_products` | Products, variants, images, specs, add-ons |
| `add_category_slug_and_min_price` | `Category.slug`, `Product.minPrice` |
| `add_product_image_colour` | Nullable `colour` on `product_images` |

---

## 3. Admin

Three screens under Catalogue in the admin sidebar. Each page checks its own
permission, and every route starts with `authorizeApi`.

| Screen | Route | Permission |
| --- | --- | --- |
| Products | `/admin/products` | `catalogue.products` |
| Inventory | `/admin/products/inventory` | `catalogue.inventory` |
| Add-ons | `/admin/add-ons` | `catalogue.add-ons` |

| Endpoint | Methods |
| --- | --- |
| `/api/v1/admin/products` | `GET` list, `POST` create |
| `/api/v1/admin/products/[id]` | `GET`, `PUT`, `DELETE` |
| `/api/v1/admin/products/[id]/status` | `PATCH` publish, unpublish or archive |
| `/api/v1/admin/inventory` | `GET` a paged list of variants, filter `stock=all,low,out` |
| `/api/v1/admin/inventory/[variantId]` | `PATCH` one variant's stock |
| `/api/v1/admin/add-ons` | `GET` list, `POST` create |
| `/api/v1/admin/add-ons/[id]` | `GET`, `PUT`, `DELETE` |

Files follow the usual chain: `src/app/admin/...` page, `src/components/admin/{products,add-ons,inventory}`,
`src/hooks/use-{product,add-on,inventory}.ts`, the routes above,
`src/services/{product,add-on,inventory}.service.ts` and
`src/validators/{product,add-on,inventory}.validator.ts`.

### Product rules

1. **Slug and SKU are unique.** A clash answers 409 on the `slug` or
   `variants` field.
2. **At least one variant.** Two variants may not share the same storage and
   colour.
3. **Variants keep their id on save.** Variants sent with an `id` are updated,
   variants without one are created, and variants left out are deleted. This
   keeps a variant's identity stable for the cart and orders later.
4. **Images and specs are replaced on save.** An image dropped from a product
   releases its `MediaAsset` once nothing else uses it.
5. **Publishing needs at least one image** (409 otherwise).
6. **An image colour must match a variant colour.** The admin picks it from a
   list built from the variants in the form; "All colours" leaves it empty.
7. **Deleting** a product removes its variants, images and specs. Archive it
   instead to keep the record.
8. Categories and brands with products can't be deleted; the message names the
   count.

### Add-on rules

An add-on is offered on every product (`appliesToAll`) or on the categories it
lists, and at least one of the two is required. A product shows add-ons
attached to its own category or to that category's parent. Inactive add-ons are
never shown. The product page shows at most `MAX_PRODUCT_ADD_ONS` (4),
protection first, then popular, then cheapest.

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
| `q` | Text search on product name, brand name and category name, up to 100 characters |
| `category` | Comma separated category slugs. A parent slug also matches its children |
| `condition` | `new`, `open-box`, `pre-owned`, `refurbished` |
| `grade` | `premium`, `excellent`, `very-good`, `good` |
| `brand` | Brand names, matched without case |
| `storage` | Storage labels, for example `256GB` |
| `price` | Price band ids from `priceBands` in `src/lib/shop.ts` |
| `sort` | `newest` (default), `price-asc`, `price-desc` |

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

A `ShopCard` carries the cheapest variant's storage, colour and compare at
price, `price` (the product's `minPrice`), total stock across variants, the
first image and `optionCount` (the number of variants). Types are in
`src/types/catalogue.ts`.

### `GET /api/v1/products/[slug]`

Returns a `ShopProductPage`: the product with its variants, images (each with
its `colour`), grouped specs, highlights, what is included, battery health and
warranty months, plus:

1. `addOns`: the add-ons offered on this product, as described in section 3.
2. `related`: up to `RELATED_PRODUCTS_LIMIT` (5) other published products in the
   same category, newest first.

The product page calls the same `findShopProductPage` service function, so the
page and the API cannot disagree.

---

## 5. Storefront

| Route | Source |
| --- | --- |
| `/` | The "Just listed" shelf: `listNewestShopProducts(FEATURED_PRODUCTS_LIMIT)`, newest products with stock |
| `/collection` | Every published product |
| `/collection/[category]` | The same page, with the category filter set |
| `/category/[slug]` | Permanent redirect to `/collection/[slug]` (`next.config.ts`) |
| `/search?q=` | The same page, with the text search set. Not indexed |
| `/product/[slug]` | `findShopProductPage` |

All of these render per request (`force-dynamic`), because they read the
database.

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

**The product card** is `ShopProductCard` in `src/components/shop/product-card.tsx`,
used by the shop and the homepage shelf. It links to `/product/[slug]` through
`productHref`.

---

## 6. Variant images

Images are tagged by colour, not by variant id. Storage never changes how a
device looks, and variant ids change when an admin recreates a variant, so a
colour is the stable and meaningful link.

On the product page `ProductStage` holds the selected variant for both the
gallery and the buy panel. The gallery shows the images tagged with the
selected colour plus every untagged image. If that leaves nothing, it shows all
images, so a product is never shown without a picture.

Renaming a variant colour leaves images tagged with the old name. They then
count as belonging to no variant and only appear through the fallback, until
the admin picks the new colour on them.

---

## 7. SEO

| Piece | File |
| --- | --- |
| Sitemap | `src/app/sitemap.ts`. Home, the shop, every category with published products, and up to `SITEMAP_PRODUCT_LIMIT` (1000) products, most recently updated first |
| Robots | `src/app/robots.ts`. Keeps `/admin`, `/api`, `/account`, `/cart` and `/checkout` out, except `/api/v1/media/` so product images stay crawlable, and points to the sitemap |
| Product JSON-LD | `productJsonLd` in `src/lib/seo.ts`, rendered on the product page |
| Canonical and Open Graph image | `generateMetadata` on the product page |

Absolute URLs come from `siteConfig.url` in `src/lib/site.ts`.

The JSON-LD is a `Product` with an `AggregateOffer`: lowest and highest variant
price, variant count, and in stock when any variant has stock. Condition maps
to schema.org the way Google Merchant defines it:

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

---

## 9. Known limits

1. **The cart still uses the mock catalogue.** Add to cart on the product page
   and on cards writes a slug into the local mock cart (`AccountProvider`),
   which looks it up in `src/lib/catalog.ts`. Phase 4 replaces this with the
   server cart.
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
   `npm run db:seed`. Staging has no products until it is run.
