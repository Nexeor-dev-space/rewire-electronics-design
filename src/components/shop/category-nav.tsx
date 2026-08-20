"use client";

import { shopCategories, type CategorySlug } from "@/lib/shop";
import { cn } from "@/lib/utils";

interface CategoryNavProps {
  /**
   * The category axis itself, not a copy of it. Empty means "All
   * Products"; more than one entry means the shopper has ticked several
   * in the filter panel, and the rail shows all of them lit rather than
   * pretending a single choice is in force.
   */
  selected: CategorySlug[];
  /** `null` clears the axis; a slug toggles it. */
  onSelect: (category: CategorySlug | null) => void;
  counts: Record<CategorySlug | "all", number>;
}

/**
 * CategoryNav — the first cut, and the only one that gets to be a rail.
 *
 * Category is the question every shopper answers first, so it sits above
 * the grid in full view rather than inside the filter panel with the
 * other five axes. It is still the same axis: selecting here ticks the
 * category box in the panel, and vice versa. One state, two surfaces.
 *
 * The rail scrolls and snaps below `lg`, bleeding to the gutter edge so a
 * partial pill always signals there is more — the same behaviour the
 * homepage's category gallery uses.
 */
export function CategoryNav({ selected, onSelect, counts }: CategoryNavProps) {
  const items: {
    key: string;
    label: string;
    value: CategorySlug | null;
    count: number;
    active: boolean;
  }[] = [
    {
      key: "all",
      label: "All Products",
      value: null,
      count: counts.all,
      active: selected.length === 0,
    },
    ...shopCategories.map((category) => ({
      key: category.slug,
      label: category.label,
      value: category.slug as CategorySlug | null,
      count: counts[category.slug],
      active: selected.includes(category.slug),
    })),
  ];

  return (
    <nav aria-label="Product categories">
      <ul
        className={cn(
          "no-scrollbar -mx-(--spacing-gutter) flex snap-x gap-2 overflow-x-auto px-(--spacing-gutter) pb-1",
          "lg:mx-0 lg:flex-wrap lg:px-0 lg:pb-0",
        )}
      >
        {items.map((item) => {
          const isActive = item.active;
          return (
            <li key={item.key} className="shrink-0 snap-start">
              <button
                type="button"
                onClick={() => onSelect(item.value)}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 sm:px-5",
                  "text-[0.8125rem] font-medium tracking-tight whitespace-nowrap",
                  "transition-[background-color,border-color,color] duration-(--duration-fast) ease-(--ease-out-quart)",
                  "active:scale-[0.97]",
                  isActive
                    ? "border border-ink bg-ink text-surface"
                    : "border border-line bg-surface text-ink-secondary hover:border-line-strong hover:text-ink",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "font-mono text-[0.6875rem] tabular-nums",
                    isActive ? "text-surface/60" : "text-ink-faint",
                  )}
                >
                  {item.count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
