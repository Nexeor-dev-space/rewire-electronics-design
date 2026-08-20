"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { siteConfig } from "@/lib/site";
import {
  DURATION,
  EASE_OUT_EXPO,
  scaleIn,
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
 * Section 01 — Brand introduction.
 *
 * The About-page counterpart to the homepage hero: same clip-reveal
 * editorial title, same rhythm, but calmer — no countdown, no product
 * on a plinth. The tagline is the site's tagline verbatim, so this page
 * and the SEO title cannot disagree. Nothing here is a factual claim
 * about the operation; the sections that follow do that work.
 */
export function AboutIntro() {
  return (
    <section
      aria-labelledby="about-intro-heading"
      className="relative overflow-hidden bg-void pt-(--spacing-section) pb-14 lg:pb-16"
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(120%_80%_at_50%_0%,rgb(255_255_255/0.7),transparent_70%)]"
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
            About {siteConfig.shortName}
          </motion.span>

          <h1
            id="about-intro-heading"
            className="mt-9 max-w-5xl font-sans text-[clamp(2.5rem,5.4vw,5rem)] font-light leading-[1.02] tracking-[-0.035em] text-ink"
          >
            {siteConfig.tagline.split(". ").map((phrase, index, array) => {
              const withStop =
                index === array.length - 1 ? phrase : `${phrase}.`;
              return (
                <span
                  key={index}
                  className="block overflow-hidden pb-[0.2em] -mb-[0.2em]"
                >
                  <motion.span variants={lineClip} className="block">
                    {withStop}
                  </motion.span>
                </span>
              );
            })}
          </h1>
        </motion.div>

        {/* ---------- Feature plate ----------
            The same photograph the homepage's Standard section leans on,
            reused here so the two pages read as one authorship. */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={scaleIn}
          className="relative mt-16 aspect-[16/9] w-full overflow-hidden rounded-[2rem] bg-surface-2 lg:mt-20"
        >
          <Image
            src="/images/rewire-img.jpg"
            alt="A restored phone with an iridescent back, photographed on a seamless studio background"
            fill
            priority
            sizes="(max-width: 1024px) 92vw, 88rem"
            className="object-cover"
          />
        </motion.div>
      </div>
    </section>
  );
}
