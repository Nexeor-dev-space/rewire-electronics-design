"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { getSupportPolicies } from "@/lib/support";
import { cn } from "@/lib/utils";
import {
  DURATION,
  EASE_OUT_EXPO,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";

const rise = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

const lineClip = {
  hidden: { y: "140%" },
  visible: { y: "0%", transition: { duration: 1, ease: EASE_OUT_EXPO } },
};

/**
 * Section 01 — the way in.
 *
 * Same clip-reveal opening as the About page, so the two secondary
 * pages read as one authorship, with one addition the About page does
 * not need: a contents row. Support is the only page on the site people
 * arrive at already knowing what they want — they are checking a
 * window, not reading an argument — so the sections are listed as
 * targets before a word of prose, and the numbers are on the chips
 * because half the visits end there.
 *
 * The row is built from the policy adapter rather than typed out, which
 * is what stops it from listing a section the page no longer has.
 */
export function SupportIntro() {
  const policies = getSupportPolicies();

  const jumps = [
    ...policies.map((policy) => ({
      label: policy.eyebrow,
      meta: `${policy.figure} ${policy.unit}`,
      href: `#${policy.id}`,
    })),
    { label: "FAQ", meta: "Answered", href: "#faq" },
    { label: "Contact", meta: "A person replies", href: "#contact" },
  ];

  return (
    <section
      aria-labelledby="support-intro-heading"
      className="relative overflow-hidden bg-void pt-(--spacing-section) pb-14 lg:pb-16"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.05),transparent_70%)]"
      />
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.1)}
        >
          <motion.span variants={rise} className="eyebrow block">
            Support
          </motion.span>

          {/* The two-column head: title left, lede set against it on the
              right at `lg`. A single centred column made a page of
              lookups open like a manifesto. */}
          <div className="mt-9 grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-6">
            <h1
              id="support-intro-heading"
              className="font-sans text-[clamp(2.5rem,5.4vw,5rem)] font-light leading-[1.02] tracking-[-0.035em] text-ink lg:col-span-7"
            >
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  Every answer,
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  in one place.
                </motion.span>
              </span>
            </h1>

            <motion.p
              variants={rise}
              className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:justify-self-end"
            >
              Warranty, shipping and returns, written out in full, and the
              twelve questions a drop actually raises. If the answer is not
              on this page, a person replies to every message.
            </motion.p>
          </div>
        </motion.div>

        {/* ---------- Contents ----------
            Anchors, not navigation: every target is on this page, so the
            row never takes a reader off it. Five across on `lg`, two up
            on a phone — a single scrolling rail was tried first and read
            as a product carousel, which is the wrong promise for a list
            of policies. */}
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.06, 0.15)}
          aria-label="On this page"
          className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:mt-16 lg:grid-cols-5 lg:gap-4"
        >
          {jumps.map((jump) => (
            <motion.li key={jump.href} variants={rise} className="flex">
              <Link
                href={jump.href}
                className={cn(
                  "group flex w-full flex-col justify-between gap-6 rounded-xl p-5",
                  "border border-line bg-surface-2",
                  "transition-[transform,border-color,background-color] duration-(--duration-base) ease-(--ease-out-expo)",
                  "hover:-translate-y-1 hover:border-line-strong hover:bg-surface",
                  "focus-visible:-translate-y-1 focus-visible:border-line-strong",
                  "motion-reduce:hover:translate-y-0",
                )}
              >
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-ink-muted">
                  {jump.meta}
                </span>
                <span className="flex items-center justify-between gap-3">
                  <span className="font-sans text-[1.0625rem] font-light tracking-[-0.02em] text-ink lg:text-[1.25rem]">
                    {jump.label}
                  </span>
                  {/* Down, not right: the destination is further along
                      this page, and a right arrow on an in-page anchor
                      promises a navigation that never happens. */}
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={cn(
                      "size-3.5 shrink-0 text-ink-faint",
                      "transition-[transform,color] duration-(--duration-base) ease-(--ease-out-expo)",
                      "group-hover:translate-y-0.5 group-hover:text-ink",
                      "group-focus-visible:translate-y-0.5 group-focus-visible:text-ink",
                    )}
                  >
                    <path d="M8 3v10M4 9l4 4 4-4" />
                  </svg>
                </span>
              </Link>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
