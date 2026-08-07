"use client";

import { useRef, type MouseEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/categories";

interface CategoryCardProps {
  category: Category;
  /** First two cards are above the fold on wide screens. */
  priority?: boolean;
}

/**
 * CategoryCard — a way in, not a product tile.
 *
 * The photograph is the whole card: a soft plate that warms and lifts,
 * with the name and count set plainly beneath it. No price, no badge,
 * no button — this is navigation, and anything else would turn it into
 * a shop tile.
 *
 * The image leans a few pixels toward the cursor while it is over the
 * plate. That is the whole "cursor interaction": under 2% of the plate's
 * width, spring-damped, and switched off entirely under reduced motion.
 */
export function CategoryCard({ category, priority }: CategoryCardProps) {
  const plateRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 140, damping: 20, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 140, damping: 20, mass: 0.4 });

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion) return;
    const plate = plateRef.current;
    if (!plate) return;
    const rect = plate.getBoundingClientRect();
    // −0.5 … 0.5 across the plate, then a very short throw.
    x.set(((event.clientX - rect.left) / rect.width - 0.5) * 18);
    y.set(((event.clientY - rect.top) / rect.height - 0.5) * 14);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  // No `outline-none` on the link: the global accent `:focus-visible`
  // ring is the site's focus affordance, and swapping it for a custom
  // ring on a child risks leaving keyboard users with no indicator at
  // all. The hover visuals below are mirrored on focus as enhancement.
  return (
    <Link href={`/collection/${category.slug}`} className="group block">
      <div
        ref={plateRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "relative aspect-4/5 overflow-hidden rounded-xl bg-surface-2",
          "transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
          "group-hover:-translate-y-1.5",
          "group-focus-visible:-translate-y-1.5",
          "motion-reduce:group-hover:translate-y-0",
        )}
      >
        {/* Warm wash under the product — the subtle background shift */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 opacity-0",
            "bg-[radial-gradient(120%_90%_at_50%_10%,rgb(122_165_232/0.20),transparent_65%)]",
            "transition-opacity duration-(--duration-slow) ease-(--ease-out-expo)",
            "group-hover:opacity-100 group-focus-visible:opacity-100",
          )}
        />

        <motion.div
          style={{ x: sx, y: sy }}
          className="absolute inset-0 will-change-transform"
        >
          <Image
            src={category.image.url}
            alt={category.image.alt}
            fill
            priority={priority}
            sizes="(max-width: 640px) 68vw, (max-width: 1024px) 42vw, (max-width: 1280px) 30vw, 18vw"
            className={cn(
              "object-cover",
              "transition-transform duration-(--duration-slow) ease-(--ease-out-expo)",
              "group-hover:scale-[1.03] group-focus-visible:scale-[1.03]",
            )}
          />
        </motion.div>

      </div>

      {/* ---------- Meta ---------- */}
      <div className="mt-5 flex items-baseline justify-between gap-4 px-1">
        <div className="min-w-0">
          <h3 className="text-[1.25rem] font-medium leading-tight tracking-[-0.02em] text-ink">
            {category.name}
          </h3>
          <p className="mt-1.5 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-ink-muted">
            {category.count} devices
          </p>
        </div>

        {/* Direction cue — slides out on hover, the way a nav item should */}
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "size-3.5 shrink-0 translate-y-0.5 text-ink-faint",
            "transition-[transform,color] duration-(--duration-base) ease-(--ease-out-expo)",
            "group-hover:translate-x-1 group-hover:text-ink",
            "group-focus-visible:translate-x-1 group-focus-visible:text-ink",
          )}
        >
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </div>

      <p className="mt-2 px-1 text-xs leading-relaxed text-ink-faint">
        {category.note}
      </p>
    </Link>
  );
}
