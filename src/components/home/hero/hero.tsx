"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { getLiveDrop } from "@/lib/drops";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { CategoryStrip } from "./category-strip";

/** Dwell per device before the next crossfade. */
const CYCLE_MS = 6000;

/** Horizontal travel before a drag counts as a swipe rather than a tap. */
const SWIPE_MIN_PX = 44;

/** One entrance, several delays — the column reads top to bottom. */
function enter(delay: number) {
  return {
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: DURATION.slow, ease: EASE_OUT_EXPO },
  };
}

/**
 * Hero — a limited release in progress, not a shop window.
 *
 * On desktop: the drop's argument on columns 1–4, the device on 5–9, and
 * its ledger on a dedicated rail at 10–12, sharing one baseline so the eye
 * reads product → price → how many remain → act.
 *
 * Below `lg` the running order changes rather than merely narrowing. The
 * sequence is one uninterrupted purchase block — device, controls, name,
 * variant, price, scarcity, then both CTAs — with the brand statement
 * after it. Nothing about buying is separated from the photograph by a
 * marketing headline, and the drop's numbers appear once, attached to the
 * product they describe, rather than again in a card further down.
 *
 * The plinth turns over every six seconds. Rotation stops on reduced
 * motion, while focus is inside the hero, and while the pointer is on the
 * device itself.
 */
export function Hero() {
  const drop = getLiveDrop();
  const prefersReducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [steered, setSteered] = useState(false);

  const count = drop.devices.length;

  /* ---------- Crossfade rotation ----------
      Stops for good the moment the visitor works the controls: once
      somebody is choosing what to look at, advancing the frame under them
      is the carousel behaviour everyone hates. */
  useEffect(() => {
    if (prefersReducedMotion || paused || steered) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % count),
      CYCLE_MS,
    );
    return () => window.clearInterval(id);
  }, [prefersReducedMotion, paused, steered, count]);


  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  const goPrev = useCallback(() => {
    setSteered(true);
    setActive((i) => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    setSteered(true);
    setActive((i) => (i + 1) % count);
  }, [count]);

  /* ---------- Swipe ----------
      Pointer events rather than touch, so a trackpad drag works too.
      Nothing is prevented or captured: the gesture is only *read* on
      release, which leaves vertical scrolling completely untouched — a
      carousel that eats downward swipes is worse than one with no
      gesture at all. A horizontal intent has to beat both the distance
      floor and the vertical travel to count. */
  const swipeFrom = useRef<{ x: number; y: number } | null>(null);

  const onPointerDown = useCallback((event: ReactPointerEvent) => {
    swipeFrom.current = { x: event.clientX, y: event.clientY };
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent) => {
      const from = swipeFrom.current;
      swipeFrom.current = null;
      if (!from) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) <= Math.abs(dy)) return;
      if (dx < 0) goNext();
      else goPrev();
    },
    [goNext, goPrev],
  );

  const onPointerCancel = useCallback(() => {
    swipeFrom.current = null;
  }, []);

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
      onFocusCapture={pause}
      onBlurCapture={resume}
      // `min-h-svh` is a landscape assumption: on a portrait desktop-width
      // canvas (iPad Pro 12.9", 1024×1366) stretching to the viewport
      // opens a ~500px void between the masthead and the product, because
      // the composition is bottom-anchored and the content column is only
      // ~700px tall. In portrait the banner sizes to its content instead
      // and hands the rest of the screen to the calendar below.
      //
      // The height subtracts the masthead offset it sits below. `mt-16`
      // (`md:mt-20`) pushes this section down by the fixed header, so a
      // flat `min-h-svh` made the banner a full header taller than the
      // screen — and because the composition is bottom-anchored, every
      // one of those 64–80px came off the *bottom*, running the product
      // past the fold and leaving the band under the masthead empty.
      // Subtracting the same offset the margin adds puts the whole
      // composition back inside one screen, which lifts the product.
      className="relative mt-16 flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden bg-void md:mt-20 md:min-h-[calc(100svh-5rem)] md:portrait:min-h-0"
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
        className="pointer-events-none absolute inset-x-0 top-[6%] z-0 select-none md:top-[4%]"
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
          {/* Phone-only live indicator — the drop-edition line above
              carried it on mobile before; now it stands alone as the one
              chrome the top of the mobile hero needs. */}
          <motion.p
            {...enter(0)}
            className="order-1 flex items-center justify-end gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink min-[480px]:max-md:col-span-2 md:hidden"
          >
            <span
              aria-hidden
              className="size-1.5 shrink-0 animate-pulse-dot rounded-full bg-urgent"
            />
            Live
          </motion.p>

          {/* ---------- Centrepiece · columns 5–9 ---------- */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: 0.45,
              duration: DURATION.cinematic,
              ease: EASE_OUT_EXPO,
            }}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
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
                {drop.devices.map((item, i) => (
                  <Image
                    key={item.id}
                    src={item.image.url}
                    alt={i === active ? item.image.alt : ""}
                    fill
                    priority={i === 0}
                    loading={i === 0 ? undefined : "eager"}
                    sizes="(max-width: 1024px) 80vw, 42vw"
                    className={cn(
                      "object-contain transition-opacity duration-(--duration-cinematic) ease-(--ease-in-out-soft)",
                      i === active ? "opacity-100" : "opacity-0",
                    )}
                  />
                ))}
              </motion.div>
            </motion.div>

          </motion.div>

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
              A limited release, once a month.
              <br />
              <span className="text-ink-muted">
                Certified refurbished electronics, released in numbered
                editions.
              </span>
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
              Premium certified electronics.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-ink-secondary sm:mt-8">
              Professionally inspected. Fully warranted. Released in very
              limited quantities.
            </p>
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
