"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { getSupportPolicies } from "@/lib/support";
import { policyLink } from "@/lib/policy-types";
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

export function SupportIntro() {
  const policies = getSupportPolicies();

  const jumps = [
    ...policies.map((policy) => ({
      ...policyLink(policy.slug),
      meta: `${policy.figure} ${policy.unit}`,
      away: true,
    })),
    { ...policyLink("faq"), meta: "Answered", away: true },
    { label: "Contact", meta: "A person replies", href: "#contact", away: false },
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
              Warranty, shipping and returns, each written out in full, and
              the questions a drop actually raises. If the answer is not on
              one of those pages, a person replies to every message.
            </motion.p>
          </div>
        </motion.div>

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
                      "group-focus-visible:text-ink group-hover:text-ink",
                      jump.away
                        ? "group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5"
                        : "group-hover:translate-y-0.5 group-focus-visible:translate-y-0.5",
                    )}
                  >
                    {jump.away ? (
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    ) : (
                      <path d="M8 3v10M4 9l4 4 4-4" />
                    )}
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
