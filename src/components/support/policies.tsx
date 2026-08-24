"use client";

import { motion } from "framer-motion";
import { getSupportPolicies } from "@/lib/support";
import {
  DURATION,
  EASE_OUT_EXPO,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";

const rise = {
  hidden: { opacity: 0, y: 24 },
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
 * Section 02 — Warranty, Shipping, Returns.
 *
 * Editorial rows on a hairline rhythm rather than three cards in a
 * row. Cards were the first attempt and they fail on the one thing this
 * section exists for: each policy is its own link target from the
 * Support menu, and three anchors sitting side by side in one band all
 * scroll to the same place. Stacked, `/support#returns` lands on
 * returns.
 *
 * The number leads because a reader here is checking whether they are
 * still inside a window, not reading prose — "30" answers the question
 * before the sentence underneath it does.
 */
export function SupportPolicies() {
  const policies = getSupportPolicies();

  return (
    <section
      aria-labelledby="support-policies-heading"
      className="relative bg-void pt-(--spacing-section)"
    >
      <div className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.1)}
          className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-6"
        >
          <div className="lg:col-span-7">
            <motion.span variants={rise} className="eyebrow block">
              What we promise
            </motion.span>
            <h2
              id="support-policies-heading"
              className="mt-5 font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.02] tracking-[-0.035em] text-ink"
            >
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  Three windows,
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  stated plainly.
                </motion.span>
              </span>
            </h2>
          </div>

          <motion.p
            variants={rise}
            className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:justify-self-end"
          >
            The same terms on every device in every drop. Nothing here is
            conditional on which release you bought from.
          </motion.p>
        </motion.div>

        <div className="mt-14 lg:mt-20">
          {policies.map((policy) => (
            <motion.article
              key={policy.id}
              id={policy.id}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              variants={staggerChildren(0.08)}
              // The header is fixed, so an anchored row would otherwise
              // land under the bar. `scroll-mt` is the offset that keeps
              // the eyebrow visible when the jump resolves.
              className="scroll-mt-28 border-t border-line py-12 last:border-b lg:py-16"
            >
              <div className="grid gap-8 lg:grid-cols-12 lg:gap-6">
                {/* ---------- The figure ---------- */}
                <motion.div variants={rise} className="lg:col-span-4">
                  <span className="eyebrow block">{policy.eyebrow}</span>
                  <p className="mt-6 flex items-baseline gap-3">
                    <span className="font-sans text-[clamp(3rem,6vw,4.5rem)] font-light leading-[0.9] tracking-[-0.045em] tabular-nums text-ink">
                      {policy.figure}
                    </span>
                    <span className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink-muted">
                      {policy.unit}
                    </span>
                  </p>
                </motion.div>

                {/* ---------- The promise ---------- */}
                <div className="lg:col-span-7 lg:col-start-6">
                  <motion.h3
                    variants={rise}
                    className="font-sans text-[clamp(1.5rem,2.4vw,2rem)] font-light leading-[1.15] tracking-[-0.03em] text-ink"
                  >
                    {policy.title}
                  </motion.h3>

                  <motion.p
                    variants={rise}
                    className="mt-5 max-w-[54ch] text-base leading-relaxed text-ink-secondary"
                  >
                    {policy.body}
                  </motion.p>

                  {/* The specifics. A hairline and a mono index per row —
                      the same list treatment the FAQ column uses, so the
                      two halves of the page share one texture. */}
                  <motion.ul
                    variants={rise}
                    // `text-base` is here for the `ch` unit, not for the
                    // rows — every row sets its own size. The paragraph
                    // above is capped at 54ch of an 18px base, so a list
                    // capped at 54ch of the inherited 16px ran 68px
                    // narrower and its hairlines stopped short of the
                    // measure they are supposed to close.
                    className="mt-8 max-w-[54ch] text-base"
                  >
                    {policy.points.map((point, i) => (
                      <li
                        key={point}
                        className="flex items-baseline gap-5 border-t border-line py-3.5 last:border-b sm:gap-8"
                      >
                        <span
                          aria-hidden
                          className="w-6 shrink-0 font-mono text-[0.6875rem] tabular-nums tracking-[0.2em] text-ink-faint"
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[0.9375rem] leading-[1.7] text-ink-secondary">
                          {point}
                        </span>
                      </li>
                    ))}
                  </motion.ul>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
