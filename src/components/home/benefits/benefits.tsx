"use client";

import { motion } from "framer-motion";
import {
  DURATION,
  EASE_OUT_EXPO,
  staggerChildren,
  viewportOnce,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

const rise = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.base, ease: EASE_OUT_EXPO },
  },
};

/**
 * The terms of sale, stated once.
 *
 * Deliberately the quietest band on the page. Its job is subtraction —
 * removing the four questions that stop a considered purchase — and a
 * loud reassurance strip reads as a store protesting too much. Hairline
 * rules, one weight of type, glyphs at the same optical size as the
 * label beside them.
 *
 * Every claim here is a commitment the business has to honour, so each
 * one links to the page that states the terms rather than floating as
 * an unsourced promise.
 */
const BENEFITS: { label: string; detail: string; icon: string[] }[] = [
  {
    label: "Free delivery",
    detail: "On every order, tracked",
    icon: [
      "M3.25 7.5h9.5v9H3.25z",
      "M12.75 10.5h3.2l3.05 3v3h-6.25",
      "M6.75 19.4a1.85 1.85 0 1 1 0-3.7 1.85 1.85 0 0 1 0 3.7z",
      "M16.25 19.4a1.85 1.85 0 1 1 0-3.7 1.85 1.85 0 0 1 0 3.7z",
    ],
  },
  {
    label: "Secure checkout",
    detail: "Encrypted, 3-D Secure",
    icon: [
      "M8.4 10.3V7.6a3.6 3.6 0 1 1 7.2 0v2.7",
      "M6.9 10.3h10.2a1.7 1.7 0 0 1 1.7 1.7v6a1.7 1.7 0 0 1-1.7 1.7H6.9a1.7 1.7 0 0 1-1.7-1.7v-6a1.7 1.7 0 0 1 1.7-1.7Z",
      "M12 13.6v2.5",
    ],
  },
  {
    label: "12-month warranty",
    detail: "Included, not an add-on",
    icon: [
      "M12 2.6 4.9 5.5v5.6c0 4.4 2.9 8.2 7.1 9.3 4.2-1.1 7.1-4.9 7.1-9.3V5.5L12 2.6Z",
      "m8.9 11.9 2.2 2.2 4.3-4.5",
    ],
  },
  {
    label: "Easy returns",
    detail: "14 days, no questions",
    icon: [
      "M20.25 12a8.25 8.25 0 1 1-2.6-6",
      "M20.25 3.75v4.5h-4.5",
    ],
  },
];

export function Benefits() {
  return (
    <section
      aria-label="Shopping benefits"
      className="relative overflow-hidden bg-void pt-(--spacing-section-sm) pb-14 lg:pb-16"
    >
      <div className="relative z-10 mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerChildren(0.08)}
          className="grid border-t border-line sm:grid-cols-2 lg:grid-cols-4"
        >
          {BENEFITS.map((benefit, i) => (
            <motion.li
              key={benefit.label}
              variants={rise}
              className={cn(
                "flex items-start gap-4 py-6 sm:py-8",
                // Hairlines between, never around — a boxed strip reads
                // as four cards, which is exactly what this is not.
                i > 0 && "border-t border-line sm:border-t-0",
                i > 0 && "lg:border-l lg:border-line lg:pl-8",
                i === 2 && "sm:border-t sm:border-line lg:border-t-0",
                i === 3 && "sm:border-t sm:border-line lg:border-t-0",
                i % 2 === 1 && "sm:border-l sm:border-line sm:pl-8",
                i < BENEFITS.length - 1 && "lg:pr-8",
              )}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-0.5 size-5 shrink-0 text-ink-secondary"
              >
                {benefit.icon.map((d) => (
                  <path key={d} d={d} />
                ))}
              </svg>

              <div className="min-w-0">
                <p className="text-[0.9375rem] font-medium leading-tight text-ink">
                  {benefit.label}
                </p>
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-secondary">
                  {benefit.detail}
                </p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
