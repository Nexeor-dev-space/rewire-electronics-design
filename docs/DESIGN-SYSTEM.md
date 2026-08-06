# Rewire Electronics — Design System

Dark luxury, editorial, cinematic. This document is the contract every future
page and component must follow. Tokens live in `src/app/globals.css`; motion
vocabulary in `src/lib/motion.ts`. If a value isn't a token, it doesn't ship.

---

## 1. Design philosophy

Rewire sells certified-renewed electronics as **limited, numbered drops** — the
product experience of Apple, the urgency of Nike Launch, the editorial calm of
a luxury magazine. Every decision optimizes for:

- **Restraint** — few elements, generous whitespace, one accent color used rarely.
- **Cinema** — slow reveals, deep shadows, products staged like objects in a gallery.
- **Trust** — technical precision (mono type, spec language, certification grades) signals engineering credibility.
- **Conversion** — scarcity (editions, countdowns, stock) is expressed quietly, never as a bazaar.

What we never do: bright white pages, drop shadows on light surfaces, more than
one accent per view, dense grids, discount-store urgency ("SALE!!!"), generic
template patterns.

## 2. Color

| Token | Value | Role |
|---|---|---|
| `void` | `#08080a` | Page background. The site is built on near-black. |
| `surface` / `surface-2` / `surface-3` | `#0e0e11 → #1b1b22` | Elevation steps. Higher = lighter. |
| `ink` | `#f5f4f1` | Primary text — warm off-white, never `#fff`. |
| `ink-secondary` / `ink-muted` / `ink-faint` | greys | Supporting → captions → decorative. |
| `line` / `line-strong` | white @ 8% / 16% | Hairline borders; strong on hover/focus. |
| `copper` (+ `bright`, `dim`) | `#c9a06e` | **The** brand accent — the copper inside every device. Reserve for: drop CTAs, edition badges, focus rings, key highlights. If a view has copper in more than two places, remove one. |
| `live` | `#3ecf8e` | A drop is live. Only for status. |
| `warn` | `#e8c468` | Low stock, ending soon. |
| `danger` | `#e5645f` | Errors, sold out. |

Elevation on dark is communicated by **surface steps + edge light**
(`edge-light` utility = 1px inner top highlight), not by heavy borders.

## 3. Typography

Three voices, three families (loaded via `next/font`, wired in `src/lib/fonts.ts`):

1. **Inter (`font-sans`)** — UI, body, navigation. Neutral and invisible.
2. **Instrument Serif (`font-display`)** — editorial display. Oversized headlines; *italics* for emotional emphasis.
3. **IBM Plex Mono (`font-mono`)** — the technical voice: prices, countdowns, spec labels, eyebrows, edition numbers. Always `tabular-nums` for ticking values.

Fluid display scale (clamped, viewport-driven):

| Class | Size | Use |
|---|---|---|
| `text-display-2xl` | 60–144px | Hero statements only |
| `text-display-xl` | 48–96px | Page titles |
| `text-display-lg` | 36–64px | Section headlines |
| `text-display-md` | 28–44px | Sub-sections, pull quotes |
| `text-display-sm` | 22–28px | Card titles, minor headlines |
| `eyebrow` utility | 12px mono, +0.18em tracked, uppercase | Section labels |

Rules: negative tracking on display sizes (built into tokens); body stays
14–18px Inter; headlines `text-wrap: balance` (global default for h1–h3).

## 4. Spacing & layout

- `--spacing-gutter` — fluid page side padding (20–48px). Use `px-(--spacing-gutter)` or the `Container` component.
- `--spacing-section` — vertical rhythm between chapters (80–176px) via `Section`.
- Containers: `narrow` (48rem, prose) · `default` (80rem) · `wide` (110rem, editorial/product grids).
- Whitespace is the luxury signal: when in doubt, double it.

## 5. Radius, shadows, glass

