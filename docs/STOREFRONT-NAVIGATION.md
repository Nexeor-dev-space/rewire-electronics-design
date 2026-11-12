# Storefront Navigation and Product Taxonomy

How the navbar, the mobile navigation and the homepage decide what the
storefront sells, and where each of those decisions lives in code.

Read this before adding a category, renaming a condition, or adding an
entry to the About menu.

**The About menu, the footer and the mobile tab bar are managed by staff since
issue #148.** Their links are no longer written in `aboutColumns`, `footerNav`
or the tab bar component. See [NAVIGATION.md](NAVIGATION.md). Where this
document names those exports, read it as history.

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
| 6 | Account icon links to `/account` | `src/components/layout/account-menu.tsx`, `src/components/layout/mobile-tab-bar.tsx` |

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
| Navbar rail | `components/layout/category-bar.tsx` | The Categories button, see §13.3 |
| Category popup | `components/layout/categories-popup.tsx` | `categoryNav(useStorefrontCategories())` in `lib/navigation.ts`, with brand counts |
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
5. While the panel is open a backdrop (`bg-void/85`, blurred) covers the
   page, so nothing behind shows through. `Header` renders it outside
   `motion.header`, because the header's transform would otherwise confine a
   `fixed` layer to the header box.

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

### Font loading

`src/lib/fonts.ts` serves Geist locally through `next/font/local` with
`display: "swap"`. This note used to explain why `adjustFontFallback` was
turned off: the old Söhne trial cuts carried only 68 glyphs, so the
Helvetica fallback was rendering real punctuation. Geist has a full
character set, so that reason is gone and the option is back on its
default (metric matched Arial). That removes the last of the first paint
reflow this section described.

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
it is reached as `My Orders` on the account pages. Signed out, it is
the public page `/order/track` (`ORDER_TRACK_PAGE_PATH`): the customer
enters an order number and the email on the order, or follows the link
in the confirmation email, which fills both in. It is not behind the
account gate. The page is `noindex`. The tab bar's signed out account
panel (§7) links to it as `Track Order`, and the Support section's
"Track an order" box (`src/lib/support.ts`) points at it with the
action "Track my order". How it matches orders is in
[ORDERS.md](ORDERS.md) §8.

Track Order shows no return links. On a returnable order it adds a notice
telling the guest to create an account with the order email (or reset its
password if one exists), verify it, and request the return from the account;
see [RETURNS.md](RETURNS.md) §10.

### Account returns and order detail links

`/account/returns` sits under `/account`, so the account gate applies (§9).
It reads two presets from the query: `?order=RW-…` selects that order's
returnable lines in the request panel, and `&item=<orderItemId>` narrows it to
one line. The preset only applies when the order is on the loaded page of
eligible orders. `ACCOUNT_RETURNS_PATH` is the constant for the path. The
links come from the account order detail (`/account/orders/[number]`):
"Request a return" in the items header and "Return this item" on each line
with something left to return, while the order is inside its window; "Return
window closed" afterwards. Track Order never shows them. Rules and screens are
in [RETURNS.md](RETURNS.md) §10.

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

## 7. Account icon

**Files: `src/components/layout/account-menu.tsx` (desktop),
`src/components/layout/mobile-tab-bar.tsx` (phones).**

Signed in, the account icon is a plain link to `/account`
(`ACCOUNT_HOME_PATH`), with no dropdown, on desktop and on the mobile tab
bar alike. It shows as active on any `/account/*` page and carries
`aria-current="page"` on `/account` itself. The account pages carry
everything the old dropdown listed: the account nav, and the overview's
quick actions, which now also link My Waitlists, Support and Profile.

**Sign out** is in three places: the account nav
(`components/account/account-nav.tsx`), Account Settings
(`components/account/account-settings.tsx`) and the mobile drawer's
account block (below). The header and the tab bar no longer offer it.

**The account nav** (`components/account/account-nav.tsx`) has two shapes.
From `lg` it is the `AccountSidebar` rail. Below `lg` it is `AccountTopNav`,
a horizontally scrolling strip of the same links, with the active link
underlined and carrying `aria-current="page"`. Since issue #132 the strip
also:

1. Shows the current section above the tabs, as "Your account · Wishlist".
   The label is the active link's own label from `LINKS`, matched with the
   same `isActive` rule as the tabs, so an order detail page reads
   "My Orders".
2. Scrolls itself, not the page, so the active tab sits in the middle of the
   strip on every page (`nav.scrollTo`, run when the path changes). Before
   this, sections near the end, such as Account Settings, opened with their
   tab scrolled out of view.

