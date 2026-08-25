"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { getFaqs } from "@/lib/faqs";
import { DURATION, EASE_OUT_EXPO, staggerChildren, viewportOnce } from "@/lib/motion";
import { FaqItem } from "./faq-item";

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
 * Section 06 — Questions, Answered.
 *
 * An editorial split rather than a stack: the statement holds the left
 * column and stays with the reader while the questions run down the
 * right. One answer open at a time — the section reads as a page of a
 * magazine, not a list of toggles. Below `lg` the columns fold into a
 * single measure with the same hairline rhythm.
 */
export function Faq() {
  const faqs = getFaqs();
  // The first answer is open on arrival so the column never reads as inert.
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  return (
    <section
      aria-labelledby="faq-heading"
      // Carries its own bottom padding, unlike the top-only sections: the
      // next section is the dark band, so its padding sits inside a
      // different colour and leaves the last row flush against the edge.
      className="relative bg-void py-(--spacing-section-sm)"
    >
      <div className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <div className="grid gap-y-12 lg:grid-cols-12 lg:items-start lg:gap-x-16 xl:gap-x-24">
          {/* ---------- Column one: the statement ---------- */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerChildren(0.1)}
            className="lg:col-span-5 lg:sticky lg:top-[18vh]"
          >
            <h2
              id="faq-heading"
              className="font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.02] tracking-[-0.035em] text-ink"
            >
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  Questions,
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  answered.
                </motion.span>
              </span>
            </h2>

            <motion.p
              variants={rise}
              className="mt-8 max-w-sm text-base leading-relaxed text-ink-secondary"
            >
              Everything worth knowing before a drop opens — how the releases
              run, what we guarantee, and what happens after the box arrives.
            </motion.p>
          </motion.div>

          {/* ---------- Column two: the questions ---------- */}
          <motion.ul
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerChildren(0.07, 0.1)}
            className="lg:col-span-7"
          >
            {faqs.map((faq, i) => (
              <FaqItem
                key={faq.id}
                faq={faq}
                index={String(i + 1).padStart(2, "0")}
                open={openId === faq.id}
                onToggle={() => setOpenId((current) => (current === faq.id ? null : faq.id))}
              />
            ))}
          </motion.ul>
        </div>
      </div>

      {/* Search engines read the same answers the reader does. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          }),
        }}
      />
    </section>
  );
}
