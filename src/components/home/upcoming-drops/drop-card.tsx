"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { UpcomingDrop } from "@/lib/drops";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/ui/countdown";

interface DropCardProps {
  drop: UpcomingDrop;
  /** First card above the fold gets eager loading. */
  priority?: boolean;
}

/**
 * DropCard — a launch plate, not a shop tile.
 * The image is the story: it holds roughly three quarters of the card
 * with only a whisper of chrome floating over it — status and clock.
 * Below, just what curiosity needs: name, variant, one action. Prices
 * and specifications live on the product detail page.
 */
export function DropCard({ drop, priority }: DropCardProps) {
  return (
    <motion.article
      className="group relative flex h-full w-full flex-col"
      whileHover="hover"
      initial="rest"
      animate="rest"
      variants={{
        rest: { y: 0 },
        hover: { y: -6 },
      }}
      transition={{ duration: DURATION.base, ease: EASE_OUT_EXPO }}
    >
      {/* Soft accent glow, revealed on hover */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] opacity-0",
          "bg-[radial-gradient(closest-side,rgb(44_90_160/0.16),transparent_75%)]",
          "transition-opacity duration-(--duration-slow) ease-(--ease-out-expo)",
          "group-hover:opacity-100",
        )}
      />

      {/* ---------- The image is the card ---------- */}
      <div
        className={cn(
          "relative aspect-3/4 overflow-hidden rounded-xl bg-surface",
        )}
      >
        <motion.div
          className="absolute inset-0"
          variants={{ rest: { scale: 1 }, hover: { scale: 1.03 } }}
          transition={{ duration: DURATION.slow, ease: EASE_OUT_EXPO }}
        >
          <Image
            src={drop.image.url}
            alt={drop.image.alt}
            fill
            priority={priority}
            sizes="(max-width: 640px) 92vw, (max-width: 1280px) 46vw, 24vw"
            className="object-cover"
          />
        </motion.div>

        {/* Status — the only chrome on the image */}
        <span className="glass-strong absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ink">
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-accent animate-pulse-dot"
          />
          Upcoming drop
        </span>

        {/* The clock, floating quiet at the plate's floor */}
        <span className="glass-strong absolute bottom-4 left-4 inline-flex items-baseline gap-2.5 rounded-full px-3.5 py-2">
          <span className="font-mono text-[0.75rem] uppercase tracking-[0.18em] text-ink-muted">
            Opens in
          </span>
          <Countdown
            compact
            target={drop.startsAt}
            label={`${drop.name} drop opens in`}
            className="text-sm text-ink"
          />
        </span>
      </div>

      {/* ---------- Editorial meta — name and variant, action opposite ---------- */}
      <div className="flex flex-1 items-start justify-between gap-4 px-1 pt-6">
        <div className="min-w-0">
          <h3 className="text-[1.4rem] font-medium leading-tight tracking-[-0.02em] text-ink">
            <Link
              href={`/drops/${drop.slug}`}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {drop.name}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-ink-muted">{drop.variant}</p>
        </div>

        {/* One action — level with the name, above the card link overlay */}
        <div className="relative z-10 -mt-1.5 shrink-0">
          {/* No icon: sharing the row with the name, the pill has to stay
              narrow enough that titles never wrap around it. */}
          <Button variant="primary" size="sm" className="px-4">
            Notify me
            <span className="sr-only">about the {drop.name} drop</span>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
