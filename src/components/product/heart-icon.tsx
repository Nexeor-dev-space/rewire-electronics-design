"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * HeartIcon — the wishlist heart, with the "saved" micro interaction.
 *
 * Outline when not saved. When it becomes saved it fills with `love` red,
 * pops (0.8 → 1.25 → 1), and a ring plus a few dots burst outwards. Only a
 * change to saved plays the burst; first render and unsaving don't.
 * With reduced motion it only changes colour.
 *
 * Purely visual: the button around it owns the click and the label.
 */

const HEART_PATH =
  "M12 20.25S3.75 15.5 3.75 9.6A4.35 4.35 0 0 1 12 7.6a4.35 4.35 0 0 1 8.25 2c0 5.9-8.25 10.65-8.25 10.65Z";

/** Burst dots: count, and how far from the centre they travel (1 = the icon edge). */
const DOT_COUNT = 6;
const DOT_TRAVEL = 1.6;

export function HeartIcon({ saved, className }: { saved: boolean; className?: string }) {
  const reduceMotion = useReducedMotion();
  const [burst, setBurst] = useState(0);
  const previous = useRef(saved);

  useEffect(() => {
    if (saved && !previous.current && !reduceMotion) setBurst((count) => count + 1);
    previous.current = saved;
  }, [saved, reduceMotion]);

  return (
    <span aria-hidden className={cn("relative inline-flex", className)}>
      <motion.svg
        key={burst}
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "size-full transition-colors duration-(--duration-fast)",
          saved && "text-love",
        )}
        initial={burst ? { scale: 0.8 } : false}
        animate={{ scale: burst ? [0.8, 1.25, 1] : 1 }}
        transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
      >
        <path d={HEART_PATH} />
      </motion.svg>

      <AnimatePresence>
        {burst > 0 && (
          <motion.span
            key={burst}
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO }}
            onAnimationComplete={() => setBurst(0)}
          >
            {/* Ring */}
            <motion.span
              className="absolute inset-0 rounded-full border-2 border-love"
              initial={{ scale: 0.4, opacity: 0.8 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
            />
            {/* Dots */}
            {Array.from({ length: DOT_COUNT }, (_, index) => {
              const angle = (index / DOT_COUNT) * 2 * Math.PI;
              return (
                <motion.span
                  key={index}
                  className="absolute size-[18%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-love"
                  initial={{ left: "50%", top: "50%", scale: 1 }}
                  animate={{
                    left: `${50 + Math.cos(angle) * DOT_TRAVEL * 50}%`,
                    top: `${50 + Math.sin(angle) * DOT_TRAVEL * 50}%`,
                    scale: 0,
                  }}
                  transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO }}
                />
              );
            })}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
