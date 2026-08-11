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
import Link from "next/link";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { getLiveDrop } from "@/lib/drops";
import { cn, formatPrice } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { LiveDropPanel } from "./live-drop-panel";
import { ProductNav } from "./product-nav";
import { DropSelector } from "./drop-selector";
import { PriceBlock } from "./price-block";

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
 * The plinth turns over every six seconds and everything bound to it moves
 * together. Rotation stops on reduced motion, while the pointer is over
 * the panel, while focus is inside the hero, and for good once the visitor
 * works the controls.
 */
export function Hero() {
  const drop = getLiveDrop();
  const prefersReducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [steered, setSteered] = useState(false);
  /** +1 forward, −1 back. Only drives which way the copy enters from. */
  const [direction, setDirection] = useState(1);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [showStickyBuy, setShowStickyBuy] = useState(false);

  const count = drop.devices.length;
  const device = drop.devices[active];

  const sectionRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

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

  /* ---------- Sticky buy bar ----------
      Shows whenever the inline CTA is not *fully* in view and the hero
      still is — which means it is already up on first paint, when the
      buttons sit below the fold, and retires the moment the real ones
      scroll into view. Triggering on "scrolled past" instead would leave
      the one screen that most needs a buy action without one. It also
      never doubles up: bar and buttons are never both visible.

      Two observers rather than a scroll listener, so nothing runs per
      frame; `threshold: 1` is what makes "fully visible" the test. */
  useEffect(() => {
    const cta = ctaRef.current;
    const section = sectionRef.current;
    if (!cta || !section) return;

    // Measure once, synchronously. An observer's first callback is only
    // guaranteed "at some point after observe()", and on a page that opens
    // with the buttons already below the fold that gap is exactly when the
    // bar is most needed. This also means the bar is correct on first
    // paint rather than appearing a beat late.
    const measure = () => {
      const c = cta.getBoundingClientRect();
      const s = section.getBoundingClientRect();
      return {
        ctaHidden: !(c.top >= 0 && c.bottom <= window.innerHeight),
        heroOnScreen: s.bottom > 0 && s.top < window.innerHeight,
      };
    };

    let { ctaHidden, heroOnScreen } = measure();
    setShowStickyBuy(ctaHidden && heroOnScreen);

    const sync = () => setShowStickyBuy(ctaHidden && heroOnScreen);

    const ctaObserver = new IntersectionObserver(
      ([e]) => {
        ctaHidden = !e.isIntersecting;
        sync();
      },
      { threshold: 1 },
    );
    const heroObserver = new IntersectionObserver(
      ([e]) => {
        heroOnScreen = e.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );

    ctaObserver.observe(cta);
    heroObserver.observe(section);

    // A resize can move the buttons across the fold without either
    // observer firing — the intersection ratio may not change.
    const onResize = () => {
      ({ ctaHidden, heroOnScreen } = measure());
      sync();
    };
    window.addEventListener("resize", onResize);

    return () => {
      ctaObserver.disconnect();
      heroObserver.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const pause = useCallback(() => setPaused(true), []);
  const resume = useCallback(() => setPaused(false), []);

  const goPrev = useCallback(() => {
    setSteered(true);
    setDirection(-1);
    setActive((i) => (i - 1 + count) % count);
  }, [count]);

  const goNext = useCallback(() => {
    setSteered(true);
    setDirection(1);
    setActive((i) => (i + 1) % count);
  }, [count]);

  /** Jump straight to a device from the drop list. */
  const goTo = useCallback(
    (next: number) => {
      setSteered(true);
      setDirection(next >= active ? 1 : -1);
      setActive(next);
      setSelectorOpen(false);
    },
    [active],
  );

  const openSelector = useCallback(() => setSelectorOpen(true), []);
  const closeSelector = useCallback(() => setSelectorOpen(false), []);

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

  const buyHref = `/drops/${drop.slug}`;

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-heading"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={pause}
      onBlurCapture={resume}
      className="relative flex min-h-svh flex-col overflow-hidden bg-void"
    >
      {/* Paper grain, nothing else */}
      <div aria-hidden className="grain absolute inset-0" />

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
        className="pointer-events-none absolute inset-x-0 top-[15%] z-0 select-none lg:top-[10%]"
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

            It reaches across the panel's columns rather than stopping at
            them: an opaque ground on the rail guillotined the tail
            mid-word, and sizing the type to fit the canvas cost the
            full-bleed span the word exists for. Both were tried; both were
            worse than the thing they fixed.

            So the two are separated *vertically* instead. `10%` from `lg`
            rather than `15%` is what lifts the letters clear of the
            panel's top edge — the panel is bottom-anchored, so it rides
            higher on a short window and 15% put the baseline 21px into it
            at 1280×800. Measured against the real glyph box (cap height,
            not the line box, which overstates by ~55px at this size).
            Together with the panel's tightened rhythm this clears at both
            1440×900 and 1280×800. Phones keep 15%, where the band sits
            over the product and there is no panel beside it. */}
        <span className="block whitespace-nowrap text-center font-sans text-[15vw] font-medium leading-[0.8] tracking-[0.015em] text-ink/[0.03] sm:text-ink/[0.06]">
          REIMAGINED
        </span>
      </div>

      {/* Mobile starts one tight step under the 64px bar rather than the
          112px the desktop frame wants — on a phone that gap was pushing
          the purchase block most of a screen down before anything was
          read. */}
      <div className="relative z-10 mx-auto flex w-full max-w-[110rem] flex-1 flex-col justify-end px-(--spacing-gutter) pb-10 pt-[5.5rem] sm:pb-12 sm:pt-[7rem] md:pt-28 lg:pb-16">
        {/* Three arrangements of the same five blocks.
            Mobile: one column — device, then everything needed to buy it,
            then the brand statement.
            Tablet: two columns — the device full width above, then the CTA
            beside the scarcity panel, brand copy last. Its trailing `1fr`
            row takes the panel's overhang so a tall panel can't push the
            CTA away from the copy it belongs to.
            Desktop: the 12-column frame, where row 1 is the `1fr` that
            swallows the slack and keeps label → headline → CTA tight
            together at a baseline shared with the product and the rail. */}
        <div className="grid w-full gap-y-6 sm:gap-y-10 md:grid-cols-2 md:grid-rows-[auto_auto_auto_auto_1fr] md:gap-x-10 lg:grid-cols-12 lg:grid-rows-[1fr_auto_auto_auto] lg:gap-x-6 lg:gap-y-0">
          {/* ---------- Drop label ---------- */}
          <motion.p
            {...enter(0)}
            className="order-1 flex items-center justify-between gap-4 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-muted md:col-span-2 md:row-start-1 lg:col-span-4 lg:col-start-1 lg:row-start-2"
          >
            <span>
              {drop.edition} · {drop.title}
            </span>

            {/* Phones and tablets only — redundant from `lg`, where the
                rail is already in view beside the product. */}
            <span className="flex items-center gap-2 text-ink lg:hidden">
              <span
                aria-hidden
                className="size-1.5 shrink-0 animate-pulse-dot rounded-full bg-urgent"
              />
              Live
            </span>
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
            className="relative order-2 md:col-span-2 md:row-start-2 lg:col-span-5 lg:col-start-5 lg:row-span-4 lg:row-start-1"
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
              className="relative z-10 mx-auto h-[30svh] max-h-[15rem] w-full max-w-xl sm:h-[46svh] sm:max-h-[24rem] lg:h-[68svh] lg:max-h-none lg:max-w-none lg:translate-x-[6%]"
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

            {/* Sits under the plinth, not over it — the product keeps the
                whole frame and the caption reads as the next line down. */}
            <ProductNav
              total={count}
              index={active}
              onPrev={goPrev}
              onNext={goNext}
              onViewAll={openSelector}
              className="mt-4 sm:mt-6 lg:mt-8 lg:translate-x-[6%]"
            />

            {/* ---------- Identity · below `lg` ----------
                Name, variant, price — the answer that has to arrive with
                the tap. No stock line here: the scarcity module sits
                directly beneath and would otherwise state the same count
                twice in 120px. From `lg` the rail carries all of this.

                Keyed on the device so the block re-enters per change,
                sliding a step in from the direction of travel. Reduced
                motion drops the slide and keeps the fade. */}
            <motion.div
              key={device.id}
              initial={{
                opacity: 0,
                x: prefersReducedMotion ? 0 : 18 * direction,
              }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
              className="mt-5 text-center lg:hidden"
            >
              <p className="text-[1.125rem] font-medium leading-tight tracking-[-0.015em] text-ink">
                {device.name}
              </p>
              <p className="mt-1 text-[0.8125rem] text-ink-secondary">
                {device.variant}
              </p>

              <PriceBlock
                price={device.price}
                originalPrice={device.originalPrice}
                currency={drop.currency}
                locale={drop.locale}
                className="mt-4 flex flex-col items-center"
              />
            </motion.div>
          </motion.div>

          {/* ---------- Scarcity ----------
              Third below `lg`, attached to the product it describes and
              sitting between the price and the button — which is where a
              shopper asks "how many are left" and nowhere else. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.55,
              duration: DURATION.slow,
              ease: EASE_OUT_EXPO,
            }}
            className={cn(
              "order-3 md:col-start-2 md:row-span-3 md:row-start-3",
              "lg:relative lg:col-span-3 lg:col-start-10 lg:row-span-4 lg:row-start-1",
              "lg:flex lg:flex-col lg:justify-end lg:pl-8",
            )}
          >
            <LiveDropPanel
              drop={drop}
              device={device}
              index={active}
              total={count}
              direction={direction}
              onPause={pause}
              onResume={resume}
            />
          </motion.div>

          {/* ---------- Action ----------
              Directly under price and stock below `lg`. The two pills
              measure 337px side by side, which is 2px wider than a 375px
              column — left to wrap they read as a mistake rather than a
              choice, so below `sm` they go full-width and stacked. */}
          <motion.div
            ref={ctaRef}
            {...enter(0.2)}
            className="order-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center md:col-start-1 md:row-start-3 lg:col-span-4 lg:col-start-1 lg:row-start-4 lg:mt-10"
          >
            <Link
              href={buyHref}
              className={cn(
                buttonVariants({ variant: "accent", size: "lg" }),
                "w-full sm:w-auto max-lg:px-7",
              )}
            >
              Grab It Now
            </Link>
            <Link
              href="/drops"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full sm:w-auto max-lg:px-7",
              )}
            >
              Browse Devices
            </Link>

            {/* Phones get the drop list here rather than under the nav —
                by the time the CTA is on screen the thumb is already at
                the bottom of the phone. */}
            <button
              type="button"
              onClick={openSelector}
              className="group/all mt-1 inline-flex items-center gap-1.5 self-center text-[0.8125rem] font-medium text-ink-secondary transition-colors duration-(--duration-fast) hover:text-ink md:hidden"
            >
              <span className="relative">
                View all drops
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-0 -bottom-0.5 h-px origin-right scale-x-0 bg-current",
                    "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
                    "group-hover/all:origin-left group-hover/all:scale-x-100",
                    "group-focus-visible/all:origin-left group-focus-visible/all:scale-x-100",
                  )}
                />
              </span>
              <svg
                aria-hidden
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3 transition-transform duration-(--duration-base) ease-(--ease-out-expo) motion-safe:group-hover/all:translate-x-1"
              >
                <path d="M1.5 7h11M8.5 3.5L12 7l-3.5 3.5" />
              </svg>
            </button>
          </motion.div>

          {/* ---------- The argument ----------
              Supporting brand copy, last below `lg`. It is not demoted, it
              just no longer stands between a shopper and the button. */}
          <motion.div
            {...enter(0.1)}
            className="order-5 max-w-[26.25rem] md:col-start-1 md:row-start-4 lg:col-span-4 lg:col-start-1 lg:row-start-3 lg:mt-6"
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

      {/* Hairline that closes the banner and hands the page to the calendar. */}
      <div
        aria-hidden
        className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)"
      >
        <div className="border-t border-line" />
      </div>

      {/* ---------- Sticky buy bar · phones ----------
          The purchase action follows the reader down the rest of the hero
          rather than scrolling away with the block it belongs to. It
          carries the price and the count so the bar is a decision, not
          just a button, and it retires the moment the hero does. Sits
          under the header (z-50) and under any dialog (z-100). */}
      <AnimatePresence>
        {showStickyBuy && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-40 md:hidden",
              "border-t border-line bg-[var(--glass-bg-strong)] backdrop-blur-xl",
              "px-(--spacing-gutter) pt-3",
              "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
            )}
          >
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.8125rem] font-medium leading-tight text-ink">
                  {device.name}
                </p>
                <p className="mt-0.5 font-mono text-[0.75rem] tabular-nums text-urgent">
                  {formatPrice(device.price, drop.currency, drop.locale)}
                  <span className="text-ink-muted">
                    {" "}
                    · {device.unitsLeft} left
                  </span>
                </p>
              </div>

              <Link
                href={buyHref}
                className={cn(
                  "inline-flex h-12 shrink-0 items-center rounded-full px-6",
                  "bg-ink text-[0.8125rem] font-medium tracking-tight text-surface",
                  "transition-[background-color,transform] duration-(--duration-fast) ease-(--ease-out-quart)",
                  "hover:bg-ink-hover active:scale-[0.97]",
                )}
              >
                Grab It Now
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DropSelector
        open={selectorOpen}
        onClose={closeSelector}
        drop={drop}
        activeIndex={active}
        onSelect={goTo}
      />
    </section>
  );
}
