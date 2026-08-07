"use client";

import { useId } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import type { Faq } from "@/lib/faqs";

/**
 * The panel opens on its own height and closes faster than it opens —
 * the asymmetry is what makes an accordion feel considered rather than
 * mechanical. Opacity leads slightly so text never appears mid-clip.
 */
const panel: Variants = {
  hidden: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: DURATION.base, ease: EASE_OUT_EXPO },
      opacity: { duration: 0.18 },
    },
  },
  visible: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.62, ease: EASE_OUT_EXPO },
      opacity: { duration: 0.34, delay: 0.06 },
    },
  },
};

/** The answer itself rises a few pixels behind the clip. */
const panelBody: Variants = {
  hidden: { y: -10, opacity: 0, transition: { duration: 0.18 } },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.08 },
  },
};

/** Row entrance, staggered by the parent list. */
const rowRise: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

interface FaqItemProps {
  faq: Faq;
  /** Display index, already padded: "01". */
  index: string;
  open: boolean;
  onToggle: () => void;
}

/**
 * One question. A hairline, a number, the question in display type, and a
 * drawn cross that unwinds into a dash — no chevrons, no card, no box.
 */
export function FaqItem({ faq, index, open, onToggle }: FaqItemProps) {
  const uid = useId();
  const triggerId = `faq-trigger-${uid}`;
  const panelId = `faq-panel-${uid}`;

  return (
    <motion.li variants={rowRise} className="relative border-t border-line last:border-b">
      {/* Accent hairline that draws across the divider while the row is open */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 -top-px h-px origin-left bg-accent transition-transform duration-(--duration-slow) ease-(--ease-out-expo)",
          open ? "scale-x-100" : "scale-x-0",
        )}
      />

      <h3>
        <button
          type="button"
          id={triggerId}
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="group flex w-full cursor-pointer items-start gap-5 py-7 text-left sm:gap-8 sm:py-8"
        >
          <span
            aria-hidden
            className={cn(
              // Fixed width so every answer can indent to the question's exact edge.
              "mt-[0.5em] w-6 shrink-0 font-mono text-[0.75rem] tabular-nums tracking-[0.2em] transition-colors duration-(--duration-base)",
              // Monochrome: the index is part of the heading, and headings
              // carry no accent. Weight of ink does the signalling.
              open ? "text-ink" : "text-ink-faint group-hover:text-ink-muted",
            )}
          >
            {index}
          </span>

          <span
            className={cn(
              "flex-1 font-sans text-[clamp(1.25rem,2.1vw,1.875rem)] font-normal leading-[1.28] tracking-[-0.02em] transition-colors duration-(--duration-base)",
              open ? "text-ink" : "text-ink-secondary group-hover:text-ink",
            )}
          >
            {faq.question}
          </span>

          {/* Cross → dash. Two hairlines, one rotation. */}
          <span
            aria-hidden
            className={cn(
              "relative mt-[0.6em] size-3 shrink-0 transition-[transform,color] duration-(--duration-slow) ease-(--ease-out-expo)",
              open ? "rotate-90 text-ink" : "text-ink-faint group-hover:text-ink-muted",
            )}
          >
            <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-current" />
            <span
              className={cn(
                "absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-current transition-transform duration-(--duration-slow) ease-(--ease-out-expo)",
                open ? "scale-y-0" : "scale-y-100",
              )}
            />
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="panel"
            id={panelId}
            role="region"
            aria-labelledby={triggerId}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={panel}
            className="overflow-hidden"
          >
            {/* Indented to the question's measure, not the number's */}
            <motion.p
              variants={panelBody}
              // pl = index width (1.5rem) + button gap, so the answer sits flush
              // under the first letter of the question.
              className="max-w-[46ch] pb-9 pl-11 pr-10 text-[0.9375rem] leading-[1.75] text-ink-secondary sm:pb-11 sm:pl-14"
            >
              {faq.answer}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
