"use client";

import { useCallback, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { headingLines } from "@/lib/homepage-sections";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import type { PublishedSection } from "@/types/homepage";
import { CategoryStrip } from "./category-strip";

/** One entrance, several delays — the column reads top to bottom. */
function enter(delay: number) {
  return {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: DURATION.slow, ease: EASE_OUT_EXPO },
  };
}

/**
 * Hero — the brand's opening statement, set from Homepage Builder → Hero.
 *
 * On desktop: the argument (heading, copy, button) on columns 1–4, the
 * hero image on 5–9, and the tagline on a dedicated rail at 10–12.
 *
 * Below `lg` the running order changes rather than merely narrowing: the
 * image first, then the tagline, then the argument and its button.
 *
 * The image is the one staff upload — a desktop version and, optionally, a
 * phone version (`mobileImageUrl`, which falls back to the desktop one).
 * Without an image the centrepiece is left out and the copy stands alone.
 */
export function Hero({ section }: { section: PublishedSection }) {
  const prefersReducedMotion = useReducedMotion();

  /* ---------- Cursor tilt — a few degrees, spring-settled ---------- */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-5, 5]), {
    stiffness: 60,
    damping: 18,
    mass: 0.5,
  });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [3.5, -3.5]), {
    stiffness: 60,
    damping: 18,
    mass: 0.5,
  });

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (prefersReducedMotion) return;
      const { innerWidth, innerHeight } = window;
      mx.set(event.clientX / innerWidth - 0.5);
      my.set(event.clientY / innerHeight - 0.5);
    },
    [mx, my, prefersReducedMotion],
  );

  const handleMouseLeave = useCallback(() => {
    mx.set(0);
    my.set(0);
  }, [mx, my]);


  return (
    <section
      aria-labelledby="hero-heading"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      // `min-h-svh` is a landscape assumption: on a portrait desktop-width
      // canvas (iPad Pro 12.9", 1024×1366) stretching to the viewport
      // opens a ~500px void between the masthead and the product, because
      // the composition is bottom-anchored and the content column is only
      // ~700px tall. In portrait the banner sizes to its content instead
      // and hands the rest of the screen to the calendar below.
      //
      // The section now starts at y=0 and flows *behind* the fixed
      // header (which is semi-transparent with backdrop-blur, so its
      // material shows through). No `mt-*` gap between header and
      // hero means no flat body-bg strip under the nav's bottom
      // divider — the ground, grain and ambient light all extend up
      // to the top of the viewport. REIMAGINED's own offset (bumped
      // in the masthead wrapper below) keeps it clear of the nav.
      className="relative flex min-h-svh flex-col overflow-hidden bg-void md:portrait:min-h-0"
    >
      {/* Paper grain, nothing else */}
      <div aria-hidden className="grain absolute inset-0" />

      {/* Warm backlight behind the product — a low-key radial that gives
          matte-black devices a stage on the graphite ground. Sized to the
          product column on `lg` (right-biased with the composition) and
          centred on the plate below. Alpha capped at 8% so it never
          reads as glow — just an edge of light. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 size-[70vmin] max-w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/0.08),transparent_72%)] blur-3xl lg:left-[58%]"
      />

      {/* The one decoration. It bleeds off both edges on purpose — the
          section's `overflow-hidden` crops it — and stays at z-0 behind
          everything. 15vw is the ceiling before the word stops fitting: at
          18vw the ink runs ~112% of the viewport and the centred crop eats
          the final D, so it reads "REFURBISHE" — a typo, not a bleed.

          It is a background layer and nothing else, so it is never allowed
          to sit under functional type. On phones it is dropped to 3% and
          its band coincides with the product; from `lg` the live-drop rail
          carries its own opaque ground, which is what stops the word from
          running underneath the panel's numbers. */}
      <div
        aria-hidden
        // Fixed rem offsets rather than percentages so the masthead
        // sits a predictable distance below the fixed header regardless
        // of viewport height. Header is ~4.5rem (row 1) + ~2.75rem
        // (nav row 2) = ~7.25rem; `top-[8rem]` md:`top-[9rem]` clears
        // it with a hairline of breathing room.
        className="pointer-events-none absolute inset-x-0 top-[8rem] z-0 select-none md:top-[9rem]"
      >
        {/* Full viewport width at every size, centred, cropped by the
            section's `overflow-hidden`.

            REIMAGINED is ten letters where REFURBISHED was eleven, and it
            measures 5.60× its font-size against the old word's 6.20×. At
            the inherited 15vw it therefore filled only 84% of the viewport
            and left ~116px of dead air at each end. The width is bought
            back with **tracking, not size**: `0.015em` restores the ~93%
            fill the banner was drawn around.

            That choice is load-bearing. Font-size grows the word on both
            axes, and the vertical axis is spoken for — the panel sits to
            the right and the clearance below was tuned by hand. Measured
            at 1280×800, clearance is identical (−13px by the line-box
            proxy) at −0.045em, −0.02em, 0 and +0.02em, while ink runs 84 →
            94%. Letter-spacing fills the line for free; 16.5vw bought the
            same 92% and cost 20px of clearance. If this word is ever
            swapped again, re-tune the tracking and leave 15vw alone.

            Positive tracking is a deliberate exception to the tight
            display setting used elsewhere — at 3–6% opacity and this size
            the word reads as a masthead, and open letterforms suit that
            better than the condensed setting a headline wants.

            Vertical separation alone was fragile — on shorter windows
            the panel rides up (it is bottom-anchored) and the word's tail
            slid into its top edge at 1280×800 (measured −13px). Fixed
            here on the *right axis* instead, without shrinking the word
            or clipping it hard: a linear-gradient mask fades the last 30%
            to transparent from `lg` up, so the ink is at full strength
            across the main hero canvas and dissolves before it reaches
            the rail. That is the difference from the earlier clipping
            attempt — a hard boundary "guillotines" the tail (`REIMAGINE`
            reads as a typo); a soft one lets the D taper into paper the
            way a masthead half-cropped by a page edge does. Panels can
            grow, the mask goes with them. Phones/tablets keep the full
            bleed — no rail beside the word at those sizes. */}
        {/* Symmetric side-fade mask, from `md` up: the letters at the
            outer thirds dissolve into the ground so they do not overrun
            the argument column on the left or the tagline rail on the
            right. The middle ~40% (where the product sits) stays at
            full ink, so REIMAGINED still reads as a masthead behind the
            device. Opacity was dropped a hair (5% at `sm+`) so even the
            central letters do not compete with the small type above
            them. */}
        <span
          className={cn(
            "block whitespace-nowrap text-center font-sans text-[15vw] font-medium leading-[0.8]",
            "tracking-[0.015em] text-ink/[0.025] sm:text-ink/[0.05]",
            "md:[mask-image:linear-gradient(to_right,transparent_0%,black_28%,black_72%,transparent_100%)]",
          )}
        >
          REIMAGINED
        </span>
      </div>

      {/* Mobile starts one tight step under the 64px bar rather than the
          112px the desktop frame wants — on a phone that gap was pushing
          the purchase block most of a screen down before anything was
          read. */}
      {/* The bottom padding is deliberately small from `md` up: the
          category strip below now supplies the banner's floor, and the
          old `lg:pb-16` under it stacked two full gutters between the
          product and the cards. Top padding came down one step for the
          same reason — every pixel spent above the composition is a
          pixel the strip loses at the fold. */}
      <div className="relative z-10 mx-auto flex w-full max-w-[110rem] flex-1 flex-col justify-end px-(--spacing-gutter) pb-6 pt-12 sm:pb-8 sm:pt-16 md:pt-20 lg:pb-8 lg:pt-24">
        {/* Three arrangements of the same five blocks.
            Mobile: one column — device, then everything needed to buy it,
            then the brand statement.
            Tablet and desktop share the same three-column frame — the
            drop's argument left, the device centre, its ledger rail right
            — so an iPad reads exactly like the reference composition
            rather than a rearrangement of it. From `md` the columns run
            in equal thirds (the rail needs every pixel at 768); from `lg`
            the desktop ratio returns (4 / 5 / 3). Row 1 is the `1fr` that
            swallows the slack and keeps label → headline → CTA tight
            together at a baseline shared with the product and the rail. */}
        {/* Between `sm` and `md` the single column caps itself at the
            device's own max-width and centres — a 640–767px canvas given
            full-bleed hairline rows reads as a phone layout on a rack,
            not a tablet design. */}
        {/* 480–767 — the foldable band (Surface Duo, small tablets) — is
            the reference folded once: too narrow for three columns, so the
            device holds the left half and the ledger the right, with the
            CTAs and statement centred beneath. Same reading order, one
            fold. */}
        {/* Grid now runs `auto auto 1fr` — content-first from the top,
            slack at the bottom — so the argument and the tagline rail
            sit at the head of the frame instead of pinning to the fold.
            The drop-edition line above them was removed with the same
            intent: the edition/title reads on the calendar below, and
            repeating it here was pushing the promise "Premium certified
            electronics." down a rank on the page it is meant to open. */}
        <div className="grid w-full gap-y-6 min-[480px]:max-md:grid-cols-2 min-[480px]:max-md:gap-x-6 sm:gap-y-10 sm:max-md:mx-auto sm:max-md:max-w-xl md:grid-cols-12 md:grid-rows-[auto_auto_1fr] md:gap-x-4 md:gap-y-0 lg:gap-x-6">
          {/* ---------- Centrepiece · columns 5–9 ---------- */}
          {section.imageUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                delay: 0.45,
                duration: DURATION.cinematic,
                ease: EASE_OUT_EXPO,
              }}
              className="relative order-2 min-[480px]:max-md:col-start-1 min-[480px]:max-md:row-start-2 md:col-span-4 md:col-start-5 md:row-span-4 md:row-start-1 lg:col-span-5 lg:col-start-5"
            >
              <motion.div
                style={
                  prefersReducedMotion
                    ? undefined
                    : { rotateX, rotateY, transformPerspective: 1100 }
                }
                // Biased right of the column centre so the product's mass sits
                // near 56% of the viewport instead of dead centre.
                //
                // Phones get 34svh under a hard 280px ceiling. The cutouts
                // are `object-contain`, so a tall box does not make the
                // device bigger — it pads it with air and pushes the price
                // of admission below the fold.
                // From `lg` the box height is the *smaller* of 55svh and
                // 38vw. The cutouts are roughly square and `object-contain`
                // renders them at the column's width (~42vw), so any box
                // taller than that is pure air — which is exactly what a
                // portrait viewport produced (a 929px box around a 437px
                // image). On landscape desktops the svh term is already the
                // smaller one, so that is the term the banner is tuned on.
                //
                // It was 68svh before the category strip existed. The strip
                // costs ~170px at the foot of the banner, and the whole
                // point of this composition is that it resolves inside one
                // screen — at 68svh the cards landed 30px above a 900px
                // fold, which is a strip nobody sees. The height came out
                // of the device rather than out of the strip because a
                // half-visible row of five plates reads as a bug, while a
                // slightly smaller product still reads as the product.
                className="relative z-10 mx-auto h-[26svh] max-h-[12rem] w-full max-w-xl min-[480px]:max-h-[16rem] sm:h-[40svh] sm:max-h-[21rem] md:h-[min(55svh,38vw)] md:max-h-none md:max-w-none md:translate-x-[6%]"
              >
                <motion.div
                  animate={prefersReducedMotion ? undefined : { y: [0, -12, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  {/* Decorative, like the promo banner's: the heading beside
                      it carries the meaning, and there is no alt-text field.
                      The phone version swaps in below `md` when there is one. */}
                  {section.mobileImageUrl && section.mobileImageUrl !== section.imageUrl ? (
                    <>
                      <Image
                        src={section.mobileImageUrl}
                        alt=""
                        fill
                        priority
                        sizes="80vw"
                        className="object-contain md:hidden"
                      />
                      <Image
                        src={section.imageUrl}
                        alt=""
                        fill
                        priority
                        sizes="(max-width: 1024px) 50vw, 42vw"
                        className="hidden object-contain md:block"
                      />
                    </>
                  ) : (
                    <Image
                      src={section.imageUrl}
                      alt=""
                      fill
                      priority
                      sizes="(max-width: 1024px) 80vw, 42vw"
                      className="object-contain"
                    />
                  )}
                </motion.div>
              </motion.div>

            </motion.div>
          )}

          {/* ---------- Tagline · right rail ----------
              Where the LiveDropPanel used to live. Editorial statement
              rather than a commerce panel — the hero now hands the page
              to the calendar below rather than trying to sell inline. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.55,
              duration: DURATION.slow,
              ease: EASE_OUT_EXPO,
            }}
            className={cn(
              "order-3 min-[480px]:max-md:col-start-2 min-[480px]:max-md:row-start-2 min-[480px]:max-md:self-center",
              // Anchored to the top of the rail now, not the bottom:
              // `justify-end` was pinning the statement to the fold. On
              // the new `auto auto 1fr` grid the tagline reads directly
              // opposite the argument at the head of the frame.
              "md:relative md:col-span-4 md:col-start-9 md:row-start-1",
              // Nudged below the REIMAGINED background word so the mono
              // tagline reads under the masthead, not through it.
              "md:mt-[9vw]",
              "md:flex md:flex-col md:pl-3 lg:col-span-3 lg:col-start-10 lg:pl-5 xl:pl-8",
            )}
          >
            <p className="max-w-[16rem] font-mono text-[0.6875rem] uppercase leading-loose tracking-[0.22em] text-ink-secondary md:max-w-none">
              {section.eyebrow}
              {section.eyebrow && section.description && <br />}
              {section.description && (
                <span className="text-ink-muted">{section.description}</span>
              )}
            </p>
          </motion.div>

          {/* ---------- The argument ----------
              Supporting brand copy, last below `lg`. It is not demoted, it
              just no longer stands between a shopper and the button. */}
          <motion.div
            {...enter(0.1)}
            className="order-5 max-w-[26.25rem] min-[480px]:max-md:col-span-2 min-[480px]:max-md:row-start-4 min-[480px]:max-md:mx-auto min-[480px]:max-md:text-center md:col-span-4 md:col-start-1 md:row-start-1 md:mt-[9vw]"
          >
            <h1
              id="hero-heading"
              className="font-sans text-[clamp(2.25rem,3.4vw,3.25rem)] font-light leading-[1.06] tracking-[-0.03em] text-ink"
            >
              {headingLines(section.title).map((line, index) => (
                <span key={index} className="block">
                  {line}
                </span>
              ))}
            </h1>
            {section.subtitle && (
              <p className="mt-5 text-base leading-relaxed text-ink-secondary sm:mt-8">
                {section.subtitle}
              </p>
            )}
            {section.ctaLabel && section.ctaHref && (
              <Link
                href={section.ctaHref}
                className={cn(buttonVariants({ size: "md" }), "mt-8")}
              >
                {section.ctaLabel}
                <svg
                  aria-hidden
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3.5"
                >
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </Link>
            )}
          </motion.div>
        </div>
      </div>

      {/* ---------- The catalogue index ----------
          Five families, directly under the product. It sits outside the
          `flex-1` block above rather than inside the grid, so the slack
          the banner distributes still belongs to the composition (label
          → product → tagline) and the strip simply parks on its floor.
          Put inside the grid it would have to claim a row, and every
          pixel it took would come off the device. */}
      <CategoryStrip />

      {/* Hairline that closes the banner and hands the page to the calendar. */}
      <div
        aria-hidden
        className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)"
      >
        <div className="border-t border-line" />
      </div>

    </section>
  );
}
