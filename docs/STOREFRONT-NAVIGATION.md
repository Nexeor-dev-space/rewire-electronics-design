# Storefront Navigation and Product Taxonomy

How the navbar, the mobile navigation and the homepage decide what the
storefront sells, and where each of those decisions lives in code.

Read this before adding a category, renaming a condition, or adding an
entry to the About menu.

---

## 1. What changed

A cleanup pass restructured the storefront navigation around four
product families and one editorial heading, defined the three product
conditions in one place, removed the navbar's layout instability, and
made the mobile profile surface interaction gated.

Six changes, each covered in its own section below.

| # | Change | Primary file |
|---|---|---|
| 1 | Primary product families | Admin Categories, via `listStorefrontCategories()` |
| 2 | One condition vocabulary | `src/lib/shop.ts` |
| 3 | Navbar stability | `src/hooks/use-scroll-state.ts`, `src/app/globals.css` |
| 4 | About absorbed Support | `src/lib/navigation.ts` |
| 5 | Support box reused in the About panel | `src/components/layout/mega-primitives.tsx` |
| 6 | Mobile profile dropdown | `src/components/layout/mobile-tab-bar.tsx` |

---

## 2. Primary product families

**Source of truth: the Categories screen in the admin**
(`/admin/categories`), read through `listStorefrontCategories()` in
`src/services/catalogue.service.ts`.

The storefront navigates the published top level categories that have
"Show in the storefront menus and home page" ticked, ordered by their
position and then by name, up to `NAV_CATEGORY_LIMIT` (8). The `(site)`
layout loads that list once per request (from a cache) and hands it to
`StorefrontCategoriesProvider`, so every surface reads the same list and
an admin change reaches all of them at once, with no code change:

| Surface | Component | How it reads the list |
|---|---|---|
| Navbar rail | `components/layout/category-bar.tsx` | `categoryNav(useStorefrontCategories())` in `lib/navigation.ts` |
| Category panel | `components/layout/category-mega-panel.tsx` | The same list, by slug: description, image, brand counts |
| Shop and Categories menus | `components/layout/mega-panels.tsx` | `shopBrowseLinks()` and the list itself |
| Mobile drawer | `components/layout/mobile-drawer.tsx` | `getDrawerSections(categories)` |
| Homepage strip | `components/home/hero/category-strip.tsx` | The first `HOME_CATEGORY_LIMIT` (4) |
| About page | `components/about/what.tsx` | The list, with descriptions |
| Just listed | `components/home/featured/featured.tsx` | Not the family list: the newest in stock products from the database, see [CATALOGUE.md](CATALOGUE.md) |

A category's brand dropdown lists the brands of its in stock published
products, its children included, and only appears when there is more than
one brand. The cache and how admin writes refresh it are described in
[CATALOGUE.md](CATALOGUE.md) §5.

**Search has one component and one field on screen.** The header owns the
query and shares it with `SearchPanel`. From `md` the header field
(`inline-search.tsx`) is the input itself: typing there opens the panel
beneath the bar with suggestions only (`showField={false}`), and Enter goes to
`/search?q=`. Below `md` the search icon and the mobile drawer's search button
open the panel with its own field (`showField={true}`), since the bar has no
field there. Label and placeholder come from `searchCopy` in
`src/lib/site.ts`, and every "see all" path is built by `searchHref(q)`. In
the panel:

1. Tapping search never opens a list on its own. From the inline field the
   panel stays shut until `SEARCH_MIN_QUERY_LENGTH` (2) characters are typed
   (`panelOpen` in `header.tsx`); from the icon it shows only its field until
   then.
2. While typing, `useSearchSuggestions` (`src/hooks/use-search.ts`) calls
   `GET /api/v1/search` after `SEARCH_DEBOUNCE_MS`, and shows Products, Brands
   and Categories, each linking to its page, plus "See all results".
3. It shows a skeleton while loading, a message if the request fails, and "No
   results found" with a Clear search button when nothing matches.
4. Enter opens `/search?q=`. Clear empties the field; Escape or a click
   outside closes the panel.

The search rules and the API are in [CATALOGUE.md](CATALOGUE.md) §4 "Search".
The old full screen `SearchOverlay`, its `searchSuggestions` list and the mock
`src/lib/search.ts` adapter (hardcoded quick searches and sample drops) were
removed, so the storefront keeps no search data of its own.

### Hiding a family

To take a family out of the menus but keep it browsable, untick "Show in
the storefront menus and home page". It stays at `/collection/[slug]`
and in the shop filters. To hide it from the storefront completely, set
it to Draft or Archived; its products disappear with it.

