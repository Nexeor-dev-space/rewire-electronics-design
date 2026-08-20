"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  CATEGORY_LABELS,
  CONDITION_META,
  GRADE_META,
  activeFilterCount,
  categoryCounts,
  emptyFilters,
  filterProducts,
  priceBands,
  sortProducts,
  type CategorySlug,
  type Condition,
  type Grade,
  type ShopFilters,
  type SortId,
} from "@/lib/shop";
import { cn } from "@/lib/utils";
import { DURATION, EASE_OUT_EXPO } from "@/lib/motion";
import { CategoryNav } from "./category-nav";
import { FilterDrawer } from "./filter-drawer";
import { FilterPanel } from "./filter-panel";
import { ShopProductCard } from "./product-card";
import { SortSelect } from "./sort-select";

/** One screenful at a time. Twelve divides cleanly by 2, 3 and 4 columns. */
const PAGE_SIZE = 12;

/**
 * ShopCatalogue — the working half of the shop page.
 *
 * Owns one piece of state (`filters`) that two surfaces read and write:
 * the category rail above the grid and the filter panel beside it. They
 * are the same axis rendered twice, never two competing selections, which
 * is why selecting "Laptops" on the rail also ticks Laptops in the panel.
 *
 * Everything derives from that state at render — the grid, the counts,
 * the chips, the number in the "Show N results" button. Nothing is
 * mirrored into a second copy that could drift out of step.
 *
 * Load more rather than pagination: the site scrolls as one continuous
 * editorial surface everywhere else, and numbered pages would be the only
 * place a reader is asked to leave the page they are on.
 */