`accountNav` in `src/lib/site.ts` now feeds only the drawer's account
block. Its `Profile` entry points to `/account/settings`.

Signed out, or while the session is loading, the desktop control is the
`Sign in` pill (§4.3) and the mobile Account tab is a disclosure that
owns a small panel rising above the bar.

### Interaction contract (signed out panel)

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
`Track Order`, a link to `/order/track` (`ORDER_TRACK_PAGE_PATH`). It is a
public page, so a guest can use it without signing in, and naming it here
is what stops a shopper hunting for it in a company menu where it never
belonged.

### Drawer account block

`components/layout/mobile-drawer.tsx` used to render the whole signed in
account block expanded whenever the drawer opened. It is now a
disclosure under the reader's own name, closed on every open, following
the same rule as the profile icon. Signed out there is nothing to
disclose, so the block is absent entirely; the drawer's fixed foot
already carries `Sign in`. That foot is a link: to `/account` when
signed in, to `signInHref(pathname)` when signed out. The block lists
`accountNav` and ends with Logout.

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
primary families. Real releases now have their own pages (§12); the
homepage's Upcoming drops reads them, the menus still read this mock.

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

`src/app/(site)/(auth)/` is a route group inside `(site)`: the pages get the
full header, footer and tab bar (§14), and the group layout only centres the
form card under the fixed header. Five routes, none indexed:

| Route | Purpose |
|---|---|
| `/sign-in?next=` | Email and password |
| `/register?next=` | New customer account |
| `/forgot-password` | Request a reset link |
| `/reset-password?token=` | Set a new password from the link |
| `/verify-email?token=` | Confirm the email from the link |

The URLs are unchanged. Staff sign in on the same page.

### 9.2 Building a sign-in link

Every sign-in link carries the page to come back to. Build it with
`signInHref(pathname)` from `src/lib/auth/next-path.ts`, never by hand;
it drops any `next` that is not a same-site path or that points at an
auth page. The header, drawer and tab bar all do this.

### 9.3 The account gate

`src/app/(site)/account/layout.tsx` guards every `/account/*` page on
the server. Signed out, it renders `SignInRedirect`, which sends the
visitor to `/sign-in?next=<the page>` (deep links such as
`/account/orders/RW-12345678` survive; the order detail route is
`/account/orders/[number]`, by order number, not an id). `/order/track`
lives outside `/account`, so it is not gated. The page itself never renders, so no
account content reaches a signed out visitor. Signed in with an
unverified email, a `VerifyEmailBanner` with a resend button sits above
the page.

The account pages no longer wrap themselves in `AccountGated`, and
`src/components/account/account-auth-gate.tsx` is deleted. A new page
under `/account` is gated by the layout with no code of its own.

The layout also exports `metadata` with `robots: noindex, nofollow`
(`NOINDEX_ROBOTS`), so every account page is kept out of search without
setting it itself.

### 9.4 Header, drawer and tab bar state

`AccountMenu`, `MobileDrawer` and `MobileTabBar` read the signed in user
from `useGetMe()` (`src/hooks/use-auth.ts`), which calls `GET
/api/v1/auth/me` once per full page load and keeps the answer for 60
seconds. It answers `null` when signed out, never 401, so the header
never triggers the sign-in redirect.

1. Signed out or pending: a `Sign in` link to `signInHref(pathname)`.
2. Signed in: the header and the tab bar link to `/account` (§7); the
   drawer shows the customer's name and email over its account block.
3. Logout (account nav, Account Settings, drawer) calls `useSignOut()`,
   which clears the client cache, then does a full load of `/`, so Back
   cannot show the previous account's data.

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
3. **Coupons need a session.** The checkout shows the code field to guests
   too, but without `cart.couponsAllowed` Apply shows "Sign in to use a promo
   code." with a Sign in link and sends no request.

`src/app/checkout/page.tsx` passes only the payment options to the view; the
old `DELIVERY` and `VAT_RATE` constants are gone. Place Order creates a real
order and empties the cart; the success page is `/checkout/success?order=…`
([ORDERS.md](ORDERS.md) §11).

---

## 11. Checklist for future changes

1. Adding or reordering a product family? Do it in the admin Categories
   screen. No code change.
2. Renaming a condition? `conditions` in `shop.ts`, once. Never in a
   component.
3. Adding an About menu, footer or mobile tab entry? Use Storefront,
   Navigation in the admin (NAVIGATION.md). No code change.
4. Adding a nav item that points at a route? Build the route first. The
   house rule is that a nav item never 404s.