### Old slugs

`resolveCategory()` in `lib/shop.ts` maps older slugs to the database ones
through `categoryAliases` before the lookup, so `/collection/phones`
renders Smartphones and links already in the wild keep working. The menus
themselves link with the database slug.

`src/lib/categories.ts`, the previous hardcoded list of four families and
their studio photos, is no longer read by anything.

---

## 3. Condition vocabulary

**Source of truth: `conditions` in `src/lib/shop.ts`.**

Three secondhand conditions, and two lines that separate them. Repair
separates Refurbished from Pre-Owned. Use separates both from Open Box.

| Condition | Definition | Meaning in one line |
|---|---|---|
| Refurbished | A product that has been restored | Repaired product |
| Pre-Owned | A previously owned product sold in the same condition | Used, not repaired |
| Open Box | An unused product with opened packaging | Unused, packaging opened |

`New` is a fourth value on the `Condition` type and appears in the
filter panel and on the product page, but it is deliberately absent
from the homepage legend: that section explains what the words on a
secondhand listing mean, and sealed stock needs no explaining.

### `ConditionMeta` fields

| Field | Used by |
|---|---|
| `label` | Filter panel, product page, homepage legend heading |
| `short` | Product card badge |
| `summary` | Homepage legend chip. New field: the distinction in four words |
| `note` | Full one sentence definition, everywhere it is spelled out |

### Surfaces that read it

1. `components/shop/filter-panel.tsx`
2. `components/shop/product-card.tsx`
3. `components/product/detail/condition-explainer.tsx`
4. `components/about/conditions.tsx`, which reuses the explainer
5. `components/home/conditions/what-you-have.tsx`

### Two drifts this closed

1. `condition-explainer.tsx` kept its own copy of the definitions and
   had drifted. It named a state called **Just Opened** that the
   catalogue calls **Open Box**, so the product page and the filter
   beside it disagreed about what a shopper was buying. It now reads
   `lib/shop.ts` and holds no copy of its own.
2. `what-you-have.tsx` listed **Used**, a term the catalogue does not
   sell, and marked Pre-Owned as "Not specified in the PRD", which was
   project metadata on the shop front. It now reads `CONDITION_META`.

`lib/shop.ts` also dropped the label `Just Opened / Open Box` in favour
of `Open Box`. Two names for one state is how a condition stops meaning
anything.

### New: condition deep links

`shopFiltersFromParams()` in `lib/catalogue.ts` reads `?condition=`,
`?brand=` and every other shop parameter through the Product API's own
query schema. The collection and search routes pass the result to
`ShopCatalogue` as its starting filters.

```
/collection?condition=refurbished
/collection?condition=pre-owned
/collection/laptops?condition=open-box
```

This is what makes the homepage legend a way into the shop rather than
three tiles that all land on the same unfiltered grid. Unknown
conditions are ignored, so a bad link degrades to the full shelf rather
than an error. An unknown brand is kept and simply matches nothing, and
the empty state offers to clear it.

---

## 4. Navbar stability

Four causes of visible movement were found. All four are fixed.

### 4.1 Scroll direction flapping

**File: `src/hooks/use-scroll-state.ts`.**

`scrollingDown` compared the current scroll position against the
previous frame's, so it flipped on a single pixel. The page runs Lenis,
whose momentum easing delivers a long tail of sub pixel deltas that
alternate sign as a flick settles. Every flip animated the header a
full 100% of its own height, so the bar jittered for the length of the
easing curve.

It now requires `DIRECTION_DELTA` (8px) of travel in one direction
before changing its mind, and the reference position advances only when
it does, so a settling scroll cannot accumulate a flip one pixel at a
time.

`scrolled` had the same problem in miniature and now switches on above
`threshold` and off below `threshold` minus `SCROLLED_HYSTERESIS`.

Both flags are held in closure variables rather than read out of state,
because the hysteresis moves `anchorY` and a `setState` updater has to
stay pure. React calls updaters twice under StrictMode, which would
advance the anchor by two frames of travel for every one the reader
actually made.

### 4.2 Scrollbar width

**File: `src/app/globals.css`.**

`html` now sets `scrollbar-gutter: stable`.

The header is `fixed inset-x-0`, so its width is the viewport minus the
scrollbar. Every event that removed the scrollbar moved the whole bar
sideways by roughly 15px: opening the mobile drawer or the search panel
(both set `overflow: hidden` on `html`), and any route short enough not
to scroll. Reserving the gutter fixes all of them at once.

