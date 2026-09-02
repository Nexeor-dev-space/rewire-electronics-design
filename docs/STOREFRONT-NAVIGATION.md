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
| 1 | Four primary product families | `src/lib/categories.ts` |
| 2 | One condition vocabulary | `src/lib/shop.ts` |
| 3 | Navbar stability | `src/hooks/use-scroll-state.ts`, `src/app/globals.css` |
| 4 | About absorbed Support | `src/lib/navigation.ts` |
| 5 | Support box reused in the About panel | `src/components/layout/mega-primitives.tsx` |
| 6 | Mobile profile dropdown | `src/components/layout/mobile-tab-bar.tsx` |

---

## 2. Primary product families

**Source of truth: `src/lib/categories.ts`.**

The storefront navigates four families, in this order:

1. Smartphones
2. Laptops
3. Tablets
4. Accessories

Every navigation surface derives from that one list, so adding a family
adds it everywhere at once:

| Surface | Component | How it reads the list |
|---|---|---|
| Navbar rail | `components/layout/category-bar.tsx` | `getCategoryNav()` in `lib/navigation.ts`, ordered by `CATEGORY_ORDER` |
| Category panel | `components/layout/category-mega-panel.tsx` | `getCategories()` by slug |
| Mobile drawer | `components/layout/mobile-drawer.tsx` | `getDrawerSections()` |
| Homepage strip | `components/home/hero/category-strip.tsx` | `getFeaturedCategories()` |
| Best sellers | `components/home/featured/featured.tsx` | `getFeaturedProducts()` in `lib/products.ts`, one product per family |

### Audio and Wearables

Both were removed from `categories.ts` and from `CATEGORY_ORDER`. They
are **not** removed from the catalogue:

1. `lib/shop.ts` still stocks eleven headphone and smartwatch listings.
2. `shopCategories` still offers Audio and Smartwatches, so the
   `/collection` filter panel still browses them.
3. `lib/catalog.ts` still owns their product pages, and every
   `/product/[slug]` route for them still resolves.

What changed is presentation only. Those families are no longer
top-level navigation destinations, and no longer appear on the
homepage. Nothing in the database was deleted.

To reinstate a family, add it back to `categories.ts` **and** to
`CATEGORY_ORDER`. Both, so the label and the rail cannot disagree.

### The Smartphones slug

The label is `Smartphones`; the route slug stays `phones`.

`lib/shop.ts` resolves `phones` to `smartphones` through
`categoryAliases`, so `/collection/phones` renders the Smartphones
listing and every link already in the wild keeps working. Only the word
the shopper reads changed. `catalog.ts` still seeds products with
`categorySlug: "phones"`, which is what `getProductsByCategory()` in
`getCategoryNav()` queries.

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

`conditionsFromParam()` in `lib/shop.ts` reads `?condition=` the same
way `brandsFromParam()` reads `?brand=`. Both collection routes pass
the result to `ShopCatalogue` as `initialConditions`.

```
/collection?condition=refurbished
/collection?condition=pre-owned
/collection/laptops?condition=open-box
```

This is what makes the homepage legend a way into the shop rather than
three tiles that all land on the same unfiltered grid. Unknown values
are ignored, so a bad link degrades to the full shelf rather than an
error.

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
happens after mount, when the provider has read persisted state, so a
signed in reader watched the utility row grow on every page load, which
pushed the centred search field left and re-flowed the bar.

`SLOT_WIDTH` now reserves the wider of the two states from first paint.
Both states render inside the same box.

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

The panel is the way in plus one link: a `Sign in` button and
`Track Order`. Order tracking sits behind the account auth gate either
way, but naming it here is what stops a shopper hunting for it in a
company menu where it never belonged.

### Drawer account block

`components/layout/mobile-drawer.tsx` used to render the whole signed in
account block expanded whenever the drawer opened. It is now a
disclosure under the reader's own name, closed on every open, following
the same rule as the profile icon. Signed out there is nothing to
disclose, so the block is absent entirely; the drawer's fixed foot
already carries `Sign in`.

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

## 9. Checklist for future changes

1. Adding a product family? `categories.ts` **and** `CATEGORY_ORDER`.
2. Renaming a condition? `conditions` in `shop.ts`, once. Never in a
   component.
3. Adding an About menu entry? `aboutColumns` in `navigation.ts`. If it
   is a support section, add it to `supportSections` instead and it
   appears in both places.
4. Adding a nav item that points at a route? Build the route first. The
   house rule is that a nav item never 404s.
5. Adding chrome that changes size after mount? Reserve its box, the way
   `SLOT_WIDTH` does in `account-menu.tsx`.
