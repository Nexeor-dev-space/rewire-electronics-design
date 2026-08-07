# Rewire Electronics — Design System

Light luxury, editorial, cinematic. This document is the contract every future
page and component must follow. Tokens live in `src/app/globals.css`; motion
vocabulary in `src/lib/motion.ts`. If a value isn't a token, it doesn't ship.

---

## 1. Design philosophy

Rewire sells certified-renewed electronics as **limited, numbered drops** — the
product experience of Apple, the urgency of Nike Launch, the editorial calm of
a luxury magazine. Every decision optimizes for:

- **Restraint** — few elements, generous whitespace, one accent color used rarely.
- **Cinema** — slow reveals, soft directional light, products staged like objects in a gallery.
- **Trust** — technical precision (mono type, spec language, certification grades) signals engineering credibility.
- **Conversion** — scarcity (editions, countdowns, stock) is expressed quietly, never as a bazaar.

What we never do: pure `#fff` backgrounds, hard black shadows, more than one
accent per view, dense grids, discount-store urgency ("SALE!!!"), generic
template patterns.

## 2. Color

| Token | Value | Role |
|---|---|---|
| `void` | `#f8f7f4` | Page canvas — warm off-white. Never a pure-white page. |
| `surface` | `#ffffff` | Cards and raised panels sit pure white on the canvas. |
| `surface-2` / `surface-3` | `#f2f0ec` / `#eae7e1` | Hover / nested, then highest elevation. |
| `ink` | `#111111` | Primary text. Never `#000000`. |
| `ink-hover` | `#222222` | Filled-button hover only. |
| `ink-secondary` | `#6d6d6d` | Supporting descriptions. |
| `ink-muted` | `#9a9a9a` | Supporting labels — see the contrast note in §10. |
| `ink-faint` | `#c4c1ba` | Decorative only. Never text. |
| `line` / `line-strong` | `#e6e3dd` / `#d8d4cc` | Hairline borders; strong on hover/focus. |
| `accent` (+ `hover`) | `#b7864a` / `#9f6c37` | **Under 5% of any view.** Highlighted words, small badges, the live countdown, hairline dividers, micro icons, progress. **Never a section background.** |
| `live` | `#6f8d7a` | Certified · battery health · inspection passed · warranty active. |
| `warn` | `#d08a34` | Low stock · limited drop · countdown urgency. Nothing else. |
| `danger` | `#b4544e` | Errors, sold out. |

The UI is ~95% neutral and ~5% accent. Separate cards with **borders first, shadow second**:
a `1px solid line` edge plus `--shadow-soft` is the house card, and elevation only
increases on hover. There are no glows, no saturated fills, and no gold gradients —
accent words are set in flat `text-accent`.

## 3. Typography

**Two families, one of them a single face.** Loaded via `next/font/local` from
`/public/fonts` — no external requests. Wired in `src/lib/fonts.ts`.

1. **Söhne (`font-sans`)** — everything structural: headings, body, buttons, navigation.
2. **Söhne Mono (`font-mono`)** — the technical voice: prices, countdowns, spec labels, eyebrows, edition numbers. Always `tabular-nums` for ticking values.

There is **no display face and no italic**. Söhne ships four weights and only four:

| Weight | Klim name | Use |
|---|---|---|
| 300 Light | Leicht | The quiet opening line of a headline |
| 400 Regular | Buch | Body copy, and the middle voice in a headline |
| 500 Medium | Kräftig | UI — buttons, navigation, card titles |
| 700 Bold | Dreiviertelfett | The one emphasised phrase per headline |

### Emphasis
Emphasis is **typographic, never decorative**. Build it from weight, size, line
breaks, letter-spacing, white space and alignment — never a second family,
never italics, and **never colour**. The hero is the reference:

```
Premium devices.     ← 300 Light
Released             ← 400 Regular
differently.         ← 700 Bold, tracking tightened a step
```

One bold phrase per headline, always the last line, always the same ink.

Fluid display scale (clamped, viewport-driven):

