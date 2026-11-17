"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * ConfettiBurst — a short confetti pop.
 *
 * Each time `trigger` increases, pieces fly up and out from the origin,
 * tumble, fall and fade. It never takes clicks and is hidden from screen
 * readers. With reduced motion it renders nothing.
 *
 * `size="sm"` (default): the subtle pop on "added to cart". Place it inside a
 * `relative` element (the button's wrapper); it covers that box.
 *
 * `size="screen"`: the celebration after a successful purchase. It covers the
 * whole viewport, so it can sit anywhere in the page.
 */

/**
 * Per size: piece count; how far pieces travel (sideways spread, upward lift,
 * then the fall below their peak) and in which units; how close to the origin
 * a piece may land (0 to 1 of the full reach); how long it runs, the window
 * the pieces launch across, and when in that run the pieces peak (0 to 1); the overlay
 * and origin classes; and the piece shapes.
 */
const SIZES = {
  sm: {
    count: 14,
    spread: 70,
    lift: 46,
    fall: 18,
    xUnit: "px",
    yUnit: "px",
    minReach: 0.55,
    duration: DURATION.slow,
    stagger: 0,
    peakAt: 0.6,
    overlay: "absolute inset-0 overflow-visible",
    origin: "left-1/2 top-1/2",
    round: "size-1.5 rounded-full",
    strip: "h-1 w-2 rounded-[1px]",
  },
  screen: {
    count: 90,
    spread: 50,
    lift: 40,
    fall: 55,
    xUnit: "vw",
    yUnit: "vh",
    minReach: 0.2,
    duration: DURATION.cinematic,
    // Pieces launch across this window, so the shower lasts about 2 s
    // while each piece stays on the duration scale.
    stagger: DURATION.slow,
    // Peak early so most of the run is the fall across the screen.
    peakAt: 0.35,
    // Above the header (z-50), below dialogs (z-[80]) and the toast (z-[90]).
    overlay: "fixed inset-0 z-[60] overflow-hidden",
    origin: "left-1/2 top-2/5",
    round: "size-2.5 rounded-full",
    strip: "h-2 w-3.5 rounded-[2px]",
  },
} as const;

type ConfettiSize = keyof typeof SIZES;

const COLOURS = ["bg-love", "bg-live", "bg-warn", "bg-ink", "bg-accent"] as const;

interface Piece {
  x: number;
  y: number;
  rotate: number;
  delay: number;
  colour: (typeof COLOURS)[number];
  round: boolean;
}

function makePieces(size: ConfettiSize): Piece[] {
  const { count, spread, lift, minReach, stagger } = SIZES[size];
  return Array.from({ length: count }, (_, index) => {
    // Fan across the upper half, jittered so it never looks like a pattern.
    const angle = Math.PI + (index / (count - 1)) * Math.PI + (Math.random() - 0.5) * 0.4;
    const reach = minReach + Math.random() * (1 - minReach);
    return {
      x: Math.cos(angle) * spread * reach,
      y: Math.sin(angle) * lift * reach,
      rotate: (Math.random() - 0.5) * 540,
      delay: Math.random() * stagger,
      colour: COLOURS[index % COLOURS.length],
      round: index % 3 === 0,
    };
  });
}

export function ConfettiBurst({ trigger, size = "sm" }: { trigger: number; size?: ConfettiSize }) {
  const reduceMotion = useReducedMotion();
  // New random pieces for each burst.
  const pieces = useMemo(() => (trigger > 0 ? makePieces(size) : []), [trigger, size]);
  const config = SIZES[size];
  const x = (value: number) => `${value}${config.xUnit}`;
  const y = (value: number) => `${value}${config.yUnit}`;

  if (reduceMotion) return null;

  return (
    <span aria-hidden className={`pointer-events-none ${config.overlay}`}>
      <AnimatePresence>
        {trigger > 0 &&
          pieces.map((piece, index) => (
            <motion.span
              key={`${trigger}-${index}`}
              className={`absolute ${config.origin} ${piece.round ? config.round : config.strip} ${piece.colour}`}
              initial={{ x: x(0), y: y(0), opacity: 1, rotate: 0, scale: 0.6 }}
              animate={{
                x: x(piece.x),
                y: [y(0), y(piece.y), y(piece.y + config.fall)],
                opacity: [1, 1, 0],
                rotate: piece.rotate,
                scale: 1,
              }}
              transition={{
                duration: config.duration,
                delay: piece.delay,
                ease: EASE_OUT_EXPO,
                times: [0, config.peakAt, 1],
              }}
            />
          ))}
      </AnimatePresence>
    </span>
  );
}