- Radius: `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · full`. Cards use `xl`; buttons and badges are pills (`full`); inputs `md`.
- Shadows (dark-tuned): `soft` (panels) · `float` (floating product cards, menus) · `glow` (copper ambience behind accent CTAs) · `edge` (1px machined highlight).
- **Glass** (`glass` utility): blur + saturation over imagery or gradients only — never over flat color, never for body text surfaces. Current uses: scrolled header, mobile overlay, countdown chip on product stages.

## 6. Components (src/components/ui)

- **Button** — variants `primary` (inverted light), `accent` (copper, drop CTAs only), `outline`, `ghost`, `link` (animated underline); sizes `sm/md/lg`; `loading` swaps label for spinner without width shift.
- **Badge** — mono voice; `default/outline/copper/live/warn/soldOut`; `live` carries a pulsing dot.
- **Card** — `surface/sheen/glass/plain` + `floating` + `interactive` (lift −4px on hover).
- **Input / Textarea / Label / FieldError** — hairline fields; copper focus border; error state driven by `aria-invalid`.
- **Countdown** — full stat row (drop pages) or `compact` chip (cards); mono `tabular-nums` so digits never jitter.
- **Skeleton** — shimmer on surface tones; compose layout-accurate ghosts (see `ProductCardSkeleton`) so hydration causes zero CLS.
- **ProductCard** — 4:5 stage with radial sheen; status chrome (live/edition badges) inside the stage; meta and mono price outside it; hover = card lifts −6px, product scales 1.04 and eases forward, ambient shadow deepens.

## 7. Motion principles

Defined once in `src/lib/motion.ts` — never inline ad-hoc curves.

1. **One easing family.** `EASE_OUT_EXPO` `cubic-bezier(0.16,1,0.3,1)` for all entrances; `EASE_IN_OUT_SOFT` for elements that move and return. No bounces, no springs on layout, no linear (except marquee/shimmer).
2. **Duration scale.** `fast 200ms` (hover/press) · `base 400ms` (UI transitions) · `slow 800ms` (reveals) · `cinematic 1200ms` (hero media). Nothing between or beyond.
3. **Named movements only.** `fadeUp` (rise 28px), `fadeIn` (media), `scaleIn` (settle from 1.04 — zoom out, never in), `lineReveal` (text rises out of clip), `staggerChildren` (60–80ms between siblings).
4. **Reveal once.** Scroll entrances trigger a single time, ~12% before entering the viewport (`viewportOnce`). Never re-animate on scroll-up.
5. **Transform + opacity only.** Never animate width/height/top/margin. GSAP is reserved for scroll-scrubbed choreography (pinned product stories) in later phases; Framer Motion handles everything else.
6. **Scroll.** Lenis (`lerp 0.1`) provides the glide; it uses native scroll position so anchors and a11y survive. Parallax stays subtle (≤10% travel).
7. **Reduced motion is law.** Global CSS kill-switch + `MotionConfig reducedMotion="user"` + Lenis opt-out. Every custom effect must degrade to opacity or nothing.

### Hover language
- Cards lift (−4 to −6px) with shadow deepening.
- Product imagery scales to 1.04 max.
- Nav links underline left-to-right (origin flips on exit).
- Buttons brighten and press to 0.97 scale.
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

- Contrast: `ink` on `void` ≈ 17:1; `ink-secondary` ≥ 7:1; `ink-muted` reserved for non-essential text. Copper on void ≈ 7.4:1 — safe for text and focus rings.
- Visible focus: global copper `:focus-visible` ring, 3px offset. Never `outline: none` without replacement.
- Semantics: one `h1` per page, landmarks (`header/nav/main/footer`), skip-link to `#main` (in root layout), `aria-expanded/controls` on the menu toggle, `role="alert"` on field errors, `aria-busy` on loading buttons.
- Status is never color-alone: live = dot **+** label; sold out = strikethrough **+** label.
- Countdown announces via `aria-label`; decorative type (ghost wordmark) is `aria-hidden`.
- Full keyboard path for every interaction; body scroll locks while the overlay menu is open.

## 11. Extending the system

Adding a component: build from tokens only → include focus, disabled, loading,
reduced-motion states → document its variants here → preview it on
`/styleguide`. If a new value (color, duration, radius) feels necessary,
promote it to a token first or don't use it.