| Class | Size | Use |
|---|---|---|
| `text-display-2xl` | 60–144px | Hero statements only |
| `text-display-xl` | 48–96px | Page titles |
| `text-display-lg` | 36–64px | Section headlines |
| `text-display-md` | 28–44px | Sub-sections, pull quotes |
| `text-display-sm` | 22–28px | Card titles, minor headlines |
| `eyebrow` utility | 12px mono, +0.18em tracked, uppercase | Section labels |

Rules: negative tracking on display sizes, tightened one more step on the bold
line; body stays 14–18px; headlines `text-wrap: balance` (global for h1–h3).

⚠ The Söhne files in `/public/fonts` are Klim **trial** cuts carrying 68 glyphs
(A–Z, a–z, 0–9, comma, period, hyphen). Every other character — `· — % : & ?`
and the rest — resolves from Helvetica, which leads the fallback stack because
Söhne is drawn from it. Licensed files with a full character set are required
before launch.

## 4. Spacing & layout

- `--spacing-gutter` — fluid page side padding (20–48px). Use `px-(--spacing-gutter)` or the `Container` component.
- `--spacing-section` — vertical rhythm between chapters (80–176px).
- **Each section owns its top padding only** (`pt-(--spacing-section)`), never `py`. Two sections that both pad top *and* bottom stack into a double gap — 346px at desktop — and the boundary rhythm then depends on which pair you are between. Top-only makes every gap exactly one token. The single exception is the last section before the footer, which adds `pb-(--spacing-section)` because there is no following section to supply it. Never hardcode the value (a stray `py-30` once put three different gaps on one page).
- Containers: `narrow` (48rem, prose) · `default` (80rem) · `wide` (110rem, editorial/product grids).
- Whitespace is the luxury signal: when in doubt, double it.

## 5. Radius, shadows, glass

- Radius: `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · full`. Cards use `xl`; buttons and badges are pills (`full`); inputs `md`.
- Shadows — soft elevation only: `soft` `0 8px 24px rgb(0 0 0/.06)` (resting card) · `float` `0 12px 32px rgb(0 0 0/.09)` (hover) · `edge` (1px inner highlight). Cards should feel as though they gently float; nothing casts drama.
- **Glass**: `glass` for chrome over gradients (header, overlay); `glass-strong` when the panel sits over photography and must stay legible (drop-card badges and countdown). Never over flat color, never for body text surfaces.

## 6a. Navigation (src/components/layout)