export function ShopCatalogue({
  initialCategory,
}: {
  initialCategory: CategorySlug | null;
}) {
  const [filters, setFilters] = useState<ShopFilters>(() => ({
    ...emptyFilters,
    categories: initialCategory ? [initialCategory] : [],
  }));
  const [sort, setSort] = useState<SortId>("recommended");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const counts = useMemo(() => categoryCounts(), []);
  const results = useMemo(
    () => sortProducts(filterProducts(filters), sort),
    [filters, sort],
  );

  const shown = results.slice(0, visible);
  const activeCount = activeFilterCount(filters);

  /** Any change to the result set starts the reader at the top of it. */
  function updateFilters(next: ShopFilters) {
    setFilters(next);
    setVisible(PAGE_SIZE);
  }

  function toggle(axis: keyof ShopFilters, value: string) {
    const current = filters[axis] as string[];
    updateFilters({
      ...filters,
      [axis]: current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    });
  }

  function selectCategory(category: CategorySlug | null) {
    if (category === null) {
      updateFilters({ ...filters, categories: [] });
      return;
    }
    toggle("categories", category);
  }

  function clearAll() {
    updateFilters(emptyFilters);
  }

  return (
    <>
      {/* ---------- Category rail ---------- */}
      <div className="mx-auto w-full max-w-[110rem] px-(--spacing-gutter)">
        <CategoryNav
          selected={filters.categories}
          onSelect={selectCategory}
          counts={counts}
        />
      </div>

      {/* ---------- Filters + grid ---------- */}
      <div className="mx-auto mt-8 w-full max-w-[110rem] px-(--spacing-gutter) lg:mt-12">
        <div className="lg:flex lg:items-start lg:gap-10 xl:gap-14">
          {/* ---------- Sidebar (lg and up) ---------- */}
          <aside
            aria-label="Filters"
            className="hidden shrink-0 lg:block lg:w-[16rem] xl:w-[17.5rem]"
          >
            {/* Sticky below the 5rem header so the panel stays reachable
                through a long grid without becoming its own scroll area. */}
            <div className="sticky top-28">
              <div className="flex items-baseline justify-between gap-4 pb-5">
                <h2 className="eyebrow text-ink">Filters</h2>
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    className={cn(
                      "text-[0.8125rem] text-ink-secondary underline underline-offset-4",
                      "transition-colors duration-(--duration-fast) hover:text-ink",
                    )}
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto pr-1">
                <FilterPanel
                  idPrefix="sidebar"
                  filters={filters}
                  onToggle={toggle}
                />
              </div>
            </div>
          </aside>

          {/* ---------- Results ---------- */}
          <div className="min-w-0 flex-1">
            {/* Toolbar: what you are looking at, and the two controls that
                change it. Sort sits on the right at every width; the
                filter trigger replaces the sidebar below `lg`. */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
              <p className="text-sm text-ink-secondary" aria-live="polite">
                <span className="font-mono tabular-nums text-ink">{results.length}</span>{" "}
                {results.length === 1 ? "product" : "products"}
              </p>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-haspopup="dialog"
                  className={cn(
                    "inline-flex h-10 items-center gap-2.5 rounded-full px-4 sm:px-5 lg:hidden",
                    "border border-line bg-surface text-[0.8125rem] font-medium tracking-tight text-ink",
                    "transition-colors duration-(--duration-fast) ease-(--ease-out-quart)",
                    "hover:border-line-strong active:scale-[0.97]",
                  )}
                >
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    className="size-3.5"
                  >
                    <path d="M2 4h12M4 8h8M6.5 12h3" />
                  </svg>
                  Filters
                  {activeCount > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-ink font-mono text-[0.625rem] leading-none tabular-nums text-surface">
                      {activeCount}
                    </span>
                  )}
                </button>

                <SortSelect value={sort} onChange={setSort} className="w-[13.5rem]" />
              </div>
            </div>

            {/* Active filters — every applied narrowing, removable in one
                tap. The only place the three axes appear side by side, so
                each chip names its axis rather than just its value. */}
            {activeCount > 0 && (
              <ul className="flex flex-wrap items-center gap-2 pt-5">
                {chipsFor(filters).map((chip) => (
                  <li key={`${chip.axis}-${chip.value}`}>
                    <button
                      type="button"
                      onClick={() => toggle(chip.axis, chip.value)}
                      className={cn(
                        "group/chip inline-flex h-8 items-center gap-2 rounded-full pl-3.5 pr-2.5",
                        "border border-line bg-surface-2 text-[0.75rem] tracking-tight text-ink-secondary",
                        "transition-colors duration-(--duration-fast)",
                        "hover:border-line-strong hover:text-ink",
                      )}
                    >
                      <span className="text-ink-muted">{chip.axisLabel}</span>
                      {chip.label}
                      <svg
                        aria-hidden
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        className="size-3 text-ink-muted transition-colors group-hover/chip:text-ink"
                      >
                        <path d="M4 4l8 8M12 4l-8 8" />
                      </svg>
                      <span className="sr-only">Remove filter</span>
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={clearAll}
                    className={cn(
                      "inline-flex h-8 items-center px-2 text-[0.75rem] text-ink-secondary",
                      "underline underline-offset-4 transition-colors duration-(--duration-fast) hover:text-ink",
                    )}
                  >
                    Clear all
                  </button>
                </li>
              </ul>
            )}

            {/* ---------- The grid ---------- */}
            {shown.length > 0 ? (
              <>
                <ul
                  className={cn(
                    "grid gap-x-4 gap-y-10 pt-8 sm:gap-x-6 sm:gap-y-14 lg:pt-10",
                    // Two up from 360px — a catalogue of thirty-two devices
                    // read one-per-row is a very long scroll, and the card's
                    // compact type holds at ~165px. Below 360 the price and
                    // the spec line start colliding, so it drops to one.
                    "grid-cols-1 min-[360px]:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
                  )}
                >
                  {shown.map((product, index) => (
                    <motion.li
                      key={product.id}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: DURATION.slow,
                        ease: EASE_OUT_EXPO,
                        // Stagger only the first screenful; anything deeper
                        // would leave later cards visibly waiting.
                        delay: Math.min(index % PAGE_SIZE, 7) * 0.04,
                      }}
                    >
                      <ShopProductCard product={product} priority={index < 4} />
                    </motion.li>
                  ))}
                </ul>

                <div className="flex flex-col items-center gap-5 pt-16 lg:pt-20">
                  <p className="font-mono text-[0.75rem] uppercase tracking-[0.14em] tabular-nums text-ink-muted">
                    Showing {shown.length} of {results.length}
                  </p>

                  {shown.length < results.length && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => setVisible((current) => current + PAGE_SIZE)}
                    >
                      Load more
                    </Button>
                  )}

                  {/* The rule closes the list whether or not the button is
                      there, so the grid never simply stops mid-page. */}
                  <span aria-hidden className="mt-2 h-px w-16 bg-line" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-start gap-5 py-24 lg:py-32">
                <p className="eyebrow">Nothing matches</p>
                <p className="max-w-md text-[clamp(1.5rem,2.4vw,2rem)] font-light leading-[1.1] tracking-[-0.03em] text-ink">
                  No devices meet all of those conditions at once.
                </p>
                <p className="max-w-md text-base leading-relaxed text-ink-secondary">
                  Try widening one axis — grade and storage narrow a catalogue
                  faster than anything else.
                </p>
                <Button variant="outline" size="md" onClick={clearAll} className="mt-2">
                  Clear all filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <FilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onToggle={toggle}
        onClear={clearAll}
        resultCount={results.length}
        activeCount={activeCount}
      />
    </>
  );
}

/* ============================================================
   Chips
   ============================================================ */

interface Chip {
  axis: keyof ShopFilters;
  /** Names the axis, so "Premium" is never mistaken for a condition. */
  axisLabel: string;
  value: string;
  label: string;
}

function chipsFor(filters: ShopFilters): Chip[] {
  return [
    ...filters.categories.map((value) => ({
      axis: "categories" as const,
      axisLabel: "Category",
      value,
      label: CATEGORY_LABELS[value as CategorySlug],
    })),
    ...filters.conditions.map((value) => ({
      axis: "conditions" as const,
      axisLabel: "Condition",
      value,
      label: CONDITION_META[value as Condition].short,
    })),
    ...filters.grades.map((value) => ({
      axis: "grades" as const,
      axisLabel: "Grade",
      value,
      label: GRADE_META[value as Grade].label,
    })),
    ...filters.priceBands.map((value) => ({
      axis: "priceBands" as const,
      axisLabel: "Price",
      value,
      label: priceBands.find((band) => band.id === value)?.label ?? value,
    })),
    ...filters.brands.map((value) => ({
      axis: "brands" as const,
      axisLabel: "Brand",
      value,
      label: value,
    })),
    ...filters.storage.map((value) => ({
      axis: "storage" as const,
      axisLabel: "Storage",
      value,
      label: value,
    })),
  ];
}