### 4.3 Account control resize on hydration

**File: `src/components/layout/account-menu.tsx`.**

Signed out the control is a `Sign in` pill; signed in it is an avatar
chip plus the word `Account`, which is roughly 40px wider. The swap
happens after mount, when the session query (`useGetMe`) resolves, so a
signed in reader watched the utility row grow on every page load, which
pushed the centred search field left and re-flowed the bar.

`SLOT_WIDTH` now reserves the wider of the two states from first paint.
Both states render inside the same box. While the query is pending the
signed out pill shows, so nothing shifts when the real state arrives.
Where the state comes from is in §9.

### 4.4 Breakpoint reshuffle

**File: `src/components/layout/category-bar.tsx`.**

The rail folded the last two of six categories into a `More` dropdown
below `xl`, so it rendered a different number of items on either side
of that breakpoint and re-laid itself out as the window crossed it.

With four families and one editorial heading, everything fits inline
from `md` at every width. `MoreItem` was deleted along with three other
components in that file that had already fallen out of use
(`LinkListItem`, `ShopLink`, `BrandDropdown`), removing 375 lines.

### Not changed: font loading

`src/lib/fonts.ts` serves Söhne locally through `next/font/local` with
`display: "swap"` and an explicit Helvetica fallback stack rather than a
synthesised metric fallback. That is a deliberate decision documented in
that file: the trial cuts carry only 68 glyphs, so the substitute is
doing real work on punctuation rather than merely covering a swap, and
Helvetica already matches Söhne's metrics closely.

Turning on `adjustFontFallback` would metric match the fallback and
remove the last of the first paint reflow, at the cost of rendering all
substituted punctuation through adjusted Arial. That trade was left
alone. If navbar movement on first paint is still visible after the four
fixes above, this is the remaining lever.

---

## 5. About absorbed Support

**Source of truth: `aboutColumns` in `src/lib/navigation.ts`.**

The navbar carried two editorial triggers opening two panels, and each
linked to the other. About's last item was `Support`; Support's quick
links included `Warranty`, which About also carried. A shopper looking
for the returns window had to guess which heading owned it.

There is now one heading. The About panel carries:

| Column | Items |
|---|---|
| The Company | Our Story, Terms & Conditions, Privacy Policy |
| Help & Policies | Warranty, Shipping, Returns Refunds & Cancellation, FAQ, Contact |

Every `/support#` href is generated from `supportSections` in
`lib/support.ts`, which is the same list the support page renders, so a
renamed section cannot become a dead menu link. One label differs
between the page and the menu: the page heads that section `Returns`
and the menu says it in full, through `ABOUT_LABEL_OVERRIDES`.

### Removed exports

| Export | Reason |
|---|---|
| `primaryNav`, `PrimaryNavItem` | Superseded by `CategoryBar`'s own data, unused |
| `aboutFeature` | The "Built to be kept." plate it fed is gone |
| `supportLinks`, `supportMenuLinks` | Support has no panel of its own |
| `aboutMenuLinks` | Kept. Now the drawer's flattened About list |
| `editorialNavLinks` | Replaced by the singular `editorialNavLink` |
| `shopIndexLink`, `getUpcomingDropsMenu` | Fed the deleted `ShopLink` and `LinkListItem` |
| `"support"` on `MegaMenuId` | No panel to register |

### Track Order

Track Order was an entry in the old Support menu. It is account
navigation, not editorial, so it left the nav entirely and now sits
behind the profile icon with the customer's other surfaces. Signed in
it is reached as `My Orders`; signed out the profile dropdown names it
`Track Order` explicitly, since that is the one account surface a guest
still has a reason to want.

### New routes

`/terms` and `/privacy` did not exist. The footer had linked to both
since it was written, and both 404'd.

| File | Role |
|---|---|
| `src/lib/legal.ts` | Both documents as data. Swap `getLegalDocument()` for a CMS query later |
| `src/components/legal/legal-document.tsx` | The shell both routes render |
| `src/app/(site)/terms/page.tsx` | Terms & Conditions |
| `src/app/(site)/privacy/page.tsx` | Privacy Policy |

The copy is scaffolding that matches what the storefront already
commits to elsewhere: twelve months of warranty, thirty days to return,
two to four working days to arrive, trading in AED out of the UAE. It
has not been through legal review, and `draft: true` prints that on the
page rather than hiding it in a comment. Replace the section bodies with
reviewed text and flip the flag.

---

## 6. Support box reuse