- **Header** — 80px bar (`h-16 md:h-20`), three zones from `lg`: wordmark, five primary links centred, then search · account · cart · Join Waitlist. Transparent over the hero; at 24px it settles to `--glass-bg` with a hairline, and retreats on downward scroll — but never while a menu, the search, or the drawer is open. Heights are load-bearing: the hero's top padding clears them.
- **MegaMenu** (`mega-menu.tsx` + `mega-panels.tsx` + `mega-primitives.tsx`) — each primary link opens a full-width panel anchored to the bar's bottom edge, sized to the page container so it lands on the same grid as everything else. One white plate: `rounded-3xl`, `border-line`, `0 18px 48px rgb(17 17 17/.08)`, 48px padding rising to 64px at `xl`. **No glass** — the bar above may itself be frosted, and two blurred layers read as fog. Motion is `DURATION.menu` (220ms), opacity + 14px translate, never scale. The *whole bar* owns closing, not the trigger: because the panel is a DOM descendant of the bar, `mouseleave` fires only once the pointer has left both, which is what lets it travel down into the panel. Panels are disclosures (`aria-expanded`/`aria-controls`), not dialogs — no focus trap, Escape closes. Content comes from `src/lib/navigation.ts`, whose lists are derived from the same catalogue adapters the pages use, so the menu can never advertise something the site does not sell.
- **MobileDrawer** — below `lg` the bar collapses to a drawer: search pinned at the top (handing off to the header's own panel rather than duplicating the field), five accordions built from `getDrawerSections()` — the same sources as the mega panels — and Sign in · Cart · Join Waitlist fixed at the foot, clear of the safe-area inset.
- **Link states** — one hairline under each label serves both: solid when `aria-current`, drawn in from the left on hover and focus. Active is weight and a rule, never colour; accent stays reserved for the CTA.
- **NavPanel** — the Categories mega menu and the Support dropdown are the same component, one column or two. Small by design: a mega menu here means more whitespace, not more surface. Hover opens it with a ~130ms close grace so the pointer can cross the gap; the trigger is a `<button>` with `aria-expanded`/`aria-controls`, so click and keyboard work identically. **No glass** — it sits under the header chrome and frosting both would fight.
- **SearchPanel** — global search as a *disclosure*, not a dialog. Rendered inside the header bar and anchored `absolute inset-x-0 top-full`, so it inherits the header's fixed position and travels with it; the bar drops its glass for flat `void` while open so bar and panel read as one surface. Full-bleed, `#f8f7f4` on an `#e6e3dd` hairline with `0 8px 24px rgb(0 0 0/.06)`; a 72px field over a single divider, then three columns (quick searches, categories, recent drops) all filtered live from one query. 250ms opacity + translateY + 5px blur, never scale. Because it is a disclosure it takes `aria-expanded`/`aria-controls` on the trigger rather than `aria-modal`, focus is not trapped, and the page is not scroll-locked — Escape and any pointer landing outside panel-or-trigger close it, returning focus to the icon.
- **MobileDrawer / WaitlistModal** — genuine dialogs, and they share one contract: focus in on open and back to the trigger on close, Escape, scroll lock, `aria-modal` with a label. The drawer additionally traps Tab.
- Category links are derived from `getCategories()` so the menu and the homepage gallery cannot drift; `featured` decides which also get a card in Section 04.
- **Two cuts per category.** The menu frames its cards at `3/2` and the Section 04 rail at `4/5`, so a category carries `image` (portrait, the rail) and an optional `menuImage` (landscape, the menu, falling back to `image`). One shared cut cannot serve both: a 16:9 source center-cropped to 4:5 loses ~55% of its width, which reduces a laptop or a pair of headphones to an unreadable close-up. Menu photography lives in `public/images/dropdown/`.

## 6. Components (src/components/ui)

- **Button** — `primary` (ink fill, `ink-hover` on hover), `accent` (same ink fill, kept separate so "this is a drop CTA" stays readable in markup), `inverse` (light chip for dark plates), `outline` (hairline ink border that fills with ink on hover), `ghost`, `link`; sizes `sm/md/lg`; `loading` swaps label for spinner without width shift. All lift 1px on hover over 250ms — no glow.
- **Badge** — mono voice; `default/outline/accent/live/warn/soldOut`; `live` carries a pulsing dot.
- **Card** — `surface/sheen/glass/plain` + `floating` + `interactive` (lift −4px on hover).
- **Input / Textarea / Label / FieldError** — hairline fields; accent focus border; error state driven by `aria-invalid`.
- **Countdown** — full stat row (drop pages) or `compact` chip (cards); mono `tabular-nums` so digits never jitter.
- **Skeleton** — shimmer on surface tones; compose layout-accurate ghosts (see `ProductCardSkeleton`) so hydration causes zero CLS.
- **ProductCard** — 4:5 stage with radial sheen; status chrome (live/edition badges) inside the stage; meta and mono price outside it; hover = card lifts −6px, product scales 1.04 and eases forward, ambient shadow deepens.

## 7. Motion principles

Defined once in `src/lib/motion.ts` — never inline ad-hoc curves.

1. **One easing family.** `EASE_OUT_EXPO` `cubic-bezier(0.16,1,0.3,1)` for all entrances; `EASE_IN_OUT_SOFT` for elements that move and return. No bounces, no springs on layout, no linear (except marquee/shimmer).
2. **Duration scale.** `fast 200ms` (hover/press) · `base 400ms` (UI transitions) · `slow 800ms` (reveals) · `cinematic 1200ms` (hero media). Nothing between or beyond.
3. **Named movements only.** `fadeUp` (rise 28px), `fadeIn` (media), `scaleIn` (settle from 1.04 — zoom out, never in), `lineReveal` (text rises out of clip), `staggerChildren` (60–80ms between siblings).
4. **Reveal once.** Scroll entrances trigger a single time, ~12% before entering the viewport (`viewportOnce`). Never re-animate on scroll-up.
5. **Transform + opacity only.** Never animate width/height/top/margin. GSAP is reserved for scroll-scrubbed choreography that Framer's `useScroll` cannot express — currently unused on the homepage; Framer Motion handles everything else. Where a section holds frames in place, pin with CSS `sticky`, not ScrollTrigger's `pin`, so Lenis stays authoritative over scroll position. Counters are the one place a number animates: drive them with `animate()` on a motion value, mark the animated numeral `aria-hidden`, and shadow it with an `sr-only` copy of the finished value. The mobile nav accordion is the one place `height` animates — a disclosure has to reflow what sits under it, and `scaleY` would distort the type; keep it to that one element.
6. **Scroll.** Lenis (`lerp 0.1`) provides the glide; it uses native scroll position so anchors and a11y survive. Parallax stays subtle (≤10% travel).
7. **Reduced motion is law.** Global CSS kill-switch + `MotionConfig reducedMotion="user"` + Lenis opt-out. Every custom effect must degrade to opacity or nothing.

### Hover language
- Cards lift 4–6px, the border darkens to `line-strong` and the shadow steps from `soft` to `float`.
- Product imagery scales to 1.03 max.
- Nav links underline left-to-right (origin flips on exit).
- Buttons darken to `ink-hover`, lift 1px, and press to 0.97 scale.
- Never: color inversion flashes, rotation, blur-in on hover.

## 8. Loading states

- Route/data loading: layout-accurate skeletons (`skeleton` shimmer utility), matching final aspect ratios exactly — zero layout shift.
- In-flight actions: `Button loading` keeps width, shows spinner, sets `aria-busy`.
- Images: `next/image` with explicit dimensions or aspect containers; hero media may `scaleIn` on load.

## 9. Responsive strategy

Mobile-first, fluid-first: clamps handle most scaling before breakpoints do.
Breakpoints (Tailwind defaults): `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`.

- Product grids: 1 col → 2 (`sm`) → 3–4 (`lg`).
- Nav collapses to full-screen overlay under `md`; drop CTAs become full-width.
- Touch targets ≥ 44px; hover effects are enhancements, never the only affordance.
- Test at 360px width first, not last.

## 10. Accessibility

- Contrast, measured on the `#f8f7f4` canvas: `ink` **17.6:1**, `ink-secondary` **4.83:1** (both pass AA). The brand palette is deliberately soft and four tokens sit **below AA for small text**: `ink-muted` 2.63:1, `accent` 3.01:1, `live` 3.40:1, `warn` 2.66:1. They are safe as fills, borders, icons and large type. If any of them has to carry small body text, use the AA-passing darkening instead — `#717171`, `#90693a`, `#5e7767`, `#996626` respectively.
- Visible focus: global accent `:focus-visible` ring, 3px offset. Never `outline: none` without replacement.
- Semantics: one `h1` per page, landmarks (`header/nav/main/footer`), skip-link to `#main` (in root layout), `aria-expanded/controls` on the menu toggle, `role="alert"` on field errors, `aria-busy` on loading buttons.
- Status is never color-alone: live = dot **+** label; sold out = strikethrough **+** label.
- Countdown announces via `aria-label`; decorative type (ghost wordmark) is `aria-hidden`.
- Full keyboard path for every interaction; body scroll locks while the overlay menu is open.

## 11. Page sections

Composed sections live in `src/components/home/<section>/`, each owning its
background, reveal choreography and sub-components.

- **Hero** (`hero/`) — a product launch frame, not a shop window (Apple keynote × Nothing × Rye Island). Full-viewport (`min-h-svh`), three quiet columns: short statement + two CTAs left, the floating device centre, the drop's facts as a hairline ledger right. **Monochrome by rule** — no copper, no italic, no badges, no countdown chrome, no fold bar; the section's only decoration is one enormous ghosted word (`REFURBISHED`, `text-ink/[0.05]`, `clamp(9rem,22vw,20rem)`, wider than the viewport so the section crops it) sitting behind the product.
  - **Centrepiece rotation** — four transparent studio cutouts (`public/images/hero/`) stacked absolutely; a 4.5s interval moves an `opacity-100` class between them over a 1.2s soft crossfade. Fade only — no slide, zoom or indicators. All four load eagerly so the first cycle never blinks. The cutouts were un-composited locally from the `drops/` JPGs (scratchpad PIL script) — alpha from darkening vs the sampled background, which keeps each render's real studio shadow as semi-transparency instead of deleting it.
  - **Motion** — device floats ±12px on a 7s loop inside a spring-damped cursor tilt (±5°/±3.5° via `transformPerspective`); statement staggers up on load, product fades in at +0.45s, ledger at +0.55s. Everything gates on `useReducedMotion`, including the crossfade interval.
  - **Information column** — mono eyebrow, then device name + date + `Only N Devices` + the three credentials as `border-b border-line` rows. No cards, no borders around items. Facts come from `getNextDrop()`; dates through UTC-pinned `formatDropDate`.
  - Below `lg` the grid restacks by `order-*` utilities: device → statement → facts, per the launch-page reading order.
  - **WaitlistModal** — opened by the accent CTA (`aria-haspopup="dialog"`). Hand-rolled rather than native `<dialog>` so it can carry an exit animation: labelled dialog role, Escape, backdrop dismiss, focus moved in and restored on close, Tab cycling held inside, page scroll locked. The eight-field registration form drops into its `children` slot without touching the shell.
- **Upcoming Drops** (`upcoming-drops/`) — Section 02. Oversized heading with serif accent accent, four `DropCard` launch plates on a staggered scroll reveal (1 → 2 `sm` → 4 `xl` columns), centered magnetic CTA. A card is a teaser, not a shop tile: a borderless 3:4 image holding ~70–75% of the card (zooms 1.06 on hover while the card lifts 8px and a accent glow blooms), one status chip and a slim one-line countdown pill floating on the image, then only index, name, variant, starting price and a compact magnetic "Notify me". No specs on the card — battery, condition, warranty and units belong to the product detail page the whole card links to.
- **The Standard** (`standard/`) — Section 03, the trust chapter as an editorial split. Left: label, two-line heading, one paragraph of philosophy, one CTA on five columns. Right: an **Apple-style feature card** on columns 7–12 (column 6 stays empty as breathing room) — `rounded-[2rem]`, `bg-surface`, `--shadow-soft`, generous padding; inside it one short headline ("Certified to Perform."), one supporting line, the device cutout from `public/images/hero/` (its studio shadow is baked into the alpha, so the card adds no lighting of its own), and the four certifications as a hairline 2×2 spec sheet. No leaders, connector lines, callouts or chips — the certification labels still come from `getStandardHotspots()` so the CMS adapter is unchanged. Below `sm` the spec sheet folds to one column; below `lg` the card stacks full-width under the argument. Under the split, three figures count up from zero on arrival, separated by hairlines rather than boxed (`getStandardStats()`).
- **The Process** (`process/`) — Section 05, "How every drop works". The purchase flow as a magazine spread, never a diagram: four rows, one photograph and one paragraph each, the pair swapping sides down the page. Explicitly **no** timeline, connector, stepper, icon grid or cards — sequence is carried by row order alone and the numeral is set at caption scale beside a hairline that draws itself in. Rows are placed with explicit `lg:col-start` **and** `lg:row-start-1` so the media/copy pair can't fall into separate grid rows. Media is capped (`30rem`, `36rem` from `lg`) rather than full-bleed; below `lg` the spread stacks but keeps the zig-zag via `max-lg:ml-auto` on odd rows, which is what stops the tablet layout running to ~5,800px. Reveal is a clip-path wipe over a 1.12 settle, with the copy drifting in from the side it sits on. Imagery in `public/images/process/`.
- **Shop by Category** (`categories/`) — Section 04, the way into the catalogue. Heading, one paragraph, then five photographs on a **horizontal gallery** rather than a grid: product navigation, not a shop shelf. All five sit in view from `xl` (`w-[calc((100%-8rem)/5)]`); below that the rail snap-scrolls at 68% → 42% → 30% width so a partial card always signals there is more. The rail lives *outside* the padded container and re-applies the gutter as both `px` and `scroll-px`, so cards bleed to the viewport edge while their resting position still lines up with the heading. A card is a way in, not a tile — photograph, name, count, one line of character, and a direction arrow; no price, no badge, no button. Hover lifts the plate 6px, warms a accent wash under the product, zooms the image 1.04 and slides the arrow. **Cursor interaction:** the image leans up to 18px toward the pointer while it is over the plate, spring-damped and off under reduced motion. Every hover visual is mirrored on `group-focus-visible`, and the link keeps the global accent focus ring — never swap that for a custom ring on a child. Content from `getCategories()` in `src/lib/categories.ts`.
- **The Archive** (`archive/`) — Section 04. Scarcity stated as history rather than as a badge: four past drops in a horizontal run, each captioned with how long its allocation lasted. Images sit desaturated and lift to full colour on hover. On desktop the row drifts ~12% as the section passes (Framer `useTransform`, gated to `lg` via `matchMedia` so touch never starts pre-offset); on touch it is a snap-scrolling swipe rail. Scroll container and transform are separate elements so neither fights the other, and the container keeps a `pb-4` floor because `overflow-x-auto` also clips vertically. Closes on one line and one link.
- **The Invitation** (`invitation/`) — Section 05. The page's closing note and the only place it asks for anything: one centred statement, one CTA opening the shared `WaitlistModal`, and the next drop's facts as a wide three-column ledger. No cards, no icons, no competing second CTA. Top padding is deliberately `--spacing-section-sm` so it doesn't stack with the archive's bottom rhythm into a dead gap.

Section rhythm: `pt-(--spacing-section)` (see §4 — top-only, never `py`), an eyebrow rule (`Section NN — label`)
above each heading, and one background wash per section — never two competing
gradients.

### Dark bands

`.theme-dark` (defined in `globals.css`) redefines the palette tokens on a
scope rather than hard-coding colors. Tailwind v4 utilities resolve
`var(--color-*)` at use time, so every child of a `.theme-dark` element —
including shared components like `Button` and the `glass` utilities — renders
from the inverted palette automatically. Surface treatments that can't be
expressed as a color token (`--glass-bg`, `--glass-bg-strong`,
`--glass-border`, `--grain-opacity`) are declared as variables in `:root` and
overridden in the scope for the same reason.

Use it sparingly: a dark band is a chapter break, not decoration. One per page
is the working limit.

## Navigation

The bar is the site's one piece of persistent chrome and carries the whole
customer journey. Three zones from `lg` up:

**Wordmark · primary links · utilities.** Primary is five items, no more —
Upcoming Drops, Shop, Categories, How It Works, Support — with Categories and
Support opening hover panels (`NavPanel`). Utilities are Search, Cart and
identity, separated from the links by the bar's single hairline.

- **Cart** (`cart-button.tsx`) links to `/cart` and carries its own count as a small ink chip on the icon's shoulder — never a coloured badge. The count lives in the accessible name, so screen readers get it without a live region.
- **Identity** (`account-menu.tsx`) is one control in two states. Signed out it is a quiet "Sign in"; signed in it becomes a disclosure with the customer's initials, opening My Orders · My Waitlists · Support Tickets · Returns · Profile, with **Logout below its own rule**. It opens on click only, never hover — a destination menu, not a browsing aid.
- Below `lg` the bar is **Logo · Search · Cart · Hamburger**, and the drawer carries everything else: the full primary tree as accordions, then the same account block or the Sign in control.

**Session and cart state** come from `AccountProvider`
(`providers/account-provider.tsx`) via `useAccount()`. It is a front-end
stand-in — `signIn()` sets a demo customer and localStorage persists it so both
navigation states are reviewable. Replace `signIn`/`signOut`/`cartCount` with
the real auth and cart adapters; no component changes. Server and first client
render are always signed-out with an empty cart, and `ready` gates the badge,
so there is no hydration mismatch and no badge flash on load.

## 12. Extending the system

Adding a component: build from tokens only → include focus, disabled, loading,
reduced-motion states → document its variants here → preview it on
`/styleguide`. If a new value (color, duration, radius) feels necessary,
promote it to a token first or don't use it.
