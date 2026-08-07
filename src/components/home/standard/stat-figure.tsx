"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import type { StandardStat } from "@/lib/standard";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * StatFigure — one number, counted up on arrival.
 *
 * The animated numeral is `aria-hidden` and shadowed by a screen-reader
 * copy of the finished value, so assistive tech and crawlers always get
 * "68 Inspection Points" rather than whatever frame the count is on.
 * Under reduced motion the value is simply present from the start.
 */
export function StatFigure({ stat }: { stat: StandardStat }) {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });

  const count = useMotionValue(prefersReducedMotion ? stat.value : 0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion) {
      count.set(stat.value);
      return;
    }
    const controls = animate(count, stat.value, {
      duration: 1.6,
      ease: EASE_OUT_EXPO,
    });
    return () => controls.stop();
  }, [inView, prefersReducedMotion, count, stat.value]);

  const spoken = `${stat.value}${stat.suffix ?? ""}${stat.unit ? ` ${stat.unit}` : ""} ${stat.label}`;

  return (
    <div ref={ref}>
      <p
        aria-hidden
        className="flex items-baseline font-sans text-[clamp(3.25rem,5.6vw,5.25rem)] leading-none tracking-[-0.045em] tabular-nums text-ink"
      >
        <motion.span>{rounded}</motion.span>
        {stat.suffix}
        {stat.unit && (
          <span className="ml-2 text-[0.34em] tracking-[-0.01em]">
            {stat.unit}
          </span>
        )}
      </p>
      <span className="sr-only">{spoken}</span>

      <p
        aria-hidden
        className="mt-6 font-mono text-[0.8125rem] uppercase tracking-[0.18em] text-ink"
      >
        {stat.label}
      </p>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-muted">
        {stat.detail}
      </p>
    </div>
  );
}

/** Shared entrance for the figures — kept here so the row stays in step. */
export const statRise = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.slow, ease: EASE_OUT_EXPO },
  },
};
