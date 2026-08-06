# Rewire Electronics

Premium, campaign-driven e-commerce for certified-renewed electronics —
exclusive devices released through limited, numbered drops. Apple's product
storytelling × Nike Launch's drop mechanics × editorial luxury.

**This repo currently contains the foundation only**: design system, tokens,
global chrome, motion vocabulary, and the reusable component library. Pages
(home, drops, product) are built on top of this in later phases.

## Stack

- **Next.js 15** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4** — CSS-first tokens via `@theme` in `globals.css`
- **Framer Motion** — component/entrance animation
- **GSAP** (installed, reserved for scroll-scrubbed choreography)
- **Lenis** — smooth scroll
- **Payload CMS-ready** — domain types in `src/types` mirror future collections

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The full design system is
previewed at **`/styleguide`** (noindexed, internal).

## Architecture

```
src/
├── app/                    # App Router
│   ├── layout.tsx          # Root layout: fonts, SEO, providers, chrome
│   ├── page.tsx            # Placeholder (homepage arrives in a later phase)
│   ├── styleguide/         # Internal design-system preview
│   └── globals.css         # ★ ALL design tokens (@theme) + base + utilities
├── components/
│   ├── ui/                 # Primitives: Button, Badge, Card, Input, Label,
│   │                       #   Skeleton, Spinner, Countdown
│   ├── product/            # ProductCard, ProductCardSkeleton
│   ├── layout/             # Header, Footer, Container/Section primitives
│   ├── motion/             # Reveal, RevealGroup, RevealItem
│   └── providers/          # Lenis smooth scroll, MotionConfig (reduced motion)
├── hooks/                  # use-countdown, use-scroll-state
├── lib/
│   ├── fonts.ts            # Inter / Instrument Serif / IBM Plex Mono
│   ├── motion.ts           # ★ Motion vocabulary: easings, durations, variants
│   ├── site.ts             # Brand config + navigation (single source of truth)
│   └── utils.ts            # cn(), formatPrice(), savingsPercent()
├── types/                  # Product, Drop, Media — Payload-shaped
└── docs/DESIGN-SYSTEM.md   # ★ The design contract — read before building pages
```

## Conventions

- **Tokens or nothing.** Colors, spacing, radius, shadows, easings and
  durations come from `globals.css` / `lib/motion.ts`. No magic values in
  components.
- **Server-first.** Components are server components unless they animate or
  hold state (`"use client"` is the exception, not the default).
- **Motion is composed**, not improvised — use the named variants from
  `lib/motion.ts` and the `Reveal` primitives.
- **Accessibility is built in**: visible copper focus rings, reduced-motion
  support at three layers (CSS, Framer, Lenis), skip link, semantic landmarks,
  status never conveyed by color alone.
- **Prices are integers** (minor units / cents) formatted via `formatPrice`.

See [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) for the full design
language: palette, type scale, motion principles, hover rules, loading
states, responsive strategy and accessibility guidelines.
