"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { DURATION, EASE_OUT_EXPO, staggerChildren, viewportOnce } from "@/lib/motion";
import { richTextToPlainText } from "@/lib/rich-text";
import type { FaqEntry } from "@/lib/faq-entry";
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

function faqJsonLd(faqs: FaqEntry[]): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: richTextToPlainText(faq.answer),
      },
    })),
  }).replace(/</g, "\\u003c");
}

export function Faq({
  faqs,
  heading = ["Questions,", "answered."],
  lede = "Everything worth knowing before a drop opens — how the releases run, what we guarantee, and what happens after the box arrives.",
  headingLevel = "h2",
}: {
  faqs: FaqEntry[];
  heading?: [string, string];
  lede?: string;
  headingLevel?: "h1" | "h2";
}) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  const Heading = headingLevel;

  return (
    <section
      aria-labelledby="faq-heading"
      className="relative bg-void py-(--spacing-section-sm)"
    >
      <div className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <div className="grid gap-y-12 lg:grid-cols-12 lg:items-start lg:gap-x-16 xl:gap-x-24">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={staggerChildren(0.1)}
            className="lg:col-span-5 lg:sticky lg:top-[18vh]"
          >
            <Heading
              id="faq-heading"
              className="font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.02] tracking-[-0.035em] text-ink"
            >
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  {heading[0]}
                </motion.span>
              </span>
              <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
                <motion.span variants={lineClip} className="block">
                  {heading[1]}
                </motion.span>
              </span>
            </Heading>

            <motion.p
              variants={rise}
              className="mt-8 max-w-sm text-base leading-relaxed text-ink-secondary"
            >
              {lede}
            </motion.p>
          </motion.div>

          {faqs.length === 0 ? (
            <p className="text-base leading-relaxed text-ink-muted lg:col-span-7">
              There are no questions on this page yet.
            </p>
          ) : (
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
          )}
        </div>
      </div>

      {faqs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: faqJsonLd(faqs) }}
        />
      )}
    </section>
  );
}