5. Adding chrome that changes size after mount? Reserve its box, the way
   `SLOT_WIDTH` does in `account-menu.tsx`.
6. Adding a sign-in link or an account page? Use `signInHref`, and put
   the page under `/account` so the layout gates it (§9).
7. Showing cart data somewhere new? Call `useGetCart` or
   `useGetCartQuote` and render the server's figures (§10).
8. Adding a storefront page? Build its metadata with `pageMetadata` in
   `src/lib/seo.ts`, so it gets a canonical, Open Graph and a Twitter card.
   Set `noindex` if it is personal or a filtered view (docs/CATALOGUE.md,
   section 7).

---

## 12. Release pages and waitlist links (#117)

Releases have real storefront pages. What they show and the waitlist rules
are in [RELEASES.md](RELEASES.md) §12.

| Route | File | Role |
|---|---|---|
| `/releases` | `src/app/(site)/releases/page.tsx` | Every release the storefront shows, earliest opening first. Noindex when `page` or `pageSize` is in the URL |
| `/releases/[slug]` | `src/app/(site)/releases/[slug]/page.tsx` | One release; 404 when it isn't shown |
| `/waitlist/confirm` | `src/app/(site)/waitlist/confirm/page.tsx` | The link in the confirm email. Noindex |
| `/waitlist/leave` | `src/app/(site)/waitlist/leave/page.tsx` | The leave link. Noindex |

The path is `RELEASES_PAGE_PATH` and one release's is `releaseHref(slug)`
(`src/lib/releases.ts`), never a typed string.

Links that now go to `/releases`:

1. `upcomingDropsLink`, the drawer's Upcoming Drops heading and "View all
   upcoming drops" (`src/lib/navigation.ts`).
2. The Drops mega panel's "View Upcoming Drops" and "Join Waitlist"
   (`src/components/layout/mega-panels.tsx`). The header, category bar and
   mega menu no longer pass a do nothing `onJoinWaitlist` down.
3. The footer's "Live Drops" (`src/lib/site.ts`).
4. The Invitation's button (`src/components/home/invitation/invitation.tsx`).

The mega panel's and the drawer's drop lists themselves still read mock
`src/lib/drops.ts` (§8); wiring them to releases is a follow up.

---

## 13. Logo, footer, category popup and mobile cart (#122)

### 13.1 One logo

The company logo is `LogoMark` (`src/components/layout/logo-mark.tsx`): an
inline SVG of REWIRE with a square full stop over ELECTRONICS, redrawn from the
supplied artwork. It is transparent and coloured with theme tokens
(`fill-ink` for REWIRE, `fill-ink-muted` for ELECTRONICS, `fill-accent` for
the full stop), so the same mark is white lettering on dark grounds and black
lettering on light ones. Size it with a height class.

`Logo` (`src/components/layout/logo.tsx`) wraps it in a link home.
`variant="text"` instead draws the typeset wordmark, which only the footer
uses.

| Where | What |
|---|---|
| `Header`, `CheckoutHeader` | `<Logo />` |
| Tax invoice (`OrderInvoice`) | `<Logo />` on the light sheet, so black lettering |
| Sign in, register, forgot and reset password, verify email | `LogoMark` above the card |
| Admin console rail head and mobile bar | `LogoMark` beside the "Admin" label; follows the admin light or dark theme |
| `Footer` | `<Logo variant="text" />`, kept as text on purpose |

To change the logo, change `LogoMark`; never copy its markup or add an image
file of it.

### 13.2 One footer

`Footer` (`src/components/layout/footer.tsx`) is rendered once, by the
`(site)` layout, so every storefront page shares it. Pages never render their
own footer. Only checkout swaps it for the `TrustFooter` (§14).

The footer grid is two link columns side by side on phones with the brand
block above them, and the twelve column row from `md`. The large ghost word
at the foot is uppercase to match the logo and stays `aria-hidden`.

### 13.3 Category popup

Clicking Categories opens a popup listing every storefront category,
following the Wishmaster reference: one row per category with a grid icon,
the name in capitals and a chevron, then an All devices row. Selecting a row
goes to that category's listing and closes the popup.

| Width | Trigger | Shell |
|---|---|---|
| From `lg` | The Categories button, first in the category bar | `CategoriesDropdown`: a plate under the button. Pointing at a category with more than one brand opens a flyout beside it listing those brands with counts |
| Below `lg` | The Categories tab in the bottom tab bar | `CategoriesDialog`: the shared `Dialog`, a bottom sheet on phones and a centred panel on tablets |