**File: `src/components/layout/mega-primitives.tsx`, `MenuSupportBox`.**

The right hand side of the About panel used to be `Built to be kept.`,
a photograph linking to `/about`, the page the trigger beside it already
opens.

It now carries the support box lifted verbatim from the old Support
panel: email, live chat with its pulsing status dot, and the hours
behind both. The markup moved into the shared primitives rather than
being rewritten inside `AboutMenu`, so there is one implementation, not
two. Every value is read from `supportContact` in `lib/support.ts`, so
the box, the support page's contact section and the footer all quote the
same address and the same hours.

`MenuSupportBox` takes an optional `className`, which the About panel
uses to pass `h-full` so the box matches the column height.

---

## 7. Mobile profile dropdown

**File: `src/components/layout/mobile-tab-bar.tsx`.**

The Account tab is no longer a link. It is a disclosure, and it owns the
profile dropdown that rises above the bar.

Everything account shaped on a phone now lives behind that one tap:
orders and tracking, wishlist, waitlists, returns, the profile itself,
and sign out. Before, those rows were dealt out across two surfaces,
some in the hamburger drawer expanded on open whether or not the reader
had asked for them, and some only reachable by navigating to `/account`
first.

### Interaction contract

1. Hidden on load, always. No state, route or breakpoint opens it.
2. Tapping the profile icon opens it. Tapping the icon again closes it.
3. Tapping anywhere outside closes it. A scrim covers the rest of the
   viewport for exactly that, which also stops the panel obscuring a
   control the reader is reaching for.
4. Escape closes it, matching the drawer and the search panel.
5. A route change closes it.
6. No hover behaviour. This is tap only, unlike the desktop nav panels.

The bar itself sits above the scrim and stays tappable, so the dropdown
can never trap a reader away from Home.

### Signed out

The panel is the way in plus one link: a `Sign in` link (to
`signInHref(pathname)`, so the shopper comes back to the same page) and
`Track Order`. Order tracking sits behind the account gate (§9.3) either
way, but naming it here is what stops a shopper hunting for it in a
company menu where it never belonged.

### Drawer account block

`components/layout/mobile-drawer.tsx` used to render the whole signed in
account block expanded whenever the drawer opened. It is now a
disclosure under the reader's own name, closed on every open, following
the same rule as the profile icon. Signed out there is nothing to
disclose, so the block is absent entirely; the drawer's fixed foot
already carries `Sign in`. That foot is a link: to `/account` when
signed in, to `signInHref(pathname)` when signed out.

Desktop navigation is untouched by all of this. `AccountMenu` in the
header keeps its existing click to open behaviour.

---

## 8. Deliberately out of scope

Two things a reader of the cleanup brief might expect to find changed,
and did not.

### The drop calendar

`lib/drops.ts` still carries an Audio release (Aria Studio) and a
Wearables release (Pulse Watch S) in `upcomingDrops`, and the hero's
live drop still carries a watch and a pair of headphones.

Drops are an events axis, not the product taxonomy: a drop has an
edition, an opening time and a fixed allocation, and the calendar is
built so its four cards show four different availability states.
Re-casting two of them means inventing product names, prices and
photography, which is a content decision rather than a navigation
cleanup. Raise it as its own change if the calendar should show only
primary families.

### The footer

`footerNav` in `lib/site.ts` still has a column headed `Support`. The
brief asked for the separate Support heading to be removed from the
navbar, which it was. A footer sitemap column is a different thing and
was left alone.

Note that the footer's `Brand` column still links to `/process`,
`/certification` and `/journal`, and its `Shop` column links to `/`.
Those were dead before this change and remain so.

---

## 9. Sign-in, the account gate and header state

The storefront's session is real. The demo customer that
`AccountProvider` used to fake (`DEMO_USER`, `signIn`, `signOut`,
`useAccount().user`) is gone, and so is its mock cart; that provider now
holds only the wishlist. The full auth rules are in [AUTH.md](AUTH.md); the
cart's data sources are in §10.

### 9.1 Auth pages

`src/app/(auth)/` is a route group with its own layout: no header,
footer or tab bar, the same reduced chrome as checkout, on storefront
tokens. Five routes, none indexed:

| Route | Purpose |
|---|---|
| `/sign-in?next=` | Email and password |
| `/register?next=` | New customer account |
| `/forgot-password` | Request a reset link |
| `/reset-password?token=` | Set a new password from the link |
| `/verify-email?token=` | Confirm the email from the link |

