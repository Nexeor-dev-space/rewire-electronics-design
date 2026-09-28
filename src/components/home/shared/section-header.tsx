"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { headingLines } from "@/lib/homepage-sections";
import { DURATION, EASE_OUT_EXPO, staggerChildren, viewportOnce } from "@/lib/motion";

/**
 * The header and closing link the CMS-built sections share, set in the same
 * type scale and motion as Best sellers so an added section reads as part of
 * the page rather than a widget dropped onto it.
 */

export const rise = {
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

export function SectionHeader({
  id,
  eyebrow,
  title,
  subtitle,
}: {
  /** The heading's id, for the section's `aria-labelledby`. */
  id: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={staggerChildren(0.1)}
    >
      {eyebrow && (
        <motion.p
          variants={rise}
          className="font-mono text-[0.6875rem] uppercase tracking-[0.2em] text-ink-muted"
        >
          {eyebrow}
        </motion.p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-start">
        <h2
          id={id}
          className="font-sans text-[clamp(2.25rem,4.2vw,3.5rem)] font-light leading-[1.03] tracking-[-0.035em] text-ink lg:col-span-6"
        >
          {headingLines(title).map((line, index) => (
            <span key={index} className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
              <motion.span variants={lineClip} className="block">
                {line}
              </motion.span>
            </span>
          ))}
        </h2>

        {subtitle && (
          <motion.p
            variants={rise}
            className="max-w-md text-base leading-relaxed text-ink-secondary lg:col-span-5 lg:col-start-8 lg:justify-self-end lg:pt-3"
          >
            {subtitle}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

/** The outline link that closes a section. Renders nothing without both parts. */
export function SectionCta({ label, href }: { label: string | null; href: string | null }) {
  if (!label || !href) return null;

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={rise}
      className="mt-16 flex justify-center lg:mt-20"
    >
      <Link href={href} className={buttonVariants({ variant: "outline", size: "md" })}>
        {label}
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
        >
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </Link>
    </motion.div>
  );
}
