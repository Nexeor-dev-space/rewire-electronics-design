"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";

/**
 * ConfettiBurst — a small, subtle confetti pop for "added to cart".
 *
 * Place it inside a `relative` element (the button's wrapper); it covers
 * that box and never takes clicks. Each time `trigger` increases, about a
 * dozen tiny pieces fly up and out from the centre, tumble and fade. With
 * reduced motion it renders nothing.
 */

const PIECE_COUNT = 14;
/** How far pieces travel, in px: sideways spread and upward lift. */
const SPREAD_PX = 70;
const LIFT_PX = 46;
/** After rising, pieces fall back this far below where they peaked. */
const FALL_PX = 18;
const COLOURS = ["bg-love", "bg-live", "bg-warn", "bg-ink", "bg-accent"] as const;

interface Piece {
  x: number;
  y: number;
  rotate: number;
  colour: (typeof COLOURS)[number];
  round: boolean;
}

function makePieces(): Piece[] {
  return Array.from({ length: PIECE_COUNT }, (_, index) => {
    // Fan across the upper half, jittered so it never looks like a pattern.
    const angle = Math.PI + (index / (PIECE_COUNT - 1)) * Math.PI + (Math.random() - 0.5) * 0.4;
    const reach = 0.55 + Math.random() * 0.45;
    return {
      x: Math.cos(angle) * SPREAD_PX * reach,
      y: Math.sin(angle) * LIFT_PX * reach,
      rotate: (Math.random() - 0.5) * 540,
      colour: COLOURS[index % COLOURS.length],
      round: index % 3 === 0,
    };
  });
}

export function ConfettiBurst({ trigger }: { trigger: number }) {
  const reduceMotion = useReducedMotion();
  // New random pieces for each burst.
  const pieces = useMemo(() => (trigger > 0 ? makePieces() : []), [trigger]);

  if (reduceMotion) return null;

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
      <AnimatePresence>
        {trigger > 0 &&
          pieces.map((piece, index) => (
            <motion.span
              key={`${trigger}-${index}`}
              className={`absolute left-1/2 top-1/2 ${piece.round ? "size-1.5 rounded-full" : "h-1 w-2 rounded-[1px]"} ${piece.colour}`}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
              animate={{
                x: piece.x,
                y: [0, piece.y, piece.y + FALL_PX],
                opacity: [1, 1, 0],
                rotate: piece.rotate,
                scale: 1,
              }}
              transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO, times: [0, 0.6, 1] }}
            />
          ))}
      </AnimatePresence>
    </span>
  );
}
