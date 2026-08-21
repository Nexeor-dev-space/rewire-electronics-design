"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/categories";
import { productHrefForCategory } from "@/lib/route-map";

interface CategoryCardProps {
  category: Category;
  /** First two are above the fold on wide screens. */
  priority?: boolean;
}

/**
 * CategoryCard — the homepage's browse-the-catalogue cell.
 *
 * Matches the mega-menu category tile: photograph behind, one uniform
 * light-dark wash across the whole plate, white type on top. The two
 * surfaces are visually the same object, so a reader who has already
 * seen the header's category dropdown recognises the row instantly.
 *
 * The plate itself lifts a hair on hover, the arrow slides, and the
 * scrim eases up a touch as the picture scales behind it. No product
 * price, no badge, no CTA — this remains navigation, not a shelf.
 */
export function CategoryCard({ category, priority }: CategoryCardProps) {
  return (
    <Link
      href={productHrefForCategory(category.slug)}
      className={cn(
        "group relative flex h-full aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl",
        "border border-line bg-surface-2",
        "transition-[transform,border-color] duration-(--duration-base) ease-(--ease-out-expo)",
        "hover:-translate-y-1.5 hover:border-line-strong",
        "focus-visible:-translate-y-1.5 focus-visible:border-line-strong",
        "motion-reduce:hover:translate-y-0",
      )}
    >
      {/* Photograph behind — the same asset the mega-menu uses, so the
          two rows read as one object. Prefers the wide cut where it
          exists; the portrait shot is only a fallback. */}
      <Image
        src={(category.menuImage ?? category.image).url}
        alt=""
        fill
        priority={priority}
        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 20vw"
        className={cn(
          "object-cover",
          "transition-transform duration-(--duration-slow) ease-(--ease-out-expo)",
          "group-hover:scale-[1.04] group-focus-visible:scale-[1.04]",
        )}
      />

      {/* Uniform ink wash — bumped to 55% (from 40%) so the photography
          reads as a *ground* for the type rather than competing with it.
          Eases to 45% on hover so the picture opens up under the cursor. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0",
          "bg-black/55 transition-colors duration-(--duration-base) ease-(--ease-out-expo)",
          "group-hover:bg-black/45 group-focus-visible:bg-black/45",
        )}
      />

      {/* ---------- Top row — direction cue only ---------- */}
      <div className="relative flex items-start justify-end p-5 lg:p-6">
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "size-3.5 text-ink/70 [filter:drop-shadow(0_1px_6px_rgb(17_17_17/0.5))]",
            "transition-[transform,color] duration-(--duration-base) ease-(--ease-out-expo)",
            "group-hover:translate-x-1 group-hover:text-ink",
            "group-focus-visible:translate-x-1 group-focus-visible:text-ink",
          )}
        >
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </div>

      {/* ---------- Bottom — name, count, note ---------- */}
      <div className="relative p-5 lg:p-6">
        <h3 className="font-sans text-[clamp(1.5rem,2.1vw,2rem)] font-light leading-[1.05] tracking-[-0.03em] text-ink [text-shadow:0_1px_10px_rgb(17_17_17/0.5)]">
          {category.name}
        </h3>
        <p className="mt-2.5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink/70 [text-shadow:0_1px_8px_rgb(17_17_17/0.45)]">
          {category.count} devices
        </p>
        <p className="mt-3.5 text-sm leading-relaxed text-ink/80 [text-shadow:0_1px_8px_rgb(17_17_17/0.5)]">
          {category.note}
        </p>
      </div>
    </Link>
  );
}
