"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { WaitlistModal } from "./waitlist-modal";
import { getNextDrop } from "@/lib/drops";
import { cn, formatDropDate } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO, staggerChildren } from "@/lib/motion";

const rise = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

/**
 * The centrepiece rotation — one device at a time, crossfading in place.
 * Transparent studio cutouts (shadows baked in as real alpha) so the
 * product floats directly on the canvas with no plate behind it.
 */
const SHOWCASE = [
  { src: "/images/hero/phone.png", alt: "Matte black phone leaning upright" },
  { src: "/images/hero/laptop.png", alt: "Graphite laptop standing half open" },
  { src: "/images/hero/watch.png", alt: "Black smartwatch with leather strap" },
  {
    src: "/images/hero/headphones.png",
    alt: "Black over-ear headphones suspended mid-air",
  },
];

/** Dwell per device before the next crossfade. */
const CYCLE_MS = 5000;

/**
 * Device credentials for the information column. Mirrors the certification
 * facts used across the site — swap for CMS data with the drop adapter.
 */
const CREDENTIALS = [
  "98% Battery Health",
  "1-Year Warranty",
  "68-Point Inspection",
];

/**
 * Hero — a product launch frame, not a shop window.
 *
 * One 12-column composition, not three columns that happen to share a row:
 * statement on 1–4, the device on 5–9, the drop's facts on 10–12. All three
 * are centred on the same horizontal midline, so the eye reads product →
 * headline → CTA → facts without anything sitting at its own arbitrary
 * height.
 *
 * The device is biased a few percent right of its column so its mass lands
 * near 56% of the viewport — off the exact centre, which is what stops the
 * frame reading as a symmetrical diagram. The one decoration is a ghosted
 * word clipped to the device's own columns, so it can never crowd the type
 * on either side.
 *
 * Below `lg` it restacks in reading order: device, statement, facts.
 */
export function Hero() {
  const nextDrop = getNextDrop();
  const { drop, units, device } = nextDrop;
  const prefersReducedMotion = useReducedMotion();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [active, setActive] = useState(0);

  /* ---------- Crossfade rotation ---------- */
  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % SHOWCASE.length),
      CYCLE_MS,
    );
    return () => window.clearInterval(id);
  }, [prefersReducedMotion]);

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

  /* ---------- The information column ---------- */
  const facts = [
    formatDropDate(drop.startsAt),
    `Only ${units} Devices`,
    ...CREDENTIALS,
  ];

  return (
    <section
      aria-labelledby="hero-heading"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative flex min-h-svh flex-col overflow-hidden bg-void"
    >
      {/* Paper grain, nothing else */}
      <div aria-hidden className="grain absolute inset-0" />

      {/* The one decoration: the word hangs full-bleed under the bar and the
          device rises up to cover its lower half. It is set wider than the
          viewport on purpose — the section's `overflow-hidden` crops it, so
          the ends bleed off both edges instead of sitting boxed inside them.
          It stays behind everything (z-0) and never moves with the product.
          The size is pure `vw` with no rem ceiling on purpose — a rem cap
          leaves it stranded mid-canvas at wide sizes. 15vw is the ceiling
          before the word stops fitting: at 18vw the ink runs ~112% of the
          viewport and the centred crop eats the final D, so it reads
          "REFURBISHE" — a typo, not a bleed. The whole word must be legible;
          only the surrounding air is allowed to be tight. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[15%] z-0 select-none"
      >
        <span className="block whitespace-nowrap text-center font-sans text-[15vw] font-medium leading-[0.8] tracking-[-0.045em] text-ink/[0.07]">
          REFURBISHED
        </span>
      </div>

      {/* The frame starts one clear step below the bar (64px under the 80px
          navbar) rather than floating in the middle of the viewport — the
          composition is anchored, not centred in dead space. */}
      <div className="relative z-10 mx-auto flex w-full max-w-[110rem] flex-1 flex-col justify-end px-(--spacing-gutter) pb-12 pt-[7rem] md:pt-28 lg:pb-16">
        <div className="grid w-full gap-y-14 lg:grid-cols-12 lg:items-end lg:gap-x-6">
          {/* ---------- Statement · columns 1–4 ---------- */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerChildren(0.1, 0.1)}
            className="order-2 max-w-[26.25rem] lg:order-1 lg:col-span-4 lg:flex lg:min-h-[28rem] lg:flex-col"
          >
            <motion.p
              variants={rise}
              className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-muted"
            >
              Next drop
            </motion.p>

            <motion.h1
              variants={rise}
              id="hero-heading"
              className="mt-6 font-sans text-[clamp(2.25rem,3.4vw,3.25rem)] font-light leading-[1.06] tracking-[-0.03em] text-ink"
            >
              Premium refurbished electronics.
            </motion.h1>

            <motion.p
              variants={rise}
              className="mt-8 text-base leading-relaxed text-ink-secondary"
            >
              Professionally inspected. Certified. Released in limited drops.
            </motion.p>

            <motion.div
              variants={rise}
              className="mt-10 flex flex-wrap items-center gap-3"
            >
              <Button
                variant="accent"
                size="lg"
                onClick={() => setWaitlistOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={waitlistOpen}
              >
                Join Waitlist
              </Button>
              <Link
                href="/drops"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                Browse Devices
              </Link>
            </motion.div>
          </motion.div>

          {/* ---------- Centrepiece · columns 5–9 ---------- */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: 0.45,
              duration: DURATION.cinematic,
              ease: EASE_OUT_EXPO,
            }}
            className="relative order-1 lg:order-2 lg:col-span-5 lg:col-start-5"
          >
            <motion.div
              style={
                prefersReducedMotion
                  ? undefined
                  : { rotateX, rotateY, transformPerspective: 1100 }
              }
              // Biased right of the column centre so the product's mass sits
              // near 56% of the viewport instead of dead centre.
              className="relative z-10 mx-auto h-[46svh] w-full max-w-xl sm:h-[54svh] lg:h-[72svh] lg:max-w-none lg:translate-x-[6%]"
            >
              <motion.div
                animate={prefersReducedMotion ? undefined : { y: [0, -12, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                {SHOWCASE.map((item, i) => (
                  <Image
                    key={item.src}
                    src={item.src}
                    alt={i === active ? item.alt : ""}
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

          {/* ---------- Information · columns 10–12 ---------- */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.55,
              duration: DURATION.slow,
              ease: EASE_OUT_EXPO,
            }}
            className="order-3 lg:col-span-3 lg:flex lg:min-h-[28rem] lg:w-52 lg:flex-col lg:justify-self-end"
          >
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-ink-muted">
              Upcoming drop
            </p>
            <ul className="mt-6 border-t border-line">
              <li className="border-b border-line py-5 text-sm font-medium text-ink">
                {device.name}
              </li>
              {facts.map((fact) => (
                <li
                  key={fact}
                  className="border-b border-line py-5 text-sm text-ink-secondary"
                >
                  {fact}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>

      {/* Hairline that closes the banner and hands the page to the calendar.
          Inset to the editorial gutter like every other rule on the page. */}
      <div
        aria-hidden
        className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)"
      >
        <div className="border-t border-line" />
      </div>

      <WaitlistModal
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        drop={nextDrop}
      />
    </section>
  );
}
