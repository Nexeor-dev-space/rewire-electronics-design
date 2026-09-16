"use client";

import { useId } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { RichText } from "@/components/policy/rich-text";
import type { FaqEntry } from "@/lib/faq-entry";

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

const panelBody: Variants = {
  hidden: { y: -10, opacity: 0, transition: { duration: 0.18 } },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.7, ease: EASE_OUT_EXPO, delay: 0.08 },
  },
};

const rowRise: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};

interface FaqItemProps {
  faq: FaqEntry;
  index: string;
  open: boolean;
  onToggle: () => void;
}

export function FaqItem({ faq, index, open, onToggle }: FaqItemProps) {
  const uid = useId();
  const triggerId = `faq-trigger-${uid}`;
  const panelId = `faq-panel-${uid}`;

  return (
    <motion.li variants={rowRise} className="relative border-t border-line last:border-b">
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
          className="group flex w-full cursor-pointer items-start gap-5 py-5 text-left sm:gap-8 sm:py-6"
        >
          <span
            aria-hidden
            className={cn(
              "mt-[0.5em] w-6 shrink-0 font-mono text-[0.75rem] tabular-nums tracking-[0.2em] transition-colors duration-(--duration-base)",
              open ? "text-ink" : "text-ink-faint group-hover:text-ink-muted",
            )}
          >
            {index}
          </span>

          <span
            className={cn(
              "flex-1 font-sans text-[clamp(1.0625rem,1.6vw,1.375rem)] font-normal leading-[1.35] tracking-[-0.02em] transition-colors duration-(--duration-base)",
              open ? "text-ink" : "text-ink-secondary group-hover:text-ink",
            )}
          >
            {faq.question}
          </span>

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
            <motion.div
              variants={panelBody}
              className={cn(
                "max-w-[46ch] pb-7 pl-11 pr-10 sm:pb-8 sm:pl-14",
                "[&_p]:text-[0.9375rem] [&_p]:leading-[1.7]",
                "[&_li]:text-[0.9375rem] [&_li]:leading-[1.7]",
              )}
            >
              <RichText doc={faq.answer} className="space-y-4" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
