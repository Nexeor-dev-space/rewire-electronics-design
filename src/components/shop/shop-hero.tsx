"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { DURATION, EASE_OUT_EXPO, staggerChildren } from "@/lib/motion";

const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

/** Lines rise out of a clipped container — the homepage's heading move. */
const lineClip: Variants = {
  hidden: { y: "140%" },
  visible: { y: "0%", transition: { duration: 1, ease: EASE_OUT_EXPO } },
};

/**
 * ShopHero — a page head, not a campaign.
 *
 * The homepage already made the argument; a shopper who has reached the
 * catalogue is here to browse, and a full-height marketing hero would put
 * a screen of persuasion between them and the grid. So this is a
 * breadcrumb, a title, two sentences and a rule — roughly a third of the
 * homepage hero's height, in exactly its typography and with exactly its
 * entrance: parent-orchestrated variants, lines clipped and rising.
 *
 * The supporting line names all four conditions on purpose. It is the
 * cheapest possible way to teach the vocabulary the filter panel is about
 * to use, and it does it before the reader needs it rather than after.
 */
export function ShopHero() {
  return (
    <section className="relative overflow-hidden bg-void pt-28 md:pt-36 lg:pt-40">
      {/* The same soft wash and grain the homepage sections open with. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-full bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.7),transparent_70%)]"
      />
      <div aria-hidden className="grain absolute inset-0" />

      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerChildren(0.1)}
        >
          {/* ---------- Breadcrumb ---------- */}
          <motion.nav variants={rise} aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-ink-muted">
              <li>
                <Link
                  href="/"
                  className="-my-2 inline-block py-2 transition-colors duration-(--duration-fast) hover:text-ink"
                >
                  Home
                </Link>
              </li>
              <li aria-hidden className="text-ink-faint">
                /
              </li>
              <li className="text-ink" aria-current="page">
                Shop
              </li>
            </ol>
          </motion.nav>

          {/* ---------- Title and copy ---------- */}
          <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-12 lg:items-end lg:gap-6">
            <h1 className="font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.02] tracking-[-0.035em] text-ink lg:col-span-7">
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  Shop Rewire<span className="text-accent">.</span>
                </motion.span>
              </span>
            </h1>

            <motion.p
              variants={rise}
              className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:justify-self-end"
            >
              Every device we sell, in one place — refurbished, pre-owned, open
              box and new. Whichever condition you choose, it arrives inspected,
              graded and covered by the same 12-month warranty.
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* The rule that hands off to the catalogue. */}
      <div className="relative z-10 mx-auto mt-10 w-full max-w-[110rem] px-(--spacing-gutter) lg:mt-14">
        <span aria-hidden className="block h-px w-full bg-line" />
      </div>
    </section>
  );
}
