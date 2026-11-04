# Wishlist

How saved products work: where the list lives, how the pages show it, and
the heart.

---

## 1. What changed and why

1. **The wishlist pages showed nothing real.** `/wishlist` and
   `/account/wishlist` looked saved slugs up in the old demo catalogue
   (`src/lib/catalog.ts`), so a product saved from the real shop never
   appeared. They now load real product cards from the database.
2. **The badge always said 4.** A first visit was seeded with four demo
   products (`getWishlistSeed`). The seed is gone, and a browser that was
   seeded drops those four demo slugs once, keeping anything the shopper
   saved. An empty wishlist shows no badge.
3. **The product page heart did nothing.** It flipped a local toggle that
   was never saved. It now uses the same wishlist as every other heart.
4. **The heart turns red, with a pop.** See §4.

No database change and no new environment variable.

---

## 2. Where the list lives

In the browser, as before: `localStorage` key `rewire.wishlist.v1`, an array
of product slugs, newest first. `AccountProvider`
(`src/components/providers/account-provider.tsx`) owns it.

| Member | What it does |
|---|---|
| `ready` | False until the list has been read after mount (stops the badge flashing) |
| `wishlistSlugs` | The saved slugs, newest first |
| `isSaved(slug)`, `toggleSaved(slug)`, `removeSaved(slug)` | Read and change the list |
| `retainSaved(slugs)` | Keep only these slugs; the wishlist page calls it with what the server returned |

At most `WISHLIST_MAX_ITEMS` (24) are kept; saving a 25th drops the oldest.
The list is per device and works signed out.

---

## 3. Showing the products

`GET /api/v1/wishlist?slugs=a,b,c` (public, like the shop) returns the
`ShopCard` for each slug that is a published product, in the order given.
Unknown, deleted or unpublished slugs are left out. At most 24 slugs are read.

```json
{ "success": true, "data": [ { "slug": "google-pixel-8", "name": "Pixel 8", "price": 174900, "...": "..." } ] }
```

| Piece | File |
|---|---|
| Route | `src/app/api/v1/wishlist/route.ts` |
| Validator | `wishlistQuerySchema` in `src/validators/catalogue.validator.ts` |
| Service | `listSavedShopProducts` in `src/services/catalogue.service.ts` |
| Endpoint | `API_ENDPOINTS.wishlist` |
| Hook | `useGetWishlistProducts(slugs)` in `src/hooks/use-catalogue.ts` |
| Pages | `src/components/wishlist/wishlist-view.tsx`, `src/components/account/account-wishlist.tsx` |
| Card | `WishlistCard`: the shop's `ShopProductCard` plus a Remove link |

Both pages handle loading (skeleton), error (Try again), empty and data.
When a fresh answer leaves a slug out, the wishlist page calls `retainSaved`,
so a deleted product stops counting in the tab bar badge.

---

## 4. The heart

`HeartIcon` (`src/components/product/heart-icon.tsx`) is the icon inside
both heart buttons: `WishlistButton` on cards and the large heart on the
product page.

1. Not saved: outline in the current text colour.
2. Becoming saved: fills with the `love` token (`#e5484d`), pops
   0.8 → 1.25 → 1 over `DURATION.base`, and a ring and six dots burst
   outwards over `DURATION.slow`.
3. Unsaving: fades back to the outline, no burst.
4. Reduced motion: colour change only.

The button around it keeps the click, `aria-pressed` and the label.

---

## 5. Not covered

The wishlist does not follow a signed in shopper to another device. That
would need a wishlist table (a migration) and a merge on sign in.
