"use client";

import type { ReactNode } from "react";
import { motion, type Variants } from "framer-motion";
import { fadeUp, staggerChildren, viewportOnce } from "@/lib/motion";

interface RevealProps {
  children: ReactNode;
  /** Movement variant — defaults to the house fade-up. */
  variants?: Variants;
  /** Extra delay in seconds (for manual choreography). */
  delay?: number;
  className?: string;
  /** Render as a different element for semantics (section, li, h2…). */
  as?: keyof typeof motion;
}

/**
 * Reveal — scroll-triggered entrance for any block.
 * Fires once, slightly before entering the viewport, and respects
 * reduced motion via the global MotionConfig.
 */
export function Reveal({
  children,
  variants = fadeUp,
  delay = 0,
  className,
  as = "div",
}: RevealProps) {
  const Component = motion[as] as typeof motion.div;
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={variants}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </Component>
  );
}

/**
 * RevealGroup — staggers its Reveal-compatible children.
 * Wrap a grid of cards; give each child `variants={fadeUp}` via
 * motion components, or use plain <Reveal> children.
 */
export function RevealGroup({
  children,
  stagger = 0.08,
  delay = 0,
  className,
}: {
  children: ReactNode;
  stagger?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={staggerChildren(stagger, delay)}
    >
      {children}
    </motion.div>
  );
}

/** Child item for RevealGroup grids. */
export function RevealItem({
  children,
  className,
  variants = fadeUp,
}: {
  children: ReactNode;
  className?: string;
  variants?: Variants;
}) {
  return (
    <motion.div className={className} variants={variants}>
      {children}
    </motion.div>
  );
}
