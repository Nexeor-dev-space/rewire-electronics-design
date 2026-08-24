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
  /**
   * The banner strip variant — a short landscape plate instead of the
   * square index cell. Same photograph, same wash, same type ramp, one
   * step down in scale: the strip sits *inside* the hero, under the
   * product, so a square cell there would push the device off the fold
   * and turn the banner into a category page. The "Find by" mono line is
   * dropped at this size; on a 7rem plate it was a third type size
   * fighting the name for a row it did not need.
   */
  compact?: boolean;
}

/**
 * CategoryCard — the browse-the-catalogue cell.
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
export function CategoryCard({
  category,
  priority,
  compact = false,
}: CategoryCardProps) {
  return (
    <Link
      href={productHrefForCategory(category.slug)}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden",
        compact
          ? "h-[113px] rounded-xl sm:h-[129px] lg:h-[145px]"
          : "h-full aspect-square rounded-2xl",
        "border border-line bg-surface-2",
        // Lift on hover removed — a row of five cards each rising 6px
        // read as a coordinated jump rather than as a hover cue. The
        // interaction now stays inside the plate: the border brightens
        // and the photograph zooms a hair (below), which reads as the
        // card "opening up" without moving on the page.
        "transition-[border-color] duration-(--duration-base) ease-(--ease-out-expo)",
        "hover:border-line-strong",
        "focus-visible:border-line-strong",
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
        sizes={
          compact
            ? "(max-width: 640px) 62vw, (max-width: 768px) 40vw, (max-width: 1024px) 30vw, 20vw"
            : "(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 20vw"
        }
        className={cn(
          "object-cover",
          "transition-transform duration-(--duration-slow) ease-(--ease-out-expo)",
          "group-hover:scale-[1.04] group-focus-visible:scale-[1.04]",
        )}
      />

      {/* Uniform ink wash — bumped to 55% (from 40%) so the photography
          reads as a *ground* for the type rather than competing with it.
          Eases to 45% on hover so the picture opens up under the cursor.
          The strip runs two steps darker: it sits over the banner's own
          backlight and beside the REIMAGINED word, and at 55% the five
          photographs read as five bright rectangles under the product. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 transition-colors duration-(--duration-base) ease-(--ease-out-expo)",
          compact
            ? "bg-black/65 group-hover:bg-black/50 group-focus-visible:bg-black/50"
            : "bg-black/55 group-hover:bg-black/45 group-focus-visible:bg-black/45",
        )}
      />

      {/* ---------- Top row — direction cue only ----------
          Taken out of the flow in the strip variant. At 6rem tall the
          arrow's own padded row and the name block together measure more
          than the plate, and `justify-between` resolves that by pushing
          the note out under the bottom edge — the cue costs the card its
          last line. Pinned to the corner it costs nothing. */}
      <div
        className={cn(
          "flex items-start justify-end",
          compact
            ? "absolute inset-x-0 top-0 p-3.5 lg:p-4"
            : "relative p-5 lg:p-6",
        )}
      >
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

      {/* ---------- Bottom — browse verb + one-line hook ----------
          A "Find by …" verb reframes the card as navigation into the
          catalogue rather than as a bare category label. The device
          count is dropped: on a browse card it reads as marketing
          rather than a decision-influencing fact. */}
      <div
        className={cn(
          "relative mt-auto",
          compact ? "p-3.5 lg:p-4" : "p-5 lg:p-6",
        )}
      >
        {!compact && (
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-ink/70 [text-shadow:0_1px_8px_rgb(17_17_17/0.45)]">
            Find by
          </p>
        )}
        <h3
          className={cn(
            "font-sans font-light text-ink [text-shadow:0_1px_10px_rgb(17_17_17/0.5)]",
            compact
              ? "text-[1.0625rem] leading-[1.1] tracking-[-0.02em] lg:text-[1.25rem]"
              : "mt-1.5 text-[clamp(1.5rem,2.1vw,2rem)] leading-[1.05] tracking-[-0.03em]",
          )}
        >
          {category.name}
        </h3>
        <p
          className={cn(
            "text-ink/80 [text-shadow:0_1px_8px_rgb(17_17_17/0.5)]",
            compact
              ? "mt-1 truncate text-[0.75rem] leading-relaxed"
              : "mt-2.5 text-sm leading-relaxed",
          )}
        >
          {category.note}
        </p>
      </div>
    </Link>
  );
}
