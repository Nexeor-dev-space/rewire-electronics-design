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
- **Pointer cursor is a base rule, not a utility.** Tailwind v4's Preflight sets `cursor: default` on `<button>`, so on a site where the nav arrows, drop CTAs and menu triggers are all buttons, nothing reads as clickable. `globals.css` restores `cursor: pointer` for `button:not(:disabled)`, `[role="button"]` and `summary` once in `@layer base`. Do **not** hand-patch `cursor-pointer` onto individual components — two had already drifted that way, which is what flagged the gap.
- **Verifying transforms in dev tools:** Tailwind v4 compiles `translate-*` / `scale-*` / `rotate-*` to the standalone `translate`, `scale` and `rotate` CSS properties, not to `transform`. `getComputedStyle(el).transform` reads `none` on a hovered element that is in fact moving — check `.translate` and `.scale` instead, or you will chase a hover bug that does not exist.

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

- **Hero** (`hero/`) — a limited release in progress, not a shop window (Apple keynote × Nothing × Rye Island). Full-viewport (`min-h-svh`), three quiet columns: drop label + statement + two CTAs left, the floating device centre, what is left of it right. **Monochrome by rule** — no copper, no italic, no badges, no fold bar, and no sale graphics; the section's only decoration is one enormous ghosted word (`REFURBISHED`, `text-ink/[0.07]`, `text-[15vw]`, wider than the viewport so the section crops it) sitting behind the product. 15vw is the ceiling: at 18vw the ink runs ~112% of the viewport and the centred crop eats the final D.
  - **Centrepiece rotation** — four transparent studio cutouts (`public/images/hero/`) stacked absolutely; a 6s interval moves an `opacity-100` class between them over a 1.2s soft crossfade. Only the active image carries `alt` — the other three take `alt=""` so a screen reader hears one device, not four. Fade only — no slide, zoom or indicators. All four load eagerly so the first cycle never blinks. The cutouts were un-composited locally from the `drops/` JPGs (scratchpad PIL script) — alpha from darkening vs the sampled background, which keeps each render's real studio shadow as semi-transparency instead of deleting it.
  - **Motion** — device floats ±12px on a 7s loop inside a spring-damped cursor tilt (±5°/±3.5° via `transformPerspective`); statement staggers up on load, product fades in at +0.45s, ledger at +0.55s. Everything gates on `useReducedMotion`, including the crossfade interval.
  - **Live drop panel** (`live-drop-panel.tsx`) — this device's ledger, not a spec sheet parked beside a photograph. It opens on the same `01 — 04` the nav caption carries and closes on a control that moves the carousel on, so both ends are wired to the same index and the column reads as belonging to what is on the plinth. Between them: device and variant, then `Available now` → **N units remaining** at display scale → `of N devices` → a 3px bar → the velocity line → `No restock planned.` → `Closes in 2d 08h 32m`. The count is worded "units remaining", not "left": the panel names two devices, and a bare "left" invites the figure to be read against the wrong one. The bar fills with the units **claimed**, not those left, because a nearly-full bar reads as "almost gone" at a glance; it carries `role="progressbar"` with `aria-valuenow`/`aria-valuemax` in device units. Explicitly **not** an auction: no bid, no highest bidder, no starting price, no badges, no exclamation marks. Data from `getLiveDrop()`.
  - **Where the urgency actually comes from.** Three deliberate moves, because a 17px "Only 5 left" is a spec and nobody hurries for a spec. (1) **Scale** — the count is set at `3.25rem`, baseline-aligned with a small "left", so the shortage is the largest thing in the column. (2) **Rate, not level** — `N claimed in the last 24 hours` is the only figure in the panel that describes movement; level says the shelf is thin, rate says it is emptying while you read, which is the actual reason to act now. `claimedRecently` must come from real order data — a velocity figure that is not true is a dark pattern, not a design. Note there is deliberately **no** "N people are viewing this" — fabricated social proof is the line between urgency and a con. (3) **Onward pull** — the closing row names the next device and offers to show it (`Next in this drop` → name → `View product →`). Clicking it advances the carousel to exactly the device it names.
  - **The onward step is a plate, not a row.** Every other block in the column is a ledger entry about *this* device, so as a bare hairline row the next-device step read as one more line of the spec. It sits on its own card — `rounded-xl border border-line bg-surface`, the only surface in an otherwise flat hero — which lifts 2px, darkens its border and gains `shadow-soft` on hover. `View product` carries the site's editorial link rule (drawn in from the left, scoped to the words and not the arrow) so it reads as somewhere to go. It stays a `<button>`, not an `<a>`: it moves the carousel rather than navigating, and an anchor with no destination is a lie to assistive tech.
  - **One number means "running out".** The onward row deliberately carries **no stock count**. It used to, and two urgent orange figures in one 240px column made the reader stop and work out which device each belonged to — the panel's one job is to be unambiguous about *this* device. For the same reason the CTA is quiet ink rather than accent: the orange earns its urgency by only ever meaning scarcity, and spending it on a navigation control is how accents stop working. The row is stacked (label / name / CTA) rather than set inline, because "Vector Book 13" beside a tracked-out mono CTA runs to 236px in a 240px column and a name one character longer would truncate.
  - **The urgency accent** — `--color-urgent` (`#c2410c`) appears in exactly three places in the whole hero: the status dot, the `Only N left` figure, and the bar. Everything else is ink on paper, which is what keeps a burnt-orange count reading as a fact rather than a clearance sticker. It is deliberately **not** the green `live` used elsewhere on the site: green says "certified, all is well", and this dot says the opposite. Measured 4.83:1 on `void`, clearing AA for small text and the 3:1 non-text threshold the bar needs. Never use it as a fill, a badge or a button — the moment it becomes a surface the hero turns into a sale.
  - **Panel ↔ plinth binding** — the scarcity figures read whichever device is currently shown; name, variant, stock and bar all key off the same `active` index, shared with `ProductNav`. A stock number beside the wrong photograph is worse than no number, so these must never be sourced separately.
  - **ProductNav** (`product-nav.tsx`) — browsing the drop, set as a caption rather than a control bar: two hairline 36px circles and a mono `01 — 04`, all at eyebrow scale, centred under the plinth and carrying the product's own 6% bias so it centres on the device rather than its column. Deliberately **not** slider chrome — no dots, no thumbnails, no chunky arrow boxes; that UI under a keynote product announces "carousel" and costs the frame its stillness. The one flourish is inside the circle: the arrow leaves and its replacement arrives from the opposite edge, clipped by the button, so the affordance travels the direction it will take you (`motion-safe` only). The 36px circle sits inside a 44px button — the target is nested rather than padded, so it stays honest under a thumb. Index is `aria-hidden`; the buttons carry the labels and the panel names the device.
  - **DropSelector** (`drop-selector.tsx`) — the whole drop on one screen, on demand, opened from `View all drops →`. The arrows answer "show me another one"; they cannot answer "what else is in here, and which of them is nearly gone" without four taps and a memory test. Rows lead with the unit count because that is what decides which one a visitor opens, and the current device is marked with the word **Showing** rather than a tint alone — a background wash is invisible to anyone not seeing colour, and `aria-current` needs a visible partner. A sheet from the bottom edge on phones, a centred panel from `sm`. Same a11y contract as `WaitlistModal`. A standing grid of four cards in the hero was the alternative and it costs the product its stage, which is the thing the carousel exists to protect.
  - **Where the discovery link sits** — under the nav from `md`, and under the CTAs on phones, where the thumb already is by the time the CTA is on screen and "show me the others" is the natural alternative to "buy this one". Two triggers, one dialog, one visible at a time. Two circles and a fraction say "there are others" only to someone already looking for them; the words are what make the carousel discoverable.
  - **Taking control** — the first click on either arrow sets `steered` and stops the auto-advance for good. Advancing the frame under somebody who is choosing what to look at is the carousel behaviour everyone hates; it also means the rotation can never fight the arrows.
  - **Clock** — the shared `Countdown` renders `02:08:38:08`, which on a multi-day drop reads as hours:minutes:seconds. The hero uses a local `DropClock` on `useCountdown` instead: units spelled out, seconds dropped. A ticking second hand is the discount-sale cue the drop is avoiding.
  - **Rotation pause** — auto-updating information needs a way to stop it (WCAG 2.2.2). Hovering the panel or moving focus anywhere into the hero pauses the cycle; `useReducedMotion` stops it outright. Hover is scoped to the panel, not the section, because the section is hovered incidentally by the cursor-tilt.
  - **The ghosted word spans the viewport, and is separated from the panel vertically — never horizontally.** `15vw` at every size: ink runs ~93% of the viewport so all eleven letters clear both edges (at 18vw it runs ~112% and the centred crop eats the final D, reading "REFURBISHE" — a typo, not a bleed). Two horizontal fixes were tried and both were worse than the overlap they solved: an opaque ground on the rail guillotines the tail mid-word, and sizing the type to fit the canvas costs the full-bleed span the word exists for. There is also **no vertical rule** beside the panel — it read as a divider the composition does not otherwise use.
  - **How the clearance is held.** The word drops to `10%` from `lg` (phones keep `15%`, where the band sits over the product and there is no panel beside it), and the panel's desktop rhythm was tightened from 580px to 512px. The panel is *bottom-anchored*, so it rides higher on a short window — that is the case to design against, not the tall one. Measure against the **real glyph box**, not `Range.getBoundingClientRect()`, which includes the font's full ascent/descent and overstates the caps by ~55px at this size; use `TextMetrics.actualBoundingBoxAscent` off a canvas. Cap baseline to panel top: 28px at 1024×760, 22px at 1280×800, 67px at 1440×900, 173px at 1920×1080 — and the caps still clear the 80px header at all four.
  - **The scarcity module sits between the price and the button, once.** It used to repeat as a card below the brand copy — the same figures twice, the second time too far down to be read. Below `lg` the panel is attached to the product it describes, in the place a shopper actually asks "how many are left", and the identity block above drops its own stock line so the count appears exactly once.
  - **Sticky buy bar** (`max-md`) — name, price, units left and `Grab It Now`, shown whenever the inline CTA is *not fully in view* and the hero still is. The trigger matters: "scrolled past" would leave the first screen — the one that most needs a buy action — without one, because the buttons open below the fold on a 375×812 phone. Bar and buttons are never both visible, and it retires with the hero. Two `IntersectionObserver`s plus one synchronous `measure()` on mount, because an observer's first callback is only guaranteed "at some point after `observe()`", and a resize listener because a resize can move the buttons across the fold without changing either intersection ratio.
  - **Below `lg` the running order changes, not just the spacing.** Desktop reads left-to-right — argument, product, ledger — so stacking it verbatim puts the brand statement between the product and the price of admission, and the CTA lands two screens down. Below `lg` the order is **product → controls → identity → stock → CTA → brand copy → detailed card**: the purchase decision completes before the marketing starts. The brand statement is not demoted, it is just no longer standing between a shopper and the button. This is the fix that mattered; shrinking gaps had not touched it.
  - **The product is capped, not just scaled.** `34svh` under a hard `17.5rem` (280px) ceiling on phones, `46svh` under `24rem` on tablet. The cutouts are `object-contain`, so a taller box does not make the device bigger — it pads it with air and pushes the CTA down. The ceiling is what keeps `Grab It Now` at a near-constant 682–686px across 375/390/414/430 instead of drifting with the viewport: without it a 932px phone hands the product 317px it cannot use.
  - **Mobile is a different composition, not a narrower one.** The desktop frame stacked verbatim ran 1,585px on a 375px screen and put the headline most of a viewport down — the product was read, then a lot of paper, then eventually a reason to buy. On phones: the bar clearance drops from 112px to 88px, the product from 54svh to **42svh** (~42% of the viewport, its stated floor), block gaps from 40px to 28px, and the nav caption tightens to 16px under the device so it reads as the product's caption rather than a stray control. The result is 1,242px with the headline at 562px and the scarcity card breaking the fold — a 22% cut with nothing removed from the argument.
  - **The panel is a card below `lg`, a hairline column above it.** The column reads as editorial *beside* a product; the moment it sits underneath one — stacked on a phone, or in a tablet's second column — it reads as a long form. A tablet running the desktop sidebar is the "squeezed sidebar" failure exactly, so `max-lg:` gives it the plate treatment (`rounded-2xl`, hairline, `surface`, `shadow-soft`) while keeping the full content the wider column can afford.
  - **The panel closes on its own way in** — `View & Shop →`, an outline rather than a second ink fill. It goes where `Grab It Now` goes, so equal weighting would turn one decision into two; it earns its place by being at the end of the argument that just convinced you and unambiguously about the device the panel describes. Hidden on phones (`max-md:`), where `Grab It Now` sits ~24px below it and the pair would read as one ambiguous choice.
  - **The scarcity card on phones** (`max-md:`) — the hairline column becomes one condensed plate (`rounded-2xl border border-line bg-surface p-5`). A column of hairline rows reads as editorial *beside* a product and as a long form *underneath* one, which is what made the scarcity feel like small print. Three compactions, none of which shrink the count: name and variant share a line, the `of N devices` denominator moves onto the count's baseline instead of under it, and the `Available now` label goes — the orange figure says that already. 523px → 304px.
  - **What phones drop, and why it is safe** — the next-device card is `max-md:hidden`. It is a duplicate affordance (the arrows and the swipe already move the carousel) costing 140px on the screen that can least afford it. The `● LIVE` chip beside the drop label is the reverse trade: the scarcity card sits below the fold however tightly the hero is packed, so the fact that a drop is *running right now* needs to be legible in the first screenful. It is `lg:hidden` — redundant once the panel is in view beside the product.
  - **The word has a boundary, and the rail has ground.** From `lg` the hero is two zones: a main visual area and a **purchase rail** at 3 of 12 columns (measured 20.7–22.1% across 1024–1920, inside the 20–24% target). The ghosted word is clipped at `lg:right-[27%]`, so it stops *before* the rail rather than being hidden by it — a word that merely disappears behind a panel still reads as one thing lying on another; confined, it belongs to the product. The rail stretches the full frame height instead of hugging its content (no `self-end`), takes `border-l border-line` as its divider and `bg-void` as its ground, and holds the ledger at the bottom so the shared baseline survives.
  - **Sizing the word to its new frame** — Söhne Medium runs ~6.2× its font-size for these eleven letters, so `lg:text-[11vw]` puts the ink at ~68vw inside a 73vw zone: measured 698px of glyph in a 748px box at 1024, clearing the divider by 43px. `15vw` only ever fitted because it had the whole viewport; the reduction is the price of the boundary. Verify with `span.scrollWidth > span.clientWidth` — a `nowrap` block reports overflow the moment a letter is being eaten.
  - **Re-lay the grain inside any opaque panel.** The rail's solid ground covers the section's paper texture, leaving a clean rectangle in it. A second `.grain` layer inside the rail restores continuity across the divider. When settling animations for a screenshot, exclude `.grain` from blanket `opacity:1` overrides — forcing 2.5% noise to full strength turns the rail into a grey block and looks exactly like a real bug.
  - **PriceBlock** (`price-block.tsx`) — the figure that closes the sale, ranked second only to the photograph: display scale in `urgent`, with the struck original and the saving kept to one small mono line beside it. The eye should land on what the device costs *now* and only then learn what it used to. The percentage is **derived** from the two prices via `savingsPercent`, never stored, so a discount can never drift out of agreement with the numbers printed beside it. No badge, no pill, no red strike-through, no "MRP" — that restraint is the whole difference between a premium reduction and a discount sticker. `<s>` is silent in most screen readers, so a `sr-only` "Was" carries the relationship. Shared by the identity block and the panel so a phone and a desktop ledger can never show different money for one device.
  - **Price outranks stock.** The panel's count used to hold the display slot at `3.25rem`; with a price in play two competing display figures just split the eye, so the count stepped down to `1.75rem` and the price took the rank. Exactly **one** price has a layout box at any width — the identity block carries it below `lg` (where it sits above the CTA), the panel carries it from `lg`, and the panel's copy is `max-lg:hidden`. Printing the same money twice on one screen invites the reader to check whether the two figures agree.
  - **Currency** is `INR`/`en-IN` on the live drop, which is what produces `₹8,999` with Indian grouping. `upcomingDrops` still carries USD in its (unrendered) data — align the two when the catalogue is wired so one page can never print two currencies.
  - **Identity travels with the tap (`lg:hidden`)** — name, variant, then the count as a figure (`8` in urgent, `units left` in ink) over `of 14 devices`, sitting directly under the carousel controls. Without this, tapping an arrow changed the photograph and answered nothing: on a phone the panel that names the device is a scroll away, so the carousel was a picture-flipper. The block is keyed on the device and slides one step in *from the direction of travel* (18px, fade-only under reduced motion), so the copy arrives from where the next product "was". Its counterpart cut: the scarcity card's own name/variant row is `max-md:hidden` — the device would otherwise be named twice within half a screen — which makes the phone card purely quantitative (count, bar, velocity, clock), matching what it is for. From `md` the panel names the device and the identity block would say everything twice.
  - **Two crossfade speeds** — the idle rotation dissolves at `--duration-cinematic`; once `steered`, the same fade reads as lag, so manual steps drop to `--duration-base`. A tap deserves its answer inside half a second.
  - **Swipe** — pointer events on the product cell, read only on release. Nothing is captured or `preventDefault`ed and `touch-action` stays `auto`, so vertical scrolling is untouched: a carousel that eats downward swipes is worse than one with no gesture. A gesture must clear 44px *and* beat its own vertical travel to count, which is what stops a scroll that drifts sideways from changing the product.
  - **Measured across the full ladder** — 1440, 1280, 1024, 900, 834, 768, 430, 414, 390, 375. No horizontal overflow, nothing painting outside the viewport (the ghosted word excepted — it bleeds by design), no clipped copy, no type under 11px, 44×44 carousel targets at every width, and the scarcity card matching the CTA width exactly on phones. Section heights run 900 / 831 / 831 / 1390 / 1450 / 1402 / 1445 / 1430 / 1408 / 1331. At 1024×800 the section exceeds the viewport by 31px, but that overflow is the closing padding: every action — CTA, carousel, `View & Shop` — sits above the fold.
  - **The one-screen guarantee on phones** — `Grab It Now` closes at **682px** in an 812px viewport, so the first screenful carries drop label, product, controls, name, variant, stock and both actions with nothing to scroll. That is the number to protect: it is what makes the mobile hero a shopping surface rather than a poster with a buried button. Anything added above the CTA has to earn its pixels against it.
  - **Tablet keeps the four together.** `md`–`lg` runs two columns: product full-bleed with its controls and identity beneath, then `Grab It Now` in column one *beside* the live-drop card in column two, with the brand copy last. Product → identity → scarcity → CTA stay in one region rather than being split across a stacked page.
  - **The floating "N"** is Next's dev-tools indicator, not page chrome — injected by `next dev`, never in a production build. At 375px no corner is free, so `devIndicators: false` in `next.config.ts` turns it off; error overlays still appear.
  - **Responsive** — three arrangements of the same five blocks; the nav caption travels with the device in all three, so it is always the line directly under the product. Mobile: one column, ordered label → device → argument → stock → CTA, with the two pills full-width and stacked (side by side they measure 337px against a 335px column, so left alone they wrap and read as a mistake). Tablet (`md`): two columns, device full-bleed above, argument and stock side by side; the grid's trailing `1fr` row absorbs the panel's overhang so a tall panel can't push the CTA away from its copy. Desktop (`lg`): the 12-column frame, where row 1 is the `1fr` that swallows the slack and keeps label → headline → CTA tight at a baseline shared with the product and the panel.
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