Closing: a click outside, Escape or a route change closes the dropdown; the
dialog closes from its close icon, its backdrop, Escape or a route change.
The dropdown opens on click only, never on hover, so it never covers the page
by accident.

The category bar no longer lists each category inline, and
`category-mega-panel.tsx` was removed. Upcoming Drops and About keep their
hover menus.

Both shells live in `src/components/layout/categories-popup.tsx` and read the
same `categoryNav()` list, so an admin change to the storefront categories
reaches both.

### 13.4 Mobile cart

Below `lg` (phones and smaller tablets) the cart is a tab in the fixed bottom
tab bar, not an icon in the top bar:

1. The tab bar now shows below `lg` (it was below `md`) and has five tabs:
   Home, Categories, Cart, Wishlist, Account.
2. The Cart tab's badge is the live `itemCount` from `useGetCart`, the same
   source as the desktop `CartButton`, and its accessible name includes the
   count.
3. The header hides `CartButton` below `lg`; from `lg` the desktop layout is
   unchanged.
4. The `(site)` layout pads the footer wrapper `pb-16` below `lg` so no page
   content ends under the bar, and the homepage draft preview banner sits
   above the bar below `lg`.
5. The cart icon is `CartIcon`, exported from `cart-button.tsx` and shared by
   both. `/cart` and `/wishlist` are `CART_PAGE_PATH` and
   `WISHLIST_PAGE_PATH` in `src/lib/constants.ts`.

Checkout and the payment success page have no tab bar (§14), so the
checkout's own fixed bottom bar never meets it.

---

## 14. One header and footer on every page (#151)

**The rule:** every storefront page shows the same header, footer and mobile
tab bar. The single exception is checkout, which keeps a focused layout.

It is applied in one place. `src/app/(site)/layout.tsx` wraps every route in
`(site)`, including the auth pages (`(site)/(auth)/`) and checkout
(`(site)/checkout/`), and hands the chrome to `SiteChrome`
(`src/components/layout/site-chrome.tsx`). A new page under `(site)` gets the
header, footer and tab bar with no code of its own. Pages never render chrome.

| Page | Header | Footer | Mobile tab bar |
|---|---|---|---|
| Every storefront page, cart and the five auth pages included | Full | Full | Yes |
| `/checkout/success` | Full | Full | No |
| `/checkout` (the one exception) | `CheckoutHeader` | `TrustFooter` | No |

`SiteChrome` is a client component that reads the path against
`CHECKOUT_PAGE_PATH` and `CHECKOUT_SUCCESS_PAGE_PATH` (`src/lib/constants.ts`).
To change the exception, change it there and update this table.

`CheckoutHeader` shows the logo, Secure Checkout badge, Need help link and Back
to cart, with no menus, search or account controls. It uses the main header's
height, gutters and glass surface so cart to checkout reads as the same site.
The checkout's sticky step bar (`checkout-view.tsx`) sits at the same offset.

Fixed header offset: the full header is `fixed`, so a page needs the
`page-top` utility on its outer element (the auth layout and the success page
do this). The checkout header is sticky, so checkout needs none.

The tab bar's bottom pad (`pb-16 lg:pb-0` on the footer wrapper) is applied
only when the bar shows, so it never covers the footer's last line.

---

## 15. The storefront 404 page

**The rule:** a visitor who lands on a page that does not exist keeps the
site chrome and gets two ways on: the collection to shop, or the homepage.

| File | Role |
|---|---|
| `src/app/(site)/not-found.tsx` | The page. A three line headline in the house weights, one sentence, and two buttons: **Shop the collection** (`SHOP_INDEX_HREF`, primary) and **Back to home** (`/`, outline) |
| `src/app/(site)/[...notFound]/page.tsx` | Catch-all for URLs no storefront route owns. It calls `notFound()` so the page above renders inside the `(site)` layout instead of Next's bare default |

It is reached two ways:

1. A page calls `notFound()`: an unpublished product, a renamed category, a
   closed release, an unpublished policy.
2. A URL matches no route at all. Admin and API paths match their own routes
   first, so the catch-all never takes them; `/admin/*` keeps its own
   `not-found.tsx`.

Next answers with a real 404 status in both cases, and the catch-all sets
`NOINDEX_ROBOTS`, so search engines drop the URL. The page carries no data
and renders no chrome of its own; the header, footer and tab bar come from
the layout as on every other page (§14).

House rule: a nav item never 404s (§11). This page is for links from outside
the site and for content that has been taken down, not a destination to
link to.