The URL `/sign-in` is unchanged; only its file moved from
`src/app/sign-in/` into the group. Staff sign in on the same page.

### 9.2 Building a sign-in link

Every sign-in link carries the page to come back to. Build it with
`signInHref(pathname)` from `src/lib/auth/next-path.ts`, never by hand;
it drops any `next` that is not a same-site path or that points at an
auth page. The header, drawer and tab bar all do this.

### 9.3 The account gate

`src/app/(site)/account/layout.tsx` guards every `/account/*` page on
the server. Signed out, it renders `SignInRedirect`, which sends the
visitor to `/sign-in?next=<the page>` (deep links such as
`/account/orders/123` survive). The page itself never renders, so no
account content reaches a signed out visitor. Signed in with an
unverified email, a `VerifyEmailBanner` with a resend button sits above
the page.

The account pages no longer wrap themselves in `AccountGated`, and
`src/components/account/account-auth-gate.tsx` is deleted. A new page
under `/account` is gated by the layout with no code of its own.

### 9.4 Header, drawer and tab bar state

`AccountMenu`, `MobileDrawer` and `MobileTabBar` read the signed in user
from `useGetMe()` (`src/hooks/use-auth.ts`), which calls `GET
/api/v1/auth/me` once per full page load and keeps the answer for 60
seconds. It answers `null` when signed out, never 401, so the header
never triggers the sign-in redirect.

1. Signed out or pending: a `Sign in` link to `signInHref(pathname)`.
2. Signed in: the customer's name and email in the menu, and Logout.
3. Logout calls `useSignOut()`, which clears the client cache, then does
   a full load of `/`, so Back cannot show the previous account's data.

The `(site)` layout deliberately does not read the session on the
server: that would add a database query to every storefront render,
crawlers included.

---

## 10. Cart and checkout data sources

The cart is a server cart, read and changed only through
`src/hooks/use-cart.ts`. The full rules are in [CART.md](CART.md).

| Surface | File | Source |
|---|---|---|
| Header cart count | `components/layout/cart-button.tsx` | `useGetCart().itemCount`; hidden while the query is pending, so no badge flash |
| Cart page `/cart` | `components/cart/cart-view.tsx` | `useGetCart()`; lines, issues and totals as priced by the server |
| Add to cart modal | `components/cart/add-to-cart-modal.tsx` | `useGetCart()` for the count and subtotal; the added line from the mutation response |
| Product page buy panel | `components/product/detail/product-buy-panel.tsx` | `useGetCart()` for the selected variant's line; add, update and remove mutations; a skeleton fills the CTA slot while the cart query is pending so the button never flashes before the stepper |
| Card Add to cart | `components/product/add-to-cart-button.tsx` | `useAddCartItem()` with `ShopCard.variantId`; becomes the same − N + stepper once that variant is in the cart, reading the shared `useGetCart()` cache (one request for every card on the page) |
| Checkout `/checkout` | `components/checkout/checkout-view.tsx`, `order-summary.tsx` | `useGetCartQuote(emirate, method)`: lines, totals, coupon and delivery options in one response |

Three rules for anything that shows cart data:

1. **Never compute a total on the client.** Subtotal, discount, delivery, VAT
   and total come from the response. VAT is shown as included ("Includes VAT
   5%"), never added.
2. **Delivery is only known at checkout.** The cart page shows "Calculated at
   checkout"; the quote needs an emirate and a method.
3. **Coupons need a session.** The checkout shows the code field only when
   `cart.couponsAllowed` is true.

`src/app/checkout/page.tsx` passes only the payment options to the view; the
old `DELIVERY` and `VAT_RATE` constants are gone. Placing an order is still
the Phase 4 mock and leaves the cart as it is.

---

## 11. Checklist for future changes

1. Adding or reordering a product family? Do it in the admin Categories
   screen. No code change.
2. Renaming a condition? `conditions` in `shop.ts`, once. Never in a
   component.
3. Adding an About menu entry? `aboutColumns` in `navigation.ts`. If it
   is a support section, add it to `supportSections` instead and it
   appears in both places.
4. Adding a nav item that points at a route? Build the route first. The
   house rule is that a nav item never 404s.
5. Adding chrome that changes size after mount? Reserve its box, the way
   `SLOT_WIDTH` does in `account-menu.tsx`.
6. Adding a sign-in link or an account page? Use `signInHref`, and put
   the page under `/account` so the layout gates it (§9).
7. Showing cart data somewhere new? Call `useGetCart` or
   `useGetCartQuote` and render the server's figures (§10).
